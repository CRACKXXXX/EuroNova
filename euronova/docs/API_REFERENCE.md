# EuroNova — Manual de Referencia de API, Telemetría y Webhooks

**Versión:** 1.0.0 — Documento de Referencia Técnica y Auditoría Externa  
**Especificación OpenAPI 3.1:** [`openapi.yaml`](openapi.yaml)  
**Host de Producción:** `https://euronova.vercel.app`  
**Host de Desarrollo:** `http://localhost:3000`  

---

## 1. Modelo de Seguridad y Autenticación

Los Route Handlers y endpoints en segundo plano de EuroNova implementan un esquema de seguridad multi-capa:

### 1.1 Verificación Criptográfica en Tiempo Constante (`CRON_SECRET`)
Para prevenir ataques de canal lateral basados en temporización (*Timing Side-Channel Attacks*), la cabecera `Authorization: Bearer <CRON_SECRET>` se evalúa mediante:
1. Pre-hasheo con **SHA-256** de ambos tokens (el recibido y el almacenado en `process.env.CRON_SECRET`), garantizando buffers de longitud idéntica de 32 bytes.
2. Comparación bit a bit utilizando `crypto.timingSafeEqual`.
3. Esto garantiza que el tiempo de respuesta sea estrictamente idéntico sin importar cuántos caracteres coincidan.

### 1.2 Sesión de Administrador Raíz (*Root Admin Fallback*)
Si una petición manual se realiza desde el navegador sin cabecera Bearer, el middleware de autorización (`lib/cronAuth.ts`) consulta la sesión de Supabase Auth en las cookies. Si el usuario ostenta el rol `root` (o el email maestro del sistema), la petición se autoriza legítimamente.

### 1.3 Bloqueo Anti-Concurrencia en Memoria (*Overlap Lock*)
Endpoints pesados como el Auto-Scraper cuentan con una bandera en memoria (`isScrapeRunning`) con expiración de 60 segundos. Si una invocación llega mientras otra sigue en curso, la nueva petición se descarta de inmediato con código **429 Too Many Requests**, evitando sobrecarga de CPU y memoria en Vercel Serverless.

---

## 2. Catálogo Detallado de Endpoints

---

### `GET /api/health`
**Propósito:** Telemetría en tiempo real sin caché que evalúa la salud de la infraestructura y calcula la latencia de ida y vuelta (*round-trip latency*) con Supabase PostgreSQL.

* **Autenticación:** Pública (Sin token).
* **Encabezado de Caché:** `Cache-Control: no-store, no-cache, must-revalidate`.

#### Diagnóstico Interno:
1. Ejecuta consultas SQL paralelas y ligeras a las tablas principales (`projects` y `org_surveys`).
2. Mide la latencia con `performance.now()`.
3. Retorna `db_connected: true` y `status: "healthy"` con código **200 OK** mientras la base de datos responda de forma operativa.
4. Reporta el estado de esquema en `schema_ready` (indica si todas las migraciones recientes están activas).

#### Ejemplo `curl` (Local):
```bash
curl -X GET http://localhost:3000/api/health \
  -H "Accept: application/json"
```

#### Ejemplo `curl` (Producción):
```bash
curl -X GET https://euronova.vercel.app/api/health \
  -H "Accept: application/json"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "status": "healthy",
  "db_connected": true,
  "schema_ready": true,
  "latency_ms": 118.42,
  "timestamp": "2026-11-02T01:45:00.000Z"
}
```

---

### `POST /api/telemetry/error`
**Propósito:** Recepción de informes de fallos y excepciones no controladas capturadas por los Error Boundaries del cliente React 19.

* **Autenticación:** Pública (Protegida por Rate Limiting y límite estricto de tamaño).
* **Límite de Carga Útil:** **10 KB (10,240 bytes)**. Peticiones mayores retornan **413 Payload Too Large**.
* **Limitador de Tasa (*Rate Limiter*):** Ventana deslizante por IP de cliente. Excesos retornan **429 Too Many Requests**.

#### Defensas de Seguridad y Privacidad:
1. **Server-Side PII Scrubbing:** Todo mensaje, nombre y *stack trace* pasa por `scrubPII` antes de ser almacenado o notificado, eliminando automáticamente:
   - Direcciones de correo electrónico (`[REDACTED_EMAIL]`).
   - Tokens JWT y API Keys (`[REDACTED_TOKEN]`).
   - Contraseñas y cadenas de conexión a base de datos.
2. **Anonimización de IP:** La IP de origen se enmascara (ej. `192.168.1.***`).
3. **Alerta Opcional a Discord:** Si `DISCORD_WEBHOOK_URL` está configurado, despacha una notificación enriquecida.

#### Ejemplo `curl` (Local):
```bash
curl -X POST http://localhost:3000/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TypeError",
    "message": "Cannot read properties of undefined (reading '\''map'\'')",
    "route": "/es/community",
    "digest": "2847193751",
    "timestamp": "2026-11-02T01:45:00.000Z"
  }'
```

#### Ejemplo `curl` (Producción):
```bash
curl -X POST https://euronova.vercel.app/api/telemetry/error \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChunkLoadError",
    "message": "Loading chunk failed",
    "route": "/en/projects"
  }'
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true
}
```

---

### `GET /api/scraper/official`
**Propósito:** Motor extractor de oportunidades europeas (SALTO Youth, European Youth Portal ESC, Proactive Projects y Youth Exchange Aggregators).

* **Autenticación:** `Authorization: Bearer <CRON_SECRET>` o sesión de usuario con rol `root`/`admin`.
* **Tiempo Máximo de Ejecución:** 60 segundos (`maxDuration: 60`).
* **Protección Concurrente:** Retorna **429** si ya existe una ejecución activa en la instancia.

#### Ejemplo `curl` (Local):
```bash
curl -X GET http://localhost:3000/api/scraper/official \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Ejemplo `curl` (Producción):
```bash
curl -X GET https://euronova.vercel.app/api/scraper/official \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "source": "multisource_aggregator",
  "inserted": 8,
  "duplicates_skipped": 14,
  "duration_ms": 14250,
  "inserted_projects": [
    {
      "id": "e4b2d180-77a2-4a0b-9679-b1d567890123",
      "title": "Green Solidarity in Rural Communities",
      "status": "published",
      "duration_days": 180
    }
  ]
}
```

---

### `GET /api/cron/scrape`
**Propósito:** Orquestador de la tarea cron programada en Vercel (`0 2 * * *` — diariamente a las 02:00 AM UTC).

* **Autenticación:** `Authorization: Bearer <CRON_SECRET>`.
* **Mecanismo:** Delega internamente a `/api/scraper/official` sin mutar la lógica de extracción.

#### Ejemplo `curl` (Producción):
```bash
curl -X GET https://euronova.vercel.app/api/cron/scrape \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "cron_triggered_at": "2026-11-02T02:00:00.000Z",
  "source": "multisource_aggregator",
  "inserted": 8,
  "duplicates_skipped": 14
}
```

---

### `GET /api/cron/archive`
**Propósito:** Archivero automatizado con margen de seguridad de 60 días (`0 3 * * *` — diariamente a las 03:00 AM UTC).

* **Autenticación:** `Authorization: Bearer <CRON_SECRET>`.
* **Lógica Failsafe:** Solo archiva proyectos con `status = 'published'` cuya fecha de fin (`end_date`) haya expirado hace **más de 60 días (2 meses)**, previniendo la desaparición prematura de proyectos con plazos prorrogados. Procesa en lotes acotados de 100 para evitar bloqueos de tabla.

#### Ejemplo `curl` (Producción):
```bash
curl -X GET https://euronova.vercel.app/api/cron/archive \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "message": "Archival process complete. Archived 5 projects older than 60 days past end date.",
  "cutoff_date": "2026-09-03",
  "archived_count": 5,
  "archived_ids": ["c1a2b3d4-0000-4000-8000-000000000001"],
  "timestamp": "2026-11-02T03:00:00.000Z"
}
```

---

### `GET` / `POST /api/cron/purge-logs`
**Propósito:** Purga de registros de auditoría y tickets resueltos con retención de 48 horas (`0 4 * * *` — diariamente a las 04:00 AM UTC).

* **Autenticación:** `Authorization: Bearer <CRON_SECRET>`.
* **Principio GDPR:** Minimización de Datos (Art. 5.1.c). Elimina reportes de moderación, tickets de soporte y escalaciones resueltas hace más de 48 horas.

#### Ejemplo `curl` (Producción):
```bash
curl -X POST https://euronova.vercel.app/api/cron/purge-logs \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "timestamp": "2026-11-02T04:00:00.000Z",
  "cutoffDate": "2026-10-31T04:00:00.000Z",
  "purged": {
    "reportsCount": 3,
    "ticketsCount": 7,
    "escalationsCount": 2
  },
  "errors": {
    "reports": null,
    "tickets": null,
    "escalations": null
  }
}
```

---

### `GET` / `POST /api/cron/inactivity-purge`
**Propósito:** Purga definitiva de cuentas de usuario inactivas tras 2 años (`0 5 * * *` — diariamente a las 05:00 AM UTC).

* **Autenticación:** `Authorization: Bearer <CRON_SECRET>`.
* **Principio GDPR:** Limitación del Plazo de Conservación (Art. 5.1.e).
* **Preservación Art. 17:** Para mantener la integridad de los foros comunitarios sin violar restricciones de clave foránea ni conservar datos personales, los mensajes de usuarios inactivos se reasignan a un usuario pseudónimo del sistema (*Ghost User* / `"Deleted User"`), eliminando irreversiblemente credenciales en Auth, notificaciones, postulaciones y perfiles.

#### Ejemplo `curl` (Producción):
```bash
curl -X POST https://euronova.vercel.app/api/cron/inactivity-purge \
  -H "Authorization: Bearer your_cron_secret_token_here"
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "timestamp": "2026-11-02T05:00:00.000Z",
  "retentionRule": "2 Years Data Decay (GDPR Art. 5.1.e)",
  "cutoffDate": "2024-11-02T05:00:00.000Z",
  "totalInactiveDetected: 2,
  "purgedCount": 2,
  "purgedUsers": [
    {
      "id": "u1a2b3c4-0000-4000-8000-000000000001",
      "maskedEmail": "jo***a@gmail.com",
      "lastActivity": "2024-05-10T12:00:00.000Z"
    }
  ],
  "errors": []
}
```

---

## 3. Arquitectura Failsafe de Webhooks y SMTP (Timeout No Bloqueante)

Para garantizar que un fallo en servidores externos (ej. caída de Discord, congestión de la red o lentitud en servidores SMTP de Google) **jamás bloquee las acciones de los usuarios** ni cause timeouts de 60 segundos en Vercel, todos los despachos externos implementan un límite estricto de **5 segundos**:

### 3.1 Webhooks Salientes (Discord / Slack)
```typescript
// Implementación en lib/externalAlerts.ts
const res = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(5000), // Cancelación obligatoria a los 5000ms
  redirect: "error",                 // Previene redirecciones no seguras (Anti-SSRF)
});
```

### 3.2 Envío de Correos Transaccionales (SMTP / Nodemailer)
```typescript
// Carrera de Promesas (Promise.race) con Timeout de 5000ms en lib/externalAlerts.ts
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("SMTP timeout after 5000ms")), 5000)
);

const sendPromise = transporter.sendMail({ ...mailOptions });

// Si SMTP tarda más de 5 segundos, timeoutPromise gana la carrera y la excepción se captura limpiamente
await Promise.race([sendPromise, timeoutPromise]);
```

### 3.3 Protección Anti-SSRF en Webhooks
Toda URL configurada por el usuario o administradores se valida mediante `validateSafeHttpsUrl`:
- Se rechaza cualquier protocolo distinto a `https://`.
- Se bloquean rangos de red locales y privados (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Se bloquea la IP de metadatos de proveedores en la nube (`169.254.169.254`).

