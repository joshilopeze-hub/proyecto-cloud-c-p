# ms-tickets — Microservicio de Compra y Consulta de Tickets

Gestiona la compra de tickets y el historial por usuario. Usa Aurora Serverless v2 (PostgreSQL) por la necesidad de relaciones y consultas complejas.

## Base de datos
- **Aurora Serverless v2 — PostgreSQL** vía RDS Data API (sin driver, 100% serverless)
- Escala automáticamente desde 0.5 ACU hasta 4 ACU

## Esquema SQL

```sql
CREATE TABLE tickets (
    ticket_id     VARCHAR(36) PRIMARY KEY,
    user_id       VARCHAR(36) NOT NULL,
    evento_id     VARCHAR(50) NOT NULL,
    evento_nombre VARCHAR(200) NOT NULL,
    evento_fecha  DATE NOT NULL,
    evento_lugar  VARCHAR(200) NOT NULL,
    zona          VARCHAR(100) NOT NULL,
    cantidad      INTEGER NOT NULL DEFAULT 1,
    precio_unit   NUMERIC(10,2) NOT NULL,
    precio_total  NUMERIC(10,2) NOT NULL,
    qr_code       VARCHAR(50) UNIQUE NOT NULL,
    estado        VARCHAR(20) DEFAULT 'activo',
    created_at    TIMESTAMP DEFAULT NOW()
);
```

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/tickets` | Comprar ticket | Sí |
| GET  | `/tickets` | Mis tickets | Sí |
| GET  | `/tickets/{ticketId}` | Detalle de ticket | Sí |

## Ejemplos de uso

### Comprar ticket
```bash
curl -X POST https://{API_URL}/tickets \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "eventoId": "evt-001",
    "eventoNombre": "Bad Bunny World Tour Lima",
    "eventoFecha": "2026-03-15",
    "eventoLugar": "Estadio Nacional",
    "zona": "Tribuna Norte",
    "cantidad": 2,
    "precioUnit": 180
  }'
```

### Ver mis tickets
```bash
curl https://{API_URL}/tickets \
  -H "Authorization: Bearer {TOKEN}"
```

## Despliegue

> ⚠️ Aurora tarda ~5 minutos en crear el cluster. Esperar antes de invocar las funciones.

```bash
serverless deploy

# Inicializar esquema de BD (solo una vez)
serverless invoke -f initDb

# Ver logs
serverless logs -f buyTicket
```

## Nota sobre VPC

Aurora Serverless v2 con Data API **no requiere VPC** para las Lambdas cuando se usa el endpoint HTTP de Data API. El `serverless.yml` incluye VPC solo como referencia. Puedes remover la configuración de VPC de las funciones si usas exclusivamente el Data API.
