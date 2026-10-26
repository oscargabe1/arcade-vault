"use server";

import { Resend } from "resend";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

const LIMITS = { name: 60, email: 120, msg: 2000 } as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const msg = field(formData, "msg");

  // Honeypot: bots fill it. Fake success so they get no signal.
  if (field(formData, "website") !== "") {
    return { status: "success", name: name || "AGENTE" };
  }

  if (!name || !email || !msg) {
    return { status: "error", message: "ERROR: FALTAN CAMPOS POR COMPLETAR." };
  }
  if (name.length > LIMITS.name) {
    return { status: "error", message: `ERROR: NOMBRE MAX ${LIMITS.name} CARACTERES.` };
  }
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    return { status: "error", message: "ERROR: CORREO INVALIDO." };
  }
  if (msg.length > LIMITS.msg) {
    return { status: "error", message: `ERROR: MENSAJE MAX ${LIMITS.msg} CARACTERES.` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("sendContactMessage: missing RESEND_API_KEY or CONTACT_TO_EMAIL");
    return { status: "error", message: "ERROR: SERVICIO DE CORREO NO CONFIGURADO." };
  }

  try {
    // Instantiated here (not at module level) so `next build` works without the key.
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });
    if (error) {
      console.error("sendContactMessage: Resend error", error);
      return { status: "error", message: "ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTENTA DE NUEVO." };
    }
  } catch (err) {
    console.error("sendContactMessage: unexpected error", err);
    return { status: "error", message: "ERROR: NO SE PUDO ENVIAR EL MENSAJE. INTENTA DE NUEVO." };
  }

  return { status: "success", name };
}
