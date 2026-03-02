"""
ms-tickets — Microservicio de Compra y Consulta de Tickets
Boletealo · Cloud Computing UTEC
Base de datos: Aurora Serverless v2 (PostgreSQL) via RDS Data API
Handlers: buy_ticket, list_my_tickets, get_ticket, init_db
"""

import json
import os
import uuid
import hmac
import hashlib
import base64
import time
from datetime import datetime, timezone
from decimal import Decimal

import boto3

rds_data = boto3.client("rds-data", region_name="us-east-1")
ses      = boto3.client("ses",      region_name="us-east-1")

DB_SECRET_ARN  = os.environ["DB_SECRET_ARN"]
DB_CLUSTER_ARN = os.environ["DB_CLUSTER_ARN"]
DB_NAME        = os.environ["DB_NAME"]
JWT_SECRET     = os.environ.get("JWT_SECRET", "boletealo-secret-local")


# ── Helpers ───────────────────────────────────────────────────

def response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


def sql(statement: str, parameters: list = None) -> dict:
    """Ejecutar SQL via RDS Data API."""
    kwargs = {
        "resourceArn": DB_CLUSTER_ARN,
        "secretArn":   DB_SECRET_ARN,
        "database":    DB_NAME,
        "sql":         statement,
    }
    if parameters:
        kwargs["parameters"] = parameters
    return rds_data.execute_statement(**kwargs)


def rows_to_dicts(result: dict) -> list[dict]:
    """Convertir resultado RDS Data API a lista de dicts."""
    columns = [col["name"] for col in result.get("columnMetadata", [])]
    rows = []
    for row in result.get("records", []):
        record = {}
        for col, cell in zip(columns, row):
            # Extraer valor del tipo de celda
            value = list(cell.values())[0] if cell else None
            record[col] = value
        rows.append(record)
    return rows


def decode_jwt(token: str) -> dict | None:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        sig_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode()
        if not hmac.compare_digest(sig_b64, expected_b64):
            return None
        padding = 4 - len(payload_b64) % 4
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * padding))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_user_from_event(event: dict) -> dict | None:
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    return decode_jwt(auth[7:])


def generate_qr_code(ticket_id: str) -> str:
    """Generar código QR como string único (en prod usar librería qrcode)."""
    return f"BLT-{ticket_id[:8].upper()}"


# ── Init DB ───────────────────────────────────────────────────

def init_db(event, context):
    """Inicializar esquema PostgreSQL — ejecutar una sola vez post-deploy."""
    try:
        sql("""
            CREATE TABLE IF NOT EXISTS tickets (
                ticket_id    VARCHAR(36) PRIMARY KEY,
                user_id      VARCHAR(36) NOT NULL,
                evento_id    VARCHAR(50) NOT NULL,
                evento_nombre VARCHAR(200) NOT NULL,
                evento_fecha  DATE NOT NULL,
                evento_lugar  VARCHAR(200) NOT NULL,
                zona         VARCHAR(100) NOT NULL,
                cantidad     INTEGER NOT NULL DEFAULT 1,
                precio_unit  NUMERIC(10,2) NOT NULL,
                precio_total NUMERIC(10,2) NOT NULL,
                qr_code      VARCHAR(50) UNIQUE NOT NULL,
                estado       VARCHAR(20) DEFAULT 'activo',
                created_at   TIMESTAMP DEFAULT NOW()
            )
        """)
        sql("CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)")
        sql("CREATE INDEX IF NOT EXISTS idx_tickets_evento ON tickets(evento_id)")
        return response(200, {"message": "Esquema de base de datos inicializado correctamente"})
    except Exception as e:
        return response(500, {"error": f"Error al inicializar BD: {str(e)}"})


# ── Handlers ──────────────────────────────────────────────────

def buy_ticket(event, context):
    """POST /tickets — Comprar tickets para un evento."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")

        # Validaciones
        required = ["eventoId", "eventoNombre", "eventoFecha", "eventoLugar", "zona", "cantidad", "precioUnit"]
        for field in required:
            if not body.get(field):
                return response(400, {"error": f"Campo requerido: {field}"})

        cantidad    = int(body["cantidad"])
        precio_unit = float(body["precioUnit"])
        precio_total= round(cantidad * precio_unit, 2)

        if cantidad < 1 or cantidad > 10:
            return response(400, {"error": "La cantidad debe estar entre 1 y 10 tickets"})

        ticket_id = str(uuid.uuid4())
        qr_code   = generate_qr_code(ticket_id)
        now       = datetime.now(timezone.utc).isoformat()

        sql(
            """
            INSERT INTO tickets
              (ticket_id, user_id, evento_id, evento_nombre, evento_fecha,
               evento_lugar, zona, cantidad, precio_unit, precio_total, qr_code, estado, created_at)
            VALUES
              (:ticket_id, :user_id, :evento_id, :evento_nombre, :evento_fecha,
               :evento_lugar, :zona, :cantidad, :precio_unit, :precio_total, :qr_code, 'activo', NOW())
            """,
            [
                {"name": "ticket_id",     "value": {"stringValue": ticket_id}},
                {"name": "user_id",       "value": {"stringValue": user["userId"]}},
                {"name": "evento_id",     "value": {"stringValue": body["eventoId"]}},
                {"name": "evento_nombre", "value": {"stringValue": body["eventoNombre"]}},
                {"name": "evento_fecha",  "value": {"stringValue": body["eventoFecha"]}},
                {"name": "evento_lugar",  "value": {"stringValue": body["eventoLugar"]}},
                {"name": "zona",          "value": {"stringValue": body["zona"]}},
                {"name": "cantidad",      "value": {"longValue": cantidad}},
                {"name": "precio_unit",   "value": {"doubleValue": precio_unit}},
                {"name": "precio_total",  "value": {"doubleValue": precio_total}},
                {"name": "qr_code",       "value": {"stringValue": qr_code}},
            ],
        )

        # Enviar confirmación por email via SES
        try:
            ses.send_email(
                Source="noreply@boletealo.pe",
                Destination={"ToAddresses": [user["email"]]},
                Message={
                    "Subject": {"Data": f"🎟 Tu ticket para {body['eventoNombre']} — Boletealo"},
                    "Body": {
                        "Html": {
                            "Data": f"""
                            <h2>¡Compra exitosa! 🎉</h2>
                            <p>Hola <strong>{user['nombre']}</strong>,</p>
                            <p>Tu compra ha sido confirmada:</p>
                            <ul>
                                <li><strong>Evento:</strong> {body['eventoNombre']}</li>
                                <li><strong>Fecha:</strong> {body['eventoFecha']}</li>
                                <li><strong>Lugar:</strong> {body['eventoLugar']}</li>
                                <li><strong>Zona:</strong> {body['zona']}</li>
                                <li><strong>Cantidad:</strong> {cantidad} entrada(s)</li>
                                <li><strong>Total pagado:</strong> S/ {precio_total}</li>
                            </ul>
                            <h3>Tu código QR: <code>{qr_code}</code></h3>
                            <p>Presenta este código en la entrada del evento.</p>
                            <p>— Equipo Boletealo</p>
                            """
                        }
                    },
                },
            )
        except Exception:
            pass  # No fallar si SES no está configurado en el laboratorio

        return response(201, {
            "message": "Ticket comprado exitosamente",
            "ticket": {
                "ticketId":    ticket_id,
                "eventoNombre":body["eventoNombre"],
                "eventoFecha": body["eventoFecha"],
                "eventoLugar": body["eventoLugar"],
                "zona":        body["zona"],
                "cantidad":    cantidad,
                "precioTotal": precio_total,
                "qrCode":      qr_code,
                "estado":      "activo",
                "createdAt":   now,
            },
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def list_my_tickets(event, context):
    """GET /tickets — Listar tickets del usuario autenticado."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        result = sql(
            "SELECT * FROM tickets WHERE user_id = :user_id ORDER BY created_at DESC",
            [{"name": "user_id", "value": {"stringValue": user["userId"]}}],
        )

        tickets = rows_to_dicts(result)
        return response(200, {"tickets": tickets, "total": len(tickets)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_ticket(event, context):
    """GET /tickets/{ticketId} — Detalle de un ticket."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        ticket_id = event.get("pathParameters", {}).get("ticketId")
        if not ticket_id:
            return response(400, {"error": "ticketId requerido"})

        result = sql(
            "SELECT * FROM tickets WHERE ticket_id = :ticket_id AND user_id = :user_id",
            [
                {"name": "ticket_id", "value": {"stringValue": ticket_id}},
                {"name": "user_id",   "value": {"stringValue": user["userId"]}},
            ],
        )

        tickets = rows_to_dicts(result)
        if not tickets:
            return response(404, {"error": "Ticket no encontrado"})

        return response(200, tickets[0])

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
