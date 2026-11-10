import { Select } from "@mantine/core";

/**
 * Las opciones salen de las filas de la tabla, no del catálogo de servicios:
 * así aparece también una clase pasada cuyo servicio ya se borró, y no se
 * ofrece un servicio que en esa tabla daría cero filas.
 *
 * Se filtra por NOMBRE porque es lo único que todas las tablas comparten:
 * `GymClass.class_type` es el nombre denormalizado del servicio y una solicitud
 * de clase solo trae ese nombre, no el id.
 */
export function opcionesDeServicio(nombres: (string | null | undefined)[], elegido?: string | null) {
  const unicos = new Set(nombres.filter((n): n is string => !!n && !!n.trim()));
  // El elegido se queda en la lista aunque esta tabla no lo tenga: si no, el
  // Select se vería vacío mientras la tabla sigue filtrando (y mostrando nada).
  if (elegido) unicos.add(elegido);
  return [...unicos]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((n) => ({ value: n, label: n }));
}

/** `null` = todos los servicios. */
export function coincideServicio(nombre: string | null | undefined, elegido: string | null) {
  return !elegido || nombre === elegido;
}

export function FiltroServicio({
  opciones,
  value,
  onChange,
}: {
  opciones: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      aria-label="Filtrar por servicio"
      placeholder="Todos los servicios"
      data={opciones}
      value={value}
      onChange={onChange}
      clearable
      searchable
      w={{ base: "100%", sm: 220 }}
    />
  );
}
