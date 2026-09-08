import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PASOS, aplanarErrores, pasoDelCampo, pasoDelPrimerError } from "../../api/onboarding";

/**
 * El formulario del contrato de alta se rompe en silencio de tres formas, y las tres
 * se ven aquí:
 *
 * 1. Un campo que el formulario manda con otro nombre → el backend lo ignora y ese dato
 *    no llega nunca, sin error visible.
 * 2. Un campo que existe en el formulario y no en el catálogo `PASOS` → el porcentaje de
 *    avance miente, y quien vende llama a la persona equivocada.
 * 3. Un 400 que no se mapea al paso donde vive el campo que falló → la persona se queda
 *    mirando un formulario que dice que algo está mal sin decirle dónde.
 */

// Ruta desde la raíz del proyecto: en jsdom `import.meta.url` no es un `file://`.
const RUTA_FORM = resolve(process.cwd(), "src/pages/contrato/OnboardingForm.tsx");

/** Las llaves del objeto que `construirCuerpo` manda al backend. */
function camposDelPayload(): Set<string> {
  const fuente = readFileSync(RUTA_FORM, "utf8");
  const desde = fuente.indexOf("function construirCuerpo");
  expect(desde, "no se encontró construirCuerpo").toBeGreaterThan(-1);
  const bloque = fuente.slice(desde);
  const objeto = bloque.slice(bloque.indexOf("return {"), bloque.indexOf("\n  };"));
  return new Set([...objeto.matchAll(/^ {4}([a-z_][a-z0-9_]*):/gm)].map((m) => m[1]));
}

/** Campos que pone la página, no la persona: no cuentan para el avance. */
const AUTOMATICOS = new Set(["terms_version", "contract_hash", "recaptcha_token"]);

describe("catálogo de pasos ↔ formulario", () => {
  it("manda exactamente los campos del catálogo, ni uno más ni uno menos", () => {
    const delCatalogo = new Set(PASOS.flatMap((p) => p.campos));
    const delPayload = camposDelPayload();

    const faltan = [...delCatalogo].filter((c) => !delPayload.has(c));
    const sobran = [...delPayload].filter((c) => !delCatalogo.has(c) && !AUTOMATICOS.has(c));

    expect(faltan, "campos del catálogo que el formulario no manda").toEqual([]);
    expect(sobran, "campos que el formulario manda y el catálogo no conoce").toEqual([]);
  });

  it("manda los tres campos automáticos, que no cuentan para el avance", () => {
    const delPayload = camposDelPayload();
    for (const campo of AUTOMATICOS) expect(delPayload.has(campo), campo).toBe(true);
    for (const campo of AUTOMATICOS) expect(pasoDelCampo(campo)).toBe(-1);
  });

  it("no repite un campo en dos pasos", () => {
    const todos = PASOS.flatMap((p) => p.campos);
    expect(todos.length).toBe(new Set(todos).size);
  });

  it("tiene los diez pasos en el orden del backend", () => {
    expect(PASOS.map((p) => p.key)).toEqual([
      "organizacion", "gimnasio", "sedes", "contacto", "planes",
      "disciplinas", "cobro", "operacion", "arranque", "aceptacion",
    ]);
  });
});

describe("un 400 lleva al campo que falló", () => {
  it("lee los errores de `detail`, que es donde Nucleo los pone", () => {
    // El `nucleo_exception_handler` NO devuelve `{campo: [...]}` en la raíz como DRF a
    // secas: los anida en `detail`. Leerlos del sitio equivocado deja el formulario sin
    // marcar ni un campo en rojo.
    const respuesta = {
      detail: { gym_nit: ["Este campo es requerido."] },
      code: "invalid",
      message: "Este campo es requerido.",
    };

    expect(aplanarErrores(respuesta)).toEqual({ gym_nit: "Este campo es requerido." });
  });

  it("salta al primer paso que contiene un campo con error", () => {
    // `gym_nit` está en el paso 2 (índice 1) y `signer_name` en el 10 (índice 9): se
    // tiene que ir al más temprano, no al último que llegó en el diccionario.
    const errores = { signer_name: "Falta.", gym_nit: "Falta." };

    expect(pasoDelPrimerError(errores)).toBe(1);
  });

  it("no inventa un paso cuando el error no es de un campo del formulario", () => {
    // `recaptcha_failed` llega como `{detail, code}` sin campo: si esto devolviera 0,
    // el formulario mandaría a la persona al paso 1 sin nada marcado.
    expect(pasoDelPrimerError({ detail: "No pudimos validar el reCAPTCHA." })).toBeNull();
  });

  it("aplana el error de una fila de repetidor sin romperse", () => {
    const respuesta = { detail: { branches: [{}, { name: ["Este campo es requerido."] }] } };

    expect(aplanarErrores(respuesta)).toEqual({ branches: "Este campo es requerido." });
  });
});
