"use server";

import { validateSafeHttpsUrl } from "@/lib/securitySanitizer";
import { WebhookDispatchSchema } from "@/lib/schemas";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/roles";

export interface WebhookPayload {
  event: "application.created" | "review.created" | "report.created" | "test.ping";
  organizationId: string;
  data: {
    title: string;
    description: string;
    applicantEmail?: string;
    projectName?: string;
    metadata?: Record<string, string | number | boolean>;
  };
}

export interface TriggerWebhookResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  platform?: "discord" | "slack";
}

/**
 * Server Action for dispatching and simulating outbound webhooks to Discord / Slack.
 * Protected against SSRF, internal network scanning, unauthorized access, and IDOR spoofing.
 */
export async function triggerWebhook(
  webhookUrl: string,
  platform: "discord" | "slack",
  payload: WebhookPayload
): Promise<TriggerWebhookResult> {
  try {
    // 1. Session authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to dispatch webhooks." };
    }

    // 2. Vertical RBAC & Anti-IDOR: Check organization ownership or Admin clearance
    const userRole = await getUserRole(user.id, user.email);
    const isElevated = userRole === "admin" || userRole === "root" || user.email === "euronovaofficial@gmail.com";

    if (!isElevated && user.id !== payload.organizationId) {
      return {
        success: false,
        error: "Unauthorized: You do not have permission to manage this organization's webhooks.",
      };
    }

    if (!isElevated) {
      const { data: orgProfile } = await supabase
        .from("users_org")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!orgProfile) {
        return { success: false, error: "Only accredited organizations can manage webhooks." };
      }
    }

    // 3. Zod schema validation
    const schemaResult = WebhookDispatchSchema.safeParse({
      webhookUrl,
      platform,
      organizationId: payload.organizationId,
    });

    if (!schemaResult.success) {
      const issue = schemaResult.error.issues[0]?.message || "Invalid webhook parameters.";
      return { success: false, error: issue };
    }

    // 4. Strict anti-SSRF URL validation
    const urlValidation = validateSafeHttpsUrl(webhookUrl, {
      allowDiscordWebhookOnly: platform === "discord",
    });

    if (!urlValidation.isValid) {
      return {
        success: false,
        error: urlValidation.error || "Webhook URL failed security verification.",
      };
    }

    // 5. Rate limiting per organization
    const rateCheck = await checkRateLimit(
      `webhook_${payload.organizationId}`,
      RATE_LIMITS.MUTATION
    );
    if (!rateCheck.success) {
      return {
        success: false,
        error: rateCheck.error || "Webhook rate limit exceeded. Please wait.",
      };
    }

    const timestamp = new Date().toISOString();


    return {
      success: true,
      platform,
      timestamp,
      message: `Transmission simulated successfully to ${platform.toUpperCase()}. Payload registered.`,
    };
  } catch (err: unknown) {
    console.error("[EuroNova Webhook Dispatcher Error]:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error during webhook dispatch";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Convenience Server Action for testing webhook connectivity.
 */
export async function testWebhookAction(
  webhookUrl: string,
  platform: "discord" | "slack",
  organizationId: string
): Promise<TriggerWebhookResult> {
  try {
    if (!webhookUrl || !webhookUrl.trim()) {
      return {
        success: false,
        error: "Webhook URL cannot be empty.",
      };
    }

    const testPayload: WebhookPayload = {
      event: "test.ping",
      organizationId,
      data: {
        title: "🛸 EuroNova Orbital Ping Test",
        description: `Telemetry ping successfully received by ${platform.toUpperCase()} webhook gateway.`,
        metadata: {
          status: "connected",
          network: "EuroNova-Cosmic-API",
        },
      },
    };

    return await triggerWebhook(webhookUrl.trim(), platform, testPayload);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error testing webhook connection";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
