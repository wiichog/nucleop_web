/**
 * Levantamientos del catálogo, para ligar un bloque de «Carga» a un movimiento:
 * con eso, el peso que anota cada atleta cuenta para su RM estimado.
 *
 * Espejo de `nucleo-api/apps/athletes/movimientos.py` (fuente) y del app
 * (`lib/prs.ts` + `lib/labels.ts`). Al agregar uno hay que tocar los tres.
 */
export const MOVIMIENTOS_DE_CARGA: Record<string, string> = {
  back_squat: "Back squat",
  front_squat: "Front squat",
  overhead_squat: "Overhead squat",
  deadlift: "Deadlift",
  sumo_deadlift: "Sumo deadlift",
  clean: "Clean",
  power_clean: "Power clean",
  squat_clean: "Squat clean",
  hang_clean: "Hang clean",
  hang_power_clean: "Hang power clean",
  clean_and_jerk: "Clean & jerk",
  snatch: "Snatch",
  power_snatch: "Power snatch",
  squat_snatch: "Squat snatch",
  hang_snatch: "Hang snatch",
  hang_power_snatch: "Hang power snatch",
  strict_press: "Strict press",
  push_press: "Push press",
  push_jerk: "Push jerk",
  split_jerk: "Split jerk",
  bench_press: "Bench press",
  thruster: "Thruster",
};

/** Nombre del movimiento; uno fuera del catálogo (lo trajo la IA) se muestra tal cual. */
export const nombreMovimiento = (m?: string | null) =>
  m ? (MOVIMIENTOS_DE_CARGA[m] ?? m) : "";
