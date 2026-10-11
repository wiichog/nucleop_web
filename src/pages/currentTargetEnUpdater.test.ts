import { describe, expect, it } from "vitest";
import compras from "./PurchaseOrdersPanel.tsx?raw";
import inventario from "./InventoryPage.tsx?raw";

/**
 * `e.currentTarget` dentro del updater de un `setX(prev => …)` tumba la página al
 * escribir rápido: React lo pone en null al terminar el handler y el updater puede
 * correr después (ver el comentario en InventoryPage). Un test de render da verde
 * con el bug puesto, así que se revisa el código fuente.
 *
 * El updater se recorta contando paréntesis (no por línea: el patrón suele venir
 * partido en varias líneas, y un grep por línea lo subcuenta).
 */
function updatersQueLeenCurrentTarget(fuente: string): string[] {
  const hallados: string[] = [];
  const inicio = /\bset[A-Z]\w*\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>/g;
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(fuente))) {
    // Desde el paréntesis de apertura del setter hasta su cierre.
    let i = m.index + m[0].indexOf("(");
    let nivel = 0;
    const desde = i;
    for (; i < fuente.length; i++) {
      if (fuente[i] === "(") nivel++;
      else if (fuente[i] === ")" && --nivel === 0) break;
    }
    const cuerpo = fuente.slice(desde, i + 1);
    if (cuerpo.includes("currentTarget")) hallados.push(cuerpo);
  }
  return hallados;
}

describe("currentTarget nunca dentro del updater de setState", () => {
  it("detecta el patrón aunque venga en varias líneas", () => {
    const malo = `onChange={(e) =>\n  setLineas((ls) =>\n    ls.map((x) => ({ ...x, c: e.currentTarget.value })),\n  )\n}`;
    expect(updatersQueLeenCurrentTarget(malo)).toHaveLength(1);
    const bueno = `onChange={(e) => {\n  const valor = e.currentTarget.value;\n  setLineas((ls) => ls.map((x) => ({ ...x, c: valor })));\n}}`;
    expect(updatersQueLeenCurrentTarget(bueno)).toHaveLength(0);
  });

  it("Compras a proveedor lee el valor antes del setter", () => {
    expect(updatersQueLeenCurrentTarget(compras)).toEqual([]);
  });

  it("Inventario lee el valor antes del setter", () => {
    expect(updatersQueLeenCurrentTarget(inventario)).toEqual([]);
  });
});
