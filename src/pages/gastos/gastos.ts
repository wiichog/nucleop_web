import type { ErpExpense } from "../../api/types";

/**
 * Lo que la pantalla de Gastos decide del lado del panel: de qué mes se ven,
 * qué se busca y en qué orden. Los filtros de estado y categoría los resuelve
 * el servidor; aquí no se toca ningún monto.
 */

export const CATEGORIAS_GASTO = [
  { value: "rent", label: "Renta" },
  { value: "utilities", label: "Servicios" },
  { value: "equipment", label: "Equipo" },
  { value: "marketing", label: "Marketing" },
  { value: "payroll", label: "Nómina" },
  { value: "inventory", label: "Compra de inventario" },
  { value: "other", label: "Otro" },
];

const ETIQUETA_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_GASTO.map((c) => [c.value, c.label]),
);

export const categoriaGasto = (c: string) => ETIQUETA_CATEGORIA[c] ?? c;

/** «Todo el historial» en el selector de periodo. */
export const TODO = "todo";

/** «2026-11» de una fecha local. */
export const mesDe = (d: Date) => d.toLocaleDateString("en-CA").slice(0, 7);

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** «Noviembre 2026». */
export function nombreMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString("es-GT", { month: "long", year: "numeric" });
  return mayuscula(t.replace(" de ", " "));
}

/**
 * Meses que se pueden elegir: el actual siempre (es donde se registra), los que
 * tienen gastos y el elegido, del más nuevo al más viejo; al final, todo.
 */
export function periodosDisponibles(
  gastos: Pick<ErpExpense, "incurred_on">[],
  hoy: Date,
  elegido?: string | null,
): { value: string; label: string }[] {
  const meses = new Set<string>([mesDe(hoy)]);
  for (const g of gastos) if (g.incurred_on) meses.add(g.incurred_on.slice(0, 7));
  if (elegido && elegido !== TODO) meses.add(elegido);
  return [
    ...[...meses].sort((a, b) => b.localeCompare(a)).map((m) => ({ value: m, label: nombreMes(m) })),
    { value: TODO, label: "Todo el historial" },
  ];
}

export const tieneComprobante = (g: Pick<ErpExpense, "proof_file" | "proof_url">) => !!(g.proof_file || g.proof_url);

/** Vigente y sin factura ni recibo: lo único pendiente de un gasto. */
export const faltaComprobante = (g: Pick<ErpExpense, "is_void" | "proof_file" | "proof_url">) =>
  !g.is_void && !tieneComprobante(g);

export type OrdenGastos = "recientes" | "monto";

/** Del periodo, con el texto buscado (descripción o categoría) y, si se pide, solo los que no tienen comprobante. */
export function filtrarGastos<G extends Pick<ErpExpense, "incurred_on" | "description" | "category" | "is_void" | "proof_file" | "proof_url">>(
  gastos: G[],
  { periodo, texto, soloSinComprobante }: { periodo: string; texto: string; soloSinComprobante?: boolean },
): G[] {
  const t = texto.trim().toLowerCase();
  return gastos.filter(
    (g) =>
      (periodo === TODO || (g.incurred_on ?? "").startsWith(periodo)) &&
      (!t ||
        (g.description ?? "").toLowerCase().includes(t) ||
        categoriaGasto(g.category).toLowerCase().includes(t)) &&
      (!soloSinComprobante || faltaComprobante(g)),
  );
}

/** Recientes: por fecha del gasto y, el mismo día, el último registrado arriba. Monto: el mayor arriba. */
export function ordenarGastos<G extends Pick<ErpExpense, "incurred_on" | "created_at" | "amount">>(
  gastos: G[],
  orden: OrdenGastos,
): G[] {
  return gastos.slice().sort((a, b) => {
    if (orden === "monto") {
      const d = Number(b.amount || 0) - Number(a.amount || 0);
      if (d) return d;
    }
    return b.incurred_on.localeCompare(a.incurred_on) || b.created_at.localeCompare(a.created_at);
  });
}

/** «12 nov»; con año si no es el de hoy. */
export function fechaCorta(iso: string, hoy: Date): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== hoy.getFullYear() ? { year: "numeric" } : {}),
  });
}
