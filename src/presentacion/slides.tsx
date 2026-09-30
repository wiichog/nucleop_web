import type { ReactNode } from "react";
import {
  BellRing,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileSpreadsheet,
  Flame,
  History,
  KeyRound,
  Landmark,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Monitor,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { AUTORES, FOTOS, fotoSrc, fotoSrcSet, type Foto } from "./fotos";
import { AvisoPush, Laptop, Telefono, Ventana } from "./marcos";

/* ============================================================================
   Presentación comercial de Nucleo para el dueño o la administración de un
   gimnasio o box: las 13 láminas, en cinco tiempos (problema → solución →
   confianza → oferta → siguiente paso).

   Cada lámina se escribe una sola vez y se ve de dos formas (presentacion.css):
   en pantalla grande es un lienzo fijo de 1600×900 que se escala; en un
   teléfono o en vertical, las mismas piezas se apilan y se leen bajando.

   Reglas de contenido (verificadas contra `main` el 2026-09-29):
   - Solo se promete lo que está en producción. La app del atleta está en el
     App Store; en Google Play NO (la ficha da 404): nada de «iOS y Android».
     Tampoco se menciona la facturación electrónica: hoy factura el precio
     completo con el NIT de Nucleo, y el arreglo (facturar solo la comisión)
     sigue sin llegar a `main`.
   - El precio sale de las condiciones del contrato de alta (licencia Q299 al
     mes, costo por cobro con tarjeta de 8.35 % + Q1.59). Las cifras de la tabla
     las calcula `billing/services.py:calcular_recargo` con esa tasa; si cambia,
     se recalculan ahí, no a mano.
   - En producción solo existe la modalidad «trasladada» (el atleta paga el
     cargo y el gimnasio recibe su precio completo, ver `calcular_estado_cuenta`).
     La «absorbida» y el contrato digital viven en la rama
     `respaldo/pre-mac-2026-09-08`, sin fusionar: no se ofrecen aquí.
   - Las pantallas son capturas reales de una demo local con un gimnasio de
     ejemplo («Box Demo») y atletas inventados (ver marcos.tsx).
   - Una sola acción por pieza: agendar la demo por WhatsApp.
   ========================================================================== */

export const WHATSAPP = "+502 3948 5323";
const WHATSAPP_URL = `https://wa.me/50239485323?text=${encodeURIComponent(
  "Hola, vi la presentación de Nucleo y quiero agendar una demo para mi gimnasio.",
)}`;
const SITIO = "app.nucleo.fit";

export type Tono = "oscuro" | "claro";

export type Lamina = {
  id: string;
  titulo: string;
  seccion: string;
  tono: Tono;
  contenido: (ctx: { prioridad: boolean }) => ReactNode;
};

type Gtag = (...args: unknown[]) => void;

/** Evento de GA4 (solo existe fuera de localhost, ver lib/analytics). */
function medir(nombre: string) {
  (window as unknown as { gtag?: Gtag }).gtag?.("event", nombre);
}

/* ── Piezas compartidas ─────────────────────────────────────────────────── */

function FotoFondo({
  foto,
  posicion = "50% 50%",
  espejo = false,
  prioridad = false,
}: {
  foto: Foto;
  posicion?: string;
  espejo?: boolean;
  prioridad?: boolean;
}) {
  return (
    <div className="sl-foto" aria-hidden="true">
      <img
        src={fotoSrc(foto)}
        srcSet={fotoSrcSet(foto)}
        sizes="100vw"
        alt=""
        loading={prioridad ? "eager" : "lazy"}
        // React 18 aún no tipa `fetchPriority` en camelCase.
        {...{ fetchpriority: prioridad ? "high" : "auto" }}
        decoding="async"
        style={{ objectPosition: posicion, transform: espejo ? "scaleX(-1)" : undefined }}
      />
    </div>
  );
}

function Velo({ tipo }: { tipo: "portada" | "izquierda" | "izquierda-fuerte" | "derecha" | "total" }) {
  return <div className="sl-velo" data-tipo={tipo} aria-hidden="true" />;
}

/** El halo blanco de la landing: profundidad sin glow naranja. */
function Halo() {
  return <div className="sl-halo" aria-hidden="true" />;
}

/**
 * Titular de la marca: primera línea plena, segunda atenuada y el punto final
 * en naranja (el único naranja «de texto», y es un punto).
 */
function Titulo({
  nivel = 2,
  tam,
  a,
  b,
}: {
  nivel?: 1 | 2 | 3;
  tam: "hero" | "xl" | "lg" | "md";
  a: ReactNode;
  b: string;
}) {
  const Tag = `h${nivel}` as const;
  return (
    <Tag className={`tt tt--${tam}`}>
      <span className="tt-a">{a}</span> <span className="tt-b">
        {b}
        <span className="tt-punto">.</span>
      </span>
    </Tag>
  );
}

const Sobre = ({ children }: { children: ReactNode }) => <p className="ov">{children}</p>;

/**
 * Un monto dentro de un titular. Va en Inter: en Space Grotesk grande la «Q» se
 * confunde con un 0 («Q0» se leía «QO»), la misma trampa que Barlow en EasyPass.
 */
const Monto = ({ children }: { children: ReactNode }) => <span className="monto">{children}</span>;

/** «A, B y C»: la lista de créditos en español. */
function enLista(nombres: string[]): string {
  return nombres.length < 2
    ? nombres.join("")
    : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

const PieDemo = () => (
  <p className="pie-demo">Pantallas reales de Nucleo con un gimnasio de ejemplo y datos ficticios.</p>
);

function Rasgo({ Icono, titulo, children }: { Icono: typeof Flame; titulo: string; children: ReactNode }) {
  return (
    <li>
      <Icono aria-hidden="true" />
      <p>
        <b>{titulo}</b> {children}
      </p>
    </li>
  );
}

/* ── Las láminas ────────────────────────────────────────────────────────── */

export const LAMINAS: Lamina[] = [
  {
    id: "inicio",
    titulo: "Opera tu gym. Retén a tu gente.",
    seccion: "Presentación",
    tono: "oscuro",
    contenido: ({ prioridad }) => (
      <>
        <FotoFondo foto={FOTOS.grupo} posicion="50% 60%" espejo prioridad={prioridad} />
        <Velo tipo="portada" />
        <div className="portada anim">
          <Sobre>Software y comunidad para gimnasios y boxes</Sobre>
          <Titulo nivel={2} tam="hero" a="Opera tu gym." b="Retén a tu gente" />
          <p className="lead">
            Membresías, cobros, clases y comunidad en un solo sistema: un panel para ti y tu equipo, y una
            app para tus atletas.
          </p>
        </div>
        <ol className="franja anim anim--2">
          <li>
            <span className="franja-n">01</span>
            <span>
              <b>Panel web</b>
              <small>para administrar tu gimnasio</small>
            </span>
          </li>
          <li>
            <span className="franja-n">02</span>
            <span>
              <b>App Nucleo Gym</b>
              <small>para tus atletas, en el App Store</small>
            </span>
          </li>
          <li>
            <span className="franja-n">03</span>
            <span>
              <b>Hecho en Guatemala</b>
              <small>{SITIO}</small>
            </span>
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "problema",
    titulo: "El alumno que se va no avisa",
    seccion: "El problema",
    tono: "oscuro",
    contenido: () => (
      <>
        <FotoFondo foto={FOTOS.vacio} posicion="70% 50%" />
        <Velo tipo="izquierda" />
        <div className="col-texto col-texto--ancha anim">
          <Sobre>El problema</Sobre>
          <Titulo tam="xl" a="El alumno que se va" b="no avisa" />
          <p className="lead">
            Deja de venir unas semanas y te enteras cuando ya no renovó. Mientras tanto, el día a día vive
            repartido en cuatro lugares y nadie ve a tiempo quién se está enfriando.
          </p>
          <ul className="dispersos">
            <li>
              <MessagesSquare aria-hidden="true" /> Cobros por WhatsApp
            </li>
            <li>
              <Landmark aria-hidden="true" /> Transferencias por confirmar
            </li>
            <li>
              <ClipboardList aria-hidden="true" /> Asistencia en papel
            </li>
            <li>
              <FileSpreadsheet aria-hidden="true" /> Números en Excel
            </li>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: "plataforma",
    titulo: "Qué es Nucleo",
    seccion: "La solución",
    tono: "claro",
    contenido: () => (
      <>
        <div className="split-texto anim">
          <Sobre>Qué es Nucleo</Sobre>
          <Titulo tam="lg" a="Un sistema," b="dos lados" />
          <p className="lead">
            Tú manejas el gimnasio desde el panel. Tus atletas reservan, pagan y siguen su progreso desde la
            app.
          </p>
          <dl className="pantallas">
            <div>
              <dt>
                <Monitor aria-hidden="true" /> Panel web
              </dt>
              <dd>Para ti y tu equipo: atletas, cobros, clases, coaches y los números del negocio.</dd>
            </div>
            <div>
              <dt>
                <Smartphone aria-hidden="true" /> App Nucleo Gym
              </dt>
              <dd>
                Para tus atletas, en el App Store: reservan, marcan asistencia y ven su progreso. La misma app
                tiene modo coach y modo administración.
              </dd>
            </div>
          </dl>
          <ul className="pildoras" aria-label="Disciplinas">
            <li>CrossFit</li>
            <li>Funcional</li>
            <li>Halterofilia</li>
            <li>Pilates</li>
            <li>Open gym</li>
            <li>y las que tú definas</li>
          </ul>
        </div>
        <div className="equipos anim anim--2">
          <Laptop
            captura="panel-dashboard"
            etiqueta="Panel de Nucleo: el tablero del gimnasio con ingresos del periodo por tarjeta y manuales, atletas activos, morosos y clases más demandadas"
          />
          <Telefono
            captura="app-perfil"
            etiqueta="App de Nucleo: el perfil del atleta con sus puntos, su racha, sus PRs y sus insignias"
            className="telefono--esquina"
          />
        </div>
        <PieDemo />
      </>
    ),
  },
  {
    id: "retencion",
    titulo: "Retención",
    seccion: "La solución",
    tono: "oscuro",
    contenido: () => (
      <>
        <Halo />
        <div className="col-texto col-texto--media anim">
          <Sobre>Retención</Sobre>
          <Titulo tam="lg" a="Te avisa antes" b="de que se vaya" />
          <p className="lead lead--chico">
            Nucleo marca en riesgo a quien lleva días sin venir a tu gimnasio. Tú decides cuántos días, y lo
            ves en tu panel antes de que pida la baja.
          </p>
          <ul className="rasgos">
            <Rasgo Icono={BellRing} titulo="Un aviso para que vuelva.">
              Al cruzar tu umbral, la app le escribe al atleta; si sigue sin venir, el aviso vuelve con otro
              tono.
            </Rasgo>
            <Rasgo Icono={Flame} titulo="Rachas, puntos e insignias.">
              Cada clase completada suma en tu gimnasio, y la racha le da una razón para no cortarla.
            </Rasgo>
            <Rasgo Icono={Trophy} titulo="Atleta del mes.">
              Se calcula cada mes y se celebra en el feed de tu gimnasio.
            </Rasgo>
          </ul>
        </div>
        <div className="pantalla-der anim anim--2">
          <Laptop
            captura="panel-riesgo"
            etiqueta="Panel de Nucleo: el padrón filtrado por atletas en riesgo, con su plan, su vencimiento y sus puntos"
          />
          <AvisoPush />
        </div>
        <PieDemo />
      </>
    ),
  },
  {
    id: "cobros",
    titulo: "Cobros y morosidad",
    seccion: "La solución",
    tono: "claro",
    contenido: () => (
      <>
        <div className="col-texto col-texto--media anim">
          <Sobre>Cobros y morosidad</Sobre>
          <Titulo tam="lg" a="Cobra sin" b="perseguir a nadie" />
          <p className="lead lead--chico">
            Nucleo genera la cuota de cada ciclo y le avisa al atleta antes de que venza. Si se atrasa, le
            manda recordatorios con un enlace para pagar desde la app.
          </p>
          <ul className="rasgos">
            <Rasgo Icono={CreditCard} titulo="Tarjeta, efectivo o transferencia.">
              Con tarjeta pagan en la app; el efectivo, la transferencia o tu propio POS los registras en el
              panel, con su comprobante.
            </Rasgo>
            <Rasgo Icono={CalendarClock} titulo="Mora con tus reglas.">
              Tú fijas los días de gracia: al pasarlos, la membresía se suspende sola y vuelve al pagar.
            </Rasgo>
            <Rasgo Icono={ShieldCheck} titulo="Nada se cobra sin su visto bueno.">
              Cada pago con tarjeta lo autoriza el atleta en la app, y ve el desglose antes de pagar.
            </Rasgo>
          </ul>
        </div>
        <div className="pantalla-der anim anim--2">
          <Laptop
            captura="panel-morosos"
            etiqueta="Panel de Nucleo: el padrón filtrado por morosos, con los días de vencido y el botón de recordatorio"
          />
        </div>
        <PieDemo />
      </>
    ),
  },
  {
    id: "clases",
    titulo: "Clases y asistencia",
    seccion: "La solución",
    tono: "oscuro",
    contenido: () => (
      <>
        <FotoFondo foto={FOTOS.coach} posicion="40% 40%" />
        <Velo tipo="izquierda-fuerte" />
        <div className="col-texto col-texto--media anim">
          <Sobre>Clases y asistencia</Sobre>
          <Titulo tam="lg" a="Tu horario," b="lleno y en orden" />
          <ul className="rasgos">
            <Rasgo Icono={CalendarDays} titulo="Un horario que se arma solo.">
              Defines la semana una vez y Nucleo publica las clases de las próximas seis semanas.
            </Rasgo>
            <Rasgo Icono={Users} titulo="Cupo y lista de espera.">
              Si alguien cancela, entra el siguiente de la lista.
            </Rasgo>
            <Rasgo Icono={QrCode} titulo="Asistencia con QR.">
              El atleta escanea el QR de la clase con la app; quien reservó y no llegó queda como no-show.
            </Rasgo>
            <Rasgo Icono={Dumbbell} titulo="Coaches en su propio modo.">
              Ven sus clases y la asistencia desde la app, y se cubren entre ellos cuando uno no puede.
            </Rasgo>
          </ul>
        </div>
        <div className="telefono-solo anim anim--2">
          <Telefono
            captura="app-clases"
            etiqueta="App de Nucleo: las clases de hoy con su cupo, su coach y el botón para reservar"
          />
        </div>
      </>
    ),
  },
  {
    id: "comunidad",
    titulo: "Comunidad",
    seccion: "La solución",
    tono: "oscuro",
    contenido: () => (
      <>
        <FotoFondo foto={FOTOS.clase} posicion="50% 50%" />
        <Velo tipo="derecha" />
        <div className="duo-telefonos anim anim--2">
          <Telefono
            captura="app-wod"
            etiqueta="App de Nucleo: la rutina del día y el board con el tiempo de cada atleta, en RX o Scaled"
          />
          <Telefono
            captura="app-progreso"
            etiqueta="App de Nucleo: el progreso del atleta, con la curva de cada PR"
            className="telefono--atras"
          />
        </div>
        <div className="split-texto split-texto--der anim">
          <Sobre>Comunidad</Sobre>
          <Titulo tam="lg" a="Que volver" b="sea un hábito" />
          <p className="lead lead--chico">
            Lo que hace que un atleta se quede no es la cuota: es su progreso y su gente.
          </p>
          <ul className="rasgos">
            <Rasgo Icono={Dumbbell} titulo="El WOD del día y su board.">
              Cada quien sube su score y ve su lugar, en RX o Scaled.
            </Rasgo>
            <Rasgo Icono={ChartColumn} titulo="PRs con su historia.">
              El atleta registra sus récords y ve cómo suben; tu coach los valida.
            </Rasgo>
            <Rasgo Icono={Megaphone} titulo="El feed de tu gimnasio.">
              Anuncios para todos o por disciplina, y publicaciones de tus atletas que tú apruebas.
            </Rasgo>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: "panel",
    titulo: "El panel",
    seccion: "La solución",
    tono: "claro",
    contenido: () => (
      <>
        <div className="modulos-cabeza anim">
          <Sobre>El panel</Sobre>
          <Titulo tam="lg" a="Todo tu gimnasio," b="en un solo lugar" />
          <p className="lead lead--chico">Desde la recepción hasta los números del mes.</p>
          <ul className="notas">
            <Rasgo Icono={KeyRound} titulo="Cada quien con su acceso.">
              Administración, coaches y trainers entran con su propio rol.
            </Rasgo>
            <Rasgo Icono={FileSpreadsheet} titulo="Tus datos, tuyos.">
              El padrón, los pagos y la bitácora se descargan en CSV.
            </Rasgo>
          </ul>
        </div>
        <div className="modulos anim anim--2">
          {MODULOS.map(({ nombre, texto, Icono }) => (
            <article key={nombre}>
              <Icono aria-hidden="true" />
              <h3>{nombre}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "dinero",
    titulo: "Tu dinero",
    seccion: "La confianza",
    tono: "oscuro",
    contenido: () => (
      <>
        <Halo />
        <div className="col-texto col-texto--dinero anim">
          <Sobre>Tu dinero</Sobre>
          <Titulo tam="lg" a="Tu precio, íntegro." b="Cada mes, desglosado" />
          <p className="lead lead--chico">
            Lo que tus atletas pagan con tarjeta en la app lo recibe Nucleo y te lo liquida cada mes. En tu
            panel ves cobro por cobro: tu ingreso, el cargo de Nucleo y lo que se te deposita.
          </p>
        </div>
        <div className="datos anim anim--2">
          <div>
            <b className="dato">100 %</b>
            <h3>de tu precio</h3>
            <p>El cargo por servicio lo paga el atleta encima: tu precio de lista te llega completo.</p>
          </div>
          <div>
            <b className="dato">1</b>
            <h3>depósito al mes</h3>
            <p>Al cerrar el mes te transferimos lo tuyo, con su referencia bancaria.</p>
          </div>
          <div>
            <b className="dato">0 %</b>
            <h3>en efectivo o transferencia</h3>
            <p>Lo que cobras tú no pasa por Nucleo ni paga cargo alguno.</p>
          </div>
        </div>
        <div className="cuenta-lugar anim anim--3">
          <Ventana
            captura="panel-estado-cuenta-recorte"
            ancho={1640}
            alto={600}
            direccion="app.nucleo.fit/panel/pagos"
            etiqueta="Estado de cuenta de agosto en el panel: cobrado por tarjeta Q15,207.04, tu ingreso Q14,000.00, recargo de Nucleo Q1,207.04 y depositado Q14,000.00 con su referencia"
          />
          <p className="cuenta-nota">Agosto de un gimnasio de ejemplo: 24 cobros con tarjeta.</p>
        </div>
      </>
    ),
  },
  {
    id: "empezar",
    titulo: "Cómo empezamos",
    seccion: "La confianza",
    tono: "oscuro",
    contenido: () => (
      <>
        <FotoFondo foto={FOTOS.tableta} posicion="55% 35%" />
        <Velo tipo="total" />
        <div className="col-texto col-texto--ancha anim">
          <Sobre>Cómo empezamos</Sobre>
          <Titulo tam="xl" a="Tu gimnasio en Nucleo," b="sin empezar de cero" />
        </div>
        <ol className="pasos anim anim--2">
          <li className="vidrio">
            <span className="paso-n">01</span>
            <h3>Demo y cotización</h3>
            <p>Te enseñamos Nucleo con tu operación en mente: tus planes, tu horario y cómo cobras hoy.</p>
          </li>
          <li className="vidrio">
            <span className="paso-n">02</span>
            <h3>Montamos tu gimnasio</h3>
            <p>Cargamos tus disciplinas, tu horario, tus planes y tu lista de atletas desde tu hoja de cálculo.</p>
          </li>
          <li className="vidrio">
            <span className="paso-n">03</span>
            <h3>Tus atletas entran</h3>
            <p>Cada uno recibe su invitación y activa su cuenta; tú ya operas desde el panel.</p>
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "precio",
    titulo: "Precio",
    seccion: "La oferta",
    tono: "oscuro",
    contenido: () => (
      <>
        <Halo />
        <div className="precio-texto anim">
          <ul className="chips" aria-label="Incluye">
            <li>Panel web</li>
            <li>App del atleta</li>
            <li>Sin cuota de activación</li>
          </ul>
          <Titulo tam="hero" a={<Monto>Q299</Monto>} b="al mes" />
          <p className="lead lead--chico">
            Una licencia fija por el panel y la app. Cuando tus atletas pagan con tarjeta en la app, se les
            suma un cargo por servicio y tú recibes tu precio completo.
          </p>
        </div>
        <div className="tarifa anim anim--2">
          <h3>Tu precio, completo · así se reparte cada pago</h3>
          <table>
            <colgroup>
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Tu precio</th>
                <th scope="col">Cargo por servicio</th>
                <th scope="col">Paga el atleta</th>
                <th scope="col">Recibes tú</th>
              </tr>
            </thead>
            <tbody>
              {TARIFAS.map(([concepto, precio, cargo, total]) => (
                <tr key={concepto}>
                  <th scope="row">
                    {precio}
                    <small>{concepto}</small>
                  </th>
                  <td className="tarifa-cargo">{cargo}</td>
                  <td>{total}</td>
                  <td className="tarifa-tuyo">{precio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="precio-nota">
          Con la tasa de nuestras condiciones: 8.35 % + Q1.59 por pago con tarjeta, la misma para membresías,
          drop-ins, servicios, tienda y personal trainer. El atleta ve el desglose antes de pagar. Efectivo,
          transferencia o tu propio POS: sin cargo. Te mandamos la cotización con tus precios.
        </p>
      </>
    ),
  },
  {
    id: "preguntas",
    titulo: "Preguntas frecuentes",
    seccion: "Dudas",
    tono: "claro",
    contenido: () => (
      <>
        <div className="faq-cabeza anim">
          <Sobre>Dudas frecuentes</Sobre>
          <Titulo tam="lg" a="Preguntas" b="que siempre salen" />
        </div>
        <div className="faq anim anim--2">
          <article>
            <h3>¿Mis atletas tienen que pagar con tarjeta?</h3>
            <p>
              No. El efectivo y la transferencia los registras en el panel, con su comprobante, y activan la
              membresía igual. Sin cargo.
            </p>
          </article>
          <article>
            <h3>¿Cuándo recibo lo que se cobra con tarjeta?</h3>
            <p>
              Al cerrar cada mes. En tu panel ves el estado de cuenta y el depósito, con su referencia
              bancaria.
            </p>
          </article>
          <article>
            <h3>¿Qué pasa con mis alumnos actuales?</h3>
            <p>
              Nos pasas tu lista y los damos de alta. Si alguien ya usa Nucleo en otro box, se vincula su misma
              cuenta: nunca se duplica.
            </p>
          </article>
          <article>
            <h3>¿Y mis atletas con Android?</h3>
            <p>
              La app está en el App Store; la de Android todavía no está publicada en Google Play. Mientras,
              sus pagos y su asistencia se registran desde el panel.
            </p>
          </article>
          <article>
            <h3>¿Otro gimnasio puede ver a mis atletas?</h3>
            <p>
              No. Cada gimnasio ve solo su relación con el atleta: los pagos, la asistencia y las notas de ese
              gimnasio.
            </p>
          </article>
          <article>
            <h3>¿Puedo manejarlo desde el teléfono?</h3>
            <p>Sí. La misma app tiene modo administración y modo coach, además del de atleta.</p>
          </article>
        </div>
      </>
    ),
  },
  {
    id: "demo",
    titulo: "Agenda tu demo",
    seccion: "El siguiente paso",
    tono: "oscuro",
    contenido: () => (
      <>
        <FotoFondo foto={FOTOS.argollas} posicion="50% 45%" espejo />
        <Velo tipo="portada" />
        <div className="cierre anim">
          <Sobre>El siguiente paso</Sobre>
          <Titulo tam="hero" a="Agenda" b="tu demo" />
          <p className="lead">
            Cuéntanos cuántos atletas tienes y cómo cobras hoy. Te enseñamos Nucleo con tu operación en mente
            y te mandamos la cotización.
          </p>
          <a
            className="cta"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            onClick={() => medir("presentacion_whatsapp")}
          >
            <span className="cta-cuadro" aria-hidden="true">
              <ChevronRight />
            </span>
            <span className="cta-texto">
              <MessageCircle aria-hidden="true" /> Escríbenos por WhatsApp
            </span>
          </a>
          <p className="cierre-tel">
            WhatsApp <span className="sin-corte">{WHATSAPP}</span> ·{" "}
            <a href="/" onClick={() => medir("presentacion_sitio")}>
              {SITIO}
            </a>
          </p>
        </div>
        <p className="creditos">
          Fotos de {enLista(AUTORES)} en Unsplash. Pantallas: demo de Nucleo con datos de ejemplo.
        </p>
      </>
    ),
  },
];

/**
 * Módulos del panel, con los nombres del menú real (components/Layout.tsx).
 * Si se renombra una página, se renombra aquí.
 */
const MODULOS = [
  { nombre: "Atletas", texto: "Padrón con estado de pago, vencimientos y riesgo.", Icono: Users },
  { nombre: "Solicitudes", texto: "Altas, invitaciones y clases de prueba.", Icono: UserPlus },
  { nombre: "Planes y cuotas", texto: "Planes, ofertas y cuota especial por atleta.", Icono: Ticket },
  { nombre: "Membresías", texto: "Pagos, morosos y estado de cuenta.", Icono: Wallet },
  { nombre: "Clases y rutinas", texto: "Horario, reservas, asistencia y WOD.", Icono: CalendarDays },
  { nombre: "Coaches", texto: "Asignación de clases y pago por clase o fijo.", Icono: Dumbbell },
  { nombre: "Personal trainer", texto: "Sesiones cobrables con comisión por coach.", Icono: Flame },
  { nombre: "Feed y atleta del mes", texto: "Anuncios, publicaciones y reconocimientos.", Icono: Megaphone },
  { nombre: "Punto de venta", texto: "Mostrador, inventario y tienda en la app.", Icono: ShoppingCart },
  { nombre: "Gastos y reportes", texto: "Gastos, nómina y rentabilidad del mes.", Icono: Receipt },
  { nombre: "Drop-ins", texto: "Pases para visitantes, con su QR.", Icono: QrCode },
  { nombre: "Bitácora", texto: "Quién cambió qué, y cuándo.", Icono: History },
];

/**
 * Ejemplos de la tabla de precio. Salen de `calcular_recargo` con la tasa de las
 * condiciones del contrato (8.35 % + Q1.59; el redondeo es por cobro):
 * Q650 → Q55.86 · Q450 → Q39.16 · Q150 → Q14.12. Efectivo/transferencia → Q0.
 */
const TARIFAS: [string, string, string, string][] = [
  ["Membresía mensual con tarjeta", "Q650", "+Q55.86", "Q705.86"],
  ["Plan de 3 veces por semana", "Q450", "+Q39.16", "Q489.16"],
  ["Drop-in de un día", "Q150", "+Q14.12", "Q164.12"],
  ["Membresía en efectivo o transferencia", "Q650", "Q0", "Q650"],
];
