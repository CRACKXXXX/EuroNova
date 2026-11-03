#!/usr/bin/env node

/**
 * ==============================================================================
 * EuroNova — Automated Supabase PostgreSQL DB Backup & Safe Rotation
 * ==============================================================================
 * Pipeline:
 *  1. Execute pg_dump (via SUPABASE_DB_URL) piped through gzip to a local .sql.gz
 *  2. Authenticate with Google Drive API via Service Account JSON or OAuth
 *  3. Upload the compressed backup to the target Google Drive Folder ID
 *  4. Verify the remote upload is 100% valid (fileId exists, size > 0)
 *  5. ONLY THEN: Safe Rotation — search and delete the previous day's backup
 *
 * Security:
 *  - Connection strings, credentials, and passwords are sanitized from console logs.
 *  - Comprehensive try/catch wraps execution; any failure exits with code 1.
 * ==============================================================================
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGzip } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_PREFIX = 'euronova_backup_';

/**
 * Dynamically resolves googleapis package from current scope or euronova/node_modules
 */
async function loadGoogleApis() {
  try {
    const mod = await import('googleapis');
    return mod.google;
  } catch {
    const fallbackPaths = [
      path.resolve(__dirname, '..', 'node_modules', 'googleapis', 'build', 'src', 'index.js'),
      path.resolve(process.cwd(), 'node_modules', 'googleapis', 'build', 'src', 'index.js'),
      path.resolve(__dirname, '..', 'euronova', 'node_modules', 'googleapis', 'build', 'src', 'index.js'),
      path.resolve(process.cwd(), 'euronova', 'node_modules', 'googleapis', 'build', 'src', 'index.js'),
    ];
    for (const fp of fallbackPaths) {
      if (fs.existsSync(fp)) {
        const mod = await import(pathToFileURL(fp).href);
        return mod.google;
      }
    }
    throw new Error("Cannot find package 'googleapis'. Run 'npm install googleapis' or run inside ./euronova.");
  }
}

/**
 * Sanitizes sensitive substrings (passwords, private keys, URLs) from logs
 */
function sanitizeOutput(text, sensitiveTokens = []) {
  if (!text) return '';
  let cleanText = String(text);
  for (const token of sensitiveTokens) {
    if (token && typeof token === 'string' && token.length > 2) {
      cleanText = cleanText.split(token).join('***[REDACTED]***');
    }
  }
  return cleanText;
}

/**
 * Formats bytes to human-readable megabytes
 */
function toMegabytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Optional local environment loader: loads .env.local if present
 */
function loadLocalEnvIfPresent() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'euronova', '.env.local'),
    path.resolve(__dirname, '..', '.env.local'),
    path.resolve(__dirname, '..', 'euronova', '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const fileContent = fs.readFileSync(envPath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Silently skip if reading fails
      }
      break;
    }
  }
}

/**
 * Parses and normalizes Google credentials (supports raw JSON, Base64 JSON, and handles literal newlines in private keys)
 */
function parseGoogleCredentials(rawInput) {
  if (!rawInput) {
    throw new Error('No Google credentials provided. Set GDRIVE_SERVICE_ACCOUNT_JSON or GDRIVE_CREDENTIALS_DATA.');
  }

  let text = rawInput.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    text = text.slice(1, -1).trim();
  }

  let creds;
  try {
    if (text.startsWith('{')) {
      creds = JSON.parse(text);
    } else {
      const decoded = Buffer.from(text, 'base64').toString('utf8');
      creds = JSON.parse(decoded);
    }
  } catch (err) {
    throw new Error(`Failed to parse Google credentials. Ensure the secret contains valid JSON or Base64 JSON: ${err.message}`);
  }

  if (creds.private_key && typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  return creds;
}

/**
 * Cleans folder ID if user pasted full browser URL
 */
function sanitizeFolderId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  return trimmed;
}

/**
 * Validates database URL structure, detects Transaction Pooler misuse and IPv6 timeout risks
 */
function inspectAndValidateDbUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    throw new Error(`Invalid SUPABASE_DB_URL format: ${e.message}`);
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`Invalid database protocol in SUPABASE_DB_URL: expected "postgresql:" or "postgres:", got "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname;
  const port = parsed.port || '5432';

  if (port === '6543') {
    throw new Error(
      'CRITICAL: SUPABASE_DB_URL is configured with port 6543 (Transaction Pooler / PgBouncer). ' +
      'pg_dump requires session-level PostgreSQL features and will fail on port 6543. ' +
      'Please switch the port to 5432 (Session Mode Pooler): postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres'
    );
  }

  if (hostname.startsWith('db.') && hostname.endsWith('.supabase.co')) {
    console.warn('\n⚠️ [NETWORK WARNING] Direct Supabase host detected: ' + hostname);
    console.warn('⚠️ GitHub Actions hosted runners operate on IPv4. Direct "db.*.supabase.co" endpoints on modern Supabase projects resolve to IPv6 only.');
    console.warn('⚠️ If pg_dump hangs or times out with "Connection timed out", switch your SUPABASE_DB_URL to the IPv4-compatible Session Pooler:');
    console.warn('⚠️ Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres\n');
  }

  const dbPassword = parsed.password || '';
  const maskedPort = parsed.port ? `:${parsed.port}` : '';
  const maskedTarget = `${parsed.protocol}//${parsed.username ? parsed.username + ':***@' : ''}${hostname}${maskedPort}${parsed.pathname}`;

  return {
    parsed,
    hostname,
    port,
    dbPassword,
    maskedTarget,
  };
}

async function runBackupPipeline() {
  loadLocalEnvIfPresent();

  console.log('================================================================');
  console.log('🚀 EuroNova Database Backup Pipeline: Initializing...');
  console.log('================================================================');

  // 1. Verify required environment variables
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  const rawServiceAccountJson = (
    process.env.GDRIVE_SERVICE_ACCOUNT_JSON ||
    process.env.GDRIVE_CREDENTIALS_DATA ||
    process.env.GDRIVE_CREDENTIALS ||
    process.env.GOOGLE_CREDENTIALS
  )?.trim();
  const rawFolderId = (
    process.env.GDRIVE_FOLDER_ID ||
    process.env.FOLDER_ID
  )?.trim();

  const missingEnv = [];
  if (!dbUrl) missingEnv.push('SUPABASE_DB_URL');
  if (!rawServiceAccountJson) missingEnv.push('GDRIVE_SERVICE_ACCOUNT_JSON (or GDRIVE_CREDENTIALS_DATA)');
  if (!rawFolderId) missingEnv.push('GDRIVE_FOLDER_ID');

  if (missingEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  }

  const folderId = sanitizeFolderId(rawFolderId);
  const dbInfo = inspectAndValidateDbUrl(dbUrl);
  const sensitiveTokens = [dbUrl, dbInfo.dbPassword, rawServiceAccountJson];

  // 2. Parse Google Credentials
  const credentials = parseGoogleCredentials(rawServiceAccountJson);
  const isServiceAccount = Boolean(credentials.client_email && credentials.private_key);
  const isAuthorizedUser = Boolean(credentials.type === 'authorized_user' || credentials.refresh_token);

  if (!isServiceAccount && !isAuthorizedUser) {
    throw new Error('Invalid Google Credentials: Must contain either (client_email + private_key) for Service Accounts OR (refresh_token) for Authorized Users.');
  }

  if (credentials.private_key) {
    sensitiveTokens.push(credentials.private_key);
  }

  console.log(`[Config Check] Target Database: ${dbInfo.maskedTarget}`);
  console.log(`[Config Check] Auth Identity: ${credentials.client_email || credentials.client_id || 'OAuth User'}`);
  console.log(`[Config Check] GDrive Folder ID: ${folderId}`);

  // 3. Setup timestamped filenames
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-');
  const backupFileName = `${BACKUP_PREFIX}${dateStr}_${timeStr}.sql.gz`;
  const localBackupPath = path.resolve(process.cwd(), backupFileName);

  console.log(`\n--- [STEP 1/4] DUMPING SUPABASE DATABASE (pg_dump + gzip) ---`);
  console.log(`Target local file: ${backupFileName}`);

  const pgDumpArgs = [
    `--dbname=${dbUrl}`,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ];

  const pgEnv = {
    ...process.env,
    PGPASSWORD: dbInfo.dbPassword || process.env.PGPASSWORD,
    PGSSLMODE: process.env.PGSSLMODE || 'require',
    PGCONNECT_TIMEOUT: '45',
  };

  const pgDumpProcess = spawn('pg_dump', pgDumpArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: pgEnv,
  });

  const gzip = createGzip({ level: 9 });
  const outputStream = fs.createWriteStream(localBackupPath);

  let pgDumpStderr = '';
  pgDumpProcess.stderr.on('data', (chunk) => {
    pgDumpStderr += chunk.toString();
  });

  const streamPipelinePromise = pipeline(pgDumpProcess.stdout, gzip, outputStream);

  const processExitPromise = new Promise((resolve, reject) => {
    pgDumpProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
    });
    pgDumpProcess.on('close', (code) => {
      if (code !== 0) {
        const cleanErr = sanitizeOutput(pgDumpStderr, sensitiveTokens).trim();
        let hint = '';
        if (cleanErr.includes('timeout') || cleanErr.includes('timed out') || cleanErr.includes('unreachable')) {
          hint = '\n👉 DIAGNOSTIC HINT: Connection timed out. If your SUPABASE_DB_URL uses "db.<ref>.supabase.co", switch to the IPv4-compatible Session Pooler at "aws-0-<region>.pooler.supabase.com:5432".';
        } else if (cleanErr.includes('password authentication failed')) {
          hint = '\n👉 DIAGNOSTIC HINT: Password authentication failed. Check your database password in SUPABASE_DB_URL. Special characters must be URL-encoded (e.g., %23 instead of #).';
        } else if (cleanErr.includes('server version mismatch')) {
          hint = '\n👉 DIAGNOSTIC HINT: Server version mismatch. Ensure postgresql-client-16 is installed in the workflow.';
        }
        reject(new Error(`pg_dump exited with non-zero code (${code}): ${cleanErr || 'Unknown error'}${hint}`));
      } else {
        resolve();
      }
    });
  });

  await Promise.all([streamPipelinePromise, processExitPromise]);

  if (!fs.existsSync(localBackupPath)) {
    throw new Error(`Backup file was not created: ${localBackupPath}`);
  }

  const localFileStats = fs.statSync(localBackupPath);
  if (localFileStats.size === 0) {
    throw new Error(`Generated backup file is empty (0 bytes): ${localBackupPath}`);
  }

  console.log(`[STEP 1/4 Completed] Backup extracted successfully! Local Size: ${toMegabytes(localFileStats.size)}`);

  // 4. Authenticate with Google Drive API
  console.log(`\n--- [STEP 2/4] AUTHENTICATING WITH GOOGLE DRIVE API ---`);
  const google = await loadGoogleApis();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  console.log('[STEP 2/4 Completed] Google Drive API client authenticated successfully.');

  // 5. Upload backup file to Google Drive
  console.log(`\n--- [STEP 3/4] UPLOADING COMPRESSED BACKUP TO GOOGLE DRIVE ---`);
  console.log(`Destination Folder ID: ${folderId}`);

  let uploadResponse;
  try {
    uploadResponse = await drive.files.create({
      requestBody: {
        name: backupFileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/gzip',
        body: fs.createReadStream(localBackupPath),
      },
      fields: 'id, name, size, mimeType',
      supportsAllDrives: true,
    });
  } catch (uploadError) {
    const errMsg = uploadError?.message || '';
    let hint = '';
    if (errMsg.includes('storageQuotaExceeded') || errMsg.includes('quota')) {
      hint = '\n👉 DIAGNOSTIC HINT: Google Drive error "storageQuotaExceeded". Google Service Accounts have 0 MB storage quota in personal Google Drive folders. Make sure you either: 1) Use a Google Workspace Shared Drive, OR 2) Share the folder with the Service Account and assign Editor permissions, OR 3) Use OAuth credentials for the personal account.';
    } else if (errMsg.includes('File not found') || errMsg.includes('notFound')) {
      hint = `\n👉 DIAGNOSTIC HINT: Google Drive folder "${folderId}" not found. Verify GDRIVE_FOLDER_ID and confirm the folder has been shared with "${credentials.client_email || 'Service Account'}" with Editor role.`;
    }
    throw new Error(`Google Drive upload failed: ${errMsg}${hint}`);
  }

  const uploadedFileId = uploadResponse.data?.id;
  if (!uploadedFileId) {
    throw new Error('Google Drive API response did not contain a valid file ID.');
  }

  const verifyResponse = await drive.files.get({
    fileId: uploadedFileId,
    fields: 'id, name, size, trashed',
    supportsAllDrives: true,
  });

  const remoteFileSize = Number(verifyResponse.data.size || uploadResponse.data?.size || 0);
  if (remoteFileSize <= 0) {
    throw new Error(`Verification failed: Uploaded file ID ${uploadedFileId} has invalid remote size (${remoteFileSize} bytes).`);
  }

  console.log(`[STEP 3/4 Completed] 100% Successful Upload! Remote File ID: ${uploadedFileId} (Size: ${toMegabytes(remoteFileSize)})`);

  // 6. Safe Rotation: Search and delete previous day's backup ONLY AFTER verified upload
  console.log(`\n--- [STEP 4/4] EXECUTING SAFE ROTATION (PREVIOUS DAY RETENTION) ---`);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  console.log(`Today date: ${dateStr} | Target previous day date: ${yesterdayStr}`);

  const listResponse = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name, createdTime, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const filesInFolder = listResponse.data.files || [];
  console.log(`Found ${filesInFolder.length} total file(s) in the target Google Drive folder.`);

  const previousBackups = filesInFolder.filter((file) => {
    return file.id !== uploadedFileId && file.name.startsWith(BACKUP_PREFIX);
  });

  const previousDayBackups = previousBackups.filter((file) => {
    return file.name.includes(yesterdayStr) || (file.createdTime && file.createdTime.startsWith(yesterdayStr));
  });

  let backupsToDelete = previousDayBackups;

  if (backupsToDelete.length === 0) {
    const olderBackups = previousBackups.filter((file) => !file.name.includes(dateStr));
    if (olderBackups.length > 0) {
      console.log(`[Safe Rotation] No backup strictly matched yesterday (${yesterdayStr}), but found ${olderBackups.length} older backup(s).`);
      backupsToDelete = olderBackups;
    }
  }

  if (backupsToDelete.length > 0) {
    for (const oldFile of backupsToDelete) {
      console.log(`[Safe Rotation] Deleting previous backup: "${oldFile.name}" (ID: ${oldFile.id})...`);
      await drive.files.delete({
        fileId: oldFile.id,
        supportsAllDrives: true,
      });
      console.log(`[Safe Rotation] Successfully deleted: "${oldFile.name}"`);
    }
  } else {
    console.log('[Safe Rotation] No previous backup found to rotate (initial backup established). Rotation skipped safely.');
  }

  // Cleanup local temporary file
  try {
    if (fs.existsSync(localBackupPath)) {
      fs.unlinkSync(localBackupPath);
      console.log(`[Cleanup] Removed local temporary file: ${backupFileName}`);
    }
  } catch (cleanErr) {
    console.warn(`[Cleanup Warning] Could not delete local temp file: ${cleanErr.message}`);
  }

  // Generate GitHub Step Summary if running inside Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryContent = `### 🛡️ EuroNova Database Backup Status: SUCCESS
- **Backup File:** \`${backupFileName}\`
- **Size:** ${toMegabytes(remoteFileSize)}
- **Google Drive File ID:** \`${uploadedFileId}\`
- **Target Folder:** \`${folderId}\`
- **Timestamp:** ${new Date().toISOString()}
- **Safe Rotation:** ${backupsToDelete.length > 0 ? `Rotated ${backupsToDelete.length} prior backup(s)` : 'Initial backup established (no files deleted)'}
`;
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryContent);
    } catch {
      // Ignore summary write errors
    }
  }

  console.log('\n================================================================');
  console.log('✅ EuroNova Database Backup Pipeline Finished Successfully!');
  console.log('================================================================');
}

// Global execution wrapper
try {
  await runBackupPipeline();
  process.exit(0);
} catch (error) {
  console.error('\n================================================================');
  console.error('❌ [CRITICAL BACKUP FAILURE] Execution aborted with error:');
  console.error('================================================================');

  const cleanMessage = sanitizeOutput(
    error?.message || error || 'Unknown runtime error',
    [
      process.env.SUPABASE_DB_URL,
      process.env.GDRIVE_SERVICE_ACCOUNT_JSON,
      process.env.GDRIVE_CREDENTIALS_DATA,
      process.env.GDRIVE_CREDENTIALS,
    ]
  );
  console.error(cleanMessage);

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const summaryContent = `### ❌ EuroNova Database Backup Status: FAILED
**Error Details:**
\`\`\`text
${cleanMessage}
\`\`\`
> Please check repository secrets (\`SUPABASE_DB_URL\`, \`GDRIVE_SERVICE_ACCOUNT_JSON\` / \`GDRIVE_CREDENTIALS_DATA\`, \`GDRIVE_FOLDER_ID\`) and ensure your database connection uses the IPv4 Session Pooler on port 5432.
`;
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryContent);
    } catch {
      // Ignore
    }
  }

  process.exit(1);
}
