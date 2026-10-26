/**
 * Global Error Sanitizer for EuroNova
 * Prevents raw Zod errors, Postgres codes (e.g. violates constraint, 23505),
 * or [object Object] from ever reaching the client UI.
 */

export function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred. Please try again later.";
  }

  let rawMessage = "";

  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      rawMessage = obj.message;
    } else if (typeof obj.error === "string") {
      rawMessage = obj.error;
    } else if (typeof obj.details === "string") {
      rawMessage = obj.details;
    } else {
      try {
        rawMessage = JSON.stringify(error);
      } catch {
        rawMessage = "An unexpected error occurred.";
      }
    }
  }

  const lower = rawMessage.toLowerCase();

  // 1. File Size Exceeded Limit
  if (lower.includes("maximum allowed size") || lower.includes("file is too large")) {
    return rawMessage;
  }
  if (
    lower.includes("payload too large") ||
    lower.includes("entity too large") ||
    lower.includes("size exceeds") ||
    lower.includes("file size") ||
    lower.includes("413")
  ) {
    return "File is too large. Maximum allowed size is 1MB.";
  }

  // 2. Auto-Moderator / Content Filter Block
  if (
    lower.includes("auto-mod") ||
    lower.includes("automod") ||
    lower.includes("restricted") ||
    lower.includes("blocked") ||
    lower.includes("profanity") ||
    lower.includes("forbidden word") ||
    lower.includes("personal data") ||
    lower.includes("phone number") ||
    lower.includes("email address") ||
    lower.includes("moderation shield")
  ) {
    return "Your input contains restricted words or personal data and was blocked.";
  }

  // 3. Unique / Conflict / Already Voted
  if (
    lower.includes("unique") ||
    lower.includes("duplicate key") ||
    lower.includes("23505") ||
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("already voted")
  ) {
    if (lower.includes("voted") || lower.includes("survey")) {
      return "You have already cast your vote in this survey.";
    }
    return "This information is already registered.";
  }

  // 4. Missing Required Fields
  if (
    lower.includes("required") ||
    lower.includes("missing") ||
    lower.includes("not-null") ||
    lower.includes("null value in column") ||
    lower.includes("invalid_type") ||
    lower.includes("cannot be empty") ||
    lower.includes("please fill in all required fields")
  ) {
    return "Please fill in all required fields.";
  }

  // 5. Authentication Specific Errors
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Invalid email or password. Please verify your credentials.";
  }
  if (lower.includes("user already registered") || lower.includes("email already in use")) {
    return "This email is already registered.";
  }
  if (
    lower.includes("not authenticated") ||
    lower.includes("unauthorized") ||
    lower.includes("no estás autenticado") ||
    lower.includes("jwt")
  ) {
    return "You are not authenticated. Please log in to continue.";
  }

  // 6. Postgres technical codes, Zod errors, or Object strings
  if (
    lower.includes("violates") ||
    lower.includes("constraint") ||
    lower.includes("foreign key") ||
    lower.includes("relation") ||
    lower.includes("syntax error") ||
    lower.includes("42p01") ||
    lower.includes("42703") ||
    lower.includes("23503") ||
    lower.includes("[object object]") ||
    lower.includes("zoderror") ||
    lower.includes("storageapi") ||
    lower.includes("schema cache")
  ) {
    return "An unexpected error occurred. Please try again later.";
  }

  // If the message is a clean, readable user sentence without technical noise
  if (
    rawMessage.length > 0 &&
    rawMessage.length < 120 &&
    !rawMessage.includes("{") &&
    !rawMessage.includes("}") &&
    !rawMessage.includes("SELECT") &&
    !rawMessage.includes("INSERT")
  ) {
    return rawMessage;
  }

  return "An unexpected error occurred. Please try again later.";
}
