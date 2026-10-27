"use server";

import { validateSafeHttpsUrl } from "@/lib/securitySanitizer";
import { WebhookDispatchSchema } from "@/lib/schemas";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/roles";
import { verifyMidSessionActiveStatus } from "@/lib/moderationShield";

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
 * Server Action for dispatching outbound webhooks to Discord / Slack.
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
      const activeCheck = await verifyMidSessionActiveStatus(user.id, { requireVerifiedOrg: true });
      if (!activeCheck.allowed) {
        return {
          success: false,
          error: activeCheck.error || "Organization is suspended or not verified to manage webhooks.",
        };
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

    // 4. Strict anti-SSRF URL validation (enforcing https, blocking private IPs, cloud metadata, credentials)
    const urlValidation = validateSafeHttpsUrl(webhookUrl, {
      allowDiscordWebhookOnly: platform === "discord",
      platform,
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

    // 6. Format platform-specific payload
    let outboundBody: string;
    if (platform === "discord") {
      const isPing = payload.event === "test.ping";
      const embed = {
        title: payload.data.title,
        description: payload.data.description,
        color: isPing ? 0x00e5ff : 0x6366f1,
        timestamp: new Date().toISOString(),
        fields: [
          ...(payload.data.projectName
            ? [{ name: "Project", value: payload.data.projectName, inline: true }]
            : []),
          ...(payload.data.applicantEmail
            ? [{ name: "Applicant", value: payload.data.applicantEmail, inline: true }]
            : []),
        ],
        footer: {
          text: "EuroNova Security Grid • Webhooks Gateway",
        },
      };

      outboundBody = JSON.stringify({
        username: "EuroNova Webhook Bot",
        avatar_url: "https://euronova.vercel.app/logo-small.png",
        content: `🛰️ **[EURONOVA EVENT: ${payload.event.toUpperCase()}]**`,
        embeds: [embed],
      });
    } else {
      outboundBody = JSON.stringify({
        text: `🛰️ *[EuroNova Event: ${payload.event}]* ${payload.data.title}\n${payload.data.description}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `EuroNova Event: ${payload.event}`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${payload.data.title}*\n${payload.data.description}`,
            },
          },
        ],
      });
    }

    // 7. Dispatch outbound fetch with strict 5s timeout & disabled redirects (anti-SSRF)
    const safeUrl = urlValidation.sanitizedUrl || webhookUrl.trim();

    const response = await fetch(safeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "EuroNova-Orbital-Webhook/1.0",
      },
      body: outboundBody,
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook recipient responded with error status ${response.status}.`,
      };
    }

    const timestamp = new Date().toISOString();

    return {
      success: true,
      platform,
      timestamp,
      message: `Transmission dispatched successfully to ${platform.toUpperCase()}. Payload registered.`,
    };
  } catch (err: unknown) {
    console.error("[EuroNova Webhook Dispatcher Error]:", err);
    let clientError = "Unable to complete webhook transmission. Remote endpoint unreachable.";
    if (err instanceof Error) {
      if (err.name === "TimeoutError" || err.message?.toLowerCase().includes("timeout")) {
        clientError = "Webhook delivery timed out after 5000ms. Remote server unresponsive.";
      } else if (err.message?.toLowerCase().includes("redirect")) {
        clientError = "Webhook delivery rejected: redirects are not permitted for security reasons.";
      }
    }
    return {
      success: false,
      error: clientError,
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
    console.error("[EuroNova Webhook Test Error]:", err);
    return {
      success: false,
      error: "Error testing webhook connection. Remote endpoint unreachable.",
    };
  }
}
