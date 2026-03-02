# ms-eventos — Microservicio de Catálogo de Eventos

Gestiona el listado y detalle de eventos disponibles en Boletealo.

## Base de datos
- **DynamoDB** — Tabla `eventos` con GSI por categoría

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET  | `/events` | Listar todos los eventos (filtros: ?categoria=concierto&ciudad=Lima) | No |
| GET  | `/events/{eventoId}` | Detalle de un evento | No |
| POST | `/events` | Crear evento (admin) | No |

## Ejemplos de uso

### Listar todos los eventos
```bash
curl https://{API_URL}/events
```

### Filtrar por categoría
```bash
curl "https://{API_URL}/events?categoria=concierto&ciudad=Lima"
```

### Ver detalle
```bash
curl https://{API_URL}/events/evt-001
```

### Crear evento
```bash
curl -X POST https://{API_URL}/events \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Concierto",
    "categoria": "concierto",
    "fecha": "2026-05-01",
    "hora": "20:00",
    "lugar": "Arena Perú",
    "ciudad": "Lima",
    "precioDesde": 150,
    "zonas": [{"nombre": "General", "precio": 150, "disponibles": 500}]
  }'
```

## Despliegue

```bash
npm install -g serverless-python-requirements
serverless deploy
serverless logs -f listEventos
```
