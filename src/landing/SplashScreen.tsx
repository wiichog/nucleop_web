import { useEffect, useRef, useState } from "react";

const DURATION = 1800; // ms de apertura del iris
const FADE = 400; // ms de desvanecido de la capa
const BLOCK = 10; // lado del "pixel" del borde

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Cortina de entrada: un iris de píxeles que se abre desde el centro sobre negro.
 * El agujero se "perfora" con `destination-out` y el borde se dibuja como bloques
 * cuadrados con jitter, de ahí el aire dot-matrix. Sin color: negro puro (el
 * naranja de la marca aparece hasta el hero).
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onComplete();
      return;
    }

    // Accesibilidad: quien pidió menos movimiento entra directo.
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onComplete();
      return;
    }

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Anillo principal: 360 bloques con ángulo y radio ligeramente aleatorios.
    const ring = Array.from({ length: 360 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 360 + (Math.random() - 0.5) * 0.02,
      offsetFactor: 0.85 + Math.random() * 0.3,
    }));

    let rafId = 0;
    let start = 0;
    let done = false;
    let fadeTimer: number | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      setFading(true);
      fadeTimer = window.setTimeout(onComplete, FADE);
    };

    // Red de seguridad: en pestañas de fondo `requestAnimationFrame` no corre y
    // la cortina se quedaría tapando la página. `setTimeout` sí dispara.
    const guard = window.setTimeout(finish, DURATION + 1200);

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const draw = (ts: number) => {
      if (done) return;
      if (!start) start = ts;
      const progress = Math.min((ts - start) / DURATION, 1);
      const radius = easeOutCubic(progress) * (Math.sqrt(w * w + h * h) / 2);
      const cx = w / 2;
      const cy = h / 2;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "destination-out";

      // Disco limpio por dentro…
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, radius - BLOCK * 2), 0, Math.PI * 2);
      ctx.fill();

      // …y borde pixelado por fuera (dos anillos de bloques).
      for (const b of ring) {
        const r = radius * b.offsetFactor;
        ctx.fillRect(
          cx + Math.cos(b.angle) * r - BLOCK / 2,
          cy + Math.sin(b.angle) * r - BLOCK / 2,
          BLOCK,
          BLOCK,
        );
      }
      for (let i = 0; i < 180; i++) {
        const angle = (Math.PI * 2 * i) / 180;
        const r = radius * (0.92 + Math.random() * 0.12);
        ctx.fillRect(
          cx + Math.cos(angle) * r - BLOCK / 2,
          cy + Math.sin(angle) * r - BLOCK / 2,
          BLOCK * 0.8,
          BLOCK * 0.8,
        );
      }

      ctx.globalCompositeOperation = "source-over";

      if (progress < 1) {
        rafId = requestAnimationFrame(draw);
      } else {
        finish();
      }
    };

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    rafId = requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      clearTimeout(guard);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [onComplete]);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] transition-opacity duration-[400ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
