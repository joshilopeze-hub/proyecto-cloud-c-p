"""
ms-pagos — Microservicio de Procesamiento de Pagos
Boletealo · Cloud Computing UTEC
Base de datos: Aurora Serverless v2 (PostgreSQL) via RDS Data API
Métodos de pago: Tarjeta de crédito / Yape
Handlers: procesar_pago, get_pago, init_db
"""

import json
import os
import uuid
import hmac
import hashlib
import base64
import time
import re
from datetime import datetime, timezone

import boto3

rds_data = boto3.client("rds-data", region_name="us-east-1")

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
    columns = [col["name"] for col in result.get("columnMetadata", [])]
    rows = []
    for row in result.get("records", []):
        record = {}
        for col, cell in zip(columns, row):
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


def simular_pasarela_tarjeta(numero: str, cvv: str, mes: str, anio: str, nombre: str) -> dict:
    """
    Simulación de pasarela de pago con tarjeta.
    En producción integrar con: Culqi, Niubiz, Stripe, etc.
    Tarjeta de prueba exitosa: cualquier número de 16 dígitos válido.
    Tarjeta que falla: termina en 0000.
    """
    numero_limpio = re.sub(r"\s|-", "", numero)
    if len(numero_limpio) != 16 or not numero_limpio.isdigit():
        return {"aprobado": False, "mensaje": "Número de tarjeta inválido"}
    if numero_limpio.endswith("0000"):
        return {"aprobado": False, "mensaje": "Tarjeta rechazada por el banco"}
    if not cvv or len(cvv) not in [3, 4]:
        return {"aprobado": False, "mensaje": "CVV inválido"}
    codigo_autorizacion = uuid.uuid4().hex[:8].upper()
    return {"aprobado": True, "codigoAutorizacion": codigo_autorizacion, "mensaje": "Pago aprobado"}


def simular_pasarela_yape(numero_celular: str, codigo_seguridad: str) -> dict:
    """
    Simulación de pago con Yape.
    En producción integrar con API de Yape / BCP.
    Celular que falla: termina en 0000.
    """
    celular_limpio = re.sub(r"\s|-", "", numero_celular)
    if len(celular_limpio) != 9 or not celular_limpio.isdigit():
        return {"aprobado": False, "mensaje": "Número de celular inválido (debe tener 9 dígitos)"}
    if celular_limpio.endswith("0000"):
        return {"aprobado": False, "mensaje": "Pago Yape rechazado — saldo insuficiente"}
    if not codigo_seguridad or len(codigo_seguridad) != 6:
        return {"aprobado": False, "mensaje": "Código de seguridad Yape inválido"}
    codigo_autorizacion = f"YAPE-{uuid.uuid4().hex[:6].upper()}"
    return {"aprobado": True, "codigoAutorizacion": codigo_autorizacion, "mensaje": "Pago Yape aprobado"}


# ── Init DB ───────────────────────────────────────────────────

def init_db(event, context):
    """Inicializar esquema PostgreSQL."""
    try:
        sql("""
            CREATE TABLE IF NOT EXISTS transacciones (
                pago_id              VARCHAR(36) PRIMARY KEY,
                ticket_id            VARCHAR(36) NOT NULL,
                user_id              VARCHAR(36) NOT NULL,
                metodo_pago          VARCHAR(20) NOT NULL,
                monto                NUMERIC(10,2) NOT NULL,
                moneda               VARCHAR(3) DEFAULT 'PEN',
                estado               VARCHAR(20) DEFAULT 'pendiente',
                codigo_autorizacion  VARCHAR(50),
                descripcion_error    TEXT,
                datos_pago_hash      VARCHAR(64),
                created_at           TIMESTAMP DEFAULT NOW(),
                updated_at           TIMESTAMP DEFAULT NOW()
            )
        """)
        sql("CREATE INDEX IF NOT EXISTS idx_transacciones_ticket  ON transacciones(ticket_id)")
        sql("CREATE INDEX IF NOT EXISTS idx_transacciones_user    ON transacciones(user_id)")
        sql("CREATE INDEX IF NOT EXISTS idx_transacciones_estado  ON transacciones(estado)")
        return response(200, {"message": "Esquema de pagos inicializado correctamente"})
    except Exception as e:
        return response(500, {"error": f"Error al inicializar BD: {str(e)}"})


# ── Handlers ──────────────────────────────────────────────────

def procesar_pago(event, context):
    """
    POST /pagos/procesar — Procesar pago de un ticket.

    Body para tarjeta:
    {
        "ticketId": "uuid",
        "monto": 396.00,
        "metodoPago": "tarjeta",
        "datosTarjeta": {
            "numero": "4242 4242 4242 4242",
            "cvv": "123",
            "mesVencimiento": "12",
            "anioVencimiento": "28",
            "nombreTitular": "Geraldo Colchado"
        }
    }

    Body para Yape:
    {
        "ticketId": "uuid",
        "monto": 396.00,
        "metodoPago": "yape",
        "datosYape": {
            "numeroCelular": "987654321",
            "codigoSeguridad": "123456"
        }
    }
    """
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")

        ticket_id   = body.get("ticketId")
        monto       = body.get("monto")
        metodo_pago = (body.get("metodoPago") or "").lower()

        if not all([ticket_id, monto, metodo_pago]):
            return response(400, {"error": "Campos requeridos: ticketId, monto, metodoPago"})

        if metodo_pago not in ["tarjeta", "yape"]:
            return response(400, {"error": "metodoPago debe ser 'tarjeta' o 'yape'"})

        pago_id = str(uuid.uuid4())

        # ── Procesar según método de pago ──
        if metodo_pago == "tarjeta":
            datos = body.get("datosTarjeta") or {}
            required_tarjeta = ["numero", "cvv", "mesVencimiento", "anioVencimiento", "nombreTitular"]
            for field in required_tarjeta:
                if not datos.get(field):
                    return response(400, {"error": f"Dato de tarjeta requerido: {field}"})

            resultado = simular_pasarela_tarjeta(
                datos["numero"],
                datos["cvv"],
                datos["mesVencimiento"],
                datos["anioVencimiento"],
                datos["nombreTitular"],
            )
            # Hash de datos sensibles (nunca guardar en claro)
            datos_hash = hashlib.sha256(datos["numero"].encode()).hexdigest()

        elif metodo_pago == "yape":
            datos = body.get("datosYape") or {}
            if not datos.get("numeroCelular") or not datos.get("codigoSeguridad"):
                return response(400, {"error": "Datos Yape requeridos: numeroCelular, codigoSeguridad"})

            resultado = simular_pasarela_yape(
                datos["numeroCelular"],
                datos["codigoSeguridad"],
            )
            datos_hash = hashlib.sha256(datos["numeroCelular"].encode()).hexdigest()

        estado = "aprobado" if resultado["aprobado"] else "rechazado"

        # Guardar transacción en Aurora
        sql(
            """
            INSERT INTO transacciones
              (pago_id, ticket_id, user_id, metodo_pago, monto, estado,
               codigo_autorizacion, descripcion_error, datos_pago_hash)
            VALUES
              (:pago_id, :ticket_id, :user_id, :metodo_pago, :monto, :estado,
               :codigo_autorizacion, :descripcion_error, :datos_pago_hash)
            """,
            [
                {"name": "pago_id",             "value": {"stringValue": pago_id}},
                {"name": "ticket_id",            "value": {"stringValue": ticket_id}},
                {"name": "user_id",              "value": {"stringValue": user["userId"]}},
                {"name": "metodo_pago",          "value": {"stringValue": metodo_pago}},
                {"name": "monto",                "value": {"doubleValue": float(monto)}},
                {"name": "estado",               "value": {"stringValue": estado}},
                {"name": "codigo_autorizacion",  "value": {"stringValue": resultado.get("codigoAutorizacion", "")}},
                {"name": "descripcion_error",    "value": {"stringValue": "" if resultado["aprobado"] else resultado["mensaje"]}},
                {"name": "datos_pago_hash",      "value": {"stringValue": datos_hash}},
            ],
        )

        if not resultado["aprobado"]:
            return response(402, {
                "error": resultado["mensaje"],
                "pagoId": pago_id,
                "estado": "rechazado",
            })

        return response(200, {
            "message": "Pago procesado exitosamente",
            "pagoId":             pago_id,
            "estado":             "aprobado",
            "codigoAutorizacion": resultado["codigoAutorizacion"],
            "monto":              monto,
            "metodoPago":         metodo_pago,
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_pago(event, context):
    """GET /pagos/{pagoId} — Consultar estado de un pago."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        pago_id = event.get("pathParameters", {}).get("pagoId")
        if not pago_id:
            return response(400, {"error": "pagoId requerido"})

        result = sql(
            """
            SELECT pago_id, ticket_id, metodo_pago, monto, moneda,
                   estado, codigo_autorizacion, created_at
            FROM transacciones
            WHERE pago_id = :pago_id AND user_id = :user_id
            """,
            [
                {"name": "pago_id", "value": {"stringValue": pago_id}},
                {"name": "user_id", "value": {"stringValue": user["userId"]}},
            ],
        )

        pagos = rows_to_dicts(result)
        if not pagos:
            return response(404, {"error": "Pago no encontrado"})

        return response(200, pagos[0])

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
