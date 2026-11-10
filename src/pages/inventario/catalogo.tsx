import { Badge } from "@mantine/core";
import type { ErpProduct } from "../../api/types";

export const CATEGORIES = [
  { value: "supplement", label: "Suplemento" },
  { value: "merch", label: "Merch / Ropa" },
  { value: "drink", label: "Bebida / Comida" },
  { value: "gear", label: "Equipamiento" },
  { value: "service", label: "Servicio" },
  { value: "other", label: "Otro" },
];

/** Nombre en español de la categoría (el servidor guarda la llave interna). */
export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * Lo que hay que reabastecer. Un preparado (licuado) no tiene stock propio —se
 * descuentan sus insumos— y uno inactivo ya no se vende: contarlos haría que el
 * aviso amarillo nunca llegara a cero.
 */
export function porReabastecer(p: ErpProduct) {
  return p.is_active && !p.is_composite && p.needs_reorder;
}

/** Cómo se anuncia el producto en la tienda del app (nada si no está a la venta ahí). */
export function TiendaBadge({ p }: { p: ErpProduct }) {
  if (!p.show_in_marketplace) return null;
  if (p.is_upcoming)
    return (
      <Badge size="xs" color="grape" variant="light">
        Próximamente{p.launch_date ? ` · ${p.launch_date}` : ""}
      </Badge>
    );
  if (p.delivery_days > 0)
    return (
      <Badge size="xs" color="blue" variant="light">
        App · {p.delivery_days} {p.delivery_days === 1 ? "día" : "días"}
      </Badge>
    );
  return (
    <Badge size="xs" color="teal" variant="light">
      En el app
    </Badge>
  );
}
