import { GoogleGenerativeAI } from "@google/generative-ai";

export type ModerationAction = "auto_reject" | "pending_review" | "auto_publish";

export interface ModerationResult {
  action: ModerationAction;
  reason: string;
}

const SYSTEM_PROMPT = `You are an expert moderator for an Erasmus+ youth mobility platform. Analyze the following project title and description. 
Rules:
1. Return 'auto_reject' ONLY for undeniable spam, crypto/financial scams, casinos, extreme hate speech, or keyboard smashing gibberish.
2. Return 'pending_review' for sensitive but potentially valid educational topics (e.g., drug prevention, sex education, politics, mental health, LGBTIQ+), OR if it has excessive ALL CAPS. (Note: Telegram/WhatsApp links are ALLOWED).
3. Return 'auto_publish' for normal, safe, educational projects.
You MUST return a raw JSON object (no markdown) with this structure: { "action": "auto_reject" | "pending_review" | "auto_publish", "reason": "Short explanation" }.`;

/**
 * Moderates project submission content using Google Gemini 1.5 Flash.
 * Safely falls back to 'pending_review' if the service fails, times out, or has no key.
 *
 * @param title - Project title
 * @param description - Project description
 * @returns ModerationResult with action ('auto_reject' | 'pending_review' | 'auto_publish') and reason
 */
export async function moderateContent(
  title: string,
  description: string
): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Falling back to pending_review.");
    return {
      action: "pending_review",
      reason: "Fallback: AI Service Unavailable",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = ["gemini-1.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    const prompt = `Title: ${title}\nDescription: ${description}`;
    let responseText: string | null = null;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (modelErr: unknown) {
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) {
          continue;
        }
        console.error(`AI Moderation error with ${modelName}:`, msg);
      }
    }

    if (!responseText) {
      return {
        action: "pending_review",
        reason: "Fallback: AI Service Unavailable",
      };
    }

    const cleanedText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText) as {
      action?: unknown;
      reason?: unknown;
    };

    if (
      parsed.action === "auto_reject" ||
      parsed.action === "pending_review" ||
      parsed.action === "auto_publish"
    ) {
      return {
        action: parsed.action,
        reason:
          typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason
            : "AI moderation complete.",
      };
    }

    return {
      action: "pending_review",
      reason: "Fallback: AI Service Unavailable",
    };
  } catch (error: unknown) {
    console.error("AI Moderation API error:", error);
    return {
      action: "pending_review",
      reason: "Fallback: AI Service Unavailable",
    };
  }
}
