import { useEffect, useRef, useState } from "react";

/**
 * Revela una sección la primera vez que entra en viewport (y deja de observar).
 * Devuelve el `ref` que se cuelga del contenedor y el flag `visible` con el que
 * las clases `animate-fade-up` / `animate-scale-in` se encienden.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // jsdom (tests) y navegadores viejos: mostrar sin animar.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
