/**
 * Guardia: los modales y drawers del panel tienen que poder hacer scroll.
 *
 * Desde el rediseño Aurora (3-ago-2026) hasta el 24-nov-2026 ningún modal ni
 * drawer hacía scroll: el tema le pone `.a-glass-card` a TODO `Paper`, y su
 * `overflow: hidden` (especificidad 0,2,0) le ganaba al `overflow-y: auto` de
 * Mantine (0,1,0) en el contenido de Modal y Drawer, que son `Paper` por dentro.
 * En el celular una ventana larga (crear workout, el manual 📖) quedaba cortada
 * sin forma de llegar al botón de guardar. En escritorio todo cabía y nadie lo vio.
 *
 * Cómo se prueba, y por qué así:
 *  - El Modal y el Drawer se montan DE VERDAD con el tema del panel, para tener
 *    sus clases reales (las de Mantine son hashes como `m_54c44539`).
 *  - La cascada NO se le pregunta a jsdom: su `getComputedStyle` ignora la
 *    especificidad (dice `auto` donde Chrome dice `hidden`) y el test pasaba con
 *    el bug puesto. Se resuelve aquí con los CSS que van a producción, en su
 *    orden, a ancho de celular: selector que aplica (`el.matches`), capa,
 *    `!important`, especificidad y orden de aparición.
 */
import { render } from "@testing-library/react";
import { Drawer, MantineProvider, Modal } from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?raw";
import { describe, expect, it } from "vitest";
import indexCss from "../index.css?raw";
import auroraCss from "./aurora.css?raw";
import { mantineTheme } from "./mantineTheme";
import themeCss from "./theme.css?raw";

// Mismo orden que en la app: main.tsx (index.css, theme.css) y luego
// AdminShell.tsx (Mantine, …, aurora.css al final).
const HOJAS = [indexCss, themeCss, mantineCss, auroraCss];
const ANCHO_CELULAR = 390;

// jsdom no trae matchMedia (MantineProvider lo usa para el esquema de color).
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// ── Mini-cascada ─────────────────────────────────────────────────────────────

type Regla = { selectores: string[]; decls: string; enCapa: boolean; orden: number };

/** ¿La media query aplica a un celular de 390px? Solo se evalúan anchos. */
function mediaAplica(query: string): boolean {
  const px = (n: string, u: string) => (u === "em" || u === "rem" ? parseFloat(n) * 16 : parseFloat(n));
  let ok = true;
  for (const m of query.matchAll(/(max|min)-width:\s*([\d.]+)(px|em|rem)/g)) {
    const v = px(m[2], m[3]);
    ok &&= m[1] === "max" ? ANCHO_CELULAR <= v : ANCHO_CELULAR >= v;
  }
  // `hover`, `prefers-*`, `print`…: no cambian el overflow de un modal.
  if (/\bprint\b|prefers-reduced-motion|hover:\s*hover/.test(query)) return false;
  return ok;
}

function leerReglas(hojas: string[]): Regla[] {
  const reglas: Regla[] = [];
  let orden = 0;
  for (const hoja of hojas) {
    const css = hoja.replace(/\/\*[\s\S]*?\*\//g, "");
    const pila: { prelude: string; activa: boolean; capa: boolean }[] = [];
    let i = 0;
    let inicio = 0;
    while (i < css.length) {
      const c = css[i];
      if (c === ";") inicio = i + 1;
      else if (c === "}") {
        pila.pop();
        inicio = i + 1;
      } else if (c === "{") {
        const prelude = css.slice(inicio, i).trim();
        if (prelude.startsWith("@")) {
          const activa = !prelude.startsWith("@media") || mediaAplica(prelude);
          pila.push({ prelude, activa, capa: prelude.startsWith("@layer") });
          inicio = i + 1;
        } else {
          const fin = css.indexOf("}", i);
          const cuerpo = css.slice(i + 1, fin);
          // Anidado CSS (`&` o `{` dentro): fuera de alcance; Mantine no lo usa aquí.
          if (!cuerpo.includes("{") && pila.every((p) => p.activa)) {
            reglas.push({
              selectores: prelude.split(",").map((s) => s.trim()).filter(Boolean),
              decls: cuerpo,
              enCapa: pila.some((p) => p.capa),
              orden: orden++,
            });
          }
          i = fin;
          inicio = fin + 1;
        }
      }
      i++;
    }
  }
  return reglas;
}

function especificidad(sel: string): number {
  const s = sel.replace(/:where\([^)]*\)/g, "").replace(/::[\w-]+/g, "");
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const clases = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!not\(|is\()[\w-]+/g) ?? []).length;
  const tipos = (s.replace(/\[[^\]]+\]|\([^)]*\)/g, "").match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return ids * 10000 + clases * 100 + tipos;
}

/** Valor ganador de `overflow-y` para `el`, como lo resolvería el navegador. */
function overflowYGanador(el: Element, reglas: Regla[]): string {
  let mejor: { clave: number[]; valor: string } | null = null;
  for (const r of reglas) {
    const aplicables = r.selectores.filter((s) => {
      try {
        return el.matches(s);
      } catch {
        return false; // selectores que jsdom no entiende (`:has`, etc.)
      }
    });
    if (!aplicables.length) continue;
    const esp = Math.max(...aplicables.map(especificidad));
    for (const d of r.decls.split(";")) {
      const m = /^\s*(overflow|overflow-y)\s*:\s*([^;]+?)\s*$/.exec(d);
      if (!m) continue;
      const importante = /!important$/.test(m[2]);
      const valores = m[2].replace(/!important$/, "").trim().split(/\s+/);
      const valor = m[1] === "overflow" ? (valores[1] ?? valores[0]) : valores[0];
      // Normales: sin capa gana a con capa. Con !important se invierte.
      const capa = importante ? (r.enCapa ? 1 : 0) : r.enCapa ? 0 : 1;
      const clave = [importante ? 1 : 0, capa, esp, r.orden];
      const gana =
        !mejor ||
        clave.some((v, k) => clave.slice(0, k).every((w, j) => w === mejor!.clave[j]) && v > mejor!.clave[k]);
      if (gana) mejor = { clave, valor };
    }
  }
  return mejor?.valor ?? "visible";
}

const REGLAS = leerReglas(HOJAS);

function montar(ui: React.ReactNode) {
  return render(<MantineProvider theme={mantineTheme}>{ui}</MantineProvider>);
}

function elemento(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se montó ${selector}`);
  return el;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("la mini-cascada resuelve como el navegador", () => {
  // Si esto falla, el resto de los tests no prueba nada.
  it("más especificidad gana aunque venga antes; !important gana a todo", () => {
    const reglas = leerReglas([
      ".x.y { overflow: hidden } .x { overflow-y: auto } .z { overflow-y: auto !important } .z.w { overflow: clip }",
    ]);
    const xy = document.createElement("div");
    xy.className = "x y";
    const zw = document.createElement("div");
    zw.className = "z w";
    expect(overflowYGanador(xy, reglas)).toBe("hidden");
    expect(overflowYGanador(zw, reglas)).toBe("auto");
  });

  it("reproduce el bug: sin la regla de aurora.css el modal NO hace scroll", () => {
    montar(
      <Modal opened onClose={() => {}} title="Workout" transitionProps={{ duration: 0 }}>
        contenido
      </Modal>,
    );
    const sinArreglo = REGLAS.filter(
      (r) => !r.selectores.some((s) => s.includes("mantine-Modal-content.a-glass-card")),
    );
    expect(overflowYGanador(elemento(".mantine-Modal-content"), sinArreglo)).toBe("hidden");
  });
});

describe("scroll de modales y drawers", () => {
  it("el contenido del Modal hace scroll aunque lleve el vidrio de Paper", () => {
    montar(
      <Modal opened onClose={() => {}} title="Workout" transitionProps={{ duration: 0 }}>
        contenido
      </Modal>,
    );
    const el = elemento(".mantine-Modal-content");
    // Precondición: si el tema deja de ponerle el vidrio, revisar este test.
    expect(el.classList.contains("a-glass-card")).toBe(true);
    expect(overflowYGanador(el, REGLAS)).toBe("auto");
  });

  it("el contenido del Drawer hace scroll aunque lleve el vidrio de Paper", () => {
    montar(
      <Drawer opened onClose={() => {}} title="Manual" transitionProps={{ duration: 0 }}>
        contenido
      </Drawer>,
    );
    const el = elemento(".mantine-Drawer-content");
    expect(el.classList.contains("a-glass-card")).toBe(true);
    expect(overflowYGanador(el, REGLAS)).toBe("auto");
  });

  it("una tarjeta normal sigue recortando al radio (no se tocó de más)", () => {
    montar(<div className="mantine-Paper-root a-glass-card" data-testid="card" />);
    expect(overflowYGanador(elemento("[data-testid=card]"), REGLAS)).toBe("hidden");
  });

  it("el header pegajoso de Modal y Drawer no es transparente", () => {
    // Con scroll, el cuerpo pasa por debajo del título: transparente se enciman.
    for (const nombre of ["Modal", "Drawer"] as const) {
      const styles = mantineTheme.components?.[nombre]?.styles as
        | { header?: { background?: string } }
        | undefined;
      const fondo = styles?.header?.background ?? "";
      expect(fondo, `${nombre}.styles.header.background`).not.toBe("");
      expect(fondo, `${nombre}.styles.header.background`).not.toBe("transparent");
      const alfa = /rgba\([^)]*,\s*([\d.]+)\)/.exec(fondo)?.[1];
      if (alfa) expect(Number(alfa), `${nombre}: fondo casi opaco`).toBeGreaterThanOrEqual(0.9);
    }
  });
});
