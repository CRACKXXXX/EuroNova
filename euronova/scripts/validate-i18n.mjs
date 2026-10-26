import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.resolve(__dirname, "../messages");

const MASTER_LOCALE = "en";
const TARGET_LOCALES = ["es", "de", "fr", "it", "ru", "pt"];

// ANSI Color Codes for Terminal Output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

/**
 * Recursively extracts all dot-notation leaf keys from a JSON object.
 */
function extractLeafKeys(obj, prefix = "") {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(extractLeafKeys(value, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

/**
 * Main dictionary validation logic.
 */
function validateI18n() {
  console.log(`\n${BOLD}${CYAN}=== EURONOVA I18N DICTIONARY VALIDATOR ===${RESET}\n`);

  const masterPath = path.join(messagesDir, `${MASTER_LOCALE}.json`);
  if (!fs.existsSync(masterPath)) {
    console.error(`${RED}Master dictionary not found at: ${masterPath}${RESET}`);
    process.exit(1);
  }

  let masterJson;
  try {
    masterJson = JSON.parse(fs.readFileSync(masterPath, "utf8"));
  } catch (err) {
    console.error(`${RED}Failed to parse master dictionary ${masterPath}: ${err.message}${RESET}`);
    process.exit(1);
  }

  const masterKeys = extractLeafKeys(masterJson);
  const masterKeySet = new Set(masterKeys);
  console.log(`${GRAY}Master Dictionary (${MASTER_LOCALE}.json):${RESET} ${BOLD}${masterKeys.length}${RESET} leaf keys registered.\n`);

  let totalMissingAcrossAll = 0;
  const missingByLocale = {};
  const extraByLocale = {};

  for (const locale of TARGET_LOCALES) {
    const localePath = path.join(messagesDir, `${locale}.json`);
    if (!fs.existsSync(localePath)) {
      console.warn(`${YELLOW}[MISSING FILE] Dictionary for '${locale}' not found at: ${localePath}${RESET}`);
      continue;
    }

    let localeJson;
    try {
      localeJson = JSON.parse(fs.readFileSync(localePath, "utf8"));
    } catch (err) {
      console.error(`${RED}Failed to parse '${locale}.json': ${err.message}${RESET}`);
      continue;
    }

    const localeKeys = extractLeafKeys(localeJson);
    const localeKeySet = new Set(localeKeys);

    const missingKeys = masterKeys.filter((key) => !localeKeySet.has(key));
    const extraKeys = localeKeys.filter((key) => !masterKeySet.has(key));

    missingByLocale[locale] = missingKeys;
    extraByLocale[locale] = extraKeys;
    totalMissingAcrossAll += missingKeys.length;

    const coveragePct = (((masterKeys.length - missingKeys.length) / masterKeys.length) * 100).toFixed(1);
    const statusColor = missingKeys.length === 0 ? GREEN : YELLOW;

    console.log(
      `${statusColor}• [${locale.toUpperCase()}]${RESET} ` +
      `Keys: ${BOLD}${localeKeys.length}${RESET}/${masterKeys.length} ` +
      `(${coveragePct}% coverage) — ` +
      (missingKeys.length === 0
        ? `${GREEN}Flawless parity${RESET}`
        : `${YELLOW}${missingKeys.length} keys missing${RESET}` +
          (extraKeys.length > 0 ? `, ${CYAN}${extraKeys.length} obsolete/extra${RESET}` : ""))
    );
  }

  console.log("");

  // Detailed Breakdown for Locales with Missing Keys
  if (totalMissingAcrossAll > 0) {
    console.log(`${BOLD}${YELLOW}⚠️  TOP MISSING NAMESPACES PER LOCALE:${RESET}`);
    for (const locale of TARGET_LOCALES) {
      const missing = missingByLocale[locale] || [];
      if (missing.length === 0) continue;

      const namespaceCounts = {};
      for (const k of missing) {
        const ns = k.split(".")[0];
        namespaceCounts[ns] = (namespaceCounts[ns] || 0) + 1;
      }

      const topNamespaces = Object.entries(namespaceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ns, count]) => `${ns} (${count})`)
        .join(", ");

      console.log(`  - ${BOLD}${locale.toUpperCase()}:${RESET} Missing in [${topNamespaces}]`);
    }
    console.log("");
  }

  // Strict / CI Mode Check
  const isCI = process.env.CI === "true";
  const isStrict = isCI || process.env.STRICT_I18N === "true" || process.argv.includes("--strict");

  if (isStrict && totalMissingAcrossAll > 0) {
    console.error(
      `${BOLD}${RED}❌ FATAL ERROR (CI/Strict Mode): Dictionary validation failed with ${totalMissingAcrossAll} total missing keys across locales.${RESET}`
    );
    console.error(`${RED}Ensure all translation keys are synced with master en.json before merging to production.${RESET}\n`);
    process.exit(1);
  } else if (totalMissingAcrossAll > 0) {
    console.log(
      `${BOLD}${YELLOW}ℹ️  LOCAL MODE NOTICE:${RESET} Runtime Graceful Fallback (Deep Merge) will silently serve master English keys for missing translations in production.`
    );
    console.log(`${GRAY}Run with --strict or CI=true to enforce 100% dictionary parity.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${BOLD}${GREEN}✅ All dictionaries are in 100% parity with master en.json!${RESET}\n`);
    process.exit(0);
  }
}

validateI18n();
