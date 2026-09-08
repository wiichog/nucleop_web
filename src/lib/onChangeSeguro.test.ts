// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardia contra un crash real de página que llegó a 27 sitios en 5 archivos.
 *
 * El patrón malo es leer el evento DENTRO del updater que recibe `setState`:
 *
 *     onChange={(e) => setAlta((a) => ({ ...a, name: e.currentTarget.value }))}
 *
 * React pone `currentTarget` en null en cuanto el handler termina, y solo evalúa el
 * updater de inmediato si la fibra no tiene ya una actualización encolada (la
 * optimización de bailout). Con una encolada lo difiere hasta el render, y para
 * entonces el evento ya está reciclado: "Cannot read properties of null (reading
 * 'value')". Sin error boundary eso desmonta la página entera y el usuario se queda
 * viendo una pantalla en blanco. Solo se dispara al escribir rápido en dos campos
 * seguidos, que es justo lo que hace la gente y lo que no hace un smoke test.
 *
 * Esto se verifica LEYENDO el código, no renderizando, y es a propósito: montar la
 * página y disparar dos `change` seguidos no sirve de guardia. En un árbol real React
 * alcanza a renderizar entre evento y evento, así que evalúa los dos updaters en
 * caliente y el test pasa igual con el bug puesto — comprobado reintroduciendo las 12
 * ocurrencias de SuppliersPanel. Lo que decide si la carrera ocurre son detalles del
 * árbol ajenos al formulario (efectos de layout de framer-motion, por ejemplo), así
 * que un test de render protegería hasta el día que alguien mueva un wrapper.
 *
 * Va como test y no como regla de ESLint porque el repo no tiene ESLint configurado
 * y `npm test` sí es lo que corre antes de subir.
 */

const RAIZ = process.cwd();

function fuentes(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) fuentes(ruta, acc);
    else if (entrada.endsWith(".tsx") && !entrada.endsWith(".test.tsx")) acc.push(ruta);
  }
  return acc;
}

/**
 * Recorta el texto de cada llamada `setAlgo((x) => …)` balanceando paréntesis, en vez
 * de cortar con un regex de una línea. El balanceo importa: el patrón aparecía tanto
 * en una sola línea como partido en tres, y un chequeo por línea se traga la versión
 * partida sin decir nada.
 */
function llamadasASetters(codigo: string): { texto: string; indice: number }[] {
  const encontradas: { texto: string; indice: number }[] = [];
  const inicio = /\bset[A-Z]\w*\(\s*\(\s*\w+\s*\)\s*=>/g;
  let m: RegExpExecArray | null;
  while ((m = inicio.exec(codigo))) {
    let profundidad = 0;
    let fin = codigo.length - 1;
    for (let j = m.index; j < codigo.length; j++) {
      if (codigo[j] === "(") profundidad++;
      else if (codigo[j] === ")" && --profundidad === 0) {
        fin = j;
        break;
      }
    }
    encontradas.push({ texto: codigo.slice(m.index, fin + 1), indice: m.index });
  }
  return encontradas;
}

const LEE_EL_EVENTO = /\b(currentTarget|target)\s*\.\s*value\b/;

describe("onChange no lee el evento dentro del updater de setState", () => {
  const archivos = fuentes(join(RAIZ, "src"));

  it("el guardia está mirando el código de verdad", () => {
    // Si un refactor mueve las fuentes, prefiero que esto grite a que el guardia
    // se quede revisando una lista vacía y reporte verde para siempre.
    expect(archivos.length).toBeGreaterThan(20);
  });

  it("ningún .tsx lee currentTarget/target dentro de un updater", () => {
    const culpables: string[] = [];
    for (const ruta of archivos) {
      const codigo = readFileSync(ruta, "utf-8");
      for (const { texto, indice } of llamadasASetters(codigo)) {
        if (!LEE_EL_EVENTO.test(texto)) continue;
        const linea = codigo.slice(0, indice).split("\n").length;
        const archivo = relative(RAIZ, ruta).split("\\").join("/");
        culpables.push(`${archivo}:${linea} → ${texto.replace(/\s+/g, " ").slice(0, 100)}`);
      }
    }
    expect(
      culpables,
      'Lee el valor ANTES de llamar al setter:\n  onChange={(e) => { const valor = e.currentTarget.value; setX((s) => ({ ...s, k: valor })); }}',
    ).toEqual([]);
  });
});
