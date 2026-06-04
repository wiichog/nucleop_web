import { FormEvent, useState } from "react";
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
import { useCreateErpMovement, useCreateErpProduct, useErpProducts } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const CATEGORIES = [
  { value: "supplement", label: "Suplemento" },
  { value: "merch", label: "Merch" },
  { value: "drink", label: "Bebida" },
  { value: "gear", label: "Equipamiento" },
  { value: "service", label: "Servicio" },
  { value: "other", label: "Otro" },
];

export function InventoryPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useErpProducts(gymId);
  const createProduct = useCreateErpProduct(gymId);
  const createMovement = useCreateErpMovement(gymId);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>("supplement");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorder, setReorder] = useState<number | string>(0);
  const [restock, setRestock] = useState<Record<string, string>>({});

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    await createProduct.mutateAsync({
      name,
      category: category ?? "other",
      sale_price: salePrice,
      cost_price: costPrice || "0",
      reorder_level: Number(reorder) || 0,
    });
    setName("");
    setSalePrice("");
    setCostPrice("");
    setReorder(0);
  };

  const onRestock = async (productId: string) => {
    const qty = parseInt(restock[productId] ?? "", 10);
    if (!Number.isFinite(qty) || qty <= 0) return;
    await createMovement.mutateAsync({ product_id: productId, type: "purchase", qty });
    setRestock((prev) => ({ ...prev, [productId]: "" }));
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Productos para venta en recepción y su stock." />
      <Card mb="lg" component="form" onSubmit={onCreate}>
        <Title order={3} mb="sm">
          Nuevo producto
        </Title>
        <Group align="flex-end" gap="md">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} />
          <TextInput label="Precio venta (Q)" value={salePrice} onChange={(e) => setSalePrice(e.currentTarget.value)} w={130} />
          <TextInput label="Costo (Q)" value={costPrice} onChange={(e) => setCostPrice(e.currentTarget.value)} w={120} />
          <NumberInput label="Reorden" value={reorder} onChange={setReorder} w={100} min={0} />
          <Button type="submit" disabled={!name || !salePrice} loading={createProduct.isPending}>
            Agregar
          </Button>
        </Group>
      </Card>

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState
            title="Sin productos"
            description="Agrega tu primer producto (suplemento, merch o bebida) para vender en recepción."
          />
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Costo</Table.Th>
                  <Table.Th>Margen</Table.Th>
                  <Table.Th>Stock</Table.Th>
                  <Table.Th>Reabastecer</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(data ?? []).map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td>{p.category}</Table.Td>
                    <Table.Td>Q{p.sale_price}</Table.Td>
                    <Table.Td>Q{p.cost_price}</Table.Td>
                    <Table.Td>Q{p.margin_unit}</Table.Td>
                    <Table.Td>
                      <Text c={p.needs_reorder ? "red" : undefined} size="sm">
                        {p.stock_qty}
                        {p.needs_reorder ? " ⚠" : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <TextInput
                          w={70}
                          placeholder="Qty"
                          value={restock[p.id] ?? ""}
                          onChange={(e) => setRestock((prev) => ({ ...prev, [p.id]: e.currentTarget.value }))}
                        />
                        <Button variant="default" size="xs" onClick={() => onRestock(p.id)} loading={createMovement.isPending}>
                          Entrada
                        </Button>
                      </Group>
                    </Table.Td>
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
