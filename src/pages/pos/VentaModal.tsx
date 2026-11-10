import { useState } from "react";
import { Badge, Button, Group, Modal, Stack, Table, Text } from "@mantine/core";
import type { ErpSale } from "../../api/types";
import { Money } from "../../components/ui";
import { fmtQ } from "../../lib/money";
import { PAYMENT_METHOD, label } from "../../lib/labels";

export const esDevolucion = (s: Pick<ErpSale, "return_of" | "total">) => !!s.return_of || Number(s.total) < 0;

export const fechaVenta = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

/**
 * La venta que se tocó: qué llevó, cuánto, con qué pagó y, si aún se puede,
 * devolverla. La confirmación va dentro de la misma ventana (en una tablet el
 * `confirm()` del navegador se pierde fácil).
 */
export function VentaModal({
  venta,
  devuelta,
  atleta,
  devolviendo,
  onDevolver,
  onClose,
}: {
  venta: ErpSale | null;
  devuelta: boolean;
  atleta: string | null;
  devolviendo: boolean;
  onDevolver: (venta: ErpSale) => void;
  onClose: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  if ((venta?.id ?? null) !== vista) {
    setVista(venta?.id ?? null);
    setConfirmando(false);
  }

  const devolucion = venta ? esDevolucion(venta) : false;

  return (
    <Modal
      opened={!!venta}
      onClose={onClose}
      title={venta ? `${devolucion ? "Devolución" : "Venta"} · ${fechaVenta(venta.created_at)}` : "Venta"}
      centered
      size="lg"
    >
      {venta && (
        <Stack gap="md">
          <Table.ScrollContainer minWidth={360}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th ta="right">Cant.</Table.Th>
                  <Table.Th ta="right">Precio</Table.Th>
                  <Table.Th ta="right">Subtotal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {venta.lines.map((l) => (
                  <Table.Tr key={l.id}>
                    <Table.Td>{l.product_name}</Table.Td>
                    <Table.Td ta="right" className="a-tabular">
                      {Math.abs(l.qty)}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Money value={l.unit_price} decimals={2} />
                    </Table.Td>
                    <Table.Td ta="right">
                      <Money value={l.subtotal} decimals={2} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {[venta.method ? label(PAYMENT_METHOD, venta.method) : null, atleta ?? "Sin atleta"]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text size="sm" c="dimmed">
                Margen <Money value={venta.margin} decimals={2} />
              </Text>
            </Stack>
            <Stack gap={0} align="flex-end">
              <Text size="xs" c="dimmed">
                Total
              </Text>
              <Text fz={24} fw={700} className="a-tabular">
                <Money value={venta.total} decimals={2} c={devolucion ? "orange" : undefined} />
              </Text>
            </Stack>
          </Group>

          {devolucion ? null : devuelta ? (
            <Badge color="gray" variant="light" size="lg">
              Devuelta
            </Badge>
          ) : confirmando ? (
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                ¿Devolver la venta por {fmtQ(venta.total, { decimals: 2 })}? Regresa el stock al inventario.
              </Text>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Button>
                <Button color="red" loading={devolviendo} onClick={() => onDevolver(venta)}>
                  Sí, devolver
                </Button>
              </Group>
            </Stack>
          ) : (
            <Group justify="flex-end">
              <Button variant="light" color="red" onClick={() => setConfirmando(true)}>
                Devolver venta
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
