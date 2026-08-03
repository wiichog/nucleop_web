import { FormEvent, useEffect, useRef, useState } from "react";
import { Phone, Mail, CheckCircle2 } from "lucide-react";
import { CtaButton, Eyebrow } from "./ui";
import { useReveal } from "./useReveal";
import { api } from "../api/client";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

interface Grecaptcha {
  render: (el: HTMLElement, opts: { sitekey: string; theme?: "dark" | "light" }) => number;
  getResponse: (id?: number) => string;
  reset: (id?: number) => void;
}
declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
    onNucleoRecaptcha?: () => void;
  }
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white " +
  "placeholder-white/40 outline-none transition-colors focus:border-nucleo-flame/60";

export function ContactSection() {
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const show = (cls: string) => (visible ? cls : "");

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", gym: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Carga el widget reCAPTCHA v2 (casilla) de forma perezosa cuando se monta la sección.
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    const renderWidget = () => {
      if (recaptchaRef.current && window.grecaptcha && widgetId.current === null) {
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: "dark",
        });
      }
    };
    if (window.grecaptcha) {
      renderWidget();
      return;
    }
    window.onNucleoRecaptcha = renderWidget;
    if (!document.getElementById("recaptcha-script")) {
      const s = document.createElement("script");
      s.id = "recaptcha-script";
      s.src = "https://www.google.com/recaptcha/api.js?onload=onNucleoRecaptcha&render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  const set = (k: keyof typeof form) => (e: { currentTarget: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.currentTarget.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    let token = "";
    if (RECAPTCHA_SITE_KEY) {
      token = window.grecaptcha?.getResponse(widgetId.current ?? undefined) ?? "";
      if (!token) {
        setStatus("error");
        setErrorMsg("Por favor confirma que no eres un robot.");
        return;
      }
    }
    setStatus("sending");
    try {
      await api.post("/contact", { ...form, recaptcha_token: token });
      setStatus("sent");
      setForm({ name: "", email: "", gym: "", message: "" });
      if (RECAPTCHA_SITE_KEY) window.grecaptcha?.reset(widgetId.current ?? undefined);
    } catch {
      setStatus("error");
      setErrorMsg("No se pudo enviar. Intenta de nuevo o escríbenos por correo.");
    }
  };

  return (
    <section
      id="contacto"
      ref={ref}
      className="relative w-full scroll-mt-20 overflow-hidden bg-black px-4 pb-12 pt-24 sm:px-6 md:pt-36 lg:px-10"
    >
      <div className="mx-auto max-w-5xl">
        <div
          className={`flex flex-col items-center text-center opacity-0 ${show("animate-fade-up")}`}
          style={{ animationDelay: "0.1s" }}
        >
          <Eyebrow>Contacto</Eyebrow>
          <h2 className="hero-title mt-6 max-w-3xl font-display text-4xl font-medium text-white sm:text-6xl">
            Lleva tu gimnasio a la red<span className="text-nucleo-flame">.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            Escríbenos para una demo o entra directo al panel de administración.
          </p>

          <div className="mt-8">
            <CtaButton to="/login" label="Portal Admin" variant="ghost" />
          </div>
        </div>

        {/* Formulario de contacto → correo (Mailgun) protegido con reCAPTCHA */}
        <form
          onSubmit={submit}
          className={`mx-auto mt-14 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left opacity-0 md:p-8 ${show(
            "animate-fade-up",
          )}`}
          style={{ animationDelay: "0.25s" }}
        >
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="text-nucleo-flame" size={40} />
              <p className="font-display text-xl text-white">¡Mensaje enviado!</p>
              <p className="font-mono text-sm text-white/60">Te contactaremos muy pronto.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  className={inputClass}
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={set("name")}
                  required
                  maxLength={120}
                />
                <input
                  className={inputClass}
                  type="email"
                  placeholder="Correo"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
                <input
                  className={`${inputClass} sm:col-span-2`}
                  placeholder="Nombre de tu gimnasio (opcional)"
                  value={form.gym}
                  onChange={set("gym")}
                  maxLength={120}
                />
                <textarea
                  className={`${inputClass} sm:col-span-2`}
                  placeholder="¿Cómo te ayudamos?"
                  rows={4}
                  value={form.message}
                  onChange={set("message")}
                  required
                  maxLength={4000}
                />
              </div>

              {RECAPTCHA_SITE_KEY ? <div ref={recaptchaRef} className="mt-4" /> : null}

              {status === "error" ? (
                <p className="mt-3 font-mono text-sm text-red-400">{errorMsg}</p>
              ) : null}

              <div className="mt-6">
                <CtaButton
                  type="submit"
                  disabled={status === "sending"}
                  label={status === "sending" ? "Enviando…" : "Enviar mensaje"}
                  variant="flame"
                />
              </div>
            </>
          )}
        </form>

        {/* Datos de contacto */}
        <div
          className={`mx-auto mt-3 grid max-w-2xl grid-cols-1 gap-3 opacity-0 sm:grid-cols-2 ${show(
            "animate-fade-up",
          )}`}
          style={{ animationDelay: "0.4s" }}
        >
          <a
            href="tel:+50249740808"
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
              <Phone size={19} strokeWidth={1.5} className="text-nucleo-flame" />
            </span>
            <span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                Teléfono
              </span>
              <span className="font-mono text-sm">+502 4974 0808</span>
            </span>
          </a>
          <a
            href="mailto:jgarcia@devpackgroup.com"
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
              <Mail size={19} strokeWidth={1.5} className="text-nucleo-flame" />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                Correo
              </span>
              <span className="block truncate font-mono text-sm">jgarcia@devpackgroup.com</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
