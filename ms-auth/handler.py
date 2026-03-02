"""
ms-auth — Microservicio de autenticación
Boletealo · Cloud Computing UTEC
Handlers: register, login, me
"""

import json
import os
import uuid
import hashlib
import hmac
import base64
import time
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr

# ── Clientes AWS ──────────────────────────────────────────────
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
ssm = boto3.client("ssm", region_name="us-east-1")

USERS_TABLE = os.environ["USERS_TABLE"]
JWT_SECRET  = os.environ.get("JWT_SECRET", "boletealo-secret-local")

table = dynamodb.Table(USERS_TABLE)


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


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored: str) -> bool:
    salt, hashed = stored.split(":")
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed


def create_jwt(payload: dict) -> str:
    """JWT manual (sin librería externa) — Header.Payload.Signature en base64url."""
    header  = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    payload["iat"] = int(time.time())
    payload["exp"] = int(time.time()) + 86400  # 24h
    body    = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    sig_input = f"{header}.{body}".encode()
    sig     = hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()
    signature = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
    return f"{header}.{body}.{signature}"


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


def get_token_from_event(event: dict) -> str | None:
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


# ── Handlers ──────────────────────────────────────────────────

def register(event, context):
    """POST /auth/register — Registrar nuevo usuario."""
    try:
        body = json.loads(event.get("body") or "{}")
        nombre   = (body.get("nombre") or "").strip()
        apellidos= (body.get("apellidos") or "").strip()
        email    = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not all([nombre, apellidos, email, password]):
            return response(400, {"error": "Todos los campos son requeridos: nombre, apellidos, email, password"})

        if len(password) < 6:
            return response(400, {"error": "La contraseña debe tener al menos 6 caracteres"})

        # Verificar email único
        existing = table.query(
            IndexName="email-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("email").eq(email),
        )
        if existing.get("Count", 0) > 0:
            return response(409, {"error": "Este correo ya está registrado"})

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        table.put_item(Item={
            "userId":    user_id,
            "email":     email,
            "nombre":    nombre,
            "apellidos": apellidos,
            "password":  hash_password(password),
            "createdAt": now,
        })

        token = create_jwt({"userId": user_id, "email": email, "nombre": nombre})

        return response(201, {
            "message": "Usuario registrado exitosamente",
            "token": token,
            "user": {"userId": user_id, "email": email, "nombre": nombre, "apellidos": apellidos},
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def login(event, context):
    """POST /auth/login — Iniciar sesión."""
    try:
        body = json.loads(event.get("body") or "{}")
        email    = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return response(400, {"error": "Email y contraseña son requeridos"})

        result = table.query(
            IndexName="email-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("email").eq(email),
        )

        if result.get("Count", 0) == 0:
            return response(401, {"error": "Credenciales incorrectas"})

        user = result["Items"][0]

        if not verify_password(password, user["password"]):
            return response(401, {"error": "Credenciales incorrectas"})

        token = create_jwt({
            "userId":    user["userId"],
            "email":     user["email"],
            "nombre":    user["nombre"],
        })

        return response(200, {
            "message": "Login exitoso",
            "token": token,
            "user": {
                "userId":    user["userId"],
                "email":     user["email"],
                "nombre":    user["nombre"],
                "apellidos": user.get("apellidos", ""),
            },
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})


def me(event, context):
    """GET /auth/me — Obtener perfil del usuario autenticado."""
    try:
        token = get_token_from_event(event)
        if not token:
            return response(401, {"error": "Token requerido"})

        payload = decode_jwt(token)
        if not payload:
            return response(401, {"error": "Token inválido o expirado"})

        result = table.get_item(Key={"userId": payload["userId"]})
        user = result.get("Item")
        if not user:
            return response(404, {"error": "Usuario no encontrado"})

        return response(200, {
            "userId":    user["userId"],
            "email":     user["email"],
            "nombre":    user["nombre"],
            "apellidos": user.get("apellidos", ""),
            "createdAt": user.get("createdAt", ""),
        })

    except Exception as e:
        return response(500, {"error": f"Error interno: {str(e)}"})
