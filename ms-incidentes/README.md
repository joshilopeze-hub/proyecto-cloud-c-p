# ms-incidentes — Microservicio de Reporte de Incidentes

Gestiona el reporte y consulta de incidencias asociadas a tickets comprados. Las evidencias (fotos, PDFs) se suben directamente a S3 desde el frontend usando URLs pre-firmadas.

## Base de datos
- **DynamoDB** — Tabla `incidentes` con GSI por userId
- **S3** — Bucket `evidencias` para archivos adjuntos

## Flujo de subida de evidencias

```
Frontend → POST /incidentes/upload-url → recibe URL pre-firmada
Frontend → PUT directo a S3 con la URL pre-firmada (sin pasar por Lambda)
Frontend → POST /incidentes con el s3Key en el campo "evidencias"
```

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/incidentes` | Reportar nuevo incidente | Sí |
| GET  | `/incidentes` | Mis incidentes | Sí |
| GET  | `/incidentes/{incidenteId}` | Detalle de incidente | Sí |
| POST | `/incidentes/upload-url` | URL pre-firmada para subir evidencia | Sí |

## Tipos de problema válidos

- `qr_no_reconocido` — QR no funciona en la entrada
- `asiento_ocupado` — El asiento está ocupado por otra persona
- `evento_cancelado` — Evento cancelado o modificado sin aviso
- `no_ingreso` — No me dejaron ingresar
- `otro` — Otro problema

## Ejemplos de uso

### 1. Obtener URL para subir evidencia
```bash
curl -X POST https://{API_URL}/incidentes/upload-url \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"nombreArchivo": "foto_entrada.jpg", "contentType": "image/jpeg"}'
```

### 2. Subir el archivo directamente a S3
```bash
curl -X PUT "{uploadUrl}" \
  -H "Content-Type: image/jpeg" \
  --data-binary @foto_entrada.jpg
```

### 3. Crear el incidente con la evidencia
```bash
curl -X POST https://{API_URL}/incidentes \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "uuid-del-ticket",
    "eventoNombre": "Bad Bunny Lima 2026",
    "fechaIncidente": "2026-03-15",
    "horaIncidente": "20:30",
    "lugar": "Puerta Norte, Estadio Nacional",
    "tipoProblema": "qr_no_reconocido",
    "descripcion": "Mi código QR aparecía como ya utilizado pero yo no había ingresado al estadio.",
    "evidencias": ["evidencias/user-uuid/archivo-uuid.jpg"]
  }'
```

## Despliegue

```bash
serverless deploy
serverless logs -f createIncidente
```
