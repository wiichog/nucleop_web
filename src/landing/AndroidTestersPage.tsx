import { FormEvent, ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Smartphone } from "lucide-react";
import { AtomLogo } from "./AtomLogo";
import { CtaButton } from "./ui";
// `publicApi` y no el `api` de `client.ts`, por lo mismo que /contrato: aquí no hay
// sesión y nunca la va a haber. El cliente normal mete `Authorization` en toda
// petición —un token viejo del localStorage viajaría a un endpoint público— y ante
// un 401 dispara el refresh rotatorio, que acabaría mandando al login a alguien que
// ni siquiera tiene cuenta.
import { publicApi } from "../api/publicClient";

// Página pública de reclutamiento de probadores de Android (prueba cerrada de
// Google Play). Va como ruta React suelta —fuera del AdminShell, igual que
// /eliminar-cuenta— porque quien la abre no tiene ni va a tener sesión: el enlace
// se reparte por WhatsApp del box y por redes.
//
// El orden de la página no es estético. Primero se explica el compromiso de los
// días y recién después se piden los datos, porque el fracaso caro de estas
// campañas no es que se apunte poca gente: es que se apunte gente que desinstala
// al tercer día. Cada una de esas reinicia el contador del GRUPO ENTERO, así que
// alguien que lee el plazo y se va es mejor noticia que alguien que se apunta sin
// haberlo leído.

// El plazo lo manda el backend (`apps/betatesters/models.DIAS_DE_COMPROMISO`) y
// aquí se repite escrito. Si allá cambia, cambia acá.
const DIAS = 14;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white " +
  "placeholder-white/40 outline-none transition-colors focus:border-nucleo-flame/60";

/** Errores por campo que devuelve el backend en `detail` ante un 400. */
type ErroresPorCampo = Partial<Record<"full_name" | "google_email" | "phone", string>>;

function Panel({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-nucleo-flame">{etiqueta}</p>
      <div className="mt-3 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

function Campo({
  label, hint, error, children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-widest text-white/50">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-2 text-xs leading-relaxed text-white/40">{hint}</p>}
      {error && <p className="mt-2 text-xs leading-relaxed text-red-400">{error}</p>}
    </label>
  );
}

export function AndroidTestersPage() {
  const [form, setForm] = useState({ full_name: "", google_email: "", phone: "" });
  // El honeypot va en su propio estado y no en `form`: no es un dato de la
  // persona, es la trampa. Una persona nunca lo ve, así que si llega con algo
  // escrito es un bot que rellenó todos los `input` que encontró.
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errores, setErrores] = useState<ErroresPorCampo>({});

  // El valor se lee ANTES de llamar a `setForm`, no dentro del updater. React
  // pone `currentTarget` en null en cuanto el handler termina, y el updater que
  // se le pasa a `setState` no siempre corre en ese mismo tick: si ya hay otra
  // actualización en cola, React lo difiere y para entonces `e.currentTarget` ya
  // es null. Se cae con un "Cannot read properties of null" que solo aparece al
  // escribir rápido en dos campos seguidos, que es justo lo que hace la gente.
  const set = (k: keyof typeof form) => (e: { currentTarget: { value: string } }) => {
    const valor = e.currentTarget.value;
    setForm((f) => ({ ...f, [k]: valor }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setErrores({});
    setStatus("sending");
    try {
      await publicApi.post(
        "/android-testers",
        { ...form, website: honeypot },
        // De dónde salió el registro. Va en cabecera y no en el body a propósito:
        // el backend solo confía en la cabecera para escribir `source`.
        { headers: { "X-Nucleo-Client": "web" } },
      );
      setStatus("sent");
    } catch (err: unknown) {
      setStatus("error");
      const res = (err as { response?: { status?: number; data?: Record<string, unknown> } })
        .response;
      const data = res?.data ?? {};

      // 503 = la campaña está cerrada (interruptor apagado o tope alcanzado). No es
      // un error de quien llenó el formulario, así que no se le pinta en rojo bajo
      // ningún campo: se le dice tal cual lo que pasa.
      if (res?.status === 503) {
        setErrorMsg(String(data.detail ?? "Por ahora no estamos buscando más probadores."));
        return;
      }

      // En un 400, `detail` es el mapa de errores por campo. Se cuelga cada
      // mensaje bajo SU input; `message` no sirve para eso porque el backend le
      // antepone el nombre técnico del campo ("google_email: …").
      const detail = data.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        const mapa: ErroresPorCampo = {};
        for (const [campo, valor] of Object.entries(detail as Record<string, unknown>)) {
          const texto = Array.isArray(valor) ? String(valor[0]) : String(valor);
          if (campo in form) mapa[campo as keyof ErroresPorCampo] = texto;
        }
        if (Object.keys(mapa).length) {
          setErrores(mapa);
          return;
        }
      }
      setErrorMsg(
        typeof data.detail === "string"
          ? data.detail
          : "No se pudo enviar. Revisa tu conexión e intenta de nuevo.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AtomLogo size={26} pulse={false} glow={false} />
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              nucleo
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-12">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-nucleo-flame">
          <Smartphone size={14} />
          Prueba cerrada · Android
        </p>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Ayúdanos a lanzar Nucleo en Android
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Nucleo ya está en el App Store y ahora vamos por Google Play. Para dejarnos publicar,
          Google nos pide un grupo de personas que instale la app y la deje instalada{" "}
          <strong className="text-white">{DIAS} días seguidos</strong>. Si tienes un teléfono
          Android, con eso nos ayudas.
        </p>

        <Panel etiqueta="⏳ Lo único que te pedimos">
          Déjala instalada <strong className="text-white">{DIAS} días seguidos</strong>. El conteo
          de Google es continuo: si alguien la desinstala antes, su prueba no cuenta y{" "}
          <strong className="text-white">el grupo entero vuelve a empezar</strong>. Con dejarla en
          tu teléfono es suficiente; no tienes que usarla todos los días.
        </Panel>

        <Panel etiqueta="📧 La cuenta importa">
          Necesitamos el correo de la{" "}
          <strong className="text-white">cuenta de Google con la que entras a Play Store</strong>{" "}
          en tu teléfono. La invitación se liga a esa dirección exacta: si nos das otra, te llegará
          el enlace y al abrirlo Play Store te dirá que no estás en la lista. No hace falta que sea
          de Gmail —una cuenta de Workspace sirve igual—, pero sí tiene que ser la del teléfono.
        </Panel>

        {status === "sent" ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <CheckCircle2 className="text-nucleo-flame" size={40} />
            <p className="font-display text-xl text-white">¡Listo! Ya estás en la lista.</p>
            <p className="max-w-md text-sm leading-relaxed text-white/60">
              Te vamos a agregar a la prueba cerrada de Google Play y te llega el enlace de
              instalación a tu correo de Google. Revisa también la carpeta de spam.
            </p>
            <p className="mt-2 font-mono text-xs text-white/40">
              Recuerda: déjala instalada {DIAS} días seguidos.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-10 space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
          >
            <Campo label="Nombre completo" error={errores.full_name}>
              <input
                className={inputClass}
                placeholder="Ana Ramírez"
                value={form.full_name}
                onChange={set("full_name")}
                required
                maxLength={120}
                autoComplete="name"
              />
            </Campo>

            <Campo
              label="Correo de tu cuenta de Google"
              hint="El mismo con el que entras a Play Store en tu teléfono."
              error={errores.google_email}
            >
              <input
                className={inputClass}
                type="email"
                placeholder="tucuenta@gmail.com"
                value={form.google_email}
                onChange={set("google_email")}
                required
                maxLength={254}
                autoComplete="email"
              />
            </Campo>

            <Campo
              label="Teléfono (opcional)"
              hint="Solo para avisarte rápido si la invitación te rebota."
              error={errores.phone}
            >
              <input
                className={inputClass}
                type="tel"
                placeholder="+502 5555 6666"
                value={form.phone}
                onChange={set("phone")}
                maxLength={30}
                autoComplete="tel"
              />
            </Campo>

            {/* Honeypot. Se esconde fuera de la pantalla en vez de con `display:none`
                porque hay bots que saltan lo que está oculto por CSS y rellenan lo
                demás. `tabIndex={-1}` y `aria-hidden` lo sacan del camino de quien
                navega con teclado o con lector de pantalla. */}
            <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
              <label>
                No llenes esto
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.currentTarget.value)}
                />
              </label>
            </div>

            {errorMsg && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMsg}
              </p>
            )}

            <div className="pt-1">
              <CtaButton
                type="submit"
                disabled={status === "sending"}
                label={status === "sending" ? "Enviando…" : "Quiero ser probador"}
              />
            </div>

            <p className="text-xs leading-relaxed text-white/40">
              Usamos tu correo solo para agregarte a la prueba de Google Play y avisarte cuando
              puedas instalar. Puedes salirte cuando quieras respondiendo ese correo. Lee la{" "}
              <Link to="/privacidad" className="text-nucleo-flame hover:underline">
                política de privacidad
              </Link>
              .
            </p>
          </form>
        )}

        <p className="mt-10 text-sm leading-relaxed text-white/50">
          ¿Tienes iPhone? Nucleo ya está publicado en el App Store: búscala como{" "}
          <strong className="text-white/80">Nucleo Gym</strong>.
        </p>

        <p className="mt-14 border-t border-white/10 pt-8 text-xs text-white/40">
          © {new Date().getFullYear()} Nucleo · Devpack Group. Hecho en Guatemala 🇬🇹
        </p>
      </main>
    </div>
  );
}
