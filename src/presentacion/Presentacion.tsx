import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

import { AtomLogo } from "../landing/AtomLogo";
import { LAMINAS, type Lamina } from "./slides";
import "./presentacion.css";

/* ============================================================================
   Visor de la presentación comercial (`/presentacion`). Es el mismo de las de
   HouseLive (hl-landing) y EasyPass (etk-portal), con la marca de Nucleo.

   Dos modos, según la pantalla:
   - PRESENTAR (pantalla ancha y horizontal): cada lámina es un lienzo fijo de
     1600×900 que se escala para llenar la ventana. Se avanza con las flechas,
     la barra espaciadora, un clic, deslizando el dedo o con los botones de
     abajo; «F» pone pantalla completa.
   - LEER (teléfono o pantalla vertical): las mismas láminas se apilan y se leen
     bajando. Un 16:9 escalado en un teléfono dejaría la letra ilegible.
   La lámina actual queda en la URL (#precio) para mandar el enlace a un tema.

   El modo depende de la ventana, así que se decide al montar: antes se pinta
   solo el fondo negro.
   ========================================================================== */

const ANCHO = 1600;
const ALTO = 900;
const ULTIMA = LAMINAS.length - 1;
const MODO_PRESENTAR = "(min-width: 900px) and (min-height: 540px) and (min-aspect-ratio: 5/4)";
const TACTIL = "(pointer: coarse)";

function useMedia(query: string): boolean | null {
  const [coincide, setCoincide] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const alCambiar = () => setCoincide(mq.matches);
    alCambiar();
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, [query]);
  return coincide;
}

function indiceDelHash(): number {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return id ? LAMINAS.findIndex((lamina) => lamina.id === id) : -1;
}

const dos = (n: number) => String(n).padStart(2, "0");

// React 18 no conoce `inert`: con `true` avisa y no lo pinta; con "" sí lo pone
// (presente = inerte). De ahí el cast.
const INERTE = { inert: "" } as unknown as { inert?: boolean };

/** Encabezado de cada lámina: marca, sección y número, más el avance a la derecha. */
function Cromo({ lamina, indice }: { lamina: Lamina; indice: number }) {
  return (
    <>
      <header className="sl-cromo">
        <span className="marca">
          <AtomLogo size={34} />
          nucleo
        </span>
        <span className="contador">
          <span className="contador-seccion">{lamina.seccion}</span>
          <b>{dos(indice + 1)}</b>
          <i>/ {dos(LAMINAS.length)}</i>
        </span>
      </header>
      <div className="avance" aria-hidden="true">
        {LAMINAS.map((otra, i) => (
          <i key={otra.id} data-actual={i === indice || undefined} />
        ))}
      </div>
    </>
  );
}

export default function Presentacion() {
  const presentar = useMedia(MODO_PRESENTAR);
  if (presentar === null) return <div className="nuc nuc--cargando" />;
  return presentar ? <ModoPresentar /> : <ModoLeer />;
}

/* ── Modo presentar ─────────────────────────────────────────────────────── */

function ModoPresentar() {
  const [indice, setIndice] = useState(() => Math.max(0, indiceDelHash()));
  const indiceRef = useRef(indice);
  const [escala, setEscala] = useState(1);
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState({ soportada: false, activa: false });
  const toque = useRef<{ id: number; x: number; y: number } | null>(null);
  const tactil = useMedia(TACTIL) ?? false;

  const ir = useCallback((destino: number) => {
    const siguiente = Math.max(0, Math.min(ULTIMA, destino));
    if (siguiente === indiceRef.current) return;
    indiceRef.current = siguiente;
    setIndice(siguiente);
    const { pathname, search } = window.location;
    const hash = siguiente === 0 ? "" : `#${LAMINAS[siguiente].id}`;
    window.history.replaceState(window.history.state, "", `${pathname}${search}${hash}`);
  }, []);
  const adelante = useCallback(() => ir(indiceRef.current + 1), [ir]);
  const atras = useCallback(() => ir(indiceRef.current - 1), [ir]);

  // El lienzo de 1600×900 se escala para llenar la ventana sin deformarse.
  useEffect(() => {
    const medir = () => setEscala(Math.min(window.innerWidth / ANCHO, window.innerHeight / ALTO));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Llegar con #precio abre directo esa lámina; también si cambian el hash a mano.
  useEffect(() => {
    const sincronizar = () => {
      const destino = indiceDelHash();
      if (destino >= 0 && destino !== indiceRef.current) {
        indiceRef.current = destino;
        setIndice(destino);
      }
    };
    window.addEventListener("hashchange", sincronizar);
    return () => window.removeEventListener("hashchange", sincronizar);
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === "ArrowDown") adelante();
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "ArrowUp") atras();
      else if (e.key === "Home") ir(0);
      else if (e.key === "End") ir(ULTIMA);
      // Con el foco en un botón o un enlace, la barra espaciadora ya lo aprieta.
      else if (e.key === " " && tag !== "BUTTON" && tag !== "A") adelante();
      else if (e.key === "f" || e.key === "F") alternarPantallaCompleta();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [adelante, atras, ir]);

  useEffect(() => {
    const actualizar = () =>
      setPantallaCompleta({ soportada: !!document.fullscreenEnabled, activa: !!document.fullscreenElement });
    actualizar();
    document.addEventListener("fullscreenchange", actualizar);
    return () => document.removeEventListener("fullscreenchange", actualizar);
  }, []);

  // Los controles se esconden solos para que no tapen la lámina al presentar;
  // vuelven al mover el ratón. En pantallas táctiles se quedan siempre.
  useEffect(() => {
    if (tactil) {
      setControlesVisibles(true);
      return;
    }
    let reloj = window.setTimeout(() => setControlesVisibles(false), 3000);
    const alMover = () => {
      setControlesVisibles(true);
      window.clearTimeout(reloj);
      reloj = window.setTimeout(() => setControlesVisibles(false), 2500);
    };
    window.addEventListener("pointermove", alMover);
    return () => {
      window.clearTimeout(reloj);
      window.removeEventListener("pointermove", alMover);
    };
  }, [tactil]);

  // Clic en la lámina = siguiente, salvo que caiga en un enlace o un botón, o
  // que se esté seleccionando texto (para copiar el teléfono, por ejemplo).
  const alHacerClic = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    if (e.clientX < window.innerWidth * 0.25) atras();
    else adelante();
  };

  // Deslizar con el dedo: solo gestos horizontales claros.
  const alTocar = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") return;
    toque.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const alSoltar = (e: ReactPointerEvent) => {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio || inicio.id !== e.pointerId) return;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) adelante();
    else atras();
  };

  const lamina = LAMINAS[indice];

  return (
    <div
      className="nuc nuc--presentar"
      onPointerDown={alTocar}
      onPointerUp={alSoltar}
      onPointerCancel={() => {
        toque.current = null;
      }}
    >
      <h1 className="nuc-sr">Presentación de Nucleo para gimnasios y boxes</h1>
      <div
        className="lienzo"
        style={{ transform: `translate(-50%, -50%) scale(${escala})` }}
        onClick={alHacerClic}
      >
        {LAMINAS.map((l, i) => (
          <section
            key={l.id}
            id={l.id}
            className={`sl sl--${l.tono}`}
            data-actual={i === indice || undefined}
            aria-roledescription="lámina"
            aria-label={`${i + 1} de ${LAMINAS.length}: ${l.titulo}`}
            aria-hidden={i !== indice}
            {...(i !== indice ? INERTE : {})}
          >
            {l.contenido({ prioridad: i === 0 })}
            <Cromo lamina={l} indice={i} />
          </section>
        ))}
      </div>

      <p className="nuc-sr" aria-live="polite">
        {`Lámina ${indice + 1} de ${LAMINAS.length}: ${lamina.titulo}`}
      </p>

      <nav className="controles" data-oculto={!controlesVisibles || undefined} aria-label="Controles de la presentación">
        <button type="button" onClick={atras} disabled={indice === 0} aria-label="Lámina anterior">
          <ChevronLeft aria-hidden="true" />
        </button>
        <span aria-hidden="true">
          {dos(indice + 1)} / {dos(LAMINAS.length)}
        </span>
        <button type="button" onClick={adelante} disabled={indice === ULTIMA} aria-label="Lámina siguiente">
          <ChevronRight aria-hidden="true" />
        </button>
        {pantallaCompleta.soportada && (
          <button
            type="button"
            onClick={alternarPantallaCompleta}
            aria-label={pantallaCompleta.activa ? "Salir de pantalla completa" : "Pantalla completa"}
            title={pantallaCompleta.activa ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
          >
            {pantallaCompleta.activa ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          </button>
        )}
      </nav>
      {indice === 0 && !tactil && (
        <p className="pista" aria-hidden="true">
          Avanza con las flechas del teclado o con un clic
        </p>
      )}
    </div>
  );
}

function alternarPantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}

/* ── Modo leer ──────────────────────────────────────────────────────────── */

function ModoLeer() {
  // La página se pinta al montar, así que el navegador ya no salta solo al
  // #id de la lámina: se hace a mano una vez.
  useEffect(() => {
    const destino = indiceDelHash();
    if (destino > 0) document.getElementById(LAMINAS[destino].id)?.scrollIntoView();
  }, []);

  return (
    <div className="nuc nuc--leer">
      <h1 className="nuc-sr">Presentación de Nucleo para gimnasios y boxes</h1>
      {LAMINAS.map((l, i) => (
        <section
          key={l.id}
          id={l.id}
          className={`sl sl--${l.tono}`}
          aria-label={`${i + 1} de ${LAMINAS.length}: ${l.titulo}`}
        >
          {l.contenido({ prioridad: i === 0 })}
          <Cromo lamina={l} indice={i} />
        </section>
      ))}
    </div>
  );
}
