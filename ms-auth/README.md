# ms-auth — Microservicio de Autenticación

Gestiona el registro, login y verificación de usuarios de Boletealo.

## Base de datos
- **DynamoDB** — Tabla `usuarios` con GSI por email

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Iniciar sesión, retorna JWT | No |
| GET  | `/auth/me` | Perfil del usuario autenticado | Sí |

## Ejemplos de uso

### Registro
```bash
curl -X POST https://{API_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Geraldo",
    "apellidos": "Colchado Rios",
    "email": "geraldo@gmail.com",
    "password": "mipassword123"
  }'
```

### Login
```bash
curl -X POST https://{API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "geraldo@gmail.com", "password": "mipassword123"}'
```

### Mi perfil
```bash
curl https://{API_URL}/auth/me \
  -H "Authorization: Bearer {TOKEN}"
```

## Despliegue

```bash
# Primero crear el secret en SSM
aws ssm put-parameter \
  --name /boletealo/jwt_secret \
  --value "tu-secret-seguro-aqui-$(openssl rand -hex 16)" \
  --type SecureString

# Instalar plugin
npm install -g serverless-python-requirements

# Desplegar
serverless deploy

# Ver logs
serverless logs -f register
serverless logs -f login
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `USERS_TABLE` | Nombre de la tabla DynamoDB |
| `JWT_SECRET` | Secret para firmar JWT (desde SSM) |
