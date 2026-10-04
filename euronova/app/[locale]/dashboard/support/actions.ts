"use server";

import { createClient } from "@/utils/supabase/server";
import nodemailer from "nodemailer";

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

  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const subject = formData.get("subject") as string;
  const reason = formData.get("reason") as string;
  const content = formData.get("content") as string;

  if (!email || !subject || !reason || !content) {
    return { error: "Por favor, completa todos los campos obligatorios." };
  }

  const { error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      email,
      phone: phone || null,
      subject,
      reason,
      content,
    });

  if (error) {
    console.error("Error al crear ticket:", error);
    return { error: "Hubo un error al guardar tu mensaje. Inténtalo de nuevo." };
  }

  try {
    await transporter.sendMail({
      from: `"EuroNova Support" <EuroNovaOfficial@gmail.com>`,
      to: "EuroNovaOfficial@gmail.com",
      subject: `Nuevo Ticket [${reason.toUpperCase()}]: ${subject}`,
      html: `
        <h2>Nuevo ticket de soporte</h2>
        <p><strong>Usuario ID:</strong> ${user.id}</p>
        <p><strong>Email de Contacto:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone || "No proporcionado"}</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <hr />
        <h3>Contenido:</h3>
        <p style="white-space: pre-wrap;">${content}</p>
      `,
    });
  } catch (mailError) {
    console.error("Error al enviar email:", mailError);
    // Even if email fails, ticket was saved. 
  }

  return { success: "¡Ticket enviado con éxito! Nuestro equipo te contactará pronto." };
}
