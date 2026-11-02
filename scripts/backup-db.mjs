#!/usr/bin/env node

/**
 * ==============================================================================
 * EuroNova — Automated Supabase PostgreSQL DB Backup & Safe Rotation
 * ==============================================================================
 * Pipeline:
 *  1. Execute pg_dump (via SUPABASE_DB_URL) piped through gzip to a local .sql.gz
 *  2. Authenticate with Google Drive API via Service Account JSON
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
 * Optional local environment loader: loads .env.local if present (useful for local CLI runs)
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

async function runBackupPipeline() {
  loadLocalEnvIfPresent();

  console.log('================================================================');
  console.log('🚀 EuroNova Database Backup Pipeline: Initializing...');
  console.log('================================================================');

  // 1. Verify required environment variables
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  const rawServiceAccountJson = process.env.GDRIVE_SERVICE_ACCOUNT_JSON?.trim();
  const folderId = process.env.GDRIVE_FOLDER_ID?.trim();

  const missingEnv = [];
  if (!dbUrl) missingEnv.push('SUPABASE_DB_URL');
  if (!rawServiceAccountJson) missingEnv.push('GDRIVE_SERVICE_ACCOUNT_JSON');
  if (!folderId) missingEnv.push('GDRIVE_FOLDER_ID');

  if (missingEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  }

  // Extract database metadata safely for logging without leaking the password
  let dbPassword = '';
  let maskedDbTarget = 'postgresql://***';
  try {
    const parsedUrl = new URL(dbUrl);
    dbPassword = parsedUrl.password || '';
    const port = parsedUrl.port ? `:${parsedUrl.port}` : '';
    maskedDbTarget = `${parsedUrl.protocol}//${parsedUrl.username ? parsedUrl.username + ':***@' : ''}${parsedUrl.hostname}${port}${parsedUrl.pathname}`;
  } catch {
    maskedDbTarget = 'postgresql://[DATABASE_TARGET_MASKED]';
  }

  const sensitiveTokens = [dbUrl, dbPassword, rawServiceAccountJson];

  // 2. Parse Google Service Account credentials (support raw JSON or base64)
  let serviceAccountCredentials;
  try {
    if (rawServiceAccountJson.startsWith('{')) {
      serviceAccountCredentials = JSON.parse(rawServiceAccountJson);
    } else {
      const decoded = Buffer.from(rawServiceAccountJson, 'base64').toString('utf8');
      serviceAccountCredentials = JSON.parse(decoded);
    }
  } catch (parseError) {
    throw new Error(`Failed to parse GDRIVE_SERVICE_ACCOUNT_JSON. Ensure it is valid JSON or Base64 JSON: ${parseError.message}`);
  }

  if (!serviceAccountCredentials.client_email || !serviceAccountCredentials.private_key) {
    throw new Error('Invalid Service Account JSON: Missing client_email or private_key fields.');
  }

  sensitiveTokens.push(serviceAccountCredentials.private_key);

  console.log(`[Config Check] Target Database: ${maskedDbTarget}`);
  console.log(`[Config Check] GDrive Service Account: ${serviceAccountCredentials.client_email}`);
  console.log(`[Config Check] GDrive Folder ID: ${folderId}`);

  // 3. Setup timestamped filenames
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-'); // "HH-MM-SS"
  const backupFileName = `${BACKUP_PREFIX}${dateStr}_${timeStr}.sql.gz`;
  const localBackupPath = path.resolve(process.cwd(), backupFileName);

  console.log(`\n--- [STEP 1/4] DUMPING SUPABASE DATABASE (pg_dump + gzip) ---`);
  console.log(`Target local file: ${backupFileName}`);

  // Execute pg_dump streaming directly into Node.js gzip compression
  const pgDumpArgs = [
    `--dbname=${dbUrl}`,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ];

  const pgDumpProcess = spawn('pg_dump', pgDumpArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
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
        reject(new Error(`pg_dump exited with non-zero code (${code}): ${cleanErr || 'Unknown error'}`));
      } else {
        resolve();
      }
    });
  });

  await Promise.all([streamPipelinePromise, processExitPromise]);

  // Validate local file integrity
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
    credentials: serviceAccountCredentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  console.log('[STEP 2/4 Completed] Google Drive API client authenticated successfully.');

  // 5. Upload backup file to Google Drive
  console.log(`\n--- [STEP 3/4] UPLOADING COMPRESSED BACKUP TO GOOGLE DRIVE ---`);
  console.log(`Destination Folder ID: ${folderId}`);

  const uploadResponse = await drive.files.create({
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

  const uploadedFileId = uploadResponse.data?.id;
  if (!uploadedFileId) {
    throw new Error('Google Drive API response did not contain a valid file ID.');
  }

  // Verification: Fetch file metadata from Google Drive to confirm size > 0
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
  const yesterdayStr = yesterday.toISOString().slice(0, 10); // "YYYY-MM-DD"
  console.log(`Today date: ${dateStr} | Target previous day date: ${yesterdayStr}`);

  const listResponse = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name, createdTime, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const filesInFolder = listResponse.data.files || [];
  console.log(`Found ${filesInFolder.length} total file(s) in the target Google Drive folder.`);

  // Find candidate backup files excluding the new one
  const previousBackups = filesInFolder.filter((file) => {
    return file.id !== uploadedFileId && file.name.startsWith(BACKUP_PREFIX);
  });

  // Specifically match files containing yesterday's date
  const previousDayBackups = previousBackups.filter((file) => {
    return file.name.includes(yesterdayStr) || (file.createdTime && file.createdTime.startsWith(yesterdayStr));
  });

  let backupsToDelete = previousDayBackups;

  // Fallback: If no backup specifically matches yesterday, find any older backups from days prior to today
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
    [process.env.SUPABASE_DB_URL, process.env.GDRIVE_SERVICE_ACCOUNT_JSON]
  );
  console.error(cleanMessage);

  process.exit(1);
}
