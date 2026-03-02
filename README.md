# 🎟 Boletealo — Plataforma de Venta de Tickets

Plataforma 100% serverless de venta de tickets para eventos en Perú, construida sobre AWS.

## Arquitectura

- **Frontend:** React + Vite desplegado en S3 + CloudFront
- **Backend:** 5 microservicios independientes con API Gateway + Lambda (Python 3.12)
- **Bases de datos:** DynamoDB (ms-auth, ms-eventos, ms-incidentes) y Aurora Serverless v2 PostgreSQL (ms-tickets, ms-pagos)
- **IaC:** Serverless Framework v4
- **Región:** us-east-1 (N. Virginia)

## Microservicios

| Microservicio | Descripción | Base de Datos |
|---|---|---|
| `ms-auth` | Registro y login con JWT | DynamoDB |
| `ms-eventos` | Catálogo de eventos | DynamoDB |
| `ms-tickets` | Compra y consulta de tickets | Aurora Serverless v2 (PostgreSQL) |
| `ms-pagos` | Procesamiento de pagos (Tarjeta / Yape) | Aurora Serverless v2 (PostgreSQL) |
| `ms-incidentes` | Reporte y consulta de incidentes | DynamoDB |

## Estructura del repositorio

```
boletealo/
├── README.md
├── ms-auth/
├── ms-eventos/
├── ms-tickets/
├── ms-pagos/
├── ms-incidentes/
└── frontend/
```

## Requisitos previos (en EC2)

```bash
# Node.js 22+
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Serverless Framework v4
npm install -g serverless

# Python 3.12
sudo yum install -y python3.12 python3.12-pip

# Credenciales AWS (ya configuradas en laboratorio UTEC)
aws configure list
```

## Despliegue completo (orden recomendado)

```bash
git clone https://github.com/TU_USUARIO/boletealo.git
cd boletealo

# 1. Base de datos y auth
cd ms-auth && serverless deploy && cd ..

# 2. Eventos
cd ms-eventos && serverless deploy && cd ..

# 3. Tickets (Aurora - tarda ~5 min en crear el cluster)
cd ms-tickets && serverless deploy && cd ..

# 4. Pagos (Aurora)
cd ms-pagos && serverless deploy && cd ..

# 5. Incidentes
cd ms-incidentes && serverless deploy && cd ..

# 6. Frontend (ultimo, necesita las URLs de los microservicios)
cd frontend && npm install && serverless deploy && cd ..
```

## Creado con

- GitHub Copilot (modelo GPT-4o)
- Fecha de creación: febrero 2026
- Curso: Cloud Computing — Maestría UTEC
