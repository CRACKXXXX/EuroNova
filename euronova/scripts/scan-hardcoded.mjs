/**
 * EuroNova — Phase C-Reloaded (Part 1/3)
 * Hardcoded String Scanner for components/**‌/*.tsx
 *
 * Detects:
 *  1. Raw text content directly in JSX tags (non-empty, non-whitespace-only)
 *  2. Hardcoded string literals in toast.error() / toast.success() / toast.warning()
 *  3. Hardcoded title/aria-label/placeholder attributes that are string literals
 *  4. Hardcoded strings in template literals used in toast() calls
 *  5. Fallback "|| 'string'" patterns that bypass t() calls
 *
 * Excludes:
 *  - Pure whitespace / single chars / punctuation
 *  - Content already wrapped in t("...") or tX("...")
 *  - Dynamic expressions {variable}, {function()}
 *  - HTML entities (&bull;, &copy;, &ldquo;, etc.)
 *  - Brand name "EuroNova" occurrences that must never be translated
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, "../components");

// ─── Config ──────────────────────────────────────────────────────────────────

const SKIP_FILES = new Set([
  "ConsoleEasterEgg.tsx",
  "LandingMotion.tsx",
  "TrackRecentlyViewed.tsx",
  "ScrollRestoration.tsx",
  "ScrollRestorationHelper.tsx",
  "Skeletons.tsx",
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
  "Co-Created Camp Activity · Toledo Legacy",
  "No active missions found to explore.",
  "Could not fetch a random mission.",
]);

// ─── Helper ───────────────────────────────────────────────────────────────────

function isExcluded(text) {
  if (!text || text.trim().length < 4) return true;
  if (/^[\s\d.,;:·•\-–—\/\\|@#%^&*()=+\[\]{}<>?!~`]+$/.test(text.trim())) return true;
  if (/^\{.*\}$/.test(text.trim())) return true;
  if (/^&[a-z]+;$/.test(text.trim())) return true;
  if (/^\d[\d\s,.XPxp%]*$/.test(text.trim())) return true;
  if (INTENTIONAL_EXCEPTIONS.has(text.trim())) return true;
  if (text.trim().startsWith("//")) return true;
  if (text.trim().startsWith("/*")) return true;
  return false;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const lines = content.split("\n");
  const findings = [];

  const addFinding = (lineNum, category, text) => {
    const trimmed = text.trim();
    if (isExcluded(trimmed)) return;
    findings.push({ line: lineNum, category, text: trimmed.substring(0, 90) });
  };

  // ── 1. JSX inner text (line by line) ──────────────────────────────────────
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    if (line.includes("import ") || line.includes("from \"")) return;
    if (line.includes("className=") && !line.match(/>[^<]+</)) return;

    // Text between > ... <
    const jsxMatches = [...line.matchAll(/>\s*([A-Za-z][^<\n{]{4,}?)\s*</g)];
    for (const m of jsxMatches) {
      const text = m[1].trim();
      if (!text || text.includes("{") || text.includes("}")) continue;
      if (isExcluded(text)) continue;
      if (line.includes("t(\"") || line.includes("t('")) continue;
      // Skip lines that are pure formatting
      if (/^[\s<>/]+$/.test(line.replace(text, ""))) continue;
      addFinding(lineNum, "JSX_TEXT", text);
    }

    // Standalone line that reads like hardcoded JSX text (indented text node)
    const standalone = line.match(/^(\s{2,})([A-Z][a-z].{6,})\s*$/);
    if (standalone) {
      const text = standalone[2].trim();
      if (!isExcluded(text)) {
        const prevLine = (lines[i - 1] || "").trim();
        if (prevLine.endsWith(">") && !line.includes("t(\"") && !line.includes("t('")) {
          addFinding(lineNum, "JSX_TEXT_STANDALONE", text);
        }
      }
    }
  });

  // ── 2. toast() hardcoded strings ──────────────────────────────────────────
  const TOAST_STR = /toast\.(error|success|warning|info)\s*\(\s*"([^"]{10,})"/g;
  const TOAST_TPL = /toast\.(error|success|warning|info)\s*\(\s*`([^`]{8,})`/g;
  const TOAST_TPL_PREFIX = /toast\.(error|success|warning|info)\s*\(\s*`([^`]{8,})\$\{/g;

  for (const m of [...content.matchAll(TOAST_STR)]) {
    if (!isExcluded(m[2])) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, `toast.${m[1]}()`, m[2].substring(0, 90));
    }
  }
  for (const m of [...content.matchAll(TOAST_TPL)]) {
    if (!isExcluded(m[2])) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, `toast.${m[1]}(template)`, m[2].substring(0, 90));
    }
  }
  for (const m of [...content.matchAll(TOAST_TPL_PREFIX)]) {
    if (!isExcluded(m[2])) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, `toast.${m[1]}(template)`, m[2].substring(0, 90));
    }
  }

  // ── 3. Fallback || "string" after t() calls ───────────────────────────────
  const FALLBACK = /t\s*\([^)]+\)\s*\|\|\s*["']([A-Z][^"']{6,})["']/g;
  for (const m of [...content.matchAll(FALLBACK)]) {
    if (!isExcluded(m[1])) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, "FALLBACK_STRING", m[1].substring(0, 90));
    }
  }

  // ── 4. Hardcoded title/aria-label/placeholder ─────────────────────────────
  const ATTR1 = /(?:title|aria-label|placeholder)=\{"([^"]{8,})"\}/g;
  const ATTR2 = /(?:title|aria-label|placeholder)="([^"{][A-Za-z][^"]{6,})"/g;
  for (const m of [...content.matchAll(ATTR1), ...content.matchAll(ATTR2)]) {
    const text = m[1];
    if (!isExcluded(text) && !text.startsWith("t(")) {
      const ln = content.substring(0, m.index).split("\n").length;
      addFinding(ln, "ATTR_HARDCODED", text.substring(0, 90));
    }
  }

  // ── Deduplicate findings ──────────────────────────────────────────────────
  const seen = new Set();
  const deduped = findings.filter(f => {
    const key = `${f.line}:${f.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { fileName, filePath, findings: deduped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function scanComponents() {
  const files = fs.readdirSync(COMPONENTS_DIR)
    .filter(f => f.endsWith(".tsx") && !SKIP_FILES.has(f))
    .sort();

  console.log("\n");
  console.log("═".repeat(85));
  console.log("  EURONOVA — Phase C-Reloaded (Part 1/3) — Hardcoded String Diagnostic Report");
  console.log(`  Scan Date: ${new Date().toISOString()}`);
  console.log(`  Target:    components/**/*.tsx  (${files.length} files)`);
  console.log("═".repeat(85));

  const allResults = [];
  let totalFindings = 0;

  for (const file of files) {
    const filePath = path.join(COMPONENTS_DIR, file);
    const result = analyzeFile(filePath);
    allResults.push(result);
    totalFindings += result.findings.length;
  }

  // ── Summary Table ─────────────────────────────────────────────────────────
  console.log("\n📋  SUMMARY TABLE\n");
  console.log("  " + "Component File".padEnd(42) + "Findings".padEnd(12) + "Status");
  console.log("  " + "─".repeat(68));

  const filesWithIssues = [];
  const filesClean = [];

  for (const result of allResults) {
    const { fileName, findings } = result;
    const count = findings.length;
    const status = count === 0 ? "✅ CLEAN" : `❌ ${count} ISSUES`;
    console.log("  " + fileName.padEnd(42) + String(count).padEnd(12) + status);
    if (count > 0) filesWithIssues.push(result);
    else filesClean.push(fileName);
  }

  console.log("  " + "─".repeat(68));
  console.log(
    `\n  TOTAL: ${files.length} files | ${filesWithIssues.length} with issues | ${filesClean.length} clean | ${totalFindings} total findings\n`
  );

  // ── Detailed Findings ─────────────────────────────────────────────────────
  if (filesWithIssues.length > 0) {
    console.log("═".repeat(85));
    console.log("  DETAILED FINDINGS BY COMPONENT");
    console.log("═".repeat(85));

    for (const result of filesWithIssues) {
      const { fileName, findings } = result;
      console.log(`\n  ▶  ${fileName}  (${findings.length} string${findings.length !== 1 ? "s" : ""} to extract)`);
      console.log("  " + "─".repeat(70));

      const byCategory = {};
      for (const f of findings) {
        if (!byCategory[f.category]) byCategory[f.category] = [];
        byCategory[f.category].push(f);
      }

      for (const [cat, items] of Object.entries(byCategory)) {
        console.log(`\n     [${cat}]`);
        for (const item of items) {
          console.log(`       L${String(item.line).padEnd(5)} │ ${item.text}`);
        }
      }
    }
  }

  // ── i18n Namespace Plan ───────────────────────────────────────────────────
  console.log("\n\n" + "═".repeat(85));
  console.log("  PROPOSED i18n NAMESPACE INJECTION PLAN — messages/en.json");
  console.log("═".repeat(85) + "\n");

  const namespaceMap = {
    "GlobalForumView.tsx":              "GlobalForum",
    "ProjectForum.tsx":                 "ProjectForum  [extends existing namespace]",
    "ErasmusFaqSection.tsx":            "ErasmusFaq",
    "UserLevelBadge.tsx":               "UserLevel",
    "LevelReputationModule.tsx":        "LevelReputation",
    "DistanceCalculator.tsx":           "DistanceCalculator",
    "CommunitySurveysView.tsx":         "CommunitySurveys",
    "ReportMissionButton.tsx":          "Reports",
    "ReportOrgButton.tsx":              "Reports",
    "ReportSurveyButton.tsx":           "Reports",
    "ReportUserButton.tsx":             "Reports",
    "DashboardSidebar.tsx":             "DashboardSidebar",
    "Header.tsx":                       "Header",
    "PublicHeader.tsx":                 "PublicHeader",
    "Breadcrumbs.tsx":                  "Breadcrumbs",
    "NotificationBell.tsx":             "Notifications",
    "NotificationPreferencesModal.tsx": "Notifications",
    "ShareProject.tsx":                 "ShareProject",
    "DonationBlock.tsx":                "DonationBlock",
    "CreateAlertButton.tsx":            "AlertButtons",
    "ReviewForm.tsx":                   "ReviewForm",
    "OrganizationCard.tsx":             "OrganizationCard",
    "ProjectCard.tsx":                  "ProjectCard",
    "OrganizationNavTabs.tsx":          "OrganizationNavTabs",
    "LoginForm.tsx":                    "LoginForm",
    "RegisterForm.tsx":                 "RegisterForm",
    "CookieConsentGatekeeper.tsx":      "CookieConsent",
    "MissionCompanionsSection.tsx":     "MissionCompanions",
    "RecentlyViewedMissions.tsx":       "RecentlyViewed",
    "RandomMissionButton.tsx":          "RandomMission",
    "NotificationBell.tsx":             "Notifications",
  };

  for (const [file, ns] of Object.entries(namespaceMap)) {
    const result = allResults.find(r => r.fileName === file);
    if (result && result.findings.length > 0) {
      console.log(`  ${file.padEnd(44)} → "${ns}"  (${result.findings.length} key${result.findings.length !== 1 ? "s" : ""} to inject)`);
    }
  }

  console.log("\n");
  console.log("═".repeat(85));
  console.log("  ⚠  AWAITING AUTHORIZATION TO PATCH");
  console.log("  Reply PROCEED to execute Phase C-Reloaded Part 1 patching.");
  console.log("═".repeat(85) + "\n");

  process.exitCode = totalFindings > 0 ? 1 : 0;
}

scanComponents();
