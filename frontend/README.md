# frontend — Boletealo Web App

React + Vite desplegado en S3 como sitio estático.

## Configuración post-deploy de microservicios

Después de hacer `serverless deploy` en cada microservicio, crear el archivo `.env` en esta carpeta:

```bash
# frontend/.env
VITE_MS_AUTH_URL=https://XXXXXXXX.execute-api.us-east-1.amazonaws.com
VITE_MS_EVENTOS_URL=https://YYYYYYYY.execute-api.us-east-1.amazonaws.com
VITE_MS_TICKETS_URL=https://ZZZZZZZZ.execute-api.us-east-1.amazonaws.com
VITE_MS_PAGOS_URL=https://WWWWWWWW.execute-api.us-east-1.amazonaws.com
VITE_MS_INCIDENTES_URL=https://VVVVVVVV.execute-api.us-east-1.amazonaws.com
```

Las URLs las obtienes del output de cada `serverless deploy`:
```
endpoints:
  POST - https://XXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/register
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         Esta parte es la URL base que va al .env
```

## Despliegue

```bash
# Instalar dependencias
npm install

# Instalar plugin serverless
npm install -g serverless-s3-sync

# Desarrollo local
npm run dev

# Build + deploy a S3
npm run deploy
```

## Estructura src/

```
src/
├── config/
│   └── api.js          # URLs y helpers para llamar a los microservicios
├── pages/
│   ├── Landing.jsx
│   ├── Login.jsx
│   ├── Eventos.jsx
│   ├── ComprarTicket.jsx
│   ├── MisTickets.jsx
│   ├── ReportarIncidente.jsx
│   └── MisIncidentes.jsx
├── components/
│   ├── Navbar.jsx
│   └── Sidebar.jsx
├── App.jsx
└── main.jsx
```
