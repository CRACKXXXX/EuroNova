/**
 * EURO-NOVA AUTO-MODERATION ENGINE
 * Rigorous backend shield against profanity, scams, suspicious links, and spam patterns.
 */

export interface AutoModCheckResult {
  allowed: boolean;
  reason?: string;
  errorCode?: "PROFANITY_DETECTED" | "SPAM_DETECTED" | "UNAUTHORIZED_LINK" | "EXCESSIVE_REPETITION" | "MODERATION_BLOCKED" | "PERSONAL_DATA_DETECTED";
}

export interface AutoModOptions {
  isProjectForum?: boolean;
}

// 1. Comprehensive list of profanities and hate speech (English & Spanish)
const PROFANITY_WORDS: string[] = [
  // English profanity / slur
  "fuck", "fucking", "fucker", "motherfucker",
  "shit", "bullshit", "shitty",
  "bitch", "bitches",
  "asshole", "bastard", "cunt",
  "dick", "cock", "pussy",
  "whore", "slut",
  "nigger", "nigga", "faggot", "retard",

  // Spanish profanity / slur
  "mierda", "puta", "puto", "putas", "putos",
  "coño", "conyo",
  "cabron", "cabrón", "cabrona", "cabrones",
  "gilipollas", "hijo de puta", "hdp",
  "maricon", "maricón", "marica",
  "pendejo", "pendeja", "culiao", "concha de tu madre",
  "chupa", "verga", "polla", "follar", "follada",
];

// 2. High-risk financial scam, crypto, casino, and phishing keywords
const SCAM_PATTERNS: string[] = [
  "free money", "dinero gratis",
  "earn money from home", "gana dinero desde casa",
  "passive income guarantee", "guaranteed profit",
  "crypto", "bitcoin", "ethereum", "binance", "usdt", "airdrop",
  "invest now", "hazte rico", "forex",
  "casino", "poker online", "slot machine", "betting tips",
  "wire transfer", "western union", "moneygram",
  "cash app", "paypal gift", "transfer money first",
  "pago por adelantado", "pago anticipado",
  "adult dating", "escort service", "viagra",
  "hack instagram", "hack account", "bot followers",
  "scam", "scammer", "scammers", "fraud", "fraude", "estafa", "estafador", "estafadores",
];

// Word-boundary aware fraud, scam, and phishing detection patterns
const ROOT_FRAUD_PATTERNS: RegExp[] = [
  /\b(?:scam|scams|scammer|scammers|scammed|scamming)\b/i,
  /\b(?:fraud|frauds|fraude|fraudes|fraudulento|fraudulenta|fraudulent)\b/i,
  /\b(?:estafa|estafas|estafador|estafadores|estafadora|estafadoras)\b/i,
];

// 3. Disallowed suspicious link signatures (Telegram channels, WhatsApp groups, shorteners)
const SUSPICIOUS_LINK_PATTERNS: RegExp[] = [
  /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+]+/i,
  /(?:https?:\/\/)?(?:www\.)?(?:chat\.whatsapp\.com|wa\.me)\/[a-zA-Z0-9_+]+/i,
  /(?:https?:\/\/)?(?:www\.)?(?:bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|t\.co|is\.gd|buff\.ly)\/[a-zA-Z0-9_+]+/i,
  /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.(?:xyz|top|ru|cn|buzz|click|link|stream|download)(?:\/[^\s]*)?/i,
];

// Leetspeak normalization map for basic evasion
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
};

function normalizeLeetSpeak(input: string): string {
  let normalized = input.toLowerCase();
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replaceAll(leet, char);
  }
  return normalized;
}

/**
 * Validates text against EuroNova Community Moderation Rules.
 * Returns { allowed: true } or { allowed: false, reason, errorCode }.
 */
export function autoModerateContent(rawText: string, options?: AutoModOptions): AutoModCheckResult {
  if (!rawText || typeof rawText !== "string") {
    return {
      allowed: false,
      reason: "Message content cannot be empty.",
      errorCode: "MODERATION_BLOCKED",
    };
  }

  const text = rawText.trim();
  if (text.length === 0) {
    return {
      allowed: false,
      reason: "Message content cannot be blank.",
      errorCode: "MODERATION_BLOCKED",
    };
  }

  // HYPER-STRICT PROJECT FORUM SHIELD (Zero tolerance for personal data and external links)
  if (options?.isProjectForum) {
    // 1. Block Personal Email Addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    if (emailRegex.test(text)) {
      return {
        allowed: false,
        reason: "Message blocked: sharing personal email addresses in project forums is strictly prohibited to prevent phishing.",
        errorCode: "PERSONAL_DATA_DETECTED",
      };
    }

    // 2. Block Phone Numbers (detect sequences with 8+ total digits formatted with spaces, dashes, or plus, or spaced digits)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}|(?:\d[\s.-]){7,}\d/;
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && phoneRegex.test(text)) {
      return {
        allowed: false,
        reason: "Message blocked: sharing phone numbers in project forums is prohibited to prevent off-platform scams and protect privacy.",
        errorCode: "PERSONAL_DATA_DETECTED",
      };
    }

    // 3. Block ALL External Links in Project Forums to prevent phishing and unapproved recruitment
    const anyUrlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|eu|io|me|info|es|fr|de|it|co|app)\b[^\s]*)/gi;
    if (anyUrlRegex.test(text)) {
      return {
        allowed: false,
        reason: "Message blocked: external links and web addresses are strictly forbidden in the mission squad forum to prevent phishing.",
        errorCode: "UNAUTHORIZED_LINK",
      };
    }
  }

  // CHECK 1: Excessive Symbol or Character Repetition (Spam Flooding)
  // e.g. "!!!!!!!!", "???????", "$$$$$$$", "aaaaaaaarrrrrrgh"
  const excessiveSymbolsRegex = /[!@#$%^&*()_+=\-[\]{}|;:,.<>?~`]{5,}/;
  if (excessiveSymbolsRegex.test(text)) {
    return {
      allowed: false,
      reason: "Message blocked: excessive symbol repetition detected.",
      errorCode: "EXCESSIVE_REPETITION",
    };
  }

  const excessiveCharsRegex = /(.)\1{6,}/i;
  if (excessiveCharsRegex.test(text)) {
    return {
      allowed: false,
      reason: "Message blocked: excessive repeated characters detected.",
      errorCode: "EXCESSIVE_REPETITION",
    };
  }

  // CHECK 2: All Caps Flooding (if message > 20 chars and > 85% uppercase)
  const lettersOnly = text.replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length >= 20) {
    const uppercaseCount = text.replace(/[^A-Z]/g, "").length;
    if (uppercaseCount / lettersOnly.length > 0.85) {
      return {
        allowed: false,
        reason: "Message blocked: please do not shout in all uppercase letters.",
        errorCode: "EXCESSIVE_REPETITION",
      };
    }
  }

  // CHECK 3: Suspicious & Non-Whitelisted URLs
  for (const pattern of SUSPICIOUS_LINK_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason: "Message blocked: unauthorized external channels or link shorteners are strictly prohibited for volunteer safety.",
        errorCode: "UNAUTHORIZED_LINK",
      };
    }
  }

  // Check general URLs (Only euronova.space and official European commission links permitted)
  const generalUrlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const urlsFound = text.match(generalUrlRegex);
  if (urlsFound) {
    for (const url of urlsFound) {
      const lowerUrl = url.toLowerCase();
      const isAllowedDomain =
        lowerUrl.includes("euronova.space") ||
        lowerUrl.includes("europa.eu") ||
        lowerUrl.includes("erasmus-plus.ec.europa.eu") ||
        lowerUrl.includes("salto-youth.net");

      if (!isAllowedDomain) {
        return {
          allowed: false,
          reason: "Message blocked: posting unverified external links is not permitted. Only official EuroNova and EU domains are allowed.",
          errorCode: "UNAUTHORIZED_LINK",
        };
      }
    }
  }

  // CHECK 4: Scam, Crypto, Casino & Phishing keywords (with word boundary awareness)
  const lowerText = text.toLowerCase();
  const normalizedText = normalizeLeetSpeak(text);

  // Check word-boundary fraud patterns on both raw and normalized text
  for (const regex of ROOT_FRAUD_PATTERNS) {
    if (regex.test(lowerText) || regex.test(normalizedText)) {
      return {
        allowed: false,
        reason: "Message blocked: content matches prohibited fraudulent solicitation or scam patterns.",
        errorCode: "SPAM_DETECTED",
      };
    }
  }

  for (const scam of SCAM_PATTERNS) {
    if (lowerText.includes(scam) || normalizedText.includes(scam)) {
      return {
        allowed: false,
        reason: "Message blocked: content matches prohibited promotional, crypto, or financial solicitation patterns.",
        errorCode: "SPAM_DETECTED",
      };
    }
  }

  // CHECK 5: Profanity & Hate Speech (with leetspeak normalization)
  const words = normalizedText.split(/[\s,.;:!?()[\]{}"'\\/+-]+/);

  for (const word of words) {
    if (PROFANITY_WORDS.includes(word)) {
      return {
        allowed: false,
        reason: "Message blocked: inappropriate or offensive language detected.",
        errorCode: "PROFANITY_DETECTED",
      };
    }
  }

  // Whole text phrase check for multi-word profanity
  for (const profanity of PROFANITY_WORDS) {
    if (profanity.includes(" ") && normalizedText.includes(profanity)) {
      return {
        allowed: false,
        reason: "Message blocked: inappropriate or offensive phrasing detected.",
        errorCode: "PROFANITY_DETECTED",
      };
    }
  }

  return { allowed: true };
}
