import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

// Política de privacidad pública. Se sirve como RUTA React (/privacidad), no como .html
// estático: con el rewrite SPA `/* -> /index.html 200` de Amplify, una ruta de cliente
// siempre carga, mientras que un .html estático queda sombreado por ese mismo rewrite.
// Apple y Google exigen una URL pública y VIVA de privacidad antes de revisar.

const UPDATED = "10 de agosto de 2026";
const CONTACT_EMAIL = "jgarcia@devpackgroup.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
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
          Política de privacidad
        </h1>
        <p className="mt-3 text-sm text-white/50">Última actualización: {UPDATED}</p>

        <Section title="1. Quiénes somos">
          <p>
            Nucleo es una red deportiva que conecta gimnasios y boxes de CrossFit con atletas,
            coaches y clubes en Guatemala. Operamos la aplicación móvil del atleta y el panel web
            para gimnasios. Esta política explica qué datos recopilamos, cómo los usamos y con quién
            los compartimos. El responsable del tratamiento es Devpack Group. El uso de la
            plataforma se rige además por nuestros{" "}
            <Link to="/terminos" className="text-nucleo-flame hover:underline">
              términos de servicio
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p>
            <strong className="text-white/90">Datos de cuenta:</strong> correo electrónico
            (identificador de inicio de sesión), nombre y, de forma opcional, número de teléfono y
            fecha de nacimiento.
          </p>
          {/* Divulgar QUÉ se recibe de cada proveedor de login social no es opcional:
              Meta revisa que la política declare los datos obtenidos vía Facebook Login,
              y su ausencia es causa habitual de rechazo en App Review. */}
          <p>
            <strong className="text-white/90">Si entras con Google, Apple o Facebook:</strong>{" "}
            recibimos del proveedor tu nombre, tu correo electrónico y tu foto de perfil pública, y
            los usamos únicamente para crear o vincular tu cuenta de Nucleo y mostrar tu perfil. No
            publicamos nada en tus redes, no accedemos a tu lista de contactos ni a tus amistades, y
            no usamos esos datos para publicidad. Puedes revocar el acceso cuando quieras desde los
            ajustes de tu cuenta de Google, Apple o Facebook.
          </p>
          <p>
            <strong className="text-white/90">Datos deportivos:</strong> tus récords personales
            (PRs), asistencia y check-ins, reservas de clases, puntos y rachas, y la relación con
            los gimnasios a los que perteneces (tu Athlete Passport).
          </p>
          <p>
            <strong className="text-white/90">Contenido que publicas:</strong> fotos, videos y
            comentarios que subes al feed de tu comunidad.
          </p>
          <p>
            <strong className="text-white/90">Datos del dispositivo:</strong> token de
            notificaciones push y datos técnicos básicos necesarios para que la app funcione.
          </p>
          <p>
            <strong className="text-white/90">Pagos:</strong> los pagos con tarjeta se procesan a
            través de nuestro proveedor de pasarela (Pagalo). Nucleo no almacena el número completo
            de tu tarjeta en sus servidores ni lo expone en la aplicación.
          </p>
        </Section>

        <Section title="3. Cómo usamos tus datos">
          <p>
            Usamos tus datos para crear y administrar tu cuenta, mostrar tu historial deportivo,
            permitir reservas y check-ins, procesar pagos de membresías, drop-ins, servicios y
            tienda, enviarte notificaciones relevantes (recordatorios de clase, anuncios de tu
            gimnasio) y mantener la seguridad de la plataforma. No vendemos tus datos personales.
          </p>
        </Section>

        <Section title="4. Con quién compartimos datos">
          <p>Compartimos datos únicamente con los proveedores necesarios para operar el servicio:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong className="text-white/90">Pagalo</strong> — procesamiento de pagos con tarjeta.
            </li>
            <li>
              <strong className="text-white/90">Expo</strong> — entrega de las notificaciones push a
              tu dispositivo, y distribución de la aplicación.
            </li>
            <li>
              <strong className="text-white/90">Mailgun</strong> — envío de correos transaccionales.
            </li>
            <li>
              <strong className="text-white/90">Amazon Web Services (AWS)</strong> — alojamiento de
              la infraestructura.
            </li>
            <li>
              <strong className="text-white/90">SAT / FEL</strong> — cuando emites o recibes una
              factura electrónica, los datos fiscales requeridos por la ley de Guatemala.
            </li>
          </ul>
          <p>
            El gimnasio al que perteneces accede únicamente a los datos de tu relación con ese
            gimnasio y a tu información pública de atleta; nunca a tu relación con otros gimnasios.
          </p>
        </Section>

        <Section title="5. Permisos del dispositivo">
          <p>
            La app solicita acceso a la <strong className="text-white/90">cámara</strong> para
            escanear el código QR de asistencia de tu clase, a la{" "}
            <strong className="text-white/90">galería de fotos</strong> para que puedas publicar
            contenido en el feed, y a las{" "}
            <strong className="text-white/90">notificaciones</strong> para enviarte avisos. Puedes
            revocar estos permisos en cualquier momento desde los ajustes de tu teléfono.
          </p>
        </Section>

        <Section title="6. Conservación de los datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Los registros históricos exigidos
            por motivos contables o legales (por ejemplo, pagos y facturas) se conservan durante el
            plazo que la ley aplicable requiera.
          </p>
        </Section>

        <Section title="7. Tus derechos y eliminación de la cuenta">
          <p>
            Puedes solicitar el acceso, la corrección o la eliminación de tus datos personales.
            Puedes eliminar tu cuenta tú mismo desde{" "}
            <strong className="text-white/90">Perfil → Eliminar cuenta</strong> en la app: la
            eliminación es inmediata. El detalle completo de qué se borra, qué se conserva y cómo
            pedirlo si ya no puedes entrar está en la página{" "}
            <Link to="/eliminar-cuenta" className="text-nucleo-flame hover:underline">
              eliminar tu cuenta y tus datos
            </Link>
            .
          </p>
          <p>
            También puedes escribirnos a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-nucleo-flame hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            desde el correo de tu cuenta. Atenderemos la solicitud en un plazo máximo de 30 días
            naturales, salvo los registros que debamos conservar por obligación legal.
          </p>
        </Section>

        <Section title="8. Menores de edad">
          {/* 18+ y no 13+: es el público objetivo declarado en Google Play (decisión del
              dueño, 2026-08-03). Si algún día se declara otro rango en la ficha de la
              tienda, este texto tiene que cambiar con él: que la política y la ficha digan
              edades distintas es una incoherencia que el revisor puede señalar. */}
          <p>
            Nucleo está dirigida a personas mayores de edad y no está destinada a menores de 18
            años. No recopilamos de forma consciente datos personales de menores de esa edad. Si un
            menor utiliza la plataforma a través de la membresía gestionada por su gimnasio, debe
            hacerlo bajo la autorización y supervisión de su padre, madre o tutor, quien será
            responsable de los datos proporcionados.
          </p>
        </Section>

        <Section title="9. Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, incluido
            el cifrado del tráfico (HTTPS) y controles de acceso. Ningún sistema es completamente
            infalible, pero trabajamos para mantener tu información protegida.
          </p>
        </Section>

        <Section title="10. Cambios a esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Publicaremos la versión vigente en esta
            misma página con su fecha de actualización.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p className="flex items-center gap-2">
            <Mail size={15} className="text-nucleo-flame" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-nucleo-flame hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <p className="mt-14 border-t border-white/10 pt-8 text-xs text-white/40">
          © {new Date().getFullYear()} Nucleo · Devpack Group. Hecho en Guatemala 🇬🇹
        </p>
      </main>
    </div>
  );
}
