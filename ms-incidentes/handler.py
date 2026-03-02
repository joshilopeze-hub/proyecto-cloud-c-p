"""
ms-incidentes — Microservicio de Reporte y Consulta de Incidentes
Boletealo · Cloud Computing UTEC
Base de datos: DynamoDB (documentos semi-estructurados + evidencias en S3)
Handlers: create_incidente, list_my_incidentes, get_incidente, get_upload_url
"""

import json
import os
import uuid
import hmac
import hashlib
import base64
import time
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
s3       = boto3.client("s3",        region_name="us-east-1")

INCIDENTES_TABLE  = os.environ["INCIDENTES_TABLE"]
EVIDENCIAS_BUCKET = os.environ["EVIDENCIAS_BUCKET"]
JWT_SECRET        = os.environ.get("JWT_SECRET", "boletealo-secret-local")

table = dynamodb.Table(INCIDENTES_TABLE)

ESTADOS_VALIDOS = ["abierto", "en_revision", "resuelto", "cerrado"]


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


# ── Handlers ──────────────────────────────────────────────────

def create_incidente(event, context):
    """POST /incidentes — Reportar un nuevo incidente."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")

        required = ["ticketId", "eventoNombre", "fechaIncidente", "horaIncidente", "lugar", "tipoProblema", "descripcion"]
        for field in required:
            if not body.get(field):
                return response(400, {"error": f"Campo requerido: {field}"})

        if len(body["descripcion"]) < 20:
            return response(400, {"error": "La descripción debe tener al menos 20 caracteres"})

        incidente_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "incidenteId":   incidente_id,
            "userId":        user["userId"],
            "userEmail":     user["email"],
            "userName":      user["nombre"],
            "ticketId":      body["ticketId"],
            "eventoNombre":  body["eventoNombre"],
            "fechaIncidente":body["fechaIncidente"],
            "horaIncidente": body["horaIncidente"],
            "lugar":         body["lugar"],
            "tipoProblema":  body["tipoProblema"],
            "descripcion":   body["descripcion"],
            "evidencias":    body.get("evidencias", []),  # lista de keys S3
            "estado":        "abierto",
            "createdAt":     now,
            "updatedAt":     now,
        }

        table.put_item(Item=item)

        return response(201, {
            "message": "Incidente reportado exitosamente. Nuestro equipo lo revisará en 3-5 días hábiles.",
            "incidenteId": incidente_id,
            "estado": "abierto",
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def list_my_incidentes(event, context):
    """GET /incidentes — Listar incidentes del usuario autenticado."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        result = table.query(
            IndexName="userId-index",
            KeyConditionExpression=Key("userId").eq(user["userId"]),
            ScanIndexForward=False,  # Más reciente primero
        )

        incidentes = result.get("Items", [])

        # Ocultar datos sensibles internos
        for i in incidentes:
            i.pop("userEmail", None)

        return response(200, {"incidentes": incidentes, "total": len(incidentes)})

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_incidente(event, context):
    """GET /incidentes/{incidenteId} — Detalle de un incidente."""
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        incidente_id = event.get("pathParameters", {}).get("incidenteId")
        if not incidente_id:
            return response(400, {"error": "incidenteId requerido"})

        result = table.get_item(Key={"incidenteId": incidente_id})
        incidente = result.get("Item")

        if not incidente:
            return response(404, {"error": "Incidente no encontrado"})

        # Verificar que pertenece al usuario
        if incidente["userId"] != user["userId"]:
            return response(403, {"error": "No tienes permiso para ver este incidente"})

        # Generar URLs pre-firmadas para evidencias
        if incidente.get("evidencias"):
            evidencias_con_url = []
            for key in incidente["evidencias"]:
                try:
                    url = s3.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": EVIDENCIAS_BUCKET, "Key": key},
                        ExpiresIn=3600,
                    )
                    evidencias_con_url.append({"key": key, "url": url})
                except Exception:
                    evidencias_con_url.append({"key": key, "url": None})
            incidente["evidencias"] = evidencias_con_url

        return response(200, incidente)

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def get_upload_url(event, context):
    """
    POST /incidentes/upload-url — Generar URL pre-firmada para subir evidencia a S3.
    El frontend sube el archivo directamente a S3 con PUT, luego incluye el key en create_incidente.
    """
    try:
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Autenticación requerida"})

        body = json.loads(event.get("body") or "{}")
        nombre_archivo = body.get("nombreArchivo", "evidencia")
        content_type   = body.get("contentType", "image/jpeg")

        tipos_permitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]
        if content_type not in tipos_permitidos:
            return response(400, {"error": f"Tipo de archivo no permitido. Usar: {', '.join(tipos_permitidos)}"})

        extension = nombre_archivo.rsplit(".", 1)[-1] if "." in nombre_archivo else "jpg"
        s3_key = f"evidencias/{user['userId']}/{uuid.uuid4()}.{extension}"

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket":      EVIDENCIAS_BUCKET,
                "Key":         s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=300,  # 5 minutos para subir
        )

        return response(200, {
            "uploadUrl": upload_url,
            "s3Key":     s3_key,
            "expiraEn":  "5 minutos",
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
