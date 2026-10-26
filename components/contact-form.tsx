"use client";

import { useActionState, useState } from "react";
import { sendContactMessage, type ContactState } from "@/app/about/actions";

const INITIAL: ContactState = { status: "idle" };
const EMPTY = { name: "", email: "", msg: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, INITIAL);
  const [values, setValues] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!values.name.trim() || !values.email.trim() || !values.msg.trim()) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const sent = state.status === "success" && state !== dismissed;

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      {sent ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setDismissed(state);
                  setValues(EMPTY);
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.status === "error" && (
            <div
              className="terminal-success"
              role="alert"
              style={{
                marginBottom: 18,
                borderColor: "var(--magenta)",
                boxShadow: "0 0 22px rgba(255,0,110,0.25)",
              }}
            >
              <div className="term-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="term-title">VAULT-OS // TERMINAL</span>
              </div>
              <div className="term-body">
                <div
                  className="line success"
                  style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.45)" }}
                >
                  &gt; {state.message}
                </div>
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={values.name}
              onChange={set("name")}
              placeholder="px_kai"
              maxLength={60}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={values.email}
              onChange={set("email")}
              placeholder="jugador@vault.gg"
              maxLength={120}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              name="msg"
              rows={5}
              value={values.msg}
              onChange={set("msg")}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={2000}
            ></textarea>
          </div>
          {/* Honeypot: hidden from users, bots fill it */}
          <input
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <button
            className="btn xl press"
            type="submit"
            disabled={pending}
            style={{ width: "100%" }}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
