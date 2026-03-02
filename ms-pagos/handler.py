"""
ms-pagos — Microservicio de Procesamiento de Pagos
Boletealo · Cloud Computing UTEC
Base de datos: DynamoDB
Métodos de pago: Tarjeta de crédito / Yape (simulados)
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
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

PAGOS_TABLE = os.environ["PAGOS_TABLE"]
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


def simular_pasarela_tarjeta(numero, cvv, nombre):
    numero_limpio = re.sub(r"\s|-", "", numero)
    if len(numero_limpio) != 16 or not numero_limpio.isdigit():
        return {"aprobado": False, "mensaje": "Número de tarjeta inválido"}
    if numero_limpio.endswith("0000"):
        return {"aprobado": False, "mensaje": "Tarjeta rechazada por el banco"}
    if not cvv or len(cvv) not in [3, 4]:
        return {"aprobado": False, "mensaje": "CVV inválido"}
    codigo = uuid.uuid4().hex[:8].upper()
    return {"aprobado": True, "codigoAutorizacion": codigo, "mensaje": "Pago aprobado"}


def simular_pasarela_yape(numero_celular, codigo_seguridad):
    celular = re.sub(r"\s|-", "", numero_celular)
    if len(celular) != 9 or not celular.isdigit():
        return {"aprobado": False, "mensaje": "Número de celular inválido (9 dígitos)"}
    if celular.endswith("0000"):
        return {"aprobado": False, "mensaje": "Yape rechazado — saldo insuficiente"}
    if not codigo_seguridad or len(codigo_seguridad) != 6:
        return {"aprobado": False, "mensaje": "Código de seguridad Yape inválido"}
    codigo = f"YAPE-{uuid.uuid4().hex[:6].upper()}"
    return {"aprobado": True, "codigoAutorizacion": codigo, "mensaje": "Pago Yape aprobado"}


def procesar_pago(event, context):
    """POST /pagos/procesar — Procesar pago de un ticket."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")

        ticket_id = body.get("ticket_id")
        monto = body.get("monto")
        metodo = (body.get("metodo") or "").lower()

        if not all([ticket_id, monto, metodo]):
            return response(400, {"error": "Campos requeridos: ticket_id, monto, metodo"})

        if metodo not in ["tarjeta", "yape"]:
            return response(400, {"error": "metodo debe ser 'tarjeta' o 'yape'"})

        if metodo == "tarjeta":
            numero = body.get("numero_tarjeta", "")
            cvv = body.get("cvv", "")
            nombre = body.get("nombre_tarjeta", "")
            resultado = simular_pasarela_tarjeta(numero, cvv, nombre)
            datos_hash = hashlib.sha256(numero.encode()).hexdigest()
        else:
            numero_yape = body.get("numero_yape", "")
            codigo_yape = body.get("codigo_yape", "")
            resultado = simular_pasarela_yape(numero_yape, codigo_yape)
            datos_hash = hashlib.sha256(numero_yape.encode()).hexdigest()

        estado = "aprobado" if resultado["aprobado"] else "rechazado"
        pago_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        table = dynamodb.Table(PAGOS_TABLE)
        table.put_item(Item={
            "pagoId": pago_id,
            "ticketId": ticket_id,
            "userId": user["userId"],
            "metodoPago": metodo,
            "monto": Decimal(str(monto)),
            "moneda": "PEN",
            "estado": estado,
            "codigoAutorizacion": resultado.get("codigoAutorizacion", ""),
            "descripcionError": "" if resultado["aprobado"] else resultado["mensaje"],
            "datosPagoHash": datos_hash,
            "createdAt": now,
        })

        if not resultado["aprobado"]:
            return response(402, {
                "error": resultado["mensaje"],
                "pago": {"pago_id": pago_id, "estado": "rechazado", "descripcion_error": resultado["mensaje"]},
            })

        return response(200, {
            "message": "Pago procesado exitosamente",
            "pago": {
                "pago_id": pago_id,
                "ticket_id": ticket_id,
                "estado": "aprobado",
                "codigo_autorizacion": resultado["codigoAutorizacion"],
                "monto": float(monto),
                "metodo_pago": metodo,
                "created_at": now,
            },
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_pago(event, context):
    """GET /pagos/{pagoId} — Consultar estado de un pago."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        pago_id = (event.get("pathParameters") or {}).get("pagoId")
        if not pago_id:
            return response(400, {"error": "pagoId requerido"})

        table = dynamodb.Table(PAGOS_TABLE)
        result = table.get_item(Key={"pagoId": pago_id})
        item = result.get("Item")

        if not item or item.get("userId") != user["userId"]:
            return response(404, {"error": "Pago no encontrado"})

        return response(200, {
            "pago_id": item.get("pagoId"),
            "ticket_id": item.get("ticketId"),
            "metodo_pago": item.get("metodoPago"),
            "monto": float(item.get("monto", 0)),
            "moneda": item.get("moneda"),
            "estado": item.get("estado"),
            "codigo_autorizacion": item.get("codigoAutorizacion"),
            "created_at": item.get("createdAt"),
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
