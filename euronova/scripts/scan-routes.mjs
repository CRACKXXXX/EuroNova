import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, "../app/[locale]");

const SKIP_FILES = new Set([
  // We do not touch layouts without explicit permission per rule 2
  "layout.tsx",
]);

const INTENTIONAL_EXCEPTIONS = new Set([
  "EuroNova",
  "EURO-NOVA ADMIN",
  "MODERATOR",
  "SUPPORT",
  "NGO Coordinator",
  "Verified Volunteer",
  "Español",
  "English",
  "Français",
  "Deutsch",
  "Italiano",
  "Русский",
  "Português",
]);

function isExcluded(text) {
  if (!text || text.trim().length < 3) return true;
  const t = text.trim();
  if (/^[\s\d.,;:·•\-–—\/\\|@#%^&*()=+\[\]{}<>?!~`"']+$/.test(t)) return true;
  if (/^\{.*\}$/.test(t)) return true;
  if (/^&[a-z]+;$/.test(t)) return true;
  if (/^\d[\d\s,.XPxp%€$#+]*$/.test(t)) return true;
  if (INTENTIONAL_EXCEPTIONS.has(t)) return true;
  if (t.startsWith("//") || t.startsWith("/*")) return true;
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(t)) return true; // css classes or ids
  return false;
}

function getAllFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      if (!SKIP_FILES.has(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const relPath = path.relative(path.resolve(__dirname, ".."), filePath).replace(/\\/g, "/");
  const lines = content.split("\n");
  const findings = [];

  const addFinding = (lineNum, category, text) => {
    const trimmed = text.trim();
    if (isExcluded(trimmed)) return;
    findings.push({ line: lineNum, category, text: trimmed.substring(0, 90) });
  };

  const isTsx = filePath.endsWith(".tsx");
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const ltrim = line.trim();
    if (ltrim.startsWith("//") || ltrim.startsWith("*")) return;
    if (line.includes("import ") || line.includes("from \"") || line.includes("from '")) return;
    if (line.includes("className=") && !line.match(/>[^<]+</)) return;

    if (!isTsx) return;
    if (line.includes("=>") && line.includes("Promise<")) return;
    if (line.trim().startsWith("type ") || line.trim().startsWith("interface ")) return;

    // 1. Text between > ... <
    const jsxMatches = [...line.matchAll(/>\s*([A-Za-z][^<\n{]{3,}?)\s*</g)];
    for (const m of jsxMatches) {
      const text = m[1].trim();
      if (!text || text.includes("{") || text.includes("}")) continue;
      if (isExcluded(text)) continue;
      if (line.includes("t(\"") || line.includes("t('") || line.includes("tX(\"") || line.includes("t.rich(\"")) continue;
      addFinding(lineNum, "JSX_TEXT", text);
    }

    // 2. Standalone line with JSX text
    const standalone = line.match(/^(\s{2,})([A-Z][a-z0-9].{3,})\s*$/);
    if (standalone) {
      const text = standalone[2].trim();
      if (!isExcluded(text)) {
        const prevLine = (lines[i - 1] || "").trim();
        if (prevLine.endsWith(">") && !line.includes("t(\"") && !line.includes("t('") && !line.includes("t.rich(\"")) {
          addFinding(lineNum, "JSX_TEXT_STANDALONE", text);
        }
      }
    }

    // 3. Option elements
    const optMatch = line.match(/<option[^>]*>([^<]+)<\/option>/);
    if (optMatch) {
      const text = optMatch[1].trim();
      if (!text.includes("{") && !isExcluded(text) && !line.includes("t(\"") && !line.includes("t('")) {
        addFinding(lineNum, "OPTION_TEXT", text);
      }
    }
  });

  // 4. toast() strings
  const TOAST_STR = /toast\.(error|success|warning|info)\s*\(\s*["']([^"']{5,})["']/g;
  const TOAST_TPL = /toast\.(error|success|warning|info)\s*\(\s*`([^`]{5,})`/g;
  for (const m of [...content.matchAll(TOAST_STR)]) {
    if (!isExcluded(m[2]) && !m[2].startsWith("t(")) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, `toast.${m[1]}()`, m[2].substring(0, 90));
    }
  }
  for (const m of [...content.matchAll(TOAST_TPL)]) {
    if (!isExcluded(m[2]) && !m[2].includes("t(\"") && !m[2].includes("t('")) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, `toast.${m[1]}(template)`, m[2].substring(0, 90));
    }
  }

  // 5. Fallback strings: t(...) || "..."
  const FALLBACK = /t(?:X)?\s*\([^)]+\)\s*\|\|\s*["']([A-Z][^"']{3,})["']/g;
  for (const m of [...content.matchAll(FALLBACK)]) {
    if (!isExcluded(m[1])) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, "FALLBACK_STRING", m[1].substring(0, 90));
    }
  }

  // 6. Hardcoded attributes: placeholder, title, aria-label
  const ATTR1 = /(?:title|aria-label|placeholder)=\{"([^"]{5,})"\}/g;
  const ATTR2 = /(?:title|aria-label|placeholder)="([^"{][A-Za-z][^"]{4,})"/g;
  for (const m of [...content.matchAll(ATTR1), ...content.matchAll(ATTR2)]) {
    const text = m[1];
    if (!isExcluded(text) && !text.startsWith("t(") && !text.startsWith("tX(")) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, "ATTR_HARDCODED", text.substring(0, 90));
    }
  }

  // Deduplicate findings per line & text
  const seen = new Set();
  const deduped = findings.filter(f => {
    const key = `${f.line}:${f.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { relPath, findings: deduped };
}

function run() {
  const allFiles = getAllFiles(ROUTES_DIR);
  const reports = allFiles.map(analyzeFile);
  const withIssues = reports.filter(r => r.findings.length > 0);
  const totalFindings = withIssues.reduce((sum, r) => sum + r.findings.length, 0);

  console.log("═════════════════════════════════════════════════════════════════════════════════════");
  console.log("  EURONOVA — Phase C-Reloaded (Part 2/3) — Route Tree Diagnostic Report");
  console.log(`  Target: app/[locale]/** (${allFiles.length} files scanned)`);
  console.log(`  Total files with issues: ${withIssues.length} | Clean files: ${allFiles.length - withIssues.length} | Total findings: ${totalFindings}`);
  console.log("═════════════════════════════════════════════════════════════════════════════════════\n");

  console.log("📋 SUMMARY OF FILES WITH FINDINGS:\n");
  withIssues.forEach(r => {
    console.log(`  ▶ ${r.relPath} (${r.findings.length} findings)`);
  });

  console.log("\n═════════════════════════════════════════════════════════════════════════════════════");
  console.log("  DETAILED FINDINGS (First 10 files)");
  console.log("═════════════════════════════════════════════════════════════════════════════════════\n");

  withIssues.slice(0, 10).forEach(r => {
    console.log(`\n  ▶ ${r.relPath} (${r.findings.length} findings)`);
    r.findings.forEach(f => {
      console.log(`     [${f.category}] L${f.line} │ ${f.text}`);
    });
  });

  fs.writeFileSync(
    path.resolve(__dirname, "routes_findings.json"),
    JSON.stringify(withIssues, null, 2),
    "utf-8"
  );
  console.log(`\nFull findings written to scripts/routes_findings.json`);
}

run();
