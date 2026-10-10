/**
 * Manual de uso por pantalla del panel (mismo patrón que el ERP de FC).
 *
 * Se escribe para el dueño o el staff del gimnasio, en su idioma de trabajo:
 * nada de términos técnicos, y nada que no se pueda confirmar en el código de
 * la pantalla. Si cambias lo que el usuario hace en una pantalla (un botón, un
 * paso, un estado, un mensaje), actualiza su manual en el mismo commit.
 */

/** Una tarea que el usuario viene a hacer, en pasos numerados. */
export interface ManualTarea {
  titulo: string;
  pasos: string[];
  /** Aclaración o advertencia que va debajo de los pasos. */
  nota?: string;
}

/** Un término, estado o columna que aparece en la pantalla. */
export interface ManualConcepto {
  termino: string;
  detalle: string;
}

/** Lo que el usuario ve cuando algo no sale y qué hacer. */
export interface ManualProblema {
  sintoma: string;
  solucion: string;
}

export interface Manual {
  titulo: string;
  /** Para qué sirve la pantalla, en una a tres frases. */
  paraQue: string;
  tareas: ManualTarea[];
  conceptos?: ManualConcepto[];
  problemas?: ManualProblema[];
  relacionadas?: { label: string; href: string }[];
}

/** Llave = ruta de la pantalla (p. ej. `/panel/clases`). */
export type ManualesPorRuta = Record<string, Manual>;
