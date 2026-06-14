import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Phone, Mail, ArrowRight, Send, CheckCircle2 } from "lucide-react";
import { AtomLogo } from "./AtomLogo";
import { Eyebrow } from "./ui";
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
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white " +
  "placeholder-white/40 outline-none transition-colors focus:border-nucleo-flame/60";

export function ContactSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

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
    <section id="contacto" className="relative overflow-hidden bg-black px-6 pb-12 pt-28 md:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.05),_transparent_55%)]" />
      <div ref={ref} className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center"
        >
          <Eyebrow>Contacto</Eyebrow>
          <h2 className="hero-title mt-6 font-display text-5xl font-medium text-white md:text-7xl">
            Lleva tu gimnasio <span className="text-nucleo-flame">a la red</span>
            <span className="text-nucleo-flame">.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/60">
            Escríbenos para una demo o entra directo al panel de administración.
          </p>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-nucleo-flame px-8 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-nucleo-coral"
          >
            Portal Admin
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Formulario de contacto → correo (Mailgun) protegido con reCAPTCHA */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="liquid-glass mx-auto mt-14 max-w-2xl rounded-3xl p-6 text-left md:p-8"
        >
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="text-nucleo-flame" size={40} />
              <p className="font-display text-xl text-white">¡Mensaje enviado!</p>
              <p className="text-sm text-white/60">Te contactaremos muy pronto.</p>
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
                <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
              ) : null}

              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-nucleo-flame px-7 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-nucleo-coral disabled:opacity-60"
              >
                {status === "sending" ? "Enviando…" : "Enviar mensaje"}
                <Send size={16} />
              </button>
            </>
          )}
        </motion.form>

        {/* Datos de contacto */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="tel:+50249740808"
            className="liquid-glass flex items-center gap-4 rounded-2xl px-6 py-5 text-white transition-colors hover:bg-white/5"
          >
            <span className="liquid-glass rounded-full p-3 text-nucleo-flame">
              <Phone size={20} />
            </span>
            <span>
              <span className="block text-xs uppercase tracking-widest text-white/40">Teléfono</span>
              <span className="text-sm font-medium">+502 4974 0808</span>
            </span>
          </a>
          <a
            href="mailto:jgarcia@devpackgroup.com"
            className="liquid-glass flex items-center gap-4 rounded-2xl px-6 py-5 text-white transition-colors hover:bg-white/5"
          >
            <span className="liquid-glass rounded-full p-3 text-nucleo-flame">
              <Mail size={20} />
            </span>
            <span>
              <span className="block text-xs uppercase tracking-widest text-white/40">Correo</span>
              <span className="text-sm font-medium">jgarcia@devpackgroup.com</span>
            </span>
          </a>
        </div>

        {/* Pie */}
        <div className="mt-20 flex flex-col items-center gap-4 border-t border-white/10 pt-10 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <AtomLogo size={26} pulse={false} />
            <span className="font-display text-lg font-semibold lowercase tracking-tight text-white">nucleo</span>
          </div>
          <span className="text-xs text-white/40">El núcleo de tu vida deportiva.</span>
        </div>
        <p className="mt-8 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Nucleo · Devpack Group. Todos los derechos reservados.
        </p>
      </div>
    </section>
  );
}
