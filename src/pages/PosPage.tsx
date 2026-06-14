import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useBranches,
  useCreateErpSale,
  useErpProducts,
  useErpSales,
  useMemberships,
  useReturnErpSale,
} from "../api/hooks";
import type { ErpSale } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

interface CartLine {
  product_id: string;
  name: string;
  qty: number;
  unit_price: string;
}

export function PosPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data: products, isLoading } = useErpProducts(gymId);
  const { data: sales } = useErpSales(gymId);
  const { data: branches } = useBranches(gymId);
  const { data: members } = useMemberships(gymId);
  const createSale = useCreateErpSale(gymId);
  const returnSale = useReturnErpSale(gymId);

  const onReturn = (s: ErpSale) => {
    if (!window.confirm(`¿Devolver la venta por Q${s.total}? Regresa el stock al inventario.`)) return;
    returnSale
      .mutateAsync({ id: s.id })
      .then(() => notifications.show({ color: "teal", message: "Devolución registrada." }))
      .catch((e: unknown) => {
        const detail =
          typeof e === "object" && e !== null && "response" in e
            ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : undefined;
        notifications.show({ color: "red", message: detail ?? "No se pudo registrar la devolución." });
      });
  };

  const athleteOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const m of members ?? []) {
      if (m.athlete && !seen.has(m.athlete)) {
        seen.add(m.athlete);
        opts.push({ value: m.athlete, label: m.athlete_name || m.athlete.slice(0, 8) });
      }
    }
    return opts;
  }, [members]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState<string | null>("");
  const [qty, setQty] = useState<number | string>(1);
  const [athleteId, setAthleteId] = useState("");
  const [branchId, setBranchId] = useState<string | null>("");
  const [method, setMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [error, setError] = useState("");

  const total = useMemo(() => cart.reduce((acc, l) => acc + Number(l.unit_price) * l.qty, 0), [cart]);

  const addLine = () => {
    const product = (products ?? []).find((p) => p.id === productId);
    const q = Number(qty);
    if (!product || !Number.isFinite(q) || q <= 0) return;
    setCart((prev) => [...prev, { product_id: product.id, name: product.name, qty: q, unit_price: product.sale_price }]);
    setProductId("");
    setQty(1);
  };

  const submit = async () => {
    setError("");
    try {
      await createSale.mutateAsync({
        athlete_id: athleteId.trim() || null,
        branch_id: branchId || null,
        method,
        lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      });
      setCart([]);
      setAthleteId("");
    } catch (e: unknown) {
      const data =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: unknown } }).response?.data
          : undefined;
      // El mensaje SIEMPRE debe ser string (renderizar un objeto tronaba el panel).
      let msg = "No se pudo registrar la venta.";
      if (typeof data === "string") {
        msg = data;
      } else if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (typeof d.detail === "string") msg = d.detail;
        else if (Array.isArray(d.detail) && typeof d.detail[0] === "string") msg = d.detail[0];
        else if (typeof d.qty === "string") msg = d.qty;
        else if (Array.isArray(d.qty) && typeof d.qty[0] === "string") msg = d.qty[0];
      }
      setError(msg);
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Punto de venta (recepción)" subtitle="Registra ventas de productos y servicios." />

      <Card mb="lg">
        <Title order={3} mb="sm">
          Nueva venta
        </Title>
        <Group align="flex-end" gap="md" mb="md">
          <Select
            label="Producto"
            placeholder="Selecciona producto…"
            value={productId}
            onChange={setProductId}
            searchable
            style={{ flex: 1, minWidth: 200 }}
            data={(products ?? [])
              .filter((p) => p.is_active)
              .map((p) => ({ value: p.id, label: `${p.name} — Q${p.sale_price} (stock ${p.stock_qty})` }))}
          />
          <NumberInput label="Cantidad" value={qty} onChange={setQty} w={100} min={1} />
          <Button variant="default" onClick={addLine} disabled={!productId}>
            Añadir
          </Button>
        </Group>

        {cart.length === 0 ? (
          <EmptyState title="Carrito vacío" description="Añade productos para registrar la venta." />
        ) : (
          <Table.ScrollContainer minWidth={480}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cant.</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Subtotal</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cart.map((l, i) => (
                <Table.Tr key={`${l.product_id}-${i}`}>
                  <Table.Td>{l.name}</Table.Td>
                  <Table.Td>{l.qty}</Table.Td>
                  <Table.Td>Q{l.unit_price}</Table.Td>
                  <Table.Td>Q{(Number(l.unit_price) * l.qty).toFixed(2)}</Table.Td>
                  <Table.Td>
                    <Button variant="subtle" color="red" size="xs" onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))}>
                      Quitar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Table.ScrollContainer>
        )}

        <Stack gap="md" mt="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <Select
              label="Atleta (opcional)"
              placeholder="Venta anónima si vacío"
              value={athleteId || null}
              onChange={(v) => setAthleteId(v ?? "")}
              data={athleteOptions}
              searchable
              clearable
              nothingFoundMessage="Sin coincidencias"
            />
            {(branches ?? []).length > 0 && (
              <Select
                label="Sede"
                placeholder="Sin sede"
                value={branchId}
                onChange={setBranchId}
                clearable
                data={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <Select
              label="Método"
              value={method}
              onChange={(v) => setMethod((v as typeof method) ?? "cash")}
              data={[
                { value: "cash", label: "Efectivo" },
                { value: "card", label: "Tarjeta" },
                { value: "bank_transfer", label: "Transferencia" },
              ]}
            />
          </SimpleGrid>
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={700} fz="lg" ff='"Space Grotesk", sans-serif'>
              Total: Q{total.toFixed(2)}
            </Text>
            <Button onClick={submit} disabled={cart.length === 0} loading={createSale.isPending}>
              Registrar venta
            </Button>
          </Group>
        </Stack>
        {error && (
          <Text c="red" size="sm" mt="sm">
            {error}
          </Text>
        )}
      </Card>

      <Card>
        <Title order={3} mb="sm">
          Ventas recientes
        </Title>
        {!(sales ?? []).length ? (
          <EmptyState title="Aún no hay ventas" description="Las ventas POS aparecerán aquí." />
        ) : (
          <Table.ScrollContainer minWidth={620}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Productos</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Margen</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(sales ?? []).map((s) => {
                  const esDevolucion = !!s.return_of || Number(s.total) < 0;
                  return (
                    <Table.Tr key={s.id}>
                      <Table.Td>{new Date(s.created_at).toLocaleString("es-GT")}</Table.Td>
                      <Table.Td>
                        {esDevolucion && (
                          <Text span c="orange" fw={600} mr={6}>
                            Devolución ·
                          </Text>
                        )}
                        {s.lines.map((l) => `${l.product_name} ×${Math.abs(l.qty)}`).join(", ")}
                      </Table.Td>
                      <Table.Td>Q{s.total}</Table.Td>
                      <Table.Td>Q{s.margin}</Table.Td>
                      <Table.Td>
                        {!esDevolucion && (
                          <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            loading={returnSale.isPending && returnSale.variables?.id === s.id}
                            onClick={() => onReturn(s)}
                          >
                            Devolver
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </div>
  );
}
