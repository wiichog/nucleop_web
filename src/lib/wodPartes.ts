import type { ScoreType, Wod, WodPart, WodPartInput, WodPartSuggestion } from "../api/types";
import { nombreMovimiento } from "./movimientos";

/**
 * Los bloques del WOD (`WodPart`): «Calentamiento», «Fuerza A», «Metcon»… cada
 * uno con su texto y, si se puntúa, con su propio score y su board.
 *
 * Un WOD SIN partes es el caso histórico: un solo score con los campos del WOD.
 * Con partes, el WOD refleja en sus campos sólo la principal (para los apps
 * viejos). El backend reemplaza la lista entera al guardar
 * (`services.guardar_partes_wod`): con `id` actualiza, sin `id` crea, la que no
 * viene se borra — y se niega si tiene scores.
 *
 * Espejo de `nucleo-app-mobile/src/lib/wodPartes.ts`. Puro, para probarlo.
 */

/** Una parte tal como se edita en el formulario. */
export type ParteBorrador = Partial<WodPartInput> & {
  title: string;
  /** Sólo se lee: con scores no se cambia el tipo ni se quita el bloque. */
  results_count?: number;
};

export function partesOrdenadas(wod: Pick<Wod, "parts">): WodPart[] {
  return [...(wod.parts ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function tienePartes(wod: Pick<Wod, "parts">): boolean {
  return (wod.parts?.length ?? 0) > 0;
}

/** Un sitio con board: una parte con score, o el WOD entero si no tiene partes. */
export interface BloqueScore {
  key: string;
  /** `undefined` = WOD sin partes: el board y el registro van SIN `part_id`. */
  partId?: string;
  titulo: string;
  scoreType: ScoreType;
}

export function bloquesConScore(wod: Wod): BloqueScore[] {
  if (tienePartes(wod)) {
    return partesOrdenadas(wod)
      .filter((p) => (p.score_type ?? "none") !== "none")
      .map((p, i) => ({
        key: p.id ?? `parte-${i}`,
        partId: p.id,
        titulo: p.title,
        scoreType: (p.score_type ?? "none") as ScoreType,
      }));
  }
  const tipo = (wod.score_type ?? "none") as ScoreType;
  return tipo === "none" ? [] : [{ key: wod.id, titulo: wod.title, scoreType: tipo }];
}

/** Bloque nuevo: sin score hasta que el coach diga cómo se puntúa. */
export function parteNueva(): ParteBorrador {
  return { title: "", description: "", kind: "metcon", score_type: "none", load_unit: "" };
}

/** Las partes de un WOD guardado, listas para editar. */
export function partesParaEditar(wod: Pick<Wod, "parts">): ParteBorrador[] {
  return partesOrdenadas(wod).map((p) => {
    const { order: _o, kind_display: _kd, ...resto } = p;
    return { ...resto, description: resto.description ?? "" };
  });
}

/**
 * Los bloques que propuso el backend a partir del texto pegado, como borradores.
 * Son nuevos (sin `id`): al guardar reemplazan a los que había.
 */
export function partesDesdeSugerencia(sugeridas: WodPartSuggestion[]): ParteBorrador[] {
  return sugeridas.map((s) => ({
    kind: s.kind,
    title: s.title,
    description: s.description,
    score_type: s.score_type,
    time_cap_min: s.time_cap_min,
    // El backend sólo devuelve "", "kg" o "lb"; el contrato lo declara texto libre.
    load_unit: s.load_unit as ParteBorrador["load_unit"],
    movement: s.movement,
    movement_reps: s.movement_reps,
    is_benchmark: s.is_benchmark,
  }));
}

/**
 * Por qué no se pueden reemplazar los bloques actuales, o `null`. Un bloque con
 * scores no se quita (el backend lo rechaza al guardar): mejor decirlo antes.
 */
export function bloqueoParaReemplazar(partes: ParteBorrador[]): string | null {
  const conScores = partes.find((p) => (p.results_count ?? 0) > 0);
  if (!conScores) return null;
  return `«${conScores.title}» ya tiene scores: sus bloques no se pueden reemplazar. Edítalos a mano.`;
}

/** Mueve la parte `i` una posición (`-1` arriba, `+1` abajo). Fuera de rango, igual. */
export function moverParte<T>(partes: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (i < 0 || i >= partes.length || j < 0 || j >= partes.length) return partes;
  const out = partes.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Lo primero que le impide guardar al formulario, o `null`. */
export function errorDePartes(partes: ParteBorrador[]): string | null {
  const sinTitulo = partes.findIndex((p) => !p.title.trim());
  if (sinTitulo >= 0) return `El bloque ${sinTitulo + 1} necesita un título.`;
  return null;
}

/**
 * La clave `parts` del body, o `undefined` para NO mandarla.
 * - Sin partes antes ni ahora: no se manda (el WOD sigue con un solo score).
 * - Había partes y se quitaron todas: se manda `[]` (el backend las borra).
 */
export function partesParaGuardar(
  partes: ParteBorrador[],
  teniaPartes: boolean,
): WodPartInput[] | undefined {
  if (partes.length === 0 && !teniaPartes) return undefined;
  return partes.map((p) => {
    const { results_count: _rc, ...resto } = p;
    const carga = p.score_type === "load";
    return {
      ...resto,
      title: p.title.trim(),
      // La unidad, el levantamiento y sus reps sólo tienen sentido en carga.
      load_unit: carga ? p.load_unit || "lb" : "",
      movement: carga ? p.movement || null : null,
      movement_reps: carga && p.movement ? p.movement_reps || 1 : null,
      is_benchmark: (p.score_type ?? "none") !== "none" && !!p.is_benchmark,
    } as WodPartInput;
  });
}

/** Una línea por bloque para la tabla: «Fuerza A · Carga · Back squat x3». */
export function resumenDeParte(p: WodPart, etiquetaScore: (s: string) => string): string {
  const score = (p.score_type ?? "none") === "none" ? "sin score" : etiquetaScore(p.score_type!);
  const mov = p.movement
    ? ` · ${nombreMovimiento(p.movement)}${(p.movement_reps ?? 1) > 1 ? ` x${p.movement_reps}` : ""}`
    : "";
  return `${p.title} · ${score}${mov}`;
}
