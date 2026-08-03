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
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import { useSearchParams } from "react-router-dom";
import {
  useCreateErpMovement,
  useCreateErpProduct,
  useDeleteErpProduct,
  useDeleteProductImage,
  useErpProducts,
  usePendingSummary,
  useUpdateErpProduct,
  useUploadProductImages,
  useUploadProductPhoto,
} from "../api/hooks";
import type { ErpProduct } from "../api/types";
import { InventoryValuationPanel } from "./InventoryValuationPanel";
import { PurchaseOrdersPanel } from "./PurchaseOrdersPanel";
import { StoreOrdersPanel } from "./StoreOrdersPanel";
import { SuppliersPanel } from "./SuppliersPanel";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { CountBadge, Money, PageHeader, SectionLabel } from "../components/ui";
import { GlassCard, Reveal } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { sortRecords } from "../lib/sortRecords";

const CATEGORIES = [
  { value: "supplement", label: "Suplemento" },
  { value: "merch", label: "Merch / Ropa" },
  { value: "drink", label: "Bebida / Comida" },
  { value: "gear", label: "Equipamiento" },
  { value: "service", label: "Servicio" },
  { value: "other", label: "Otro" },
];

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
  const productsQuery = useErpProducts(gymId);
  const { data, isLoading } = productsQuery;
  const createProduct = useCreateErpProduct(gymId);
  const updateProduct = useUpdateErpProduct(gymId);
  const deleteProduct = useDeleteErpProduct(gymId);
  const createMovement = useCreateErpMovement(gymId);
  const uploadPhoto = useUploadProductPhoto(gymId);
  const pendientes = usePendingSummary(gymId);
  // La pestaña vive en la URL: así el badge de «pedidos por entregar» y cualquier
  // enlace pueden abrir directamente la vista que resuelve el pendiente.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "productos";

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
    // Sin catch, un rechazo del backend (precio inválido, receta incompleta) se
    // tragaba el error y el formulario se quedaba quieto sin decir nada.
    try {
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
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el producto.") });
    }
  };

  const onRestock = async (productId: string) => {
    const qty = parseInt(restock[productId] ?? "", 10);
    if (!Number.isFinite(qty) || qty <= 0) return;
    try {
      await createMovement.mutateAsync({ product_id: productId, type: "purchase", qty });
      setRestock((prev) => ({ ...prev, [productId]: "" }));
      notifications.show({ color: "teal", message: "Entrada de inventario registrada." });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo registrar la entrada de inventario."),
      });
    }
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Negocio · ERP"
        title="Inventario"
        subtitle="Catálogo y stock, compras a proveedor y cuánto dinero tienes parado en bodega."
      />
      {/* `keepMounted={false}`: cada pestaña dispara sus queries solo al abrirla. */}
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v && v !== "productos" ? { tab: v } : {}, { replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb="lg">
          <Tabs.Tab value="productos">Productos</Tabs.Tab>
          <Tabs.Tab value="compras">Compras a proveedor</Tabs.Tab>
          <Tabs.Tab value="proveedores">Proveedores</Tabs.Tab>
          <Tabs.Tab value="valuacion">Valuación</Tabs.Tab>
          <Tabs.Tab
            value="pedidos"
            rightSection={<CountBadge count={pendientes.data?.pedidos ?? 0} size="xs" />}
          >
            Pedidos de la tienda
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="productos">
      {/* Un fallo de carga se veía como "catálogo vacío": el gym volvía a crear
          productos que ya existían y el stock quedaba duplicado. */}
      {productsQuery.isError && (
        <PageError
          message="No se pudo cargar el catálogo de productos."
          onRetry={() => productsQuery.refetch()}
        />
      )}
      {/* El alta entra con la primera tanda de tarjetas (0.6s del ritmo Aurora). */}
      <Reveal anim="slide-r" delay={0.6}>
      <Card mb="lg" component="form" onSubmit={onCreate}>
        <SectionLabel as="h2" mb="sm">Nuevo producto</SectionLabel>
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
      </Reveal>

      <SectionLabel as="h2" mb="xs">Catálogo · stock actual</SectionLabel>
      <GlassCard padding={14} delay={0.72}>
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
                      style={{
                        width: "calc(42 * var(--u))",
                        height: "calc(32 * var(--u))",
                        objectFit: "cover",
                        borderRadius: "calc(8 * var(--u))",
                        border: "1px solid var(--a-line)",
                      }}
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
            {
              accessor: "sale_price",
              title: "Precio",
              sortable: true,
              textAlign: "right",
              render: (p) => <Money value={p.sale_price} decimals={2} block />,
            },
            {
              accessor: "cost_price",
              title: "Costo",
              sortable: true,
              textAlign: "right",
              render: (p) => <Money value={p.cost_price} decimals={2} block />,
            },
            {
              accessor: "margin_unit",
              title: "Margen",
              textAlign: "right",
              render: (p) => <Money value={p.margin_unit} decimals={2} block />,
            },
            {
              accessor: "stock_qty",
              title: "Stock",
              sortable: true,
              textAlign: "right",
              render: (p) => (
                <Text c={p.needs_reorder ? "red" : undefined} size="sm" className="a-tabular">
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
      </GlassCard>
        </Tabs.Panel>

        <Tabs.Panel value="compras">
          <PurchaseOrdersPanel gymId={gymId} />
        </Tabs.Panel>

        <Tabs.Panel value="proveedores">
          <SuppliersPanel gymId={gymId} />
        </Tabs.Panel>

        <Tabs.Panel value="valuacion">
          <InventoryValuationPanel gymId={gymId} />
        </Tabs.Panel>

        <Tabs.Panel value="pedidos">
          <StoreOrdersPanel gymId={gymId} />
        </Tabs.Panel>
      </Tabs>

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
                style={{
                  width: "calc(86 * var(--u))",
                  height: "calc(56 * var(--u))",
                  objectFit: "cover",
                  borderRadius: "calc(12 * var(--u))",
                  border: "1px solid var(--a-line)",
                }}
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
          <SectionLabel as="h2" mt="md" mb={6}>
            Galería de imágenes
          </SectionLabel>
          <Text c="dimmed" size="xs" mb="sm">
            Fotos adicionales del producto (además de la portada). Se muestran en el detalle en la app.
          </Text>
          {(product.images ?? []).length > 0 && (
            <Group gap="xs" mb="sm">
              {(product.images ?? []).map((im) => (
                <div key={im.id} style={{ position: "relative" }}>
                  <img
                    src={im.url}
                    alt=""
                    style={{
                      width: "calc(72 * var(--u))",
                      height: "calc(72 * var(--u))",
                      objectFit: "cover",
                      borderRadius: "calc(12 * var(--u))",
                      border: "1px solid var(--a-line)",
                    }}
                  />
                  <Button
                    size="xs"
                    color="red"
                    variant="filled"
                    px={6}
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      height: "calc(22 * var(--u))",
                      borderRadius: "var(--radius-pill)",
                    }}
                    loading={deleteImage.isPending && deleteImage.variables?.imageId === im.id}
                    onClick={() => deleteImage.mutate({ id: product.id, imageId: im.id })}
                    aria-label="Quitar imagen"
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
