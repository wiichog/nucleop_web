import { describe, expect, it } from "vitest";
import { sortRecords } from "./sortRecords";

type Row = { id: number; name: string; fee: number | null; plan?: { name: string } };

const rows: Row[] = [
  { id: 1, name: "Beto", fee: 200, plan: { name: "Mensual" } },
  { id: 2, name: "ana", fee: 50, plan: { name: "Anual" } },
  { id: 3, name: "Caro", fee: null },
];

const status = (columnAccessor: string, direction: "asc" | "desc" = "asc") =>
  ({ columnAccessor, direction }) as never;

describe("sortRecords", () => {
  it("ordena texto sin distinguir mayúsculas (locale es)", () => {
    const out = sortRecords(rows, status("name"));
    expect(out.map((r) => r.name)).toEqual(["ana", "Beto", "Caro"]);
  });

  it("ordena números de forma natural y respeta desc", () => {
    expect(sortRecords(rows, status("fee", "asc")).map((r) => r.fee)).toEqual([50, 200, null]);
    expect(sortRecords(rows, status("fee", "desc")).map((r) => r.fee)).toEqual([null, 200, 50]);
  });

  it("manda null/undefined al final aunque sea desc", () => {
    const out = sortRecords(rows, status("fee", "asc"));
    expect(out[out.length - 1].fee).toBeNull();
  });

  it("soporta accessors anidados con punto", () => {
    const out = sortRecords(rows, status("plan.name"));
    // Caro no tiene plan (undefined) → al final.
    expect(out.map((r) => r.plan?.name)).toEqual(["Anual", "Mensual", undefined]);
  });

  it("no muta el arreglo original", () => {
    const original = [...rows];
    sortRecords(rows, status("name", "desc"));
    expect(rows).toEqual(original);
  });
});
