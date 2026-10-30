"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { TicketSubmissionSchema } from "@/lib/schemas";
import { stripDangerousHtml } from "@/lib/securitySanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export interface TicketReplyItem {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: "user" | "support" | "moderator" | "admin" | "root";
  sender_name?: string | null;
  message: string;
  created_at: string;
}

export interface UserTicketItem {
  id: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  subject: string;
  reason: string;
  content: string;
  status: "open" | "pending" | "in_progress" | "resolved";
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  resolution_action?: string | null;
  replies?: TicketReplyItem[];
}

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
      return { error: "RATE_LIMIT_EXCEEDED" };
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
    const { sendCriticalSupportAlert, sendPendingNotificationEmail } = await import("@/lib/externalAlerts");
    void sendCriticalSupportAlert({
      ticketId: user.id,
      userEmail: email,
      subject,
      reason,
      content,
    });

    // Send user confirmation email
    void sendPendingNotificationEmail({
      recipientEmail: email,
      subject: `[EuroNova Support] Ticket Confirmation: ${subject}`,
      title: "Support Ticket Registered",
      message: `Your inquiry regarding "${subject}" has been successfully received by EuroNova Orbital Command. Our support team has logged your case under reason [${reason.toUpperCase()}] and will review it shortly.`,
      actionUrl: "/dashboard/support",
      priority: "normal",
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

/**
 * Fetches the ticket history and message threads for the currently authenticated user.
 */
export async function getUserTickets(): Promise<{ tickets: UserTicketItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { tickets: [], error: "Debes estar autenticado para ver tus tickets." };
    }

    const { data: ticketsData, error: ticketsErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ticketsErr) {
      console.error("getUserTickets error:", ticketsErr);
      return { tickets: [], error: "Error al recuperar tus tickets de soporte." };
    }

    const tickets = (ticketsData as UserTicketItem[]) || [];
    if (tickets.length === 0) {
      return { tickets: [] };
    }

    const ticketIds = tickets.map((t) => t.id);

    // Fetch replies for user's tickets
    const { data: repliesData, error: repliesErr } = await supabase
      .from("support_ticket_replies")
      .select("*")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true });

    if (repliesErr) {
      console.warn("Could not fetch support_ticket_replies:", repliesErr.message);
    }

    const repliesByTicketId = new Map<string, TicketReplyItem[]>();
    if (repliesData) {
      for (const reply of repliesData as TicketReplyItem[]) {
        const list = repliesByTicketId.get(reply.ticket_id) || [];
        list.push(reply);
        repliesByTicketId.set(reply.ticket_id, list);
      }
    }

    const ticketsWithReplies = tickets.map((t) => ({
      ...t,
      replies: repliesByTicketId.get(t.id) || [],
    }));

    return { tickets: ticketsWithReplies };
  } catch (err: unknown) {
    console.error("getUserTickets unhandled error:", err);
    return { tickets: [], error: err instanceof Error ? err.message : "Error inesperado al cargar tickets." };
  }
}

/**
 * Submits a new reply to an existing support ticket from the user.
 */
export async function submitTicketReply(
  ticketId: string,
  message: string
): Promise<{ success?: boolean; reply?: TicketReplyItem; error?: string }> {
  try {
    if (!ticketId || !message || !message.trim()) {
      return { error: "El mensaje no puede estar vacío." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Debes iniciar sesión para responder." };
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(`ticket_reply_${user.id}`, RATE_LIMITS.TICKET_REPLY);
    if (!rateCheck.success) {
      return { error: "RATE_LIMIT_EXCEEDED" };
    }

    // Sanitize message
    const cleanMessage = stripDangerousHtml(message.trim(), 4000);
    if (cleanMessage.length < 2) {
      return { error: "El mensaje debe contener al menos 2 caracteres." };
    }

    // Verify ticket ownership
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id, user_id, status, subject, email")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return { error: "Ticket no encontrado o no tienes permiso para acceder a él." };
    }

    // Insert reply
    const { data: insertedReply, error: insertErr } = await supabase
      .from("support_ticket_replies")
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_role: "user",
        sender_name: user.email?.split("@")[0] || "User",
        message: cleanMessage,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Error inserting ticket reply:", insertErr);
      return { error: "No se pudo registrar tu respuesta. Inténtalo de nuevo." };
    }

    // Update ticket updated_at and reopen if resolved
    const updates: { updated_at: string; status?: "open" } = {
      updated_at: new Date().toISOString(),
    };
    if (ticket.status === "resolved") {
      updates.status = "open";
    }

    await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId);

    // Alert staff via critical support alert
    try {
      const { sendCriticalSupportAlert } = await import("@/lib/externalAlerts");
      void sendCriticalSupportAlert({
        ticketId: ticket.id,
        userEmail: ticket.email,
        subject: `[User Reply] ${ticket.subject}`,
        reason: "user_ticket_followup",
        content: cleanMessage,
      });
    } catch (err) {
      console.warn("Could not dispatch staff alert for ticket reply:", err);
    }

    revalidatePath("/dashboard/support");
    return { success: true, reply: insertedReply as TicketReplyItem };
  } catch (err: unknown) {
    console.error("submitTicketReply error:", err);
    return { error: err instanceof Error ? err.message : "Error inesperado al enviar la respuesta." };
  }
}
