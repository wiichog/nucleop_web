import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useCreateErpMovement,
  useCreateErpProduct,
  useDeleteErpProduct,
  useErpProducts,
  useUpdateErpProduct,
} from "../api/hooks";
import type { ErpProduct } from "../api/types";
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
  const updateProduct = useUpdateErpProduct(gymId);
  const deleteProduct = useDeleteErpProduct(gymId);
  const createMovement = useCreateErpMovement(gymId);
  const [editing, setEditing] = useState<ErpProduct | null>(null);

  const onDelete = (p: ErpProduct) => {
    if (!window.confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    deleteProduct
      .mutateAsync(p.id)
      .then(() => notifications.show({ color: "teal", message: "Producto eliminado." }))
      .catch(() => notifications.show({ color: "red", message: "No se pudo eliminar." }));
  };

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
                  <Table.Th>Acciones</Table.Th>
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
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button variant="default" size="xs" onClick={() => setEditing(p)}>
                          Editar
                        </Button>
                        <Button variant="light" color="red" size="xs" onClick={() => onDelete(p)}>
                          Eliminar
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

      <EditProductModal
        product={editing}
        saving={updateProduct.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body) => {
          if (!editing) return;
          try {
            await updateProduct.mutateAsync({ id: editing.id, body });
            notifications.show({ color: "teal", message: "Producto actualizado." });
            setEditing(null);
          } catch {
            notifications.show({ color: "red", message: "No se pudo actualizar." });
          }
        }}
      />
    </div>
  );
}

function EditProductModal({
  product,
  saving,
  onClose,
  onSave,
}: {
  product: ErpProduct | null;
  saving: boolean;
  onClose: () => void;
  onSave: (body: Partial<ErpProduct>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>("supplement");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorder, setReorder] = useState<number | string>(0);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (product && hydratedFor !== product.id) {
    setHydratedFor(product.id);
    setName(product.name);
    setCategory(product.category);
    setSalePrice(String(product.sale_price ?? ""));
    setCostPrice(String(product.cost_price ?? ""));
    setReorder(product.reorder_level ?? 0);
  }

  return (
    <Modal opened={!!product} onClose={onClose} title="Editar producto" centered>
      <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
      <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} mb="sm" />
      <Group grow mb="sm">
        <TextInput label="Precio venta (Q)" value={salePrice} onChange={(e) => setSalePrice(e.currentTarget.value)} />
        <TextInput label="Costo (Q)" value={costPrice} onChange={(e) => setCostPrice(e.currentTarget.value)} />
      </Group>
      <NumberInput label="Nivel de reorden" value={reorder} onChange={setReorder} min={0} mb="md" />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name || !salePrice}
          loading={saving}
          onClick={() =>
            onSave({
              name,
              category: category ?? "other",
              sale_price: salePrice,
              cost_price: costPrice || "0",
              reorder_level: Number(reorder) || 0,
            })
          }
        >
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}
