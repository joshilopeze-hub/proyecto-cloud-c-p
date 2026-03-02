"""
ms-tickets — Microservicio de Compra y Consulta de Tickets
Boletealo · Cloud Computing UTEC
Base de datos: DynamoDB
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
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
ses = boto3.client("ses", region_name="us-east-1")

TICKETS_TABLE = os.environ["TICKETS_TABLE"]
JWT_SECRET = os.environ.get("JWT_SECRET", "boletealo-secret-local")


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def decode_jwt(token):
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


def get_user_from_event(event):
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    return decode_jwt(auth[7:])


def generate_qr_code(ticket_id):
    return f"BLT-{ticket_id[:8].upper()}"


def buy_ticket(event, context):
    """POST /tickets — Comprar tickets para un evento."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")

        evento_id = body.get("evento_id")
        zona = body.get("zona")
        cantidad = int(body.get("cantidad", 1))

        if not evento_id or not zona:
            return response(400, {"error": "Campos requeridos: evento_id, zona"})

        if cantidad < 1 or cantidad > 10:
            return response(400, {"error": "La cantidad debe estar entre 1 y 10"})

        # Obtener info del evento desde ms-eventos
        ms_eventos_url = os.environ.get("MS_EVENTOS_URL", "")
        evento_nombre = body.get("evento_nombre", "Evento")
        evento_fecha = body.get("evento_fecha", "")
        evento_lugar = body.get("evento_lugar", "")
        precio_unit = Decimal(str(body.get("precio_unit", 0)))
        precio_total = precio_unit * cantidad

        ticket_id = str(uuid.uuid4())
        qr_code = generate_qr_code(ticket_id)
        now = datetime.now(timezone.utc).isoformat()

        table = dynamodb.Table(TICKETS_TABLE)
        table.put_item(Item={
            "ticketId": ticket_id,
            "userId": user["userId"],
            "eventoId": evento_id,
            "eventoNombre": evento_nombre,
            "eventoFecha": evento_fecha,
            "eventoLugar": evento_lugar,
            "zona": zona,
            "cantidad": cantidad,
            "precioUnit": precio_unit,
            "precioTotal": precio_total,
            "qrCode": qr_code,
            "estado": "activo",
            "createdAt": now,
        })

        # Alias para compatibilidad con frontend
        ticket = {
            "ticket_id": ticket_id,
            "user_id": user["userId"],
            "evento_id": evento_id,
            "evento_nombre": evento_nombre,
            "evento_fecha": evento_fecha,
            "evento_lugar": evento_lugar,
            "zona": zona,
            "cantidad": cantidad,
            "precio_unit": float(precio_unit),
            "precio_total": float(precio_total),
            "qr_code": qr_code,
            "estado": "activo",
            "created_at": now,
        }

        return response(201, {"message": "Ticket comprado exitosamente", "ticket": ticket})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def list_my_tickets(event, context):
    """GET /tickets — Listar tickets del usuario autenticado."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        table = dynamodb.Table(TICKETS_TABLE)
        result = table.query(
            IndexName="userId-index",
            KeyConditionExpression=Key("userId").eq(user["userId"]),
        )

        tickets = []
        for item in result.get("Items", []):
            tickets.append({
                "ticket_id": item.get("ticketId"),
                "user_id": item.get("userId"),
                "evento_id": item.get("eventoId"),
                "evento_nombre": item.get("eventoNombre"),
                "evento_fecha": item.get("eventoFecha"),
                "evento_lugar": item.get("eventoLugar"),
                "zona": item.get("zona"),
                "cantidad": item.get("cantidad"),
                "precio_unit": float(item.get("precioUnit", 0)),
                "precio_total": float(item.get("precioTotal", 0)),
                "qr_code": item.get("qrCode"),
                "estado": item.get("estado"),
                "created_at": item.get("createdAt"),
            })

        tickets.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return response(200, {"tickets": tickets, "total": len(tickets)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_ticket(event, context):
    """GET /tickets/{ticketId} — Detalle de un ticket."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        ticket_id = (event.get("pathParameters") or {}).get("ticketId")
        if not ticket_id:
            return response(400, {"error": "ticketId requerido"})

        table = dynamodb.Table(TICKETS_TABLE)
        result = table.get_item(Key={"ticketId": ticket_id})
        item = result.get("Item")

        if not item or item.get("userId") != user["userId"]:
            return response(404, {"error": "Ticket no encontrado"})

        ticket = {
            "ticket_id": item.get("ticketId"),
            "user_id": item.get("userId"),
            "evento_id": item.get("eventoId"),
            "evento_nombre": item.get("eventoNombre"),
            "evento_fecha": item.get("eventoFecha"),
            "evento_lugar": item.get("eventoLugar"),
            "zona": item.get("zona"),
            "cantidad": item.get("cantidad"),
            "precio_unit": float(item.get("precioUnit", 0)),
            "precio_total": float(item.get("precioTotal", 0)),
            "qr_code": item.get("qrCode"),
            "estado": item.get("estado"),
            "created_at": item.get("createdAt"),
        }

        return response(200, {"ticket": ticket})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
