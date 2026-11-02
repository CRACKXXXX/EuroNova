# EuroNova — Automated Google Drive Database Backup Setup (Safe Rotation)

This document provides a step-by-step operational guide for configuring the automated database backup pipeline from Supabase (PostgreSQL) to Google Drive utilizing GitHub Actions and Google Cloud Service Accounts.

---

## 🏗️ 1. Solution Architecture

The automated pipeline executes daily at **04:00 AM UTC** (and on-demand via `workflow_dispatch` in GitHub Actions):

```mermaid
flowchart TD
    A["GitHub Actions Cron (04:00 UTC)"] --> B["1. pg_dump (Supabase DB)"]
    B --> C["2. Streaming Compression (gzip level 9)"]
    C --> D["3. Google Drive API Authentication (Service Account)"]
    D --> E["4. Upload to Target Google Drive Folder ID"]
    E --> F{"Upload Successful & Size > 0?"}
    F -- "NO / Failed" --> G["❌ ABORT PIPELINE (Exit 1)<br/>Previous backup is NOT deleted"]
    F -- "YES" --> H["5. Safe Rotation: Query previous backup file"]
    H --> I["6. Delete previous backup from Google Drive"]
    I --> J["7. Clean temporary files & Exit 0"]
```

---

## 🔑 2. Step-by-Step: Google Cloud Platform (GCP) Configuration

### Step 2.1: Enable the Google Drive API
1. Open the [Google Cloud Console](https://console.cloud.google.com/) using your Google account.
2. Create a new project (or select an existing project, e.g. `EuroNova`).
3. In the left navigation menu, go to **APIs & Services** > **Library**.
4. Search for **"Google Drive API"**.
5. Click **Google Drive API** and click the **Enable** button.

### Step 2.2: Create a Dedicated Service Account
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **Service Account**.
3. Configure the service account details:
   - **Service account name:** `euronova-db-backup`
   - **Service account ID:** Will be generated automatically (e.g. `euronova-db-backup@<your-project-id>.iam.gserviceaccount.com`).
   - **Description:** `Automated daily database backups from Supabase to Google Drive`.
4. Click **Create and Continue**.
5. In the project roles step, **no GCP project roles are required**, as Google Drive folder access is granted directly via folder sharing. Click **Continue** and then **Done**.

### Step 2.3: Generate Private Key in JSON Format
1. From the **Service Accounts** list, click on the newly created service account (`euronova-db-backup@...`).
2. Navigate to the **Keys** tab.
3. Click **Add Key** > **Create new key**.
4. Select the **JSON** key type and click **Create**.
5. A `.json` file will automatically download to your computer (e.g. `<your-project-id>-xxxx.json`).
6. **Copy and save the service account email** (required in the next step):
   ```text
   euronova-db-backup@<your-project-id>.iam.gserviceaccount.com
   ```
> [!CAUTION]
> Store this JSON file securely. It contains the private key that authenticates as the service account. Never commit it to GitHub or share it publicly.

---

## 📁 3. Step-by-Step: Configure Google Drive with Personal Account

You must create the backup folder in your personal Google Drive account and grant editor permissions to the Service Account.

1. **Sign in to Google Drive** with your designated account:
   👉 **`joelrjtirma@gmail.com`**
2. In the root of "My Drive", click **+ New** > **New folder**.
3. Name the folder:
   ```text
   EuroNova_Backups
   ```
4. Right-click the `EuroNova_Backups` folder and select **Share** > **Share**.
5. In the *"Add people and groups"* field, paste the **Service Account Email** created in Step 2.3:
   ```text
   euronova-db-backup@<your-project-id>.iam.gserviceaccount.com
   ```
6. **Assign the "Editor" role**:
   - ⚠️ **MANDATORY:** Must have **Editor** permissions so the backup script can:
     1. Upload new `.sql.gz` dump archives.
     2. Query and delete the previous day's backup (Safe Rotation).
7. Uncheck the *"Notify people"* box (service accounts have no inbox) and click **Share**.
8. **Obtain the Folder ID (`GDRIVE_FOLDER_ID`)**:
   - Open the `EuroNova_Backups` folder in your browser.
   - Inspect the browser URL address bar:
     ```text
     https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV
     ```
   - The alphanumeric string following `/folders/` is your **Folder ID** (in this example: `1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV`).

---

## 🗄️ 4. Obtain the Supabase PostgreSQL Connection String (`SUPABASE_DB_URL`)

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the **EuroNova** project.
3. Go to **Project Settings** (gear icon) > **Database**.
4. Scroll down to the **Connection string** section.
5. Select the **URI** tab.
6. Choose **Direct connection** (Port `5432`) or **Session Pooler** (Port `5432`):
   - ⚠️ **DO NOT use the Transaction Pooler (Port 6543)**, as `pg_dump` requires PostgreSQL session-level features.
7. The connection string format is:
   ```text
   postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
   *(or `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`)*.
8. Replace `[YOUR-PASSWORD]` with your active database master password.

---

## 🔐 5. Configure Secrets in GitHub Actions

1. Go to your GitHub repository: `https://github.com/<your-user>/EuroNova`.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Click the green **New repository secret** button and add the following 3 secrets:

| Secret Name | Value |
|---|---|
| `SUPABASE_DB_URL` | Full PostgreSQL connection URI obtained in Step 4 (including user, password, and port 5432). |
| `GDRIVE_SERVICE_ACCOUNT_JSON` | Full raw contents of the `.json` key file downloaded in Step 2.3 (open in a text editor, copy all JSON text `{ ... }`, and paste as-is). |
| `GDRIVE_FOLDER_ID` | Alphanumeric Google Drive folder ID obtained in Step 3.8. |

---

## 🧪 6. Manually Trigger and Verify Backup (UAT)

To certify the pipeline without waiting for the scheduled 04:00 AM UTC cron:

1. In your GitHub repository, click the **Actions** tab.
2. In the left workflow sidebar, select:
   **"EuroNova Database Backup to Google Drive (Safe Rotation)"**.
3. In the upper-right corner, click **Run workflow** > green **Run workflow** button.
4. Click on the triggered run to watch live execution logs.
5. Verify that all 4 steps succeed:
   - `[STEP 1/4] DUMPING SUPABASE DATABASE (pg_dump + gzip)` -> `.sql.gz` archive generated.
   - `[STEP 2/4] AUTHENTICATING WITH GOOGLE DRIVE API` -> Authenticated as Service Account.
   - `[STEP 3/4] UPLOADING COMPRESSED BACKUP TO GOOGLE DRIVE` -> Upload confirmed and size verified.
   - `[STEP 4/4] EXECUTING SAFE ROTATION` -> Retains initial backup or safely deletes prior rotation.
6. Open Google Drive with `joelrjtirma@gmail.com` and open `EuroNova_Backups`: confirm the new `euronova_backup_YYYY-MM-DD_HH-MM-SS.sql.gz` file is present.

---

## 🛡️ 7. Safe Rotation Mechanism

* **Data Loss Prevention:** If `pg_dump`, database connectivity, compression, or Google Drive upload encounters an error, the script **immediately terminates with exit code 1**.
* Step 4 (deletion of previous backup) is strictly conditioned upon the Google Drive API confirming that the new file exists with a valid `fileId` and a remote file size > 0 bytes.
* If today's backup fails for any reason, **the previous day's backup remains completely intact and untouched**.
