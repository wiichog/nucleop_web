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
  /** Sets x Reps que programó el coach (bloques de carga): prellenan el registro. */
  sets?: number | null;
  reps?: number | null;
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
        sets: p.sets ?? null,
        reps: p.movement_reps ?? null,
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
    // «5x3» → 5 x 3: el backend ya lee los Sets x Reps del texto (puede faltar alguno).
    sets: s.sets ?? null,
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

/** «5×2», «5 rondas», «2 reps» o "": cómo se movió el peso de un bloque de carga. */
export function textoRondas(r: { sets?: number | null; reps?: number | null } | null | undefined): string {
  const sets = r?.sets ?? null;
  const reps = r?.reps ?? null;
  if (sets && reps) return `${sets}×${reps}`;
  if (sets) return `${sets} ${sets === 1 ? "ronda" : "rondas"}`;
  if (reps) return `${reps} reps`;
  return "";
}

/** Lo que devuelve un `NumberInput` («5», "" mientras está vacío), como entero de 1 a 99 o null. */
export function enteroDe(v: number | string): number | null {
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

/** Mueve la parte `i` una posición (`-1` arriba, `+1` abajo). Fuera de rango, igual. */
export function moverParte<T>(partes: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (i < 0 || i >= partes.length || j < 0 || j >= partes.length) return partes;
  const out = partes.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Topes de Sets x Reps de un bloque de carga (los mismos del backend). */
export const MAX_SETS = 99;
export const MAX_REPS = 30;

/** Mensaje del backend cuando falta Sets x Reps (`_exigir_sets_y_reps`). */
export const mensajeSinSetsReps = (titulo: string) =>
  `«${titulo}» es de carga: indica Sets x Reps (p. ej. 5 x 3).`;

/** Mensaje del backend cuando el workout no tiene bloques. */
export const SIN_BLOQUES = "Arma la rutina con al menos un bloque.";

/**
 * ¿Este bloque de carga tiene que llevar Sets x Reps? Igual que el backend
 * (`guardar_partes_wod`): sí si es nuevo, si antes no era de carga, o si ya los
 * tenía (no se vacían). Un bloque de carga viejo que nunca los tuvo se sigue
 * guardando sin ellos, para no romper la edición de WODs pasados.
 */
export function exigeSetsYReps(p: ParteBorrador, original?: Pick<WodPart, "score_type" | "sets">): boolean {
  if (p.score_type !== "load") return false;
  if (!p.id || !original) return true;
  return original.score_type !== "load" || original.sets != null;
}

/**
 * Lo primero que le impide guardar al formulario, o `null`. Los mensajes son los
 * mismos del backend, para que el gym lea lo mismo lo valide quien lo valide.
 * - `exigirBloque`: el workout necesita al menos un bloque (crear, o editar uno
 *   que ya tenía bloques). Un WOD viejo de solo texto se edita sin ellos.
 * - `originales`: los bloques como estaban guardados, para la regla de Sets x Reps.
 */
export function errorDePartes(
  partes: ParteBorrador[],
  opciones: { exigirBloque?: boolean; originales?: WodPart[] } = {},
): string | null {
  if (opciones.exigirBloque && partes.length === 0) return SIN_BLOQUES;
  const sinTitulo = partes.findIndex((p) => !p.title.trim());
  if (sinTitulo >= 0) return `El bloque ${sinTitulo + 1} necesita un título.`;
  // Un bloque de carga necesita su levantamiento base (Vertikal, 10-nov-2026): con
  // él el atleta ve sus porcentajes desde la rutina y su PR se actualiza solo. El
  // backend lo exige igual (`guardar_partes_wod`). Espejo del app.
  const sinLevantamiento = partes.find((p) => p.score_type === "load" && !(p.movement ?? "").trim());
  if (sinLevantamiento) {
    return `«${sinLevantamiento.title.trim()}» es de carga: elige su levantamiento base.`;
  }
  // Sets x Reps (Vertikal, ronda 6): «5 x 3 @ peso». Con ellos se prellena el
  // score del atleta y su PR sabe a cuántas reps corresponde el peso.
  for (const p of partes) {
    if (p.score_type !== "load") continue;
    const titulo = p.title.trim();
    const original = p.id ? opciones.originales?.find((o) => o.id === p.id) : undefined;
    const sets = p.sets ?? null;
    const reps = p.movement_reps ?? null;
    if (sets != null && !(Number.isInteger(sets) && sets >= 1 && sets <= MAX_SETS)) {
      return `«${titulo}»: Sets va de 1 a ${MAX_SETS}.`;
    }
    if (reps != null && !(Number.isInteger(reps) && reps >= 1 && reps <= MAX_REPS)) {
      return `«${titulo}»: Reps va de 1 a ${MAX_REPS}.`;
    }
    if ((sets == null || reps == null) && exigeSetsYReps(p, original)) return mensajeSinSetsReps(titulo);
  }
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
      // Sets x Reps del bloque de carga: «5 x 3» = 5 series de 3 reps del peso que
      // se anota. Obligatorios desde la ronda 6 (los valida `errorDePartes`).
      sets: carga ? (p.sets ?? null) : null,
      movement_reps: carga ? p.movement_reps || null : null,
      is_benchmark: (p.score_type ?? "none") !== "none" && !!p.is_benchmark,
    } as WodPartInput;
  });
}

/** «5 x 3» si el bloque trae Sets x Reps, o "". */
export function textoSetsReps(p: Pick<WodPart, "sets" | "movement_reps">): string {
  return p.sets && p.movement_reps ? `${p.sets} x ${p.movement_reps}` : "";
}

/** Una línea por bloque: «Fuerza A · Carga · Back squat 5 x 3» (o «x3» sin sets). */
export function resumenDeParte(p: WodPart, etiquetaScore: (s: string) => string): string {
  const score = (p.score_type ?? "none") === "none" ? "sin score" : etiquetaScore(p.score_type!);
  const setsReps = textoSetsReps(p);
  const mov = p.movement
    ? ` · ${nombreMovimiento(p.movement)}${
        setsReps ? ` ${setsReps}` : (p.movement_reps ?? 1) > 1 ? ` x${p.movement_reps}` : ""
      }`
    : "";
  return `${p.title} · ${score}${mov}`;
}
