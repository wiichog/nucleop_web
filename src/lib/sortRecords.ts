import type { DataTableSortStatus } from "mantine-datatable";

/**
 * Orden client-side genérico para mantine-datatable: ordena por `columnAccessor`
 * (soporta accessors anidados con punto, ej. "plan.name"). Números y fechas-ISO
 * se ordenan natural; el resto como texto. `null/undefined` van al final.
 */
export function sortRecords<T>(records: T[], { columnAccessor, direction }: DataTableSortStatus<T>): T[] {
  const get = (obj: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), obj);

  const sorted = [...records].sort((a, b) => {
    const av = get(a, String(columnAccessor));
    const bv = get(b, String(columnAccessor));
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv), "es", { numeric: true });
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}
