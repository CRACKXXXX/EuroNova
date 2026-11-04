import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== EURONOVA REGISTRATION & TERMS VALIDATION TEST SUITE ===\n");

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// 1. Test Zod SignupCredentialsSchema logic
const noNullBytes = (val) => !val.includes("\0");

const AuthCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address format.")
    .max(120, "Email address cannot exceed 120 characters.")
    .refine(noNullBytes, "Email cannot contain null bytes."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(100, "Password cannot exceed 100 characters.")
    .refine((val) => val.trim().length >= 6, "Password cannot consist solely of whitespace.")
    .refine(noNullBytes, "Password cannot contain null bytes."),
});

const SignupCredentialsSchema = AuthCredentialsSchema.extend({
  accepted_tos: z.boolean({ message: "ERR_TOS_REQUIRED" }).refine((val) => val === true, "ERR_TOS_REQUIRED"),
  role: z.enum(["youth", "org"], {
    errorMap: () => ({ message: "Missing or invalid registration role." }),
  }),
});

// Test 1: Rejection when accepted_tos is false
const test1 = SignupCredentialsSchema.safeParse({
  email: "test@euronova.eu",
  password: "SecurePassword123!",
  accepted_tos: false,
  role: "youth",
});
assert(!test1.success && test1.error.issues[0]?.message === "ERR_TOS_REQUIRED", 
  "Rejects registration with ERR_TOS_REQUIRED when terms are not accepted (false)");

// Test 2: Rejection when accepted_tos is undefined / missing
const test2 = SignupCredentialsSchema.safeParse({
  email: "test@euronova.eu",
  password: "SecurePassword123!",
  role: "youth",
});
assert(!test2.success && test2.error.issues[0]?.message === "ERR_TOS_REQUIRED", 
  "Rejects registration with ERR_TOS_REQUIRED when terms are omitted");

// Test 3: Acceptance when accepted_tos is true and credentials are valid
const test3 = SignupCredentialsSchema.safeParse({
  email: "astronaut@euronova.eu",
  password: "ValidOrbitalPassword2026",
  accepted_tos: true,
  role: "youth",
});
assert(test3.success === true, 
  "Successfully passes validation when terms are accepted (true)");

// Test 4: Password failure preserves independent accepted_tos state
const test4 = SignupCredentialsSchema.safeParse({
  email: "astronaut@euronova.eu",
  password: "123", // Short password
  accepted_tos: true,
  role: "youth",
});
assert(!test4.success && test4.error.issues[0]?.message.includes("Password must be at least 6 characters"), 
  "Field validation error on password triggers correctly while terms remain accepted");

// Test 5: Verify 7-language i18n parity for errTosRequired
const locales = ["en", "es", "de", "fr", "it", "pt", "ru"];
let i18nParity = true;

for (const loc of locales) {
  const filePath = path.join(projectRoot, "messages", `${loc}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const errTos = content?.Login?.errTosRequired;
  if (!errTos || typeof errTos !== "string") {
    i18nParity = false;
    console.error(`Missing Login.errTosRequired in ${loc}.json`);
  }
}
assert(i18nParity, "All 7 language dictionaries contain localized Login.errTosRequired");

console.log(`\nResults: ${passed}/${total} tests passed.`);

if (passed !== total) {
  process.exit(1);
}
