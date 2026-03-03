# 🎟️ Boletealo — Plataforma de Venta de Tickets Online

Aplicación web serverless para la compra y gestión de tickets de eventos (conciertos, deportes, teatro, festivales) con roles de comprador y vendedor, pago integrado y gestión de incidentes.

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
              │   Comprador ──────── Vendedor         │
              └──────────────────────────────────────┘
                               │ API calls (HTTPS + JWT)
           ┌───────────────────┼────────────────────────┐
           ▼                   ▼                        ▼
      ms-auth             ms-eventos              ms-tickets
   API GW + Lambda       API GW + Lambda         API GW + Lambda
   DynamoDB (Users)      DynamoDB (Eventos)      DynamoDB (Tickets)
                                │                       │
                          ms-pagos              ms-incidentes
                         API GW + Lambda        API GW + Lambda
                         DynamoDB (Pagos)       DynamoDB (Incidentes)
                                                    S3 (Evidencias)

              SSM Parameter Store (JWT_SECRET, URLs inter-servicios)
              IAM Role LabRole (asumido por todas las Lambdas)
              CloudFormation (gestiona los 5 stacks)
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
| Autorización | Roles en JWT: `comprador` / `vendedor` |
| Almacenamiento archivos | AWS S3 (evidencias de incidentes, Presigned URLs) |
| Configuración/Secretos | AWS SSM Parameter Store |
| Infraestructura como código | Serverless Framework v4 |
| Repositorio | GitHub |
| Terminal de deploy | EC2 t2.micro (solo para ejecutar `serverless deploy`) |

---

## 👥 Roles de usuario

### 🎫 Comprador
- Ver catálogo de eventos con filtros y disponibilidad en tiempo real
- Comprar tickets (descuenta disponibles automáticamente)
- Ver historial de tickets con código QR
- Cancelar tickets activos (restaura disponibles)
- Reportar incidentes con evidencia fotográfica

### 🏪 Vendedor
- Crear eventos con múltiples zonas y precios
- Ver dashboard de sus propios eventos con stats
- Activar / desactivar eventos publicados
- Gestión completa del inventario de entradas por zona

---

## 📦 Microservicios

### ms-auth — Autenticación y Roles
**URL base:** `https://v3mcdp3bea.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/auth/register` | ❌ | — | Registrar usuario. Body: `nombre, apellidos, email, password, rol` (`comprador`\|`vendedor`) |
| POST | `/auth/login` | ❌ | — | Iniciar sesión → devuelve JWT 24h con campo `rol` |
| GET | `/auth/me` | ✅ | — | Perfil del usuario autenticado |

---

### ms-eventos — Gestión de Eventos
**URL base:** `https://kkuok1iccg.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | `/events` | ❌ | — | Listar eventos activos (`?categoria=concierto&ciudad=Lima`) |
| GET | `/events/{eventoId}` | ❌ | — | Detalle + zonas con disponibles |
| POST | `/events` | ✅ | vendedor | Crear evento con zonas dinámicas |
| GET | `/events/mis-eventos` | ✅ | vendedor | Eventos creados por el vendedor autenticado |
| PATCH | `/events/{eventoId}/toggle` | ✅ | vendedor | Activar / desactivar evento (solo el dueño) |

Categorías válidas: `concierto` · `deporte` · `teatro` · `festival` · `conferencia` · `otro`

---

### ms-tickets — Compra y Cancelación
**URL base:** `https://s5fqc1t2j0.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/tickets` | ✅ | comprador | Comprar tickets (descuenta `disponibles` en Eventos) |
| GET | `/tickets` | ✅ | comprador | Mis tickets |
| GET | `/tickets/{ticketId}` | ✅ | comprador | Detalle de ticket + QR |
| DELETE | `/tickets/{ticketId}` | ✅ | comprador | Cancelar ticket (restaura `disponibles`) |

---

### ms-pagos — Procesamiento de Pagos
**URL base:** `https://qpbrdqcex3.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/pagos/procesar` | ✅ | comprador | Procesar pago (Tarjeta o Yape, simulado) |
| GET | `/pagos/{pagoId}` | ✅ | comprador | Detalle de pago |

---

### ms-incidentes — Reportes de Incidentes
**URL base:** `https://7a8ssnyqof.execute-api.us-east-1.amazonaws.com`

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/incidentes` | ✅ | comprador | Crear incidente con referencia a ticket |
| GET | `/incidentes` | ✅ | comprador | Mis incidentes |
| GET | `/incidentes/{incidenteId}` | ✅ | comprador | Detalle de incidente |
| POST | `/incidentes/upload-url` | ✅ | comprador | Presigned URL para subir evidencia a S3 |

---

## 📁 Estructura del proyecto

```
boletealo/
├── frontend/                       # React 18 + Vite
│   ├── index.html
│   └── src/
│       ├── config/api.js           # URLs de microservicios + safeFetch helper
│       ├── App.jsx                 # Rutas + PrivateRoute + VendedorRoute
│       ├── pages/
│       │   ├── Landing.jsx         # Hero + categorías + features
│       │   ├── Login.jsx           # Formulario de login
│       │   ├── Registro.jsx        # Registro con selector de rol (Comprador/Vendedor)
│       │   ├── Eventos.jsx         # Grid de eventos + filtros + contador disponibles
│       │   ├── ComprarTicket.jsx   # Flujo 4 pasos: Evento→Zona→Pago→Confirmación QR
│       │   ├── MisTickets.jsx      # Historial de tickets + cancelar
│       │   ├── ReportarIncidente.jsx
│       │   ├── MisIncidentes.jsx
│       │   ├── CrearEvento.jsx     # [vendedor] Formulario con zonas dinámicas
│       │   └── MisEventos.jsx      # [vendedor] Dashboard con stats + toggle
│       └── components/
│           └── Navbar.jsx          # Nav condicional por rol
├── ms-auth/
│   ├── handler.py                  # register(rol), login, me
│   └── serverless.yml
├── ms-eventos/
│   ├── handler.py                  # list, get, create(vendedor), mis-eventos, toggle
│   └── serverless.yml
├── ms-tickets/
│   ├── handler.py                  # buy, list, get, cancel + decrementar/incrementar
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
node --version    # 18+
python3 --version # 3.10
npm install -g serverless
```

### 2. Clonar repositorio
```bash
git clone https://github.com/joshilopeze-hub/proyecto-cloud-c-p.git boletealo
cd boletealo
```

### 3. Crear parámetros SSM (solo la primera vez)
```bash
aws ssm put-parameter --name /boletealo/jwt_secret \
  --value "mi-secreto-seguro-aqui" --type SecureString

# Ejecutar DESPUÉS de desplegar ms-eventos y ms-tickets:
aws ssm put-parameter --name /boletealo/ms_eventos_url --value "https://URL_EVENTOS" --type String
aws ssm put-parameter --name /boletealo/ms_tickets_url --value "https://URL_TICKETS" --type String
```

### 4. Desplegar microservicios (en orden)
```bash
for ms in ms-auth ms-eventos ms-tickets ms-pagos ms-incidentes; do
  cd $ms
  npm install
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

# 3. Pull y re-desplegar solo lo que cambió
cd ~/proyecto-cloud-c-p && git pull origin main

# Redesplegar un microservicio:
cd ms-eventos && serverless deploy && cd ..

# Siempre al cambiar frontend:
cd frontend && npm run build && \
  aws s3 sync dist/ s3://boletealo-frontend-dev/ --delete
```

> **Nota:** La URL del sitio S3 no cambia entre sesiones. Solo las credenciales del CLI expiran.

---

## 🔐 Seguridad

- Passwords hasheados con SHA-256 + salt aleatorio de 16 bytes
- JWT HS256 con expiración de 24h, almacenado en `localStorage`
- JWT incluye campo `rol` — todos los microservicios verifican el rol sin llamar a ms-auth
- Rutas protegidas con `<PrivateRoute>` (requiere token) y `<VendedorRoute>` (requiere rol vendedor)
- CORS `*` habilitado en todos los endpoints (API Gateway + Lambda)
- Secreto JWT gestionado en SSM Parameter Store (no hardcodeado)
- Presigned URLs para subida directa de archivos a S3 (sin pasar por Lambda)

---

## 💳 Métodos de pago

| Método | Campos requeridos |
|--------|------------------|
| Tarjeta | Número 16 dígitos, CVV, nombre titular |
| Yape | Número de celular (9 dígitos), código de seguridad (6 dígitos) |

> Los pagos son **simulados** — no se conectan a pasarelas reales.

---

## 💰 Estimación de Costos AWS

**Región:** US East (N. Virginia) | **Escenario:** Moderado (~100,000 requests/mes) | **Fuente:** [AWS Pricing Calculator](https://calculator.aws)

| # | Servicio AWS | Descripción | Costo Mensual |
|---|---|---|---|
| 1 | **AWS Lambda** | 5 funciones · 100K req/mes · 500ms · 128MB RAM | $0.00 |
| 2 | **Amazon API Gateway** | 5 HTTP APIs · 100K req/mes | $0.10 |
| 3 | **Amazon DynamoDB** | 5 tablas on-demand · 0.5 GB · 100K writes · 300K reads | $0.21 |
| 4 | **Amazon S3** | Frontend estático + bucket evidencias · ~1 GB | $0.03 |
| 5 | **AWS SSM Parameter Store** | 3 parámetros standard (jwt_secret, urls inter-servicios) | $0.00 |
| | **TOTAL** | | **$0.34 USD/mes** |
| | **Total anual** | | **$4.08 USD/año** |

**Lambda ($0.00):** 100K invocaciones/mes con 128MB y 500ms = ~6,250 GB-s, muy por debajo del free tier de 400,000 GB-s/mes. Sin costo.

**API Gateway ($0.10):** 5 HTTP APIs a $1.00/millón de requests. 100K requests = $0.10. Se usó HTTP API (70% más barato que REST API).

**DynamoDB ($0.21):** Modo on-demand (PAY_PER_REQUEST), ideal para tráfico variable. Costo por 0.5 GB almacenado + unidades de lectura/escritura consumidas.

**S3 ($0.03):** Bucket del frontend React (~5 MB) + bucket de evidencias de incidentes (~1 GB). Free tier cubre primeros 5 GB.

**SSM Parameter Store ($0.00):** 3 parámetros Standard (gratuitos hasta 10,000 parámetros).

> La arquitectura serverless escala automáticamente. El costo crece de forma lineal: ~$3.50/mes a 1M requests, ~$35.00/mes a 10M requests.

---

## ✅ Funcionalidades implementadas

**Autenticación y roles:**
- [x] Registro con selector visual de rol (Comprador / Vendedor)
- [x] Login con JWT que incluye rol
- [x] Navbar condicional según rol
- [x] Rutas protegidas por rol (`VendedorRoute`)

**Flujo comprador:**
- [x] Listado de eventos con filtro por categoría y ciudad
- [x] Contador de entradas disponibles por zona (verde ≥50 / ámbar <50 / rojo agotado)
- [x] Flujo de compra en 4 pasos: Evento → Zona → Pago → Confirmación QR
- [x] Descuento automático de disponibles al comprar
- [x] Cancelación de tickets (restaura disponibles automáticamente)
- [x] Reporte de incidentes con adjunto de evidencia (upload a S3)
- [x] Historial de tickets e incidentes

**Flujo vendedor:**
- [x] Crear eventos con nombre, categoría, fecha, hora, lugar, ciudad, descripción
- [x] Zonas dinámicas: agregar/eliminar zonas con nombre, precio y disponibles
- [x] Preview de precio mínimo y total de entradas antes de publicar
- [x] Dashboard de eventos propios con stats (precio desde, disponibles, estado)
- [x] Activar / desactivar eventos publicados con un clic

**UX general:**
- [x] Fechas formateadas (`15 Mar 2026` en vez de `2026-03-15`)
- [x] Banners por categoría con colores diferenciados
- [x] Diseño dark mode consistente en toda la app
