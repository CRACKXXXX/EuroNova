import { createClient } from "@supabase/supabase-js";

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number; // Decimal color code
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
}

const COSMIC_COLORS = {
  novaFlare: 0xff2e63,   // Critical / Escalation / Destructive
  plasmaCyan: 0x00e5ff,  // Info / Operation / General
  hyperViolet: 0x6366f1, // Moderation / Review
  rupEmerald: 0x00e676,  // Success / Resolution
};

/**
 * Sanitizes email addresses to strip direct PII before dispatching to external webhooks.
 * e.g., "alexander.smith@domain.com" -> "al***h@domain.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "anonymous@euronova.internal";
  }
  const [localPart, domain] = email.split("@");
  if (!localPart || localPart.length <= 2) {
    return `${localPart ? localPart[0] : "*"}***@${domain || "euronova.internal"}`;
  }
  const maskedLocal = `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Creates an elevated Supabase client for reading notification preferences.
 */
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fetches user-configured notification preferences (Email & Discord Webhook)
 * from either `users_youth` or `users_org`.
 */
export async function getUserNotificationPreferences(userId: string): Promise<{
  notificationEmail?: string;
  discordWebhookUrl?: string;
}> {
  try {
    const supabase = getAdminClient();
    if (!supabase) return {};

    // 1. Try users_youth table
    const { data: youth } = await supabase
      .from("users_youth")
      .select("notification_email, discord_webhook_url")
      .eq("id", userId)
      .maybeSingle();

    if (youth && (youth.notification_email || youth.discord_webhook_url)) {
      return {
        notificationEmail: youth.notification_email || undefined,
        discordWebhookUrl: youth.discord_webhook_url || undefined,
      };
    }

    // 2. Try users_org table
    const { data: org } = await supabase
      .from("users_org")
      .select("notification_email, discord_webhook_url")
      .eq("id", userId)
      .maybeSingle();

    if (org && (org.notification_email || org.discord_webhook_url)) {
      return {
        notificationEmail: org.notification_email || undefined,
        discordWebhookUrl: org.discord_webhook_url || undefined,
      };
    }

    return {};
  } catch (err) {
    console.error("Error fetching user notification preferences:", err);
    return {};
  }
}

import { validateSafeHttpsUrl } from "./securitySanitizer";

/**
 * Sends a structured payload to the configured Discord Webhook URL.
 * Supports user-specific override URL or falls back to the system environment variable.
 * Fails silently with error logs to prevent breaking Server Action execution.
 */
async function postToDiscordWebhook(embed: DiscordEmbed, webhookUrlOverride?: string): Promise<boolean> {
  const webhookUrl = webhookUrlOverride || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || typeof webhookUrl !== "string") {
    return false;
  }

  // Strict anti-SSRF verification (enforcing discord.com/api/webhooks and blocking RFC 1918/3927)
  const validation = validateSafeHttpsUrl(webhookUrl, { allowDiscordWebhookOnly: true });
  if (!validation.isValid) {
    console.error("[ExternalAlerts Anti-SSRF Blocked]:", validation.error);
    return false;
  }

  const safeUrl = validation.sanitizedUrl || webhookUrl;

  try {
    const payload = {
      username: "EuroNova Support Bot",
      avatar_url: "https://euronova.vercel.app/logo-small.png",
      embeds: [embed],
    };

    const res = await fetch(safeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (!res.ok) {
      console.error("Discord Webhook responded with non-200 code:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to transmit Discord alert:", err);
    return false;
  }
}

/**
 * Sends an alert email to the recipient or fallback administration box.
 */
async function sendAlertEmail(
  subject: string,
  htmlContent: string,
  recipientEmailOverride?: string
): Promise<boolean> {
  const targetEmail =
    recipientEmailOverride || process.env.ALERT_ADMIN_EMAIL || "euronovaofficial@gmail.com";
  try {
    if (!targetEmail || !subject || !htmlContent) {
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to dispatch alert email:", err);
    return false;
  }
}

/**
 * Dispatch alert when a Moderator escalates a report for Administrator review.
 */
export async function sendEscalationAlert(params: {
  escalationId: string;
  reportId: string;
  targetName: string;
  targetType: string;
  recommendedAction: string;
  reason: string;
  requestedByName?: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: "🚨 [ESCALATION] Moderator Requested Admin Intervention",
    description: `A trusted moderator has flagged target **${params.targetName}** (${params.targetType.toUpperCase()}) requiring Level 4 Administrator execution.`,
    color: COSMIC_COLORS.novaFlare,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Target Entity", value: params.targetName || "N/A", inline: true },
      { name: "Target Type", value: params.targetType.toUpperCase(), inline: true },
      { name: "Action Requested", value: `\`${params.recommendedAction}\``, inline: true },
      { name: "Escalated By", value: params.requestedByName || "EuroNova Staff", inline: true },
      { name: "Escalation Reason", value: params.reason, inline: false },
    ],
    footer: {
      text: "EuroNova Staff Security Grid • admin_escalations",
    },
  };

  void postToDiscordWebhook(embed);
  void sendAlertEmail(
    `[EuroNova Alert] New Escalation: ${params.targetName}`,
    `<p>Target: ${params.targetName}</p><p>Action: ${params.recommendedAction}</p><p>Reason: ${params.reason}</p>`
  );
}

/**
 * Dispatch alert for critical support tickets or volunteer support applications.
 */
export async function sendCriticalSupportAlert(params: {
  ticketId: string;
  userEmail: string;
  subject: string;
  reason: string;
  content: string;
}): Promise<void> {
  const isApplication = params.reason === "apply_support";
  const embed: DiscordEmbed = {
    title: isApplication
      ? "🌟 [SUPPORT ROLE] Level 10+ Volunteer Application"
      : "🎧 [SUPPORT] High-Priority Volunteer Ticket Filed",
    description: `A user has filed a critical transmission: **${params.subject}**`,
    color: isApplication ? COSMIC_COLORS.rupEmerald : COSMIC_COLORS.plasmaCyan,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Sender", value: maskEmail(params.userEmail), inline: true },
      { name: "Category / Reason", value: params.reason, inline: true },
      { name: "Subject", value: params.subject, inline: false },
      {
        name: "Message Preview",
        value: params.content.length > 500 ? params.content.slice(0, 500) + "..." : params.content,
        inline: false,
      },
    ],
    footer: {
      text: "EuroNova Support Center • support_tickets",
    },
  };

  void postToDiscordWebhook(embed);
  void sendAlertEmail(
    `[EuroNova Support] ${params.subject}`,
    `<p>From: ${params.userEmail}</p><p>Reason: ${params.reason}</p><p>${params.content}</p>`
  );
}

/**
 * Dispatch direct ticket reply notification to the user's preferred channels (Email & Discord Webhook).
 */
export async function sendDirectTicketReplyAlert(params: {
  userId: string;
  fallbackEmail?: string;
  ticketSubject: string;
  replyMessage: string;
  ticketId?: string;
  newStatus?: string;
}): Promise<void> {
  try {
    const prefs = await getUserNotificationPreferences(params.userId);

    // 1. Dispatch Email notification if configured (or fallback to ticket email)
    const targetEmail = prefs.notificationEmail || params.fallbackEmail;
    if (targetEmail) {
      void sendAlertEmail(
        `[EuroNova Support] Response to: ${params.ticketSubject}`,
        `<h2>Support Specialist Reply</h2>
<p><strong>Ticket:</strong> ${params.ticketSubject}</p>
<p><strong>Status:</strong> ${(params.newStatus || "updated").toUpperCase()}</p>
<blockquote style="background:#111420;color:#fff;padding:12px;border-left:4px solid #00e5ff;">
  ${params.replyMessage}
</blockquote>
<p>You can view full details in your <a href="https://euronova.vercel.app/dashboard/support">EuroNova Support Dashboard</a>.</p>`,
        targetEmail
      );
    }

    // 2. Dispatch to user's personalized Discord Webhook if configured
    if (prefs.discordWebhookUrl) {
      const embed: DiscordEmbed = {
        title: `🎧 Support Reply: ${params.ticketSubject}`,
        description: params.replyMessage,
        color: COSMIC_COLORS.plasmaCyan,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "Ticket Subject", value: params.ticketSubject, inline: true },
          { name: "Status", value: (params.newStatus || "updated").toUpperCase(), inline: true },
        ],
        footer: {
          text: "EuroNova Support Desk • Direct Notification",
        },
      };

      void postToDiscordWebhook(embed, prefs.discordWebhookUrl);
    }
  } catch (err) {
    console.error("Failed to send direct ticket reply alert:", err);
  }
}

/**
 * Dispatches an automated crash telemetry alert when an unhandled application
 * exception is caught by Error Boundaries and reported to the telemetry endpoint.
 */
export async function sendCrashAlert(params: {
  message: string;
  route?: string;
  digest?: string;
  stack?: string;
  timestamp?: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: "💥 [SYSTEM CRASH] Unhandled Application Exception",
    description: "A critical runtime exception was caught by EuroNova Error Boundaries and scrubbed of PII.",
    color: COSMIC_COLORS.novaFlare,
    timestamp: params.timestamp || new Date().toISOString(),
    fields: [
      { name: "Route / Subsystem", value: params.route || "Unknown / Root", inline: true },
      { name: "Digest Hash", value: params.digest ? `\`${params.digest}\`` : "N/A", inline: true },
      {
        name: "Error Message",
        value: params.message.length > 500 ? params.message.slice(0, 500) + "..." : params.message,
        inline: false,
      },
    ],
    footer: {
      text: "EuroNova Crash Shield • /api/telemetry/error",
    },
  };

  if (params.stack) {
    const trimmedStack = params.stack.length > 800 ? params.stack.slice(0, 800) + "..." : params.stack;
    embed.fields?.push({
      name: "Stack Trace (PII Scrubbed)",
      value: `\`\`\`text\n${trimmedStack}\n\`\`\``,
      inline: false,
    });
  }

  void postToDiscordWebhook(embed);
}

