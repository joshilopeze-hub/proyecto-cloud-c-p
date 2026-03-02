# 🎟️ Boletealo — Plataforma de Venta de Tickets Online

Aplicación web serverless para la compra de tickets de eventos (conciertos, deportes, teatro, festivales) con pago integrado y gestión de incidentes.

**Desarrollado para:** Cloud Computing · Maestría en Ciencia de Datos · UTEC
**Arquitectura:** 100% Serverless en AWS
**URL del sistema:** `http://boletealo-frontend-dev.s3-website-us-east-1.amazonaws.com`

---

## 🏗️ Arquitectura

```
Usuario (Navegador)
       │
       ▼
┌──────────────────────────────────────┐
│  S3 Static Website (React 18 + Vite) │
└──────────────────────────────────────┘
       │ API calls (HTTPS)
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Gateway (HTTP API)                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ │
│  │ ms-auth │ │ms-eventos│ │ms-tickets│ │ms-pagos│ │ms-inc │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬───┘ │
│       │           │            │            │           │      │
│  ┌────▼────┐ ┌────▼─────┐ ┌───▼──────┐ ┌───▼────┐ ┌───▼───┐ │
│  │ Lambda  │ │  Lambda  │ │  Lambda  │ │ Lambda │ │Lambda │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬───┘ │
└───────┼───────────┼────────────┼────────────┼───────────┼─────┘
        │           │            │            │           │
   DynamoDB    DynamoDB     DynamoDB     DynamoDB    DynamoDB
   (Users)     (Eventos)    (Tickets)    (Pagos)   (Incidentes)
                                │                      │
                         [decrementa]              S3 Bucket
                         disponibles              (Evidencias)
                                │
                    SSM Parameter Store
                    (JWT_SECRET, URLs)
```

Ver diagrama completo en: [`boletealo-architecture.drawio`](./boletealo-architecture.drawio)
Abrir en: [app.diagrams.net](https://app.diagrams.net) → File → Open

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite, React Router v6 |
| Hosting frontend | AWS S3 Static Website Hosting |
| Backend | Python 3.10 en AWS Lambda |
| API | AWS API Gateway HTTP API (CORS habilitado) |
| Base de datos | AWS DynamoDB (5 tablas, PAY_PER_REQUEST) |
| Autenticación | JWT HS256 (implementación manual sin librerías externas) |
| Almacenamiento archivos | AWS S3 (evidencias de incidentes, Presigned URLs) |
| Configuración/Secretos | AWS SSM Parameter Store |
| Infraestructura como código | Serverless Framework v4 |
| Repositorio | GitHub |
| Terminal de deploy | EC2 t2.micro (solo para ejecutar `serverless deploy`) |

---

## 📦 Microservicios

### ms-auth — Autenticación
**URL base:** `https://v3mcdp3bea.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Registrar usuario (nombre, apellidos, email, password) |
| POST | `/auth/login` | ❌ | Iniciar sesión → devuelve JWT 24h |
| GET | `/auth/me` | ✅ | Perfil del usuario autenticado |

---

### ms-eventos — Gestión de Eventos
**URL base:** `https://kkuok1iccg.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/events` | ❌ | Listar eventos (filtro: `?categoria=concierto`) |
| GET | `/events/{eventoId}` | ❌ | Detalle + zonas disponibles |
| POST | `/events` | ❌ | Crear evento |

Categorías: `concierto` · `deporte` · `teatro` · `festival`

---

### ms-tickets — Compra y Cancelación de Tickets
**URL base:** `https://s5fqc1t2j0.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/tickets` | ✅ | Comprar tickets (descuenta disponibles en Eventos) |
| GET | `/tickets` | ✅ | Mis tickets |
| GET | `/tickets/{ticketId}` | ✅ | Detalle de ticket + QR |
| DELETE | `/tickets/{ticketId}` | ✅ | Cancelar ticket (restaura disponibles) |

---

### ms-pagos — Procesamiento de Pagos
**URL base:** `https://qpbrdqcex3.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/pagos/procesar` | ✅ | Procesar pago (Tarjeta o Yape, simulado) |
| GET | `/pagos/{pagoId}` | ✅ | Detalle de pago |

---

### ms-incidentes — Reportes de Incidentes
**URL base:** `https://7a8ssnyqof.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/incidentes` | ✅ | Crear incidente con referencia a ticket |
| GET | `/incidentes` | ✅ | Mis incidentes |
| GET | `/incidentes/{incidenteId}` | ✅ | Detalle de incidente |
| POST | `/incidentes/upload-url` | ✅ | Presigned URL para subir evidencia a S3 |

---

## 📁 Estructura del proyecto

```
boletealo/
├── frontend/                       # React 18 + Vite
│   ├── index.html
│   └── src/
│       ├── config/api.js           # URLs de microservicios + safeFetch helper
│       ├── App.jsx                 # Rutas + AuthContext
│       ├── pages/
│       │   ├── Landing.jsx         # Hero + categorías + features
│       │   ├── Login.jsx           # Formulario de login
│       │   ├── Registro.jsx        # Formulario de registro
│       │   ├── Eventos.jsx         # Grid de eventos + filtros + contador disponibles
│       │   ├── ComprarTicket.jsx   # Flujo 4 pasos: Evento→Zona→Pago→Confirmación
│       │   ├── MisTickets.jsx      # Historial de tickets + botón cancelar
│       │   ├── ReportarIncidente.jsx
│       │   └── MisIncidentes.jsx
│       └── components/
│           ├── Navbar.jsx
│           └── Sidebar.jsx
├── ms-auth/
│   ├── handler.py
│   └── serverless.yml
├── ms-eventos/
│   ├── handler.py
│   └── serverless.yml
├── ms-tickets/
│   ├── handler.py
│   └── serverless.yml
├── ms-pagos/
│   ├── handler.py
│   └── serverless.yml
├── ms-incidentes/
│   ├── handler.py
│   └── serverless.yml
├── boletealo-architecture.drawio   # Diagrama de arquitectura AWS
└── README.md
```

---

## 🚀 Despliegue desde cero

### 1. Requisitos en EC2
```bash
node --version   # 18+
python3 --version  # 3.10
npm install -g serverless
```

### 2. Clonar repositorio
```bash
git clone https://github.com/joshilopeze-hub/proyecto-cloud-c-p.git boletealo
cd boletealo
```

### 3. Crear parámetros SSM
```bash
aws ssm put-parameter --name /boletealo/jwt_secret \
  --value "mi-secreto-seguro-aqui" --type SecureString

# Ejecutar DESPUÉS de desplegar ms-eventos y ms-tickets:
aws ssm put-parameter --name /boletealo/ms_eventos_url --value "https://URL_EVENTOS" --type String
aws ssm put-parameter --name /boletealo/ms_tickets_url --value "https://URL_TICKETS" --type String
aws ssm put-parameter --name /boletealo/ms_pagos_url   --value "https://URL_PAGOS"   --type String
```

### 4. Desplegar microservicios
```bash
for ms in ms-auth ms-eventos ms-tickets ms-pagos ms-incidentes; do
  cd $ms
  npm install serverless-python-requirements
  serverless deploy
  cd ..
done
```

### 5. Desplegar frontend
```bash
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://boletealo-frontend-dev/ --delete
```

---

## 🔄 Re-despliegue (sesiones Vocareum)

Las credenciales AWS expiran cada 4 horas. Al iniciar nueva sesión:

```bash
# 1. Actualizar credenciales
nano ~/.aws/credentials
# Pegar: aws_access_key_id, aws_secret_access_key, aws_session_token desde Vocareum

# 2. Verificar
aws sts get-caller-identity

# 3. Re-desplegar solo lo que cambió
cd ~/boletealo && git pull origin main

# Si cambió ms-tickets:
cd ms-tickets && serverless deploy && cd ..

# Siempre al cambiar frontend:
cd frontend && rm -rf dist/ && npm run build && \
  aws s3 sync dist/ s3://boletealo-frontend-dev/ --delete
```

> **Nota:** La URL del sitio web en S3 no cambia entre sesiones. Solo las credenciales del CLI expiran.

---

## 🔐 Seguridad

- Passwords hasheados con SHA-256 + salt aleatorio de 16 bytes
- JWT HS256 con expiración de 24h, almacenado en `localStorage`
- CORS `*` habilitado en todos los endpoints (API Gateway + Lambda)
- Rutas privadas protegidas con `<PrivateRoute>` en el frontend
- Secretos gestionados en SSM Parameter Store (no hardcodeados en código)
- Presigned URLs para subida directa de archivos a S3 (sin pasar por Lambda)

---

## 💳 Métodos de pago

| Método | Campos |
|--------|--------|
| Tarjeta | Número 16 dígitos, CVV, nombre titular |
| Yape | Número de celular (9 dígitos), código de seguridad (6 dígitos) |

> Los pagos son **simulados** — no se conectan a pasarelas reales.

---

## ✅ Funcionalidades implementadas

- [x] Registro e inicio de sesión con JWT
- [x] Listado de eventos con filtro por categoría
- [x] Contador de entradas disponibles por zona (actualizado en tiempo real)
- [x] Color de alerta cuando quedan menos de 50 entradas
- [x] Flujo de compra en 4 pasos: Evento → Zona → Pago → Confirmación QR
- [x] Descuento automático de disponibles al comprar
- [x] Cancelación de tickets (restaura disponibles automáticamente)
- [x] Reporte de incidentes con adjunto de evidencia (upload a S3)
- [x] Historial de tickets e incidentes por usuario
- [x] Fechas formateadas (`15 Mar 2026` en vez de `2026-03-15`)
- [x] Banners por categoría con colores diferenciados
