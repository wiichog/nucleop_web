import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Smartphone, Trash2 } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

// Página pública de eliminación de cuenta. Google Play la exige como URL propia,
// accesible SIN iniciar sesión y distinta de la política de privacidad, para toda app
// que permita crear cuentas. Va como ruta React (igual que /privacidad) porque el
// rewrite SPA de Amplify sombrea cualquier .html estático.
//
// Todo lo que se afirma aquí está verificado contra apps/accounts/services.py
// (`eliminar_cuenta`) del backend. Si ese flujo cambia, esta página cambia con él.

const UPDATED = "3 de agosto de 2026";
const CONTACT_EMAIL = "jgarcia@devpackgroup.com";
// Plazo de respuesta a solicitudes por correo. Es un COMPROMISO PÚBLICO, no un
// detalle de implementación: confirmado por el dueño (2026-08-03) en 30 días
// naturales. No lo cambies sin decidirlo con él.
const RESPONSE_DAYS = 30;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-nucleo-flame/40 text-xs font-semibold text-nucleo-flame">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

export function DeleteAccountPage() {
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

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Eliminar tu cuenta y tus datos
        </h1>
        <p className="mt-3 text-sm text-white/50">Última actualización: {UPDATED}</p>

        <p className="mt-6 text-sm leading-relaxed text-white/70">
          Esta página explica cómo eliminar tu cuenta de <strong className="text-white/90">Nucleo</strong>{" "}
          (aplicación publicada por Devpack Group, identificador{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-white/80">app.nucleo.mobile</code>),
          qué datos se eliminan, cuáles se conservan y por cuánto tiempo.
        </p>

        <Section title="Opción 1 — Desde la aplicación (inmediato)">
          <p className="flex items-center gap-2 text-white/90">
            <Smartphone size={16} className="shrink-0 text-nucleo-flame" />
            Es la vía más rápida: se ejecuta en el momento, sin esperar respuesta.
          </p>
          <ol className="ml-1 mt-4 space-y-3">
            <Step n={1}>
              Abre la app de Nucleo e inicia sesión con tu cuenta.
            </Step>
            <Step n={2}>
              Ve a la pestaña <strong className="text-white/90">Perfil</strong>.
            </Step>
            <Step n={3}>
              Baja hasta <strong className="text-white/90">Eliminar cuenta</strong>.
            </Step>
            <Step n={4}>
              Confirma con tu contraseña. Si entras con Google, Apple o Facebook y nunca creaste una
              contraseña, basta con confirmar.
            </Step>
          </ol>
          <p className="mt-4">
            La eliminación se aplica de inmediato y se cierran todas tus sesiones abiertas, en todos
            tus dispositivos. <strong className="text-white/90">La acción no se puede deshacer.</strong>
          </p>
        </Section>

        <Section title="Opción 2 — Por correo (si ya no puedes entrar)">
          <p className="flex items-center gap-2">
            <Mail size={15} className="shrink-0 text-nucleo-flame" />
            <a href={`mailto:${CONTACT_EMAIL}?subject=Eliminar%20mi%20cuenta%20de%20Nucleo`} className="text-nucleo-flame hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            Escríbenos <strong className="text-white/90">desde el correo electrónico de tu cuenta</strong> con
            el asunto «Eliminar mi cuenta» — así verificamos que la solicitud es tuya. Responderemos
            en un plazo máximo de {RESPONSE_DAYS} días naturales.
          </p>
        </Section>

        <Section title="Qué datos se eliminan">
          <p className="flex items-center gap-2 text-white/90">
            <Trash2 size={16} className="shrink-0 text-nucleo-flame" />
            Al eliminar tu cuenta:
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong className="text-white/90">Tus datos personales de perfil:</strong> nombre y
              apellido, fecha de nacimiento, foto, contacto de emergencia, nivel deportivo y metas.
            </li>
            <li>
              <strong className="text-white/90">Tus métodos de pago guardados:</strong> las tarjetas
              que hayas registrado se borran por completo de nuestros servidores.
            </li>
            <li>
              <strong className="text-white/90">Tu correo y tu teléfono</strong> dejan de estar
              asociados a la cuenta y quedan liberados.
            </li>
            <li>
              <strong className="text-white/90">Tu acceso:</strong> la contraseña se invalida, la
              cuenta se desactiva y se cierran todas las sesiones activas.
            </li>
            <li>
              <strong className="text-white/90">Tus roles</strong> como coach, entrenador o
              administrador de un gimnasio se desactivan.
            </li>
          </ul>
        </Section>

        <Section title="Qué datos se conservan y por qué">
          <p>
            Guatemala obliga a conservar los registros contables y las facturas electrónicas (FEL)
            emitidas. Por eso, al eliminar tu cuenta{" "}
            <strong className="text-white/90">no se borra</strong> lo siguiente:
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong className="text-white/90">El historial de pagos y facturas</strong> de las
              membresías, drop-ins, servicios o productos que hayas comprado.
            </li>
            <li>
              <strong className="text-white/90">El historial de membresías</strong> con los gimnasios
              a los que perteneciste, y tus resultados deportivos (récords personales, asistencia).
            </li>
            <li>
              <strong className="text-white/90">El registro interno de auditoría</strong>, que
              únicamente referencia un identificador y no conserva tu correo ni tu nombre.
            </li>
          </ul>
          <p>
            Estos registros quedan asociados a un perfil{" "}
            <strong className="text-white/90">ya anonimizado</strong>: conservan el dato contable o
            deportivo, pero no tu identidad. Se conservan durante el plazo que exige la legislación
            guatemalteca aplicable y después se eliminan.
            {/* Redacción genérica a propósito: dar una cifra concreta sería una afirmación legal
                que habría que confirmar con el contador. Decisión del dueño (2026-08-03). */}
          </p>
        </Section>

        <Section title="Eliminar solo algunos datos, sin cerrar la cuenta">
          <p>
            Si no quieres cerrar tu cuenta pero sí quitar cierta información, puedes hacerlo tú
            desde la app:
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              En <strong className="text-white/90">Perfil → Editar perfil</strong> puedes borrar tu
              fecha de nacimiento, tu contacto de emergencia, tu nivel deportivo y tus metas: deja el
              campo vacío y guarda.
            </li>
            <li>
              En <strong className="text-white/90">Perfil → Métodos de pago</strong> puedes eliminar
              cualquier tarjeta guardada.
            </li>
            <li>
              Puedes borrar tus propias publicaciones, comentarios y récords personales desde la
              pantalla donde aparecen.
            </li>
          </ul>
          <p>
            Para cualquier otra solicitud sobre tus datos, escríbenos a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-nucleo-flame hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Más información">
          <p>
            Consulta nuestra{" "}
            <Link to="/privacidad" className="text-nucleo-flame hover:underline">
              política de privacidad
            </Link>{" "}
            para conocer en detalle qué datos recopilamos y con quién los compartimos.
          </p>
        </Section>

        <p className="mt-14 border-t border-white/10 pt-8 text-xs text-white/40">
          © {new Date().getFullYear()} Nucleo · Devpack Group. Hecho en Guatemala 🇬🇹
        </p>
      </main>
    </div>
  );
}
