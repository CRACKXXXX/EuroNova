import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { validateSafeHttpsUrl, stripDangerousHtml } from "./securitySanitizer";

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

export interface PendingNotificationEmailParams {
  userId?: string;
  recipientEmail?: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority?: "normal" | "urgent" | "critical";
}

/**
 * Dispatches an automated email notification alerting a user or organization
 * about a pending notification, ticket resolution, report status, or application.
 * Non-blocking with 5000ms timeout protection and graceful development fallback.
 */
export async function sendPendingNotificationEmail(
  params: PendingNotificationEmailParams
): Promise<boolean> {
  const { userId, recipientEmail, subject, title, message, actionUrl } = params;

  try {
    let targetEmail = recipientEmail;

    // Resolve target email if userId provided and no direct recipientEmail
    if (!targetEmail && userId) {
      const prefs = await getUserNotificationPreferences(userId);
      if (prefs.notificationEmail) {
        targetEmail = prefs.notificationEmail;
      } else {
        const supabase = getAdminClient();
        if (supabase) {
          const { data: youth } = await supabase
            .from("users_youth")
            .select("email")
            .eq("id", userId)
            .maybeSingle();

          if (youth?.email) {
            targetEmail = youth.email;
          } else {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            if (authUser?.user?.email) {
              targetEmail = authUser.user.email;
            }
          }
        }
      }
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      return false;
    }

    const cleanTitle = stripDangerousHtml(title, 120);
    const cleanMessage = stripDangerousHtml(message, 3000);
    const destinationUrl = actionUrl
      ? `https://euronova.vercel.app${actionUrl.startsWith("/") ? actionUrl : "/" + actionUrl}`
      : "https://euronova.vercel.app/dashboard";

    const smtpUser =
      process.env.EMAIL_USER || process.env.SMTP_USER || "EuroNovaOfficial@gmail.com";
    const smtpPass =
      process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#08090E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#08090E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background-color:#111420;border:1px solid #1E2640;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg, rgba(0,229,255,0.12) 0%, rgba(99,102,241,0.08) 100%);border-bottom:1px solid #1E2640;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#FFFFFF;text-transform:uppercase;">
                      EURONOVA <span style="color:#00E5FF;">ORBITAL</span>
                    </span>
                    <div style="font-size:11px;color:#94A3B8;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">
                      European Mobility & Volunteer Command
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                ${cleanTitle}
              </h1>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#CBD5E1;white-space:pre-wrap;">
                ${cleanMessage}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 16px 0;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#00E5FF;">
                    <a href="${destinationUrl}"
                       target="_blank"
                       style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;color:#08090E;text-decoration:none;letter-spacing:0.3px;text-transform:uppercase;border-radius:10px;">
                      Open EuroNova Transmission
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;padding:12px 16px;background-color:#08090E;border-radius:10px;border:1px solid #1E2640;">
                <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.5;">
                  <strong>Security Advisory:</strong> If you did not initiate this transmission or request, you can safely disregard this notice or report suspicious activity through your EuroNova dashboard.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0A0D18;border-top:1px solid #1E2640;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#64748B;">
                EuroNova • European Youth Mobility & Anti-Scam Shield
              </p>
              <p style="margin:0;font-size:10px;color:#475569;">
                Canary Islands & Outermost Regions (RUP) Priority Grid
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Graceful development mode fallback
    if (!smtpPass || smtpPass === "dummy_password") {
      console.log(
        `[ExternalAlerts Dev] Pending notification email resolved (no SMTP credentials configured) -> Target: ${maskEmail(
          targetEmail
        )} | Subject: ${subject}`
      );
      return true;
    }

    const transporter = smtpHost
      ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        })
      : nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

    // 5-Second Timeout Promise Race
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SMTP timeout after 5000ms")), 5000)
    );

    const sendPromise = transporter.sendMail({
      from: `"EuroNova Orbital" <${smtpUser}>`,
      to: targetEmail,
      subject,
      html: htmlContent,
    });

    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (err) {
    console.error("sendPendingNotificationEmail non-blocking failure:", err);
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
    recipientEmailOverride || process.env.ALERT_ADMIN_EMAIL || "EuroNovaOfficial@gmail.com";
  try {
    if (!targetEmail || !subject || !htmlContent) {
      return false;
    }
    return await sendPendingNotificationEmail({
      recipientEmail: targetEmail,
      subject,
      title: subject,
      message: htmlContent,
    });
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
    title: "⚡ [ESCALATION] Moderator Requested Admin Intervention",
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
    `[EuroNova Escalation] ${params.targetName} (${params.targetType})`,
    `<p>Target: ${params.targetName}</p><p>Reason: ${params.reason}</p><p>Action: ${params.recommendedAction}</p>`
  );
}

/**
 * Dispatch alert when an automated anti-scam flag is triggered (duplicate titles, scam keywords).
 */
export async function sendScamAuditAlert(params: {
  auditId: string;
  projectId?: string;
  projectTitle: string;
  riskScore: number;
  triggerKeywords: string[];
  recommendedAction: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: "🛡️ [ANTI-SCAM] High-Risk Project Publication Detected",
    description: `The automated orbital shield flagged project **${params.projectTitle}** with risk score **${params.riskScore}**/100.`,
    color: COSMIC_COLORS.novaFlare,
    timestamp: new Date().toISOString(),
    fields: [
      { name: "Project Title", value: params.projectTitle, inline: false },
      { name: "Risk Score", value: `${params.riskScore}/100`, inline: true },
      { name: "Action Enforced", value: `\`${params.recommendedAction}\``, inline: true },
      {
        name: "Trigger Keywords",
        value: params.triggerKeywords.length > 0 ? params.triggerKeywords.join(", ") : "None (Pattern)",
        inline: false,
      },
    ],
    footer: {
      text: "EuroNova Anti-Scam Engine • project_audits",
    },
  };

  void postToDiscordWebhook(embed);
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
      : "🚨 [SUPPORT] High-Priority Volunteer Ticket Filed",
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
      void sendPendingNotificationEmail({
        recipientEmail: targetEmail,
        subject: `[EuroNova Support] Response to: ${params.ticketSubject}`,
        title: `Support Specialist Reply: ${params.ticketSubject}`,
        message: params.replyMessage,
        actionUrl: "/dashboard/support",
        priority: "urgent",
      });
    }

    // 2. Dispatch to user's personalized Discord Webhook if configured
    if (prefs.discordWebhookUrl) {
      const embed: DiscordEmbed = {
        title: `🚨 Support Reply: ${params.ticketSubject}`,
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
