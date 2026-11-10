import type { ReactNode } from "react";
import { Badge, Button, Divider, Group, Modal, SimpleGrid, Switch, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDeleteErpProduct, useUpdateErpProduct } from "../../api/hooks";
import type { ErpProduct } from "../../api/types";
import { Money } from "../../components/ui";
import { errMsg } from "../../lib/errors";
import { AjusteStock } from "./AjusteStock";
import { categoryLabel, porReabastecer, TiendaBadge } from "./catalogo";

/** Una cifra chica de la ficha: etiqueta arriba, valor abajo. */
function Dato({ etiqueta, children, aviso }: { etiqueta: string; children: ReactNode; aviso?: boolean }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {etiqueta}
      </Text>
      <Text fw={700} className="a-tabular" c={aviso ? "var(--mantine-color-yellow-light-color)" : undefined}>
        {children}
      </Text>
    </div>
  );
}

/**
 * Lo que se abre al tocar un producto: sus cifras, el interruptor de venta y el
 * ajuste de stock a la mano; editar, ver sus movimientos y eliminar abajo.
 */
export function FichaProducto({
  producto,
  productos,
  gymId,
  opened,
  onClose,
  onEditar,
  onVerMovimientos,
}: {
  producto: ErpProduct | null;
  productos: ErpProduct[];
  gymId: string;
  opened: boolean;
  onClose: () => void;
  onEditar: (p: ErpProduct) => void;
  onVerMovimientos: (p: ErpProduct) => void;
}) {
  const actualizar = useUpdateErpProduct(gymId);
  const eliminar = useDeleteErpProduct(gymId);

  // Activo = a la venta en el Punto de venta y en el app. Apagarlo lo saca de ahí
  // sin borrar su historial ni su stock; se manda SOLO `is_active` por PATCH.
  const alternarActivo = (p: ErpProduct) => {
    const activar = !p.is_active;
    actualizar
      .mutateAsync({ id: p.id, body: { is_active: activar } })
      .then(() =>
        notifications.show({
          color: "teal",
          message: activar
            ? `«${p.name}» ya aparece en el Punto de venta.`
            : `«${p.name}» ya no aparece en el Punto de venta.`,
        }),
      )
      .catch((error) =>
        notifications.show({
          color: "red",
          message: errMsg(error, activar ? "No se pudo activar el producto." : "No se pudo desactivar el producto."),
        }),
      );
  };

  const borrar = (p: ErpProduct) => {
    if (!window.confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    eliminar
      .mutateAsync(p.id)
      .then(() => {
        notifications.show({ color: "teal", message: "Producto eliminado." });
        onClose();
      })
      .catch((error) => notifications.show({ color: "red", message: errMsg(error, "No se pudo eliminar.") }));
  };

  const p = producto;
  const bajo = !!p && porReabastecer(p);
  // Un preparado no lleva stock propio: se descuentan sus insumos. Solo se le
  // ofrece ajuste si arrastra stock de antes de tener receta.
  const conAjuste = !!p && (!p.is_composite || p.stock_qty !== 0);

  return (
    <Modal opened={opened && !!p} onClose={onClose} title={p?.name ?? "Producto"} centered size="md">
      {p && (
        <>
          <Group gap="sm" wrap="nowrap" align="flex-start" mb="sm">
            {p.photo && (
              <img
                src={p.photo}
                alt=""
                style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--a-line)" }}
              />
            )}
            <Group gap={6} wrap="wrap" style={{ flex: 1 }}>
              <Badge size="sm" variant="light" color="gray">
                {categoryLabel(p.category)}
              </Badge>
              {p.is_composite && (
                <Badge size="sm" variant="light" color="cyan">
                  Receta
                </Badge>
              )}
              <TiendaBadge p={p} />
            </Group>
            <Switch
              label="Activo"
              checked={p.is_active}
              onChange={() => alternarActivo(p)}
              disabled={actualizar.isPending && actualizar.variables?.id === p.id}
              aria-label={p.is_active ? `Desactivar ${p.name}` : `Activar ${p.name}`}
              color="flame"
            />
          </Group>

          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs" mb="sm">
            <Dato etiqueta="Stock" aviso={bajo}>
              {p.is_composite ? "—" : p.stock_qty}
              {bajo ? " ⚠" : ""}
            </Dato>
            <Dato etiqueta="Precio">
              <Money value={p.sale_price} decimals={2} />
            </Dato>
            <Dato etiqueta="Costo">
              <Money value={p.cost_price} decimals={2} />
            </Dato>
            <Dato etiqueta="Margen">
              <Money value={p.margin_unit} decimals={2} />
            </Dato>
          </SimpleGrid>
          {!p.is_composite && (
            <Text size="xs" c={bajo ? "var(--mantine-color-yellow-light-color)" : "dimmed"} mb="sm">
              Mínimo en bodega: {p.reorder_level}
            </Text>
          )}
          {p.is_composite && (p.components ?? []).length > 0 && (
            <Text size="sm" c="dimmed" mb="sm">
              Lleva:{" "}
              {p.components
                .map((c) => `${c.component_name ?? productos.find((x) => x.id === c.component)?.name ?? "insumo"} ×${c.qty}`)
                .join(" · ")}
            </Text>
          )}

          {conAjuste && (
            <>
              <Divider mb="sm" />
              <Title order={5} mb="xs">
                Ajustar stock
              </Title>
              {/* `key`: al abrir otro producto el formulario arranca de cero. */}
              <AjusteStock key={p.id} gymId={gymId} productos={productos} productoId={p.id} />
            </>
          )}

          <Divider my="md" />
          <Group gap="xs" justify="space-between" wrap="wrap">
            <Group gap="xs">
              <Button variant="light" onClick={() => onEditar(p)}>
                Editar
              </Button>
              <Button variant="default" onClick={() => onVerMovimientos(p)}>
                Ver movimientos
              </Button>
            </Group>
            <Button variant="subtle" color="red" loading={eliminar.isPending} onClick={() => borrar(p)}>
              Eliminar
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
