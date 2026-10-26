"use server";

import { createClient } from "@/utils/supabase/server";
import nodemailer from "nodemailer";
import { TicketSubmissionSchema } from "@/lib/schemas";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "EuroNovaOfficial@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "dummy_password", 
  },
});

export async function createTicket(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes estar autenticado para crear un ticket." };
  }

  // 1. Rate limiting check per user
  const rateCheck = await checkRateLimit(`ticket_${user.id}`, RATE_LIMITS.TICKET);
  if (!rateCheck.success) {
    return {
      error: rateCheck.error || "Demasiados tickets enviados. Por favor, espera antes de enviar otro.",
    };
  }

  const rawPayload = {
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || null,
    subject: formData.get("subject") as string,
    reason: formData.get("reason") as string,
    content: formData.get("content") as string,
  };

  // 2. Zod double-layer schema validation
  const parsed = TicketSubmissionSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Por favor, completa todos los campos obligatorios correctamente.";
    return { error: issue };
  }

  // 3. Strip dangerous HTML & scripts
  const email = parsed.data.email;
  const phone = parsed.data.phone ? stripDangerousHtml(parsed.data.phone, 30) : null;
  const subject = stripDangerousHtml(parsed.data.subject, 150);
  const reason = stripDangerousHtml(parsed.data.reason, 50);
  const content = stripDangerousHtml(parsed.data.content, 5000);

  if (content.length < 10) {
    return { error: "El contenido del ticket debe tener al menos 10 caracteres." };
  }

  const { error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      email,
      phone,
      subject,
      reason,
      content,
    });

  if (error) {
    console.error("Error al crear ticket:", error);
    return { error: "Hubo un error al guardar tu mensaje. Inténtalo de nuevo." };
  }

  // Dispatch external Discord & email alerts
  try {
    const { sendCriticalSupportAlert } = await import("@/lib/externalAlerts");
    void sendCriticalSupportAlert({
      ticketId: user.id,
      userEmail: email,
      subject,
      reason,
      content,
    });
  } catch (err) {
    console.error("Could not send external support alert:", err);
  }

  try {
    await transporter.sendMail({
      from: `"EuroNova Support" <EuroNovaOfficial@gmail.com>`,
      to: "EuroNovaOfficial@gmail.com",
      subject: `[EuroNova Support] [${reason.toUpperCase()}]: ${subject}`,
      html: `
        <h2>EuroNova Support Ticket</h2>
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>Contact Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <h3>Content:</h3>
        <p style="white-space: pre-wrap;">${content}</p>
      `,
    });
  } catch (mailError) {
    console.error("Error al enviar email:", mailError);
    // Even if email fails, ticket was saved. 
  }

  // If applicant is applying for Support Specialist, log to admin_escalations
  if (reason === "apply_support") {
    try {
      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
      const adminDb = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await adminDb.from("admin_escalations").insert({
        escalated_by: user.id,
        escalated_by_role: "user",
        target_type: "user",
        target_id: user.id,
        target_name: email,
        reason: `Support Role Application: ${subject}`,
        recommended_action: "investigate",
        status: "pending",
        admin_notes: `Application Statement:\n${content}`,
      });
    } catch (err) {
      console.error("Could not register support application escalation:", err);
    }
  }

  return { success: "¡Ticket enviado con éxito! Nuestro equipo te contactará pronto." };
}
