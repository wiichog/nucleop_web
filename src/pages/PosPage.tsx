import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useBranches, useCreateErpSale, useErpProducts, useErpSales } from "../api/hooks";
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
  const createSale = useCreateErpSale(gymId);

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
      const detail =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { detail?: string; qty?: string } } }).response?.data
          : undefined;
      setError(detail?.detail ?? detail?.qty ?? "No se pudo registrar la venta.");
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
            style={{ flex: 1, minWidth: 260 }}
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
        )}

        <Group align="flex-end" gap="md" mt="md">
          <TextInput
            label="ID de atleta (opcional)"
            placeholder="Venta anónima si vacío"
            value={athleteId}
            onChange={(e) => setAthleteId(e.currentTarget.value)}
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
          <Text fw={700} fz="lg" style={{ marginLeft: "auto" }} ff='"Space Grotesk", sans-serif'>
            Total: Q{total.toFixed(2)}
          </Text>
          <Button onClick={submit} disabled={cart.length === 0} loading={createSale.isPending}>
            Registrar venta
          </Button>
        </Group>
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(sales ?? []).map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>{new Date(s.created_at).toLocaleString("es-GT")}</Table.Td>
                    <Table.Td>{s.lines.map((l) => `${l.product_name} ×${l.qty}`).join(", ")}</Table.Td>
                    <Table.Td>Q{s.total}</Table.Td>
                    <Table.Td>Q{s.margin}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </div>
  );
}
