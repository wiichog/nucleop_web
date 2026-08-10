import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

// Términos de servicio públicos. Se sirve como RUTA React (/terminos), no como .html
// estático, por la misma razón que /privacidad: el rewrite SPA `/* -> /index.html 200`
// de Amplify sombrea cualquier .html suelto.
//
// Meta (Facebook Login) exige una "Terms of Service URL" propia y viva para publicar la
// app; apuntarla a un dominio de terceros es causa directa de rechazo en App Review.
// Apple y Google también la piden para apps con compras.
//
// Lo que se afirma aquí sobre cobros está verificado contra el backend:
// - el recargo de plataforma se SUMA al precio y solo aplica a pagos con tarjeta
//   (`billing/services.py:calcular_recargo`, `Gym.platform_commission_pct`);
// - los pagos son append-only: un reembolso es un registro nuevo, nunca una edición.
// Si esas reglas cambian, esta página cambia con ellas.
//
// ⚠️ Base redactada a partir de lo que el producto hace hoy, no es asesoría legal:
// conviene que un abogado guatemalteco la revise antes de considerarla definitiva.

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

export function TermsPage() {
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
          Términos de servicio
        </h1>
        <p className="mt-3 text-sm text-white/50">Última actualización: {UPDATED}</p>

        <p className="mt-6 text-sm leading-relaxed text-white/70">
          Estos términos rigen el uso de <strong className="text-white/90">Nucleo</strong>: la
          aplicación móvil del atleta, el panel web para gimnasios y el sitio nucleo.fit. Al crear
          una cuenta o usar la plataforma, aceptas lo que aquí se describe. Si no estás de acuerdo,
          no uses el servicio.
        </p>

        <Section title="1. Quiénes somos">
          <p>
            Nucleo es una red deportiva que conecta gimnasios y boxes de CrossFit con atletas,
            coaches, entrenadores y clubes en Guatemala. La plataforma es operada por{" "}
            <strong className="text-white/90">Devpack Group</strong>, con domicilio en Guatemala.
            Puedes contactarnos en{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-nucleo-flame hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Qué es Nucleo y qué no es">
          <p>
            Nucleo es una <strong className="text-white/90">herramienta tecnológica</strong>: te
            permite pertenecer a uno o varios gimnasios, reservar clases, registrar tu asistencia y
            tus marcas, participar en la comunidad y pagar lo que contrates. Nucleo{" "}
            <strong className="text-white/90">no es un gimnasio</strong>, no imparte clases, no
            emplea a los coaches ni supervisa tu entrenamiento.
          </p>
          <p>
            El servicio deportivo lo presta el gimnasio, box o entrenador que elijas. Ellos definen
            sus precios, horarios, planes, reglas de acceso y políticas internas.
          </p>
        </Section>

        <Section title="3. Tu cuenta">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Tu <strong className="text-white/90">correo electrónico</strong> es el identificador de
              tu cuenta. Debe ser tuyo, estar vigente y la información que registres debe ser veraz.
            </li>
            <li>
              Puedes entrar con correo y contraseña o con{" "}
              <strong className="text-white/90">Google, Apple o Facebook</strong>. Si el correo ya
              existe en Nucleo, se vincula a esa misma cuenta: nunca creamos identidades duplicadas.
            </li>
            <li>
              Tu cuenta es <strong className="text-white/90">personal e intransferible</strong>. Eres
              responsable de lo que ocurra con tus credenciales; avísanos de inmediato si crees que
              alguien más accedió a tu cuenta.
            </li>
            <li>
              Nucleo está dirigida a <strong className="text-white/90">mayores de 18 años</strong>.
              Un menor solo puede usarla a través de la membresía gestionada por su gimnasio, bajo la
              autorización y supervisión de su padre, madre o tutor.
            </li>
            <li>
              Tu identidad deportiva es <strong className="text-white/90">portátil</strong>: tu
              historial, tus marcas y tus puntos globales te pertenecen y te acompañan aunque cambies
              de gimnasio.
            </li>
          </ul>
        </Section>

        <Section title="4. Tu relación con el gimnasio">
          <p>
            Cuando te unes a un gimnasio a través de Nucleo, el{" "}
            <strong className="text-white/90">acuerdo de membresía es con ese gimnasio</strong>, no
            con Nucleo. El gimnasio decide si acepta tu solicitud, qué plan te asigna, qué incluye,
            cuándo se renueva y bajo qué condiciones puede pausarse o darse de baja.
          </p>
          <p>
            Cada gimnasio ve únicamente los datos de tu relación con él y tu información pública de
            atleta. Ningún gimnasio accede a tu relación con otro.
          </p>
          <p>
            Cualquier reclamo sobre el servicio deportivo, las instalaciones, un cobro acordado con
            el gimnasio o el trato recibido debe dirigirse primero al gimnasio. Nucleo puede
            mediar y poner a disposición el historial registrado en la plataforma.
          </p>
        </Section>

        <Section title="5. Pagos, recargo de plataforma y renovaciones">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              Todos los precios están en <strong className="text-white/90">quetzales (GTQ)</strong> y
              los fija el gimnasio o el proveedor del servicio.
            </li>
            <li>
              Los pagos con tarjeta se procesan mediante nuestra pasarela (Pagalo). Nucleo no
              almacena el número completo de tu tarjeta en la aplicación ni lo expone en ninguna
              pantalla.
            </li>
            <li>
              A los pagos con tarjeta se les suma un{" "}
              <strong className="text-white/90">recargo de plataforma</strong> que se muestra
              desglosado <strong className="text-white/90">antes</strong> de que confirmes: verás el
              precio base, el recargo y el total. Ese recargo corresponde a Nucleo por el uso de la
              plataforma y el procesamiento del cobro.
            </li>
            <li>
              Los pagos <strong className="text-white/90">en efectivo o por transferencia</strong>{" "}
              registrados por tu gimnasio <strong className="text-white/90">no llevan recargo</strong>.
            </li>
            <li>
              Si tu plan es recurrente, se cobra automáticamente en cada fecha de renovación con el
              método que hayas dejado guardado, hasta que lo canceles o el gimnasio dé de baja la
              membresía. Puedes eliminar tus tarjetas guardadas cuando quieras desde tu perfil.
            </li>
            <li>
              Cuando corresponde, se emite <strong className="text-white/90">factura electrónica
              (FEL)</strong> conforme a la legislación tributaria de Guatemala. Un problema al emitir
              la factura no afecta la validez de tu pago ni de tu membresía.
            </li>
          </ul>
        </Section>

        <Section title="6. Reembolsos y cancelaciones">
          <p>
            Las condiciones de reembolso, congelamiento o cancelación de una membresía, un drop-in,
            un servicio adicional o una sesión de entrenamiento personal{" "}
            <strong className="text-white/90">las define el gimnasio o el proveedor</strong> que te
            cobró. Solicítalos directamente con ellos.
          </p>
          <p>
            Por integridad contable, el historial de pagos es inalterable: un reembolso aprobado se
            registra como un movimiento nuevo, nunca borrando ni editando el cobro original.
          </p>
          <p>
            Los pedidos de la tienda se sujetan a las condiciones de entrega y devolución que
            publique el gimnasio en cada producto.
          </p>
        </Section>

        <Section title="7. Contenido que publicas y convivencia">
          <p>
            Puedes publicar fotos, videos, comentarios y marcas personales. Ese contenido sigue
            siendo tuyo; al publicarlo nos concedes una licencia limitada, no exclusiva y sin costo
            para almacenarlo y mostrarlo dentro de Nucleo a la comunidad que corresponda, con el solo
            fin de operar el servicio. Puedes borrar tu contenido en cualquier momento.
          </p>
          <p>No se permite publicar ni enviar:</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>contenido sexual explícito, violento, discriminatorio o que promueva el odio;</li>
            <li>acoso, amenazas o suplantación de otra persona;</li>
            <li>
              contenido de terceros sobre el que no tengas derechos, ni datos personales de otras
              personas sin su consentimiento;
            </li>
            <li>publicidad no autorizada, spam o esquemas fraudulentos.</li>
          </ul>
          <p>
            El contenido pasa por revisión automática y puede ser revisado por una persona. Puedes{" "}
            <strong className="text-white/90">reportar</strong> una publicación o un comentario, y{" "}
            <strong className="text-white/90">bloquear</strong> a otro usuario: el bloqueo es mutuo y
            aplica en toda la plataforma. Podemos retirar contenido que incumpla estas reglas y
            suspender cuentas reincidentes.
          </p>
        </Section>

        <Section title="8. Uso aceptable de la plataforma">
          <p>
            No intentes acceder a datos que no te corresponden, vulnerar la seguridad del servicio,
            extraer información de forma automatizada, revender el acceso, usar la plataforma para
            fines ilícitos ni interferir con su funcionamiento. Tampoco uses tu rol de administrador
            o coach para acceder a información de atletas fuera de tu gimnasio.
          </p>
        </Section>

        <Section title="9. Propiedad intelectual">
          <p>
            La marca Nucleo, el software, el diseño y los contenidos propios de la plataforma
            pertenecen a Devpack Group. Estos términos te otorgan un derecho de uso personal y
            limitado del servicio; no transfieren ninguna titularidad.
          </p>
        </Section>

        <Section title="10. Disponibilidad y cambios del servicio">
          <p>
            Trabajamos para que Nucleo esté disponible de forma continua, pero el servicio puede
            interrumpirse por mantenimiento, fallos técnicos o causas ajenas a nosotros. Podemos
            agregar, modificar o retirar funciones; si un cambio afecta de forma relevante lo que ya
            contrataste, lo comunicaremos con antelación razonable.
          </p>
        </Section>

        <Section title="11. Suspensión y cierre de cuenta">
          <p>
            Puedes cerrar tu cuenta cuando quieras siguiendo las instrucciones de la página{" "}
            <Link to="/eliminar-cuenta" className="text-nucleo-flame hover:underline">
              eliminar tu cuenta
            </Link>
            . Podemos suspender o cerrar una cuenta que incumpla estos términos, que se use de forma
            fraudulenta o que ponga en riesgo a otras personas o a la plataforma. El cierre de la
            cuenta no cancela por sí solo las obligaciones de pago pendientes con tu gimnasio.
          </p>
        </Section>

        <Section title="12. Riesgo deportivo y límite de responsabilidad">
          <p>
            <strong className="text-white/90">
              La actividad física conlleva riesgo de lesión.
            </strong>{" "}
            Entrenas bajo tu propia responsabilidad y la del gimnasio o entrenador que te atiende.
            Consulta a un profesional de la salud antes de iniciar o retomar un programa de
            entrenamiento. Nucleo no diseña, valida ni supervisa las rutinas, cargas o progresiones
            que publiques o que te asignen, ni responde por lesiones, daños o pérdidas ocurridas
            durante la actividad deportiva ni dentro de las instalaciones.
          </p>
          <p>
            En la medida que lo permita la ley, la responsabilidad de Nucleo frente a ti por el uso
            de la plataforma se limita a los montos que Nucleo haya recibido de tu parte por concepto
            de recargo de plataforma en los tres meses anteriores al hecho que origine el reclamo.
            Nada de lo aquí dicho limita responsabilidades que la ley no permita excluir.
          </p>
        </Section>

        <Section title="13. Privacidad">
          <p>
            El tratamiento de tus datos se explica en nuestra{" "}
            <Link to="/privacidad" className="text-nucleo-flame hover:underline">
              política de privacidad
            </Link>
            , que forma parte de estos términos.
          </p>
        </Section>

        <Section title="14. Cambios a estos términos">
          <p>
            Podemos actualizar estos términos. Publicaremos siempre la versión vigente en esta misma
            página con su fecha de actualización, y avisaremos dentro de la aplicación cuando el
            cambio sea relevante. Seguir usando Nucleo después de un cambio significa que lo aceptas.
          </p>
        </Section>

        <Section title="15. Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de la República de Guatemala. Cualquier
            controversia se someterá a los tribunales competentes de la ciudad de Guatemala, sin
            perjuicio de los derechos que la ley reconozca a los consumidores.
          </p>
        </Section>

        <Section title="16. Contacto">
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
