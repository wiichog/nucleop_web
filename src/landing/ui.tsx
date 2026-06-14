import { ReactNode } from "react";

/**
 * Lenguaje visual compartido por la landing (mismo look del hero):
 * pastillas glass con punto flame y divisores diagonales.
 */

/** Etiqueta tipo pastilla glass con punto flame — gemela de las pastillas del navbar. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-nucleo-carbon/80 px-4 py-2 font-display text-xs tracking-wide text-white/70 backdrop-blur ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-nucleo-flame" />
      {children}
    </span>
  );
}

/** Divisor diagonal corto (motivo de las stats del hero). dir 1 = "/", -1 = "\". */
export function DiagonalDivider({
  dir = 1,
  force = false,
  className = "",
}: {
  dir?: 1 | -1;
  force?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${force ? "block" : "hidden md:block"} h-px w-24 bg-white/40 ${
        dir === 1 ? "rotate-[20deg]" : "rotate-[-20deg]"
      } ${className}`}
    />
  );
}
