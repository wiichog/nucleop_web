import type { ClassSchedule } from "../api/types";

/**
 * El horario semanal como cuadrícula: horas en filas, días en columnas.
 *
 * Antes era una tabla con una fila por (hora, día): el CrossFit de 6:00 de lunes
 * a viernes eran cinco filas casi iguales, y con 33 franjas el dueño «se perdía».
 * Una franja sigue siendo un `ClassSchedule` por día; aquí solo se acomodan.
 */

/** «06:00:00» → «06:00». */
export const horaDe = (s: Pick<ClassSchedule, "start_time">) => s.start_time.slice(0, 5);

/** Lunes a sábado siempre; el domingo solo si el box da clases ese día. */
export function diasVisibles(franjas: Pick<ClassSchedule, "weekday">[]): number[] {
  const dias = [0, 1, 2, 3, 4, 5];
  return franjas.some((f) => f.weekday === 6) ? [...dias, 6] : dias;
}

export type Cuadricula = {
  /** Las horas de inicio que existen, en orden. Una fila por cada una. */
  horas: string[];
  dias: number[];
  /** Las franjas de una celda (puede haber varias: dos servicios a la misma hora). */
  celda: (hora: string, dia: number) => ClassSchedule[];
};

export function armarCuadricula(franjas: ClassSchedule[]): Cuadricula {
  const porCelda = new Map<string, ClassSchedule[]>();
  for (const f of franjas) {
    const llave = `${horaDe(f)}|${f.weekday}`;
    const lista = porCelda.get(llave);
    if (lista) lista.push(f);
    else porCelda.set(llave, [f]);
  }
  for (const lista of porCelda.values()) {
    lista.sort((a, b) => a.service_type_name.localeCompare(b.service_type_name, "es"));
  }
  const horas = [...new Set(franjas.map(horaDe))].sort();
  return {
    horas,
    dias: diasVisibles(franjas),
    celda: (hora, dia) => porCelda.get(`${hora}|${dia}`) ?? [],
  };
}

/** Lo que se lee arriba de la cuadrícula: cuántas clases a la semana y cuántas sin coach. */
export function resumenHorario(franjas: Pick<ClassSchedule, "default_coach">[]) {
  return {
    clases: franjas.length,
    sinCoach: franjas.filter((f) => !f.default_coach).length,
  };
}
