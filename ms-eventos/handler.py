"""
ms-eventos — Microservicio de Catálogo de Eventos
Boletealo · Cloud Computing UTEC
Handlers: list_eventos, get_evento, create_evento
"""

import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
EVENTOS_TABLE = os.environ["EVENTOS_TABLE"]
table = dynamodb.Table(EVENTOS_TABLE)


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


# Datos semilla para demo
SEED_EVENTOS = [
    {
        "eventoId": "evt-001",
        "nombre": "Bad Bunny World Tour Lima",
        "categoria": "concierto",
        "fecha": "2026-03-15",
        "hora": "20:00",
        "lugar": "Estadio Nacional",
        "ciudad": "Lima",
        "descripcion": "El reguetonero puertorriqueño llega a Lima con su gira mundial.",
        "imagen": "concierto",
        "precioDesde": Decimal("180"),
        "zonas": [
            {"nombre": "Tribuna Norte", "precio": Decimal("180"), "disponibles": 1200},
            {"nombre": "Tribuna Sur",   "precio": Decimal("180"), "disponibles": 1140},
            {"nombre": "VIP Campo",     "precio": Decimal("350"), "disponibles": 300},
        ],
        "activo": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "eventoId": "evt-002",
        "nombre": "Alianza Lima vs Universitario",
        "categoria": "deporte",
        "fecha": "2026-03-22",
        "hora": "15:30",
        "lugar": "Estadio Nacional",
        "ciudad": "Lima",
        "descripcion": "El clásico del fútbol peruano.",
        "imagen": "deporte",
        "precioDesde": Decimal("45"),
        "zonas": [
            {"nombre": "Oriente",   "precio": Decimal("45"),  "disponibles": 450},
            {"nombre": "Occidente", "precio": Decimal("80"),  "disponibles": 320},
            {"nombre": "Palco",     "precio": Decimal("150"), "disponibles": 120},
        ],
        "activo": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    {
        "eventoId": "evt-003",
        "nombre": "El Rey León — Musical",
        "categoria": "teatro",
        "fecha": "2026-04-01",
        "hora": "19:00",
        "lugar": "Teatro Municipal de Lima",
        "ciudad": "Lima",
        "descripcion": "El aclamado musical de Broadway llega al Teatro Municipal.",
        "imagen": "teatro",
        "precioDesde": Decimal("90"),
        "zonas": [
            {"nombre": "Platea",  "precio": Decimal("90"),  "disponibles": 80},
            {"nombre": "Balcón",  "precio": Decimal("120"), "disponibles": 40},
        ],
        "activo": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
]


def seed_if_empty():
    """Poblar tabla con datos de demo si está vacía."""
    result = table.scan(Limit=1)
    if result.get("Count", 0) == 0:
        with table.batch_writer() as batch:
            for evento in SEED_EVENTOS:
                batch.put_item(Item=evento)


# ── Handlers ──────────────────────────────────────────────────

def list_eventos(event, context):
    """GET /events — Listar eventos con filtros opcionales."""
    try:
        seed_if_empty()

        params = event.get("queryStringParameters") or {}
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
            items = result.get("Items", [])

        if ciudad:
            items = [e for e in items if e.get("ciudad", "").lower() == ciudad.lower()]

        # Ordenar por fecha
        items.sort(key=lambda x: x.get("fecha", ""))

        return response(200, {"eventos": items, "total": len(items)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_evento(event, context):
    """GET /events/{eventoId} — Detalle de un evento."""
    try:
        evento_id = event.get("pathParameters", {}).get("eventoId")
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
    """POST /events — Crear nuevo evento (uso interno/admin)."""
    try:
        body = json.loads(event.get("body") or "{}")

        required = ["nombre", "categoria", "fecha", "hora", "lugar", "ciudad", "precioDesde", "zonas"]
        for field in required:
            if not body.get(field):
                return response(400, {"error": f"Campo requerido: {field}"})

        evento_id = f"evt-{str(uuid.uuid4())[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "eventoId":    evento_id,
            "nombre":      body["nombre"],
            "categoria":   body["categoria"].lower(),
            "fecha":       body["fecha"],
            "hora":        body["hora"],
            "lugar":       body["lugar"],
            "ciudad":      body["ciudad"],
            "descripcion": body.get("descripcion", ""),
            "precioDesde": Decimal(str(body["precioDesde"])),
            "zonas":       body["zonas"],
            "activo":      True,
            "createdAt":   now,
        }

        table.put_item(Item=item)

        return response(201, {"message": "Evento creado exitosamente", "eventoId": evento_id, "evento": item})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
