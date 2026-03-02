"""
ms-eventos — Microservicio de Catálogo de Eventos
Boletealo · Cloud Computing UTEC
Handlers: list_eventos, get_evento, create_evento, list_mis_eventos
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
from boto3.dynamodb.conditions import Key, Attr

dynamodb     = boto3.resource("dynamodb", region_name="us-east-1")
EVENTOS_TABLE = os.environ["EVENTOS_TABLE"]
JWT_SECRET    = os.environ.get("JWT_SECRET", "boletealo-secret-local")
table         = dynamodb.Table(EVENTOS_TABLE)


# ── Helpers ───────────────────────────────────────────────────

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def decode_jwt(token: str):
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        sig_input    = f"{header_b64}.{payload_b64}".encode()
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


# Datos semilla para demo
SEED_EVENTOS = [
    {
        "eventoId":    "evt-001",
        "nombre":      "Bad Bunny World Tour Lima",
        "categoria":   "concierto",
        "fecha":       "2026-03-15",
        "hora":        "20:00",
        "lugar":       "Estadio Nacional",
        "ciudad":      "Lima",
        "descripcion": "El reguetonero puertorriqueño llega a Lima con su gira mundial.",
        "precioDesde": Decimal("180"),
        "vendedorId":  "seed",
        "zonas": [
            {"nombre": "Tribuna Norte", "precio": Decimal("180"), "disponibles": 1200},
            {"nombre": "Tribuna Sur",   "precio": Decimal("180"), "disponibles": 1140},
            {"nombre": "VIP Campo",     "precio": Decimal("350"), "disponibles": 300},
        ],
        "activo":    True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "eventoId":    "evt-002",
        "nombre":      "Alianza Lima vs Universitario",
        "categoria":   "deporte",
        "fecha":       "2026-03-22",
        "hora":        "15:30",
        "lugar":       "Estadio Nacional",
        "ciudad":      "Lima",
        "descripcion": "El clásico del fútbol peruano.",
        "precioDesde": Decimal("45"),
        "vendedorId":  "seed",
        "zonas": [
            {"nombre": "Oriente",   "precio": Decimal("45"),  "disponibles": 450},
            {"nombre": "Occidente", "precio": Decimal("80"),  "disponibles": 320},
            {"nombre": "Palco",     "precio": Decimal("150"), "disponibles": 120},
        ],
        "activo":    True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "eventoId":    "evt-003",
        "nombre":      "El Rey León — Musical",
        "categoria":   "teatro",
        "fecha":       "2026-04-01",
        "hora":        "19:00",
        "lugar":       "Teatro Municipal de Lima",
        "ciudad":      "Lima",
        "descripcion": "El aclamado musical de Broadway llega al Teatro Municipal.",
        "precioDesde": Decimal("90"),
        "vendedorId":  "seed",
        "zonas": [
            {"nombre": "Platea", "precio": Decimal("90"),  "disponibles": 80},
            {"nombre": "Balcón", "precio": Decimal("120"), "disponibles": 40},
        ],
        "activo":    True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
]


def seed_if_empty():
    result = table.scan(Limit=1)
    if result.get("Count", 0) == 0:
        with table.batch_writer() as batch:
            for evento in SEED_EVENTOS:
                batch.put_item(Item=evento)


# ── Handlers ──────────────────────────────────────────────────

def list_eventos(event, context):
    """GET /events — Listar eventos activos con filtros opcionales."""
    try:
        seed_if_empty()

        params    = event.get("queryStringParameters") or {}
        categoria = params.get("categoria")
        ciudad    = params.get("ciudad")

        if categoria:
            result = table.query(
                IndexName="categoria-index",
                KeyConditionExpression=Key("categoria").eq(categoria.lower()),
                FilterExpression=Attr("activo").eq(True),
            )
            items = result.get("Items", [])
        else:
            result = table.scan(FilterExpression=Attr("activo").eq(True))
            items  = result.get("Items", [])

        if ciudad:
            items = [e for e in items if e.get("ciudad", "").lower() == ciudad.lower()]

        items.sort(key=lambda x: x.get("fecha", ""))
        return response(200, {"eventos": items, "total": len(items)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_evento(event, context):
    """GET /events/{eventoId} — Detalle de un evento."""
    try:
        evento_id = (event.get("pathParameters") or {}).get("eventoId")
        if not evento_id:
            return response(400, {"error": "eventoId requerido"})

        result = table.get_item(Key={"eventoId": evento_id})
        evento = result.get("Item")
        if not evento:
            return response(404, {"error": "Evento no encontrado"})

        return response(200, evento)

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def create_evento(event, context):
    """POST /events — Crear evento (solo vendedores autenticados)."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})
        if user.get("rol") != "vendedor":
            return response(403, {"error": "Solo los vendedores pueden crear eventos"})

        body = json.loads(event.get("body") or "{}")

        required = ["nombre", "categoria", "fecha", "hora", "lugar", "ciudad", "zonas"]
        for field in required:
            if not body.get(field):
                return response(400, {"error": f"Campo requerido: {field}"})

        zonas = body["zonas"]
        if not isinstance(zonas, list) or len(zonas) == 0:
            return response(400, {"error": "Debe incluir al menos una zona"})

        for z in zonas:
            if not z.get("nombre") or not z.get("precio") or not z.get("disponibles"):
                return response(400, {"error": "Cada zona requiere: nombre, precio, disponibles"})

        # Convertir precios a Decimal y calcular precio mínimo
        zonas_decimal = []
        for z in zonas:
            zonas_decimal.append({
                "nombre":      z["nombre"],
                "precio":      Decimal(str(z["precio"])),
                "disponibles": int(z["disponibles"]),
            })

        precio_desde = min(Decimal(str(z["precio"])) for z in zonas)
        evento_id    = f"evt-{str(uuid.uuid4())[:8]}"
        now          = datetime.now(timezone.utc).isoformat()

        item = {
            "eventoId":    evento_id,
            "nombre":      body["nombre"].strip(),
            "categoria":   body["categoria"].lower().strip(),
            "fecha":       body["fecha"],
            "hora":        body["hora"],
            "lugar":       body["lugar"].strip(),
            "ciudad":      body["ciudad"].strip(),
            "descripcion": (body.get("descripcion") or "").strip(),
            "precioDesde": precio_desde,
            "zonas":       zonas_decimal,
            "vendedorId":  user["userId"],
            "vendedorNombre": user.get("nombre", ""),
            "activo":      True,
            "createdAt":   now,
        }

        table.put_item(Item=item)

        return response(201, {
            "message":  "Evento creado exitosamente",
            "eventoId": evento_id,
            "evento":   item,
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def list_mis_eventos(event, context):
    """GET /events/mis-eventos — Eventos creados por el vendedor autenticado."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})
        if user.get("rol") != "vendedor":
            return response(403, {"error": "Solo los vendedores pueden ver sus eventos"})

        result = table.scan(
            FilterExpression=Attr("vendedorId").eq(user["userId"])
        )
        items = result.get("Items", [])
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return response(200, {"eventos": items, "total": len(items)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def toggle_evento(event, context):
    """PATCH /events/{eventoId}/toggle — Activar/desactivar evento (solo el dueño)."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        evento_id = (event.get("pathParameters") or {}).get("eventoId")
        result    = table.get_item(Key={"eventoId": evento_id})
        evento    = result.get("Item")

        if not evento:
            return response(404, {"error": "Evento no encontrado"})
        if evento.get("vendedorId") != user["userId"]:
            return response(403, {"error": "No tienes permiso para modificar este evento"})

        nuevo_estado = not evento.get("activo", True)
        table.update_item(
            Key={"eventoId": evento_id},
            UpdateExpression="SET activo = :a",
            ExpressionAttributeValues={":a": nuevo_estado},
        )

        return response(200, {
            "message": f"Evento {'activado' if nuevo_estado else 'desactivado'}",
            "activo":  nuevo_estado,
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
