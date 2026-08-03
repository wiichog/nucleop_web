import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Lenguaje visual compartido por la landing:
 * · etiquetas mono en versalitas con tracking ancho,
 * · botones "cuadro + etiqueta" (el cuadro es el único punto de color),
 * · naranja solo como acento sólido — nunca como resplandor.
 */

/** Etiqueta técnica (mono, uppercase, tracking ancho). */
export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  /** `dark` = sobre fondo negro · `light` = sobre fondo claro. */
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.3em] ${
        tone === "dark" ? "text-white/50" : "text-black/50"
      } ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-nucleo-flame" />
      {children}
    </span>
  );
}

type CtaVariant = "flame" | "ghost" | "light";
type CtaSize = "sm" | "md";

const SQUARE: Record<CtaVariant, string> = {
  // Único punto naranja de la página: el cuadro del CTA principal.
  flame: "bg-nucleo-flame text-white",
  ghost: "bg-white/10 text-white",
  light: "bg-black text-white",
};

const SHELL: Record<CtaVariant, string> = {
  flame: "bg-black",
  ghost: "bg-black",
  light: "bg-white shadow-sm",
};

const LABEL: Record<CtaVariant, string> = {
  flame: "text-white",
  ghost: "text-white",
  light: "text-black",
};

/**
 * Botón del nuevo lenguaje: cápsula con un cuadro de acento a la izquierda
 * (chevron) y la etiqueta a la derecha. Acepta ruta interna (`to`), ancla
 * (`href`) o `onClick`/`type=submit`.
 */
export function CtaButton({
  label,
  to,
  href,
  onClick,
  type,
  disabled,
  variant = "flame",
  size = "md",
  className = "",
}: {
  label: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: CtaVariant;
  size?: CtaSize;
  className?: string;
}) {
  const square =
    size === "md" ? "m-0.5 h-11 w-11 rounded-lg" : "m-0.5 h-9 w-9 rounded-md";
  const text = size === "md" ? "px-5 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  const radius = size === "md" ? "rounded-xl" : "rounded-lg";

  const inner = (
    <>
      <span className={`flex items-center justify-center ${square} ${SQUARE[variant]}`}>
        <ChevronRight
          className={`${
            size === "md" ? "h-5 w-5" : "h-4 w-4"
          } transition-transform group-hover:translate-x-0.5`}
        />
      </span>
      <span className={`font-mono font-medium ${text} ${LABEL[variant]}`}>{label}</span>
    </>
  );

  const shell = `group inline-flex flex-shrink-0 items-center overflow-hidden ${radius} ${SHELL[variant]} transition-transform duration-200 active:scale-[0.98] disabled:opacity-60 ${className}`;

  if (to) {
    return (
      <Link to={to} className={shell}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={shell}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={shell}>
      {inner}
    </button>
  );
}

/** Barra ancha del bento: texto a la izquierda y cuadro negro con chevron a la derecha. */
export function BentoBar({ children, href }: { children: ReactNode; href?: string }) {
  const content = (
    <>
      <p className="font-mono text-xs leading-relaxed text-black/70 sm:text-sm">{children}</p>
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-black">
        <ChevronRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  );
  const cls =
    "group flex items-center justify-between gap-3 rounded-xl bg-[#EBE8EB] py-2 pl-4 pr-2";
  return href ? (
    <a href={href} className={cls}>
      {content}
    </a>
  ) : (
    <div className={cls}>{content}</div>
  );
}

/** Código mono de esquina (motivo "GT/01" del bento). */
export function Code({ children, tone = "light" }: { children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <span
      className={`font-display text-4xl font-medium tracking-tight sm:text-5xl ${
        tone === "dark" ? "text-white" : "text-black"
      }`}
    >
      {children}
    </span>
  );
}
