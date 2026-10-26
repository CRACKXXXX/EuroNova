"use server";

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  success?: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Server Action: Email Notification Dispatcher Scaffold
 * Prepares the integration point for Resend / SendGrid / Postmark or SMTP.
 * Currently logs the payload and returns a simulated success response.
 */
export async function sendEmailAction(payload: SendEmailPayload): Promise<SendEmailResult> {
  try {
    if (!payload.to || !payload.subject || !payload.body) {
      return { error: "Missing required email fields (to, subject, body)." };
    }


    // Mock successful delivery
    const mockMessageId = `mock_dispatch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      success: true,
      messageId: mockMessageId,
    };
  } catch (error: unknown) {
    console.error("sendEmailAction error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to send email notification.",
    };
  }
}
