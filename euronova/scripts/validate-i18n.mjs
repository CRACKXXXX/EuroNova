import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default || traverseModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const messagesDir = path.resolve(projectRoot, "messages");

const MASTER_LOCALE = "en";
const TARGET_LOCALES = ["es", "de", "fr", "it", "ru", "pt"];
const ALL_LOCALES = [MASTER_LOCALE, ...TARGET_LOCALES];

// ANSI Color Codes for Terminal Output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

/**
 * Recursively extracts all dot-notation leaf keys and values from a JSON object.
 */
function extractLeafEntries(obj, prefix = "") {
  let entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries = entries.concat(extractLeafEntries(value, fullPath));
    } else {
      entries.push({ key: fullPath, value: String(value) });
    }
  }
  return entries;
}

function getNestedValue(obj, dotPath) {
  const parts = dotPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function getAllFiles(dir, extensions = [".tsx", ".ts"]) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "scratch") {
        files = files.concat(getAllFiles(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractNamespaceFromCall(callExpr) {
  if (!callExpr || callExpr.type !== "CallExpression") return null;
  const callee = callExpr.callee;
  const calleeName = callee.name || (callee.property && callee.property.name);
  if (calleeName !== "useTranslations" && calleeName !== "getTranslations") return null;

  if (callExpr.arguments.length === 0) return "";
  const arg0 = callExpr.arguments[0];
  if (arg0.type === "StringLiteral") {
    return arg0.value;
  }
  if (arg0.type === "ObjectExpression") {
    for (const prop of arg0.properties) {
      if (
        prop.type === "ObjectProperty" &&
        ((prop.key.type === "Identifier" && prop.key.name === "namespace") ||
          (prop.key.type === "StringLiteral" && prop.key.value === "namespace"))
      ) {
        if (prop.value.type === "StringLiteral") {
          return prop.value.value;
        }
      }
    }
  }
  return "";
}

/**
 * Scan all t("...") calls in app/ and components/ and verify they exist in master en.json.
 */
function auditCodebaseTranslationCalls(masterJson) {
  const scanDirs = [
    path.join(projectRoot, "app"),
    path.join(projectRoot, "components"),
  ];

  const files = scanDirs.flatMap((dir) => getAllFiles(dir));
  const missingInCode = [];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf-8");
    if (!code.includes("Translation") && !code.includes("t(") && !code.includes("t.") && !code.includes("Translator")) {
      continue;
    }

    let ast;
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch {
      continue;
    }

    const fileLevelTranslators = new Map();
    const normPath = file.replace(/\\/g, "/");
    if (normPath.includes("dashboard/admin/components/")) {
      fileLevelTranslators.set("t", { namespace: "AdminPanel" });
    } else if (normPath.includes("dashboard/my-missions/components/")) {
      fileLevelTranslators.set("t", { namespace: "MyMissions" });
    } else if (normPath.includes("components/forum/")) {
      fileLevelTranslators.set("t", { namespace: "GlobalForum" });
    } else if (normPath.includes("components/map/ProjectsMap.tsx")) {
      fileLevelTranslators.set("t", { namespace: "Map" });
    } else if (normPath.includes("components/ErasmusFaqSection.tsx")) {
      fileLevelTranslators.set("t", { namespace: "ErasmusFaq" });
    }

    traverse(ast, {
      Scope(scopePath) {
        const bindings = scopePath.scope.bindings;
        for (const [, binding] of Object.entries(bindings)) {
          if (!binding.path.isVariableDeclarator()) continue;
          const node = binding.path.node;
          let init = node.init;
          if (!init) continue;
          if (init.type === "AwaitExpression") init = init.argument;

          const ns = extractNamespaceFromCall(init);
          if (ns !== null) {
            binding.euroNovaNamespace = ns;
          }

          if (
            init &&
            init.type === "CallExpression" &&
            init.callee?.type === "MemberExpression" &&
            init.callee.object?.name === "Promise" &&
            init.callee.property?.name === "all" &&
            init.arguments.length > 0 &&
            init.arguments[0].type === "ArrayExpression" &&
            node.id.type === "ArrayPattern"
          ) {
            const elements = init.arguments[0].elements;
            const patternElements = node.id.elements;

            for (let i = 0; i < Math.min(elements.length, patternElements.length); i++) {
              const pat = patternElements[i];
              const el = elements[i];
              if (!pat || !el) continue;

              let elCall = el;
              if (elCall.type === "AwaitExpression") elCall = elCall.argument;

              const arrayNs = extractNamespaceFromCall(elCall);
              if (arrayNs !== null && pat.type === "Identifier") {
                const elBinding = scopePath.scope.getBinding(pat.name);
                if (elBinding) {
                  elBinding.euroNovaNamespace = arrayNs;
                }
              }
            }
          }
        }
      },

      CallExpression(p) {
        let calleeName = null;

        if (p.node.callee.type === "Identifier") {
          calleeName = p.node.callee.name;
        } else if (
          p.node.callee.type === "MemberExpression" &&
          p.node.callee.object.type === "Identifier" &&
          p.node.callee.property.type === "Identifier"
        ) {
          calleeName = p.node.callee.object.name;
        }

        if (!calleeName) return;

        const looksLikeTranslator = /^t([A-Z][a-zA-Z0-9]*)?$/.test(calleeName);
        const binding = p.scope.getBinding(calleeName);
        const hasNamespace = binding && typeof binding.euroNovaNamespace === "string";
        const isFilePropTranslator = fileLevelTranslators.has(calleeName);

        if (!hasNamespace && !looksLikeTranslator && !isFilePropTranslator) return;

        let namespace = "";
        if (hasNamespace) {
          namespace = binding.euroNovaNamespace;
        } else if (isFilePropTranslator) {
          namespace = fileLevelTranslators.get(calleeName).namespace;
        }

        const arg0 = p.node.arguments[0];
        if (!arg0 || arg0.type !== "StringLiteral") return;

        const key = arg0.value;
        const fullKey = namespace ? `${namespace}.${key}` : key;
        const val = getNestedValue(masterJson, fullKey);

        if (val === undefined) {
          missingInCode.push({
            file: path.relative(projectRoot, file).replace(/\\/g, "/"),
            line: p.node.loc?.start.line || 0,
            calleeName,
            key,
            fullKey,
          });
        }
      },
    });
  }

  return missingInCode;
}

/**
 * Main dictionary validation logic.
 */
function validateI18n() {
  console.log(`\n${BOLD}${CYAN}=== EURONOVA EXTREME I18N VALIDATOR & REGRESSION SHIELD ===${RESET}\n`);

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

  const masterEntries = extractLeafEntries(masterJson);
  const masterKeyMap = new Map(masterEntries.map((e) => [e.key, e.value]));
  const masterKeys = Array.from(masterKeyMap.keys());
  const masterKeySet = new Set(masterKeys);

  console.log(`${GRAY}Master Dictionary (${MASTER_LOCALE}.json):${RESET} ${BOLD}${masterKeys.length}${RESET} leaf keys registered.\n`);

  let totalMissingAcrossAll = 0;
  const missingByLocale = {};
  const extraByLocale = {};
  const dictionaries = { [MASTER_LOCALE]: masterJson };

  // 1. KEY PARITY CHECK ACROSS ALL TARGET LOCALES
  for (const locale of TARGET_LOCALES) {
    const localePath = path.join(messagesDir, `${locale}.json`);
    if (!fs.existsSync(localePath)) {
      console.warn(`${YELLOW}[MISSING FILE] Dictionary for '${locale}' not found at: ${localePath}${RESET}`);
      continue;
    }

    let localeJson;
    try {
      localeJson = JSON.parse(fs.readFileSync(localePath, "utf8"));
      dictionaries[locale] = localeJson;
    } catch (err) {
      console.error(`${RED}Failed to parse '${locale}.json': ${err.message}${RESET}`);
      continue;
    }

    const localeEntries = extractLeafEntries(localeJson);
    const localeKeySet = new Set(localeEntries.map((e) => e.key));

    const missingKeys = masterKeys.filter((key) => !localeKeySet.has(key));
    const extraKeys = Array.from(localeKeySet).filter((key) => !masterKeySet.has(key));

    missingByLocale[locale] = missingKeys;
    extraByLocale[locale] = extraKeys;
    totalMissingAcrossAll += missingKeys.length;

    const coveragePct = (((masterKeys.length - missingKeys.length) / masterKeys.length) * 100).toFixed(1);
    const statusColor = missingKeys.length === 0 ? GREEN : YELLOW;

    console.log(
      `${statusColor}• [${locale.toUpperCase()}]${RESET} ` +
      `Keys: ${BOLD}${localeKeySet.size}${RESET}/${masterKeys.length} ` +
      `(${coveragePct}% coverage) — ` +
      (missingKeys.length === 0
        ? `${GREEN}Flawless parity${RESET}`
        : `${YELLOW}${missingKeys.length} keys missing${RESET}` +
          (extraKeys.length > 0 ? `, ${CYAN}${extraKeys.length} obsolete/extra${RESET}` : ""))
    );
  }

  console.log("");

  // 2. ZERO HTML TAGS WITH ATTRIBUTES CHECK
  const htmlAttributeErrors = [];
  const htmlAttrRegex = /<[a-zA-Z]+(?:\s+[^>]+)>/i;

  for (const loc of ALL_LOCALES) {
    if (!dictionaries[loc]) continue;
    const entries = extractLeafEntries(dictionaries[loc]);
    for (const { key, value } of entries) {
      if (htmlAttrRegex.test(value)) {
        htmlAttributeErrors.push({ loc, key, value });
      }
    }
  }

  // 3. EXTREME LENGTH-RATIO ANOMALIES CHECK
  const lengthRatioAnomalies = [];
  for (const loc of TARGET_LOCALES) {
    if (!dictionaries[loc]) continue;
    const entries = extractLeafEntries(dictionaries[loc]);
    const map = new Map(entries.map((e) => [e.key, e.value]));

    for (const [key, enVal] of masterKeyMap.entries()) {
      const targetVal = map.get(key);
      if (!targetVal) continue;

      // Extreme short label expansion into full paragraph (>4x ratio and target > 75 chars)
      if (enVal.length <= 25 && targetVal.length >= 75) {
        lengthRatioAnomalies.push({
          loc,
          key,
          reason: `Short string (${enVal.length} chars) corrupted into paragraph (${targetVal.length} chars)`,
          enVal,
          targetVal,
        });
      }

      // Extreme long text collapse into single stub word (<0.15x ratio and en > 50 chars)
      if (enVal.length >= 50 && targetVal.length <= 10) {
        lengthRatioAnomalies.push({
          loc,
          key,
          reason: `Long paragraph (${enVal.length} chars) truncated into stub word (${targetVal.length} chars)`,
          enVal,
          targetVal,
        });
      }
    }
  }

  // 4. CODEBASE STATIC t(...) CALLS VERIFICATION
  console.log(`${GRAY}Auditing AST of all static t(...) calls in app/ and components/...${RESET}`);
  const missingCodeCalls = auditCodebaseTranslationCalls(masterJson);

  // REPORTING
  console.log(`\n${BOLD}=== INTEGRITY AUDIT SUMMARY ===${RESET}`);
  console.log(`• Key Parity Errors:        ${totalMissingAcrossAll === 0 ? GREEN + "0" : RED + totalMissingAcrossAll}${RESET}`);
  console.log(`• HTML Attribute Errors:     ${htmlAttributeErrors.length === 0 ? GREEN + "0" : RED + htmlAttributeErrors.length}${RESET}`);
  console.log(`• Extreme Length Anomalies:  ${lengthRatioAnomalies.length === 0 ? GREEN + "0" : RED + lengthRatioAnomalies.length}${RESET}`);
  console.log(`• Missing t(...) Calls:      ${missingCodeCalls.length === 0 ? GREEN + "0" : RED + missingCodeCalls.length}${RESET}\n`);

  if (htmlAttributeErrors.length > 0) {
    console.error(`${BOLD}${RED}❌ HTML TAGS WITH FORBIDDEN ATTRIBUTES DETECTED:${RESET}`);
    for (const err of htmlAttributeErrors) {
      console.error(`  - [${err.loc.toUpperCase()}] ${err.key}: "${err.value}"`);
    }
    console.log("");
  }

  if (lengthRatioAnomalies.length > 0) {
    console.error(`${BOLD}${RED}❌ EXTREME LENGTH-RATIO ANOMALIES DETECTED:${RESET}`);
    for (const a of lengthRatioAnomalies) {
      console.error(`  - [${a.loc.toUpperCase()}] ${a.key}: ${a.reason}`);
      console.error(`    EN:     "${a.enVal}"`);
      console.error(`    TARGET: "${a.targetVal}"`);
    }
    console.log("");
  }

  if (missingCodeCalls.length > 0) {
    console.error(`${BOLD}${RED}❌ CODEBASE TRANSLATION CALLS MISSING FROM en.json:${RESET}`);
    for (const c of missingCodeCalls) {
      console.error(`  - [${c.file}:${c.line}] ${c.calleeName}("${c.key}") -> '${c.fullKey}'`);
    }
    console.log("");
  }

  // Strict / CI Mode Check
  const isCI = process.env.CI === "true";
  const isStrict = isCI || process.env.STRICT_I18N === "true" || process.argv.includes("--strict");

  const totalErrors =
    totalMissingAcrossAll +
    htmlAttributeErrors.length +
    lengthRatioAnomalies.length +
    missingCodeCalls.length;

  if (isStrict && totalErrors > 0) {
    console.error(
      `${BOLD}${RED}❌ FATAL ERROR (Strict Mode): Validation failed with ${totalErrors} total issues.${RESET}\n`
    );
    process.exit(1);
  } else if (totalErrors > 0) {
    console.log(
      `${BOLD}${YELLOW}ℹ️  LOCAL MODE NOTICE:${RESET} Found ${totalErrors} warnings. Run with --strict to enforce 100% compliance.\n`
    );
    process.exit(0);
  } else {
    console.log(`${BOLD}${GREEN}✅ 100% PARITY & ZERO-REGRESSION PASSED! All dictionaries & translation calls are clean.${RESET}\n`);
    process.exit(0);
  }
}

validateI18n();
