# EuroNova — Configuración del Backup Automático en Google Drive (Safe Rotation)

Este documento detalla el procedimiento paso a paso para configurar la canalización automatizada de copias de seguridad de la base de datos Supabase (PostgreSQL) hacia Google Drive mediante GitHub Actions y Google Cloud Service Accounts.

---

## 🏗️ 1. Arquitectura de la Solución

El pipeline se ejecuta diariamente a las **04:00 AM UTC** (y bajo demanda mediante `workflow_dispatch` en GitHub Actions):

```mermaid
flowchart TD
    A["GitHub Actions Cron (04:00 UTC)"] --> B["1. pg_dump (Supabase DB)"]
    B --> C["2. Compresión Streaming (gzip nivel 9)"]
    C --> D["3. Autenticación Google Drive API (Service Account)"]
    D --> E["4. Subida a Google Drive Folder ID"]
    E --> F{"¿Subida exitosa y Size > 0?"}
    F -- "NO / Fallo" --> G["❌ ABORTAR PIPELINE (Exit 1)<br/>Backup previo NO se elimina"]
    F -- "SÍ" --> H["5. Safe Rotation: Buscar backup del día anterior"]
    H --> I["6. Eliminar backup anterior de Google Drive"]
    I --> J["7. Limpieza temporal local & Finalización Exit 0"]
```

---

## 🔑 2. Paso a Paso: Configuración en Google Cloud Platform (GCP)

### Paso 2.1: Habilitar la Google Drive API
1. Abre [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta de Google.
2. Crea un nuevo proyecto (o selecciona el proyecto existente, ej. `EuroNova`).
3. En el menú de navegación lateral, dirígete a **APIs y servicios** > **Biblioteca** (*APIs & Services > Library*).
4. Busca **"Google Drive API"**.
5. Haz clic en **Google Drive API** y pulsa el botón **Habilitar** (*Enable*).

### Paso 2.2: Crear la Cuenta de Servicio (Service Account)
1. Ve a **APIs y servicios** > **Credenciales** (*APIs & Services > Credentials*).
2. Haz clic en **+ Crear credenciales** (*+ Create Credentials*) en la parte superior y selecciona **Cuenta de servicio** (*Service account*).
3. Configura los detalles de la cuenta de servicio:
   - **Nombre de la cuenta de servicio:** `euronova-db-backup`
   - **ID de la cuenta de servicio:** Se autogenerará (ej. `euronova-db-backup@<tu-proyecto-id>.iam.gserviceaccount.com`).
   - **Descripción:** `Automatización de backups diarios de Supabase a Google Drive`.
4. Haz clic en **Crear y continuar** (*Create and continue*).
5. En el paso de roles (*Roles*), **no es necesario asignar ningún rol en el proyecto de GCP**, ya que el acceso a Google Drive se gestiona directamente compartiendo la carpeta de destino. Pulsa **Continuar** y luego **Listo** (*Done*).

### Paso 2.3: Generar la Clave Privada en Formato JSON
1. En la lista de **Cuentas de servicio**, haz clic en la cuenta de servicio recién creada (`euronova-db-backup@...`).
2. Dirígete a la pestaña **Claves** (*Keys*).
3. Haz clic en **Agregar clave** > **Crear clave nueva** (*Add Key > Create new key*).
4. Selecciona el tipo de clave **JSON** y pulsa **Crear** (*Create*).
5. Se descargará automáticamente un archivo `.json` a tu ordenador (ej. `<tu-proyecto-id>-xxxx.json`).
6. **Copia y anota el email de la cuenta de servicio** (lo necesitarás en el paso siguiente):
   ```text
   euronova-db-backup@<tu-proyecto-id>.iam.gserviceaccount.com
   ```
> [!CAUTION]
> Guarda este archivo JSON en un lugar seguro. Contiene la clave privada para autenticarse como la cuenta de servicio. Nunca lo subas a GitHub ni lo compartas en repositorios públicos.

---

## 📁 3. Paso a Paso: Configurar Google Drive con la Cuenta Personal

Debes crear la carpeta de backups en tu cuenta personal de Google Drive y darle permisos a la Cuenta de Servicio.

1. **Inicia sesión en Google Drive** con tu cuenta específica:
   👉 **`joelrjtirma@gmail.com`**
2. En la raíz de "Mi unidad" (*My Drive*), haz clic en **+ Nuevo** > **Nueva carpeta**.
3. Nombra la carpeta:
   ```text
   EuroNova_Backups
   ```
4. Haz clic derecho sobre la carpeta `EuroNova_Backups` y selecciona **Compartir** > **Compartir** (*Share*).
5. En el campo *"Añadir personas y grupos"*, pega el **Email de la Cuenta de Servicio** que creaste en el paso 2.3:
   ```text
   euronova-db-backup@<tu-proyecto-id>.iam.gserviceaccount.com
   ```
6. **Asigna el rol de "Editor"**:
   - ⚠️ **IMPRESCINDIBLE:** Debe tener permisos de **Editor** para que el script pueda:
     1. Subir los nuevos archivos `.sql.gz`.
     2. Consultar y eliminar el backup del día anterior (Safe Rotation).
7. Desmarca la casilla *"Notificar a los usuarios"* (las cuentas de servicio no tienen bandeja de entrada) y haz clic en **Compartir** (*Share*).
8. **Obtén el ID de la carpeta (`GDRIVE_FOLDER_ID`)**:
   - Abre la carpeta `EuroNova_Backups` en tu navegador.
   - Observa la barra de direcciones URL:
     ```text
     https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV
     ```
   - El código alfanumérico final después de `/folders/` es tu **Folder ID** (en el ejemplo: `1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV`).

---

## 🗄️ 4. Obtener la Cadena de Conexión de Supabase (`SUPABASE_DB_URL`)

1. Entra a tu panel de control en [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecciona el proyecto **EuroNova**.
3. Ve a **Project Settings** (icono de engranaje) > **Database**.
4. Desplázate hacia abajo hasta la sección **Connection string**.
5. Selecciona la pestaña **URI**.
6. Elige el modo **Direct connection** (Puerto `5432`) o **Session Pooler** (Puerto `5432`):
   - ⚠️ **NO utilices el Transaction Pooler (puerto 6543)**, ya que `pg_dump` requiere características de sesión de PostgreSQL.
7. La cadena tendrá el siguiente formato:
   ```text
   postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
   *(o `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`)*.
8. Sustituye `[YOUR-PASSWORD]` por la contraseña real del usuario administrador de tu base de datos.

---

## 🔐 5. Configurar los Secretos en GitHub Actions

1. Ve a tu repositorio de GitHub: `https://github.com/<tu-usuario>/EuroNova`.
2. Dirígete a **Settings** > **Secrets and variables** > **Actions**.
3. Haz clic en el botón verde **New repository secret** y añade los siguientes 3 secretos:

| Nombre del Secreto | Valor a Configurar |
|---|---|
| `SUPABASE_DB_URL` | La URI completa de PostgreSQL obtenida en el Paso 4 (incluyendo usuario y contraseña en puerto 5432). |
| `GDRIVE_SERVICE_ACCOUNT_JSON` | Todo el contenido del archivo `.json` descargado en el Paso 2.3 (abre el archivo con un editor de texto, copia todo el texto JSON `{ ... }` y pégalo tal cual). |
| `GDRIVE_FOLDER_ID` | El ID alfanumérico de la carpeta de Google Drive obtenido en el Paso 3.8. |

---

## 🧪 6. Probar y Verificar el Backup Manualmente (UAT)

Para certificar que todo funciona sin esperar a las 04:00 AM:

1. En tu repositorio de GitHub, haz clic en la pestaña **Actions**.
2. En la barra lateral izquierda, selecciona el flujo de trabajo:
   **"EuroNova Database Backup to Google Drive (Safe Rotation)"**.
3. A la derecha verás un desplegable: **Run workflow** > haz clic en el botón verde **Run workflow**.
4. Haz clic en la ejecución iniciada para ver los logs en tiempo real.
5. Deberás ver los 4 pasos completados con éxito:
   - `[STEP 1/4] DUMPING SUPABASE DATABASE (pg_dump + gzip)` -> Archivo `.sql.gz` generado.
   - `[STEP 2/4] AUTHENTICATING WITH GOOGLE DRIVE API` -> Autenticado como la Service Account.
   - `[STEP 3/4] UPLOADING COMPRESSED BACKUP TO GOOGLE DRIVE` -> Subida confirmada y tamaño verificado.
   - `[STEP 4/4] EXECUTING SAFE ROTATION` -> En la primera ejecución confirmará retención inicial; en días posteriores eliminará el backup anterior.
6. Entra a tu Google Drive con `joelrjtirma@gmail.com` y abre `EuroNova_Backups`: verás el nuevo archivo `euronova_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`.

---

## 🛡️ 7. Mecanismo de Rotación Segura (Safe Rotation)

* **Protección contra pérdida de datos:** Si `pg_dump`, la conexión a la base de datos o la subida a Google Drive experimentan un error (por ejemplo, timeout o corte de red), el script **aborta de inmediato** con código de error `1`.
* La etapa de borrado (**Step 4**) se encuentra estrictamente condicionada a que la API de Google Drive confirme que el nuevo archivo tiene un `fileId` válido y un tamaño remoto superior a 0 bytes.
* Si el backup de hoy falla, **el backup del día anterior se conserva intacto**.

