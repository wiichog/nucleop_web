import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCreateErpMovement,
  useCreateErpProduct,
  useDeleteErpProduct,
  useDeleteProductImage,
  useErpProducts,
  useGymProductOrders,
  useRefundProductOrder,
  useUpdateErpProduct,
  useUpdateProductOrder,
  useUploadProductImages,
  useUploadProductPhoto,
} from "../api/hooks";
import type { ErpProduct, ProductOrder } from "../api/types";
import { NoGymAssigned } from "../components/PageStatus";
import { RowActions, type RowAction } from "../components/RowActions";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { sortRecords } from "../lib/sortRecords";

const CATEGORIES = [
  { value: "supplement", label: "Suplemento" },
  { value: "merch", label: "Merch / Ropa" },
  { value: "drink", label: "Bebida / Comida" },
  { value: "gear", label: "Equipamiento" },
  { value: "service", label: "Servicio" },
  { value: "other", label: "Otro" },
];

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pago pendiente", color: "yellow" },
  reserved: { label: "Apartado", color: "grape" },
  paid: { label: "Pagado", color: "teal" },
  delivered: { label: "Entregado", color: "blue" },
  cancelled: { label: "Cancelado", color: "gray" },
};

/** Cómo se anuncia el producto en la tienda de la app. */
function marketplaceBadge(p: ErpProduct) {
  if (!p.show_in_marketplace) return <Text c="dimmed" size="sm">—</Text>;
  if (p.is_upcoming)
    return (
      <Badge color="grape" variant="light">
        Próximamente{p.launch_date ? ` · ${p.launch_date}` : ""}
      </Badge>
    );
  if (p.delivery_days > 0)
    return (
      <Badge color="yellow" variant="light">
        Entrega en {p.delivery_days} {p.delivery_days === 1 ? "día" : "días"}
      </Badge>
    );
  return (
    <Badge color="teal" variant="light">
      Disponible
    </Badge>
  );
}

export function InventoryPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useErpProducts(gymId);
  const createProduct = useCreateErpProduct(gymId);
  const updateProduct = useUpdateErpProduct(gymId);
  const deleteProduct = useDeleteErpProduct(gymId);
  const createMovement = useCreateErpMovement(gymId);
  const uploadPhoto = useUploadProductPhoto(gymId);
  const orders = useGymProductOrders(gymId);
  const updateOrder = useUpdateProductOrder(gymId);
  const refundOrder = useRefundProductOrder(gymId);

  const onRefund = (o: ProductOrder) => {
    if (
      !window.confirm(
        `Devolver el pedido de ${o.athlete_name}. Se reembolsa Q${o.total} (precio del gym); el recargo de Nucleo NO se reembolsa. El dinero se entrega por fuera. ¿Continuar?`,
      )
    )
      return;
    refundOrder.mutate(o.id, {
      onSuccess: () =>
        notifications.show({ color: "teal", message: "Pedido devuelto; se registró el reembolso." }),
      onError: () => notifications.show({ color: "red", message: "No se pudo devolver el pedido." }),
    });
  };
  const [editing, setEditing] = useState<ErpProduct | null>(null);
  const [search, setSearch] = useState("");
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ErpProduct>>({
    columnAccessor: "name",
    direction: "asc",
  });

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
  // Tienda de la app (los mismos campos también se pueden editar después).
  const [inMarketplace, setInMarketplace] = useState(false);
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<number | string>(0);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [launchDate, setLaunchDate] = useState<Date | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // Receta (preparados/licuados).
  const [prepared, setPrepared] = useState(false);
  const [components, setComponents] = useState<{ component: string; qty: number }[]>([]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const created = await createProduct.mutateAsync({
      name,
      category: category ?? "other",
      sale_price: salePrice,
      cost_price: costPrice || "0",
      reorder_level: Number(reorder) || 0,
      show_in_marketplace: inMarketplace,
      description: description.trim(),
      sizes: category === "merch" ? sizes : [],
      colors: category === "merch" ? colors : [],
      delivery_days: Number(deliveryDays) || 0,
      is_upcoming: isUpcoming,
      launch_date: launchDate ? launchDate.toLocaleDateString("en-CA") : null,
      components: prepared ? components : [],
    });
    if (photoFile) await uploadPhoto.mutateAsync({ id: created.id, file: photoFile });
    setName("");
    setSalePrice("");
    setCostPrice("");
    setReorder(0);
    setInMarketplace(false);
    setDescription("");
    setSizes([]);
    setColors([]);
    setDeliveryDays(0);
    setIsUpcoming(false);
    setLaunchDate(null);
    setPhotoFile(null);
    setPrepared(false);
    setComponents([]);
    notifications.show({ color: "teal", message: "Producto creado." });
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
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} />
          <TextInput label="Precio venta (Q)" value={salePrice} onChange={(e) => setSalePrice(e.currentTarget.value)} />
          <TextInput label="Costo (Q)" value={costPrice} onChange={(e) => setCostPrice(e.currentTarget.value)} />
          <NumberInput label="Reorden" value={reorder} onChange={setReorder} min={0} />
        </SimpleGrid>

        {category === "merch" && (
          <>
            <Text size="sm" c="dimmed" mt="md">
              Es ropa/merch: agrega tallas y/o colores si aplica. El atleta los elige al comprar.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="xs">
              <TagsInput
                label="Tallas"
                description="Escribe y presiona Enter por cada talla"
                placeholder="S, M, L, XL…"
                value={sizes}
                onChange={setSizes}
              />
              <TagsInput
                label="Colores"
                description="Enter por cada color"
                placeholder="Negro, Naranja…"
                value={colors}
                onChange={setColors}
              />
            </SimpleGrid>
          </>
        )}

        <Switch
          label="Vender en la tienda de la app"
          description="Tus atletas lo verán y comprarán desde el marketplace del gym."
          checked={inMarketplace}
          onChange={(e) => setInMarketplace(e.currentTarget.checked)}
          mt="md"
        />
        {inMarketplace && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
              <Textarea
                label="Descripción"
                placeholder="Material, beneficios, sabor…"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              <FileInput
                label="Foto del producto"
                placeholder="Subir imagen"
                accept="image/*"
                value={photoFile}
                onChange={setPhotoFile}
                clearable
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="sm">
              <NumberInput
                label="Días de entrega"
                description="0 = disponible de inmediato"
                value={deliveryDays}
                onChange={setDeliveryDays}
                min={0}
                max={120}
              />
              <Switch
                label="Próximo lanzamiento (se puede apartar)"
                checked={isUpcoming}
                onChange={(e) => setIsUpcoming(e.currentTarget.checked)}
              />
              <DateInput
                label="Fecha de lanzamiento"
                value={launchDate}
                onChange={setLaunchDate}
                valueFormat="YYYY-MM-DD"
                disabled={!isUpcoming}
                clearable
                popoverProps={{ withinPortal: true }}
              />
            </SimpleGrid>
          </>
        )}
        <Switch
          label="Es un preparado (receta)"
          description="Ej. licuado: al venderlo se descuentan sus insumos, no el preparado."
          checked={prepared}
          onChange={(e) => setPrepared(e.currentTarget.checked)}
          mt="md"
        />
        {prepared && (
          <RecipeFields
            products={data ?? []}
            value={components}
            onChange={setComponents}
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button type="submit" disabled={!name || !salePrice} loading={createProduct.isPending || uploadPhoto.isPending}>
            Agregar producto
          </Button>
        </Group>
      </Card>

      <Card>
        <TextInput
          placeholder="Buscar producto o categoría…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
          w={{ base: "100%", sm: 300 }}
        />
        <DataTable<ErpProduct>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="id"
          records={sortRecords(
            (data ?? []).filter((p) => {
              const term = search.trim().toLowerCase();
              return !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
            }),
            sortStatus,
          )}
          fetching={isLoading}
          noRecordsText="Agrega tu primer producto (suplemento, merch o bebida) para vender en recepción."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            {
              accessor: "name",
              title: "Producto",
              sortable: true,
              render: (p) => (
                <Group gap="sm" wrap="nowrap">
                  {p.photo && (
                    <img
                      src={p.photo}
                      alt={p.name}
                      style={{ width: 42, height: 32, objectFit: "cover", borderRadius: 6 }}
                    />
                  )}
                  <Text size="sm" fw={600}>
                    {p.name}
                  </Text>
                </Group>
              ),
            },
            { accessor: "category", title: "Categoría", sortable: true },
            {
              accessor: "show_in_marketplace",
              title: "Tienda (app)",
              sortable: true,
              render: (p) => marketplaceBadge(p),
            },
            { accessor: "sale_price", title: "Precio", sortable: true, render: (p) => `Q${p.sale_price}` },
            { accessor: "cost_price", title: "Costo", sortable: true, render: (p) => `Q${p.cost_price}` },
            { accessor: "margin_unit", title: "Margen", render: (p) => `Q${p.margin_unit}` },
            {
              accessor: "stock_qty",
              title: "Stock",
              sortable: true,
              render: (p) => (
                <Text c={p.needs_reorder ? "red" : undefined} size="sm">
                  {p.stock_qty}
                  {p.needs_reorder ? " ⚠" : ""}
                </Text>
              ),
            },
            {
              accessor: "restock",
              title: "Reabastecer",
              render: (p) => (
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
              ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (p) => (
                <RowActions
                  actions={[
                    { label: "Editar", onClick: () => setEditing(p) },
                    { label: "Eliminar", color: "red", variant: "light", onClick: () => onDelete(p) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card mt="lg">
        <Title order={3} mb={4}>
          Pedidos de la tienda
        </Title>
        <Text c="dimmed" size="sm" mb="md">
          Compras y apartados que tus atletas hacen desde la app. Marca “Entregado” al despachar.
        </Text>
        <DataTable<ProductOrder>
          minHeight={140}
          highlightOnHover
          striped
          idAccessor="id"
          records={orders.data ?? []}
          fetching={orders.isLoading}
          noRecordsText="Sin pedidos todavía. Activa productos en la tienda para que tus atletas compren desde la app."
          columns={[
            { accessor: "athlete_name", title: "Atleta" },
            {
              accessor: "product_name",
              title: "Producto",
              render: (o) => (
                <div>
                  <Text size="sm" fw={600}>
                    {o.product_name} × {o.qty}
                  </Text>
                  {(o.size || o.color) && (
                    <Text c="dimmed" size="xs">
                      {[o.size && `Talla ${o.size}`, o.color].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </div>
              ),
            },
            { accessor: "total", title: "Total", render: (o) => `Q${o.total}` },
            {
              accessor: "kind",
              title: "Tipo",
              render: (o) => (o.kind === "preorder" ? "Apartado" : "Compra"),
            },
            {
              accessor: "status",
              title: "Estado",
              render: (o) => {
                const s = ORDER_STATUS[o.status] ?? { label: o.status, color: "gray" };
                return (
                  <Badge color={s.color} variant="light">
                    {s.label}
                  </Badge>
                );
              },
            },
            {
              accessor: "created_at",
              title: "Fecha",
              render: (o) => new Date(o.created_at).toLocaleString("es-GT"),
            },
            {
              accessor: "actions",
              title: "",
              render: (o) => {
                const actions: RowAction[] = [];
                if (["paid", "reserved"].includes(o.status)) {
                  actions.push({
                    label: "Entregado",
                    variant: "filled" as const,
                    loading: updateOrder.isPending && updateOrder.variables?.id === o.id,
                    onClick: () => updateOrder.mutate({ id: o.id, status: "delivered" as const }),
                  });
                  actions.push({
                    label: "Cancelar",
                    variant: "subtle" as const,
                    color: "red",
                    onClick: () => updateOrder.mutate({ id: o.id, status: "cancelled" as const }),
                  });
                }
                // Devolución solo para pedidos pagados (incluye ya entregados).
                if (["paid", "delivered"].includes(o.status)) {
                  actions.push({
                    label: "Devolver",
                    variant: "subtle" as const,
                    color: "orange",
                    loading: refundOrder.isPending && refundOrder.variables === o.id,
                    onClick: () => onRefund(o),
                  });
                }
                return actions.length ? <RowActions actions={actions} /> : null;
              },
            },
          ]}
        />
      </Card>

      <EditProductModal
        product={editing ? (data ?? []).find((p) => p.id === editing.id) ?? editing : null}
        products={data ?? []}
        gymId={gymId}
        saving={updateProduct.isPending || uploadPhoto.isPending}
        onClose={() => setEditing(null)}
        onSave={async (body, photo) => {
          if (!editing) return;
          try {
            await updateProduct.mutateAsync({ id: editing.id, body });
            if (photo) await uploadPhoto.mutateAsync({ id: editing.id, file: photo });
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
  products,
  gymId,
  saving,
  onClose,
  onSave,
}: {
  product: ErpProduct | null;
  products: ErpProduct[];
  gymId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (body: Partial<ErpProduct>, photo: File | null) => Promise<void>;
}) {
  const uploadImages = useUploadProductImages(gymId);
  const deleteImage = useDeleteProductImage(gymId);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>("supplement");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorder, setReorder] = useState<number | string>(0);
  // Tienda en la app
  const [inMarketplace, setInMarketplace] = useState(false);
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<number | string>(0);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [launchDate, setLaunchDate] = useState<Date | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [components, setComponents] = useState<{ component: string; qty: number }[]>([]);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (product && hydratedFor !== product.id) {
    setHydratedFor(product.id);
    setName(product.name);
    setCategory(product.category);
    setSalePrice(String(product.sale_price ?? ""));
    setCostPrice(String(product.cost_price ?? ""));
    setReorder(product.reorder_level ?? 0);
    setInMarketplace(product.show_in_marketplace ?? false);
    setDescription(product.description ?? "");
    setSizes(product.sizes ?? []);
    setColors(product.colors ?? []);
    setDeliveryDays(product.delivery_days ?? 0);
    setIsUpcoming(product.is_upcoming ?? false);
    setLaunchDate(product.launch_date ? new Date(`${product.launch_date}T00:00:00`) : null);
    setPhoto(null);
    setPrepared((product.components ?? []).length > 0);
    setComponents((product.components ?? []).map((c) => ({ component: c.component, qty: c.qty })));
  }

  return (
    <Modal opened={!!product} onClose={onClose} title="Editar producto" centered size="lg">
      <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} mb="sm" />
      <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} mb="sm" />
      <Group grow mb="sm">
        <TextInput label="Precio venta (Q)" value={salePrice} onChange={(e) => setSalePrice(e.currentTarget.value)} />
        <TextInput label="Costo (Q)" value={costPrice} onChange={(e) => setCostPrice(e.currentTarget.value)} />
        <NumberInput label="Nivel de reorden" value={reorder} onChange={setReorder} min={0} />
      </Group>

      {category === "merch" && (
        <>
          <Text size="sm" c="dimmed">
            Ropa/merch: agrega tallas y/o colores si aplica.
          </Text>
          <Group grow my="sm">
            <TagsInput
              label="Tallas"
              description="Enter para agregar cada talla"
              placeholder="S, M, L, XL…"
              value={sizes}
              onChange={setSizes}
            />
            <TagsInput
              label="Colores"
              description="Enter para agregar cada color"
              placeholder="Negro, Naranja…"
              value={colors}
              onChange={setColors}
            />
          </Group>
        </>
      )}

      <Switch
        label="Vender en la tienda de la app"
        description="El producto aparece en el marketplace del gym para tus atletas."
        checked={inMarketplace}
        onChange={(e) => setInMarketplace(e.currentTarget.checked)}
        my="md"
      />
      {inMarketplace && (
        <>
          <Textarea
            label="Descripción"
            placeholder="Material, beneficios, sabor…"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            mb="sm"
          />
          <Group grow mb="sm" align="flex-end">
            <NumberInput
              label="Días de entrega"
              description="0 = disponible de inmediato"
              value={deliveryDays}
              onChange={setDeliveryDays}
              min={0}
              max={120}
            />
            <Switch
              label="Próximo lanzamiento (se puede apartar)"
              checked={isUpcoming}
              onChange={(e) => setIsUpcoming(e.currentTarget.checked)}
            />
            <DateInput
              label="Fecha de lanzamiento"
              value={launchDate}
              onChange={setLaunchDate}
              valueFormat="YYYY-MM-DD"
              disabled={!isUpcoming}
              clearable
              popoverProps={{ withinPortal: true }}
            />
          </Group>
          {product?.photo && !photo && (
            <Group gap="sm" mb="xs">
              <img
                src={product.photo}
                alt={product.name}
                style={{ width: 86, height: 56, objectFit: "cover", borderRadius: 8 }}
              />
              <Text c="dimmed" size="xs">
                Foto actual — sube otra para reemplazarla.
              </Text>
            </Group>
          )}
          <FileInput
            label="Foto del producto"
            placeholder="Subir imagen"
            accept="image/*"
            value={photo}
            onChange={setPhoto}
            clearable
            mb="sm"
          />
        </>
      )}

      <Switch
        label="Es un preparado (receta)"
        description="Ej. licuado: al venderlo se descuentan sus insumos, no el preparado."
        checked={prepared}
        onChange={(e) => setPrepared(e.currentTarget.checked)}
        my="md"
      />
      {prepared && (
        <RecipeFields
          products={products}
          selfId={product?.id}
          value={components}
          onChange={setComponents}
        />
      )}

      {product && (
        <>
          <Text fw={600} mt="md">
            Galería de imágenes
          </Text>
          <Text c="dimmed" size="xs" mb="sm">
            Fotos adicionales del producto (además de la portada). Se muestran en el detalle en la app.
          </Text>
          {(product.images ?? []).length > 0 && (
            <Group gap="xs" mb="sm">
              {(product.images ?? []).map((im) => (
                <div key={im.id} style={{ position: "relative" }}>
                  <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
                  <Button
                    size="xs"
                    color="red"
                    variant="filled"
                    px={6}
                    style={{ position: "absolute", top: -8, right: -8, height: 22, borderRadius: 999 }}
                    loading={deleteImage.isPending && deleteImage.variables?.imageId === im.id}
                    onClick={() => deleteImage.mutate({ id: product.id, imageId: im.id })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </Group>
          )}
          <Group align="flex-end" gap="sm">
            <FileInput
              label="Agregar imágenes"
              placeholder="Una o varias…"
              accept="image/*"
              multiple
              value={galleryFiles}
              onChange={(v) => setGalleryFiles(v as File[])}
              clearable
              style={{ flex: 1 }}
            />
            <Button
              variant="default"
              disabled={!galleryFiles.length}
              loading={uploadImages.isPending}
              onClick={async () => {
                await uploadImages.mutateAsync({ id: product.id, files: galleryFiles });
                setGalleryFiles([]);
                notifications.show({ color: "teal", message: "Imágenes agregadas." });
              }}
            >
              Subir
            </Button>
          </Group>
        </>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name || !salePrice}
          loading={saving}
          onClick={() =>
            onSave(
              {
                name,
                category: category ?? "other",
                sale_price: salePrice,
                cost_price: costPrice || "0",
                reorder_level: Number(reorder) || 0,
                show_in_marketplace: inMarketplace,
                description,
                sizes: category === "merch" ? sizes : [],
                colors: category === "merch" ? colors : [],
                delivery_days: Number(deliveryDays) || 0,
                is_upcoming: isUpcoming,
                launch_date: launchDate ? launchDate.toLocaleDateString("en-CA") : null,
                components: prepared ? components : [],
              },
              photo,
            )
          }
        >
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}

/** Editor de receta (insumos) de un producto preparado, p. ej. un licuado. */
function RecipeFields({
  products,
  selfId,
  value,
  onChange,
}: {
  products: ErpProduct[];
  selfId?: string;
  value: { component: string; qty: number }[];
  onChange: (v: { component: string; qty: number }[]) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState<number | string>(1);

  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const options = products
    .filter((p) => p.id !== selfId && !value.some((c) => c.component === p.id))
    .map((p) => ({ value: p.id, label: `${p.name} (stock ${p.stock_qty})` }));

  const add = () => {
    if (!pick) return;
    onChange([...value, { component: pick, qty: Number(qty) || 1 }]);
    setPick(null);
    setQty(1);
  };

  return (
    <div>
      <Text size="sm" c="dimmed" mb={6}>
        Insumos que se descuentan del inventario al vender 1 unidad. El COGS del preparado
        se calcula de la receta.
      </Text>
      {value.map((c, i) => (
        <Group key={c.component} gap="xs" mb={6} wrap="nowrap">
          <Text size="sm" style={{ flex: 1 }}>
            {nameOf(c.component)}
          </Text>
          <NumberInput
            w={90}
            min={1}
            value={c.qty}
            onChange={(v) =>
              onChange(value.map((x, idx) => (idx === i ? { ...x, qty: Number(v) || 1 } : x)))
            }
          />
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            Quitar
          </Button>
        </Group>
      ))}
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          placeholder="Agregar insumo…"
          data={options}
          value={pick}
          onChange={setPick}
          searchable
          style={{ flex: 1 }}
        />
        <NumberInput w={90} min={1} value={qty} onChange={setQty} />
        <Button variant="default" size="sm" onClick={add} disabled={!pick}>
          Añadir
        </Button>
      </Group>
    </div>
  );
}
