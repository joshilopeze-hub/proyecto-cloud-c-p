# ms-pagos — Microservicio de Procesamiento de Pagos

Gestiona el procesamiento de pagos con tarjeta de crédito y Yape. Usa Aurora Serverless v2 por la necesidad de consistencia ACID en transacciones financieras.

## Base de datos
- **Aurora Serverless v2 — PostgreSQL** vía RDS Data API

## Métodos de pago simulados

| Método | Datos requeridos | Tarjeta/número de prueba exitoso | Falla con |
|--------|-----------------|----------------------------------|-----------|
| Tarjeta | numero, cvv, mesVencimiento, anioVencimiento, nombreTitular | Cualquier número de 16 dígitos | Termina en `0000` |
| Yape | numeroCelular, codigoSeguridad | Cualquier celular de 9 dígitos | Termina en `0000` |

> En producción integrar con **Culqi** o **Niubiz** (pasarelas peruanas).

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/pagos/procesar` | Procesar pago de un ticket | Sí |
| GET  | `/pagos/{pagoId}` | Consultar estado de pago | Sí |

## Ejemplos de uso

### Pago con tarjeta (exitoso)
```bash
curl -X POST https://{API_URL}/pagos/procesar \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "uuid-del-ticket",
    "monto": 396.00,
    "metodoPago": "tarjeta",
    "datosTarjeta": {
      "numero": "4242 4242 4242 4242",
      "cvv": "123",
      "mesVencimiento": "12",
      "anioVencimiento": "28",
      "nombreTitular": "Geraldo Colchado"
    }
  }'
```

### Pago con Yape (exitoso)
```bash
curl -X POST https://{API_URL}/pagos/procesar \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "uuid-del-ticket",
    "monto": 396.00,
    "metodoPago": "yape",
    "datosYape": {
      "numeroCelular": "987654321",
      "codigoSeguridad": "123456"
    }
  }'
```

## Despliegue

```bash
serverless deploy

# Inicializar esquema de BD (solo una vez)
serverless invoke -f initDb

# Ver logs
serverless logs -f procesarPago
```

## Seguridad
- Los datos de tarjeta **nunca** se guardan en texto plano
- Se guarda solo un hash SHA-256 de los últimos 4 dígitos para auditoría
- En producción usar AWS KMS para cifrado adicional
