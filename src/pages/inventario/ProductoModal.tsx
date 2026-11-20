import { useState } from "react";
import {
  ActionIcon,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { Trash2, X } from "lucide-react";
import {
  useCreateErpProduct,
  useDeleteProductImage,
  useUpdateErpProduct,
  useUploadProductImages,
  useUploadProductPhoto,
} from "../../api/hooks";
import type { ErpProduct } from "../../api/types";
import { errMsg } from "../../lib/errors";
import { CATEGORIES } from "./catalogo";

type Componente = { component: string; qty: number };

const fechaIso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);

/**
 * Alta y edición del producto en la MISMA ventana (`"nuevo"` = alta). La galería
 * solo existe al editar: necesita el producto ya creado para colgarle fotos.
 */
export function ProductoModal({
  producto,
  productos,
  gymId,
  onClose,
}: {
  producto: ErpProduct | "nuevo" | null;
  productos: ErpProduct[];
  gymId: string;
  onClose: () => void;
}) {
  const crear = useCreateErpProduct(gymId);
  const actualizar = useUpdateErpProduct(gymId);
  const subirFoto = useUploadProductPhoto(gymId);
  const existente = producto && producto !== "nuevo" ? producto : null;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>("supplement");
  // NumberInput entrega número o texto; a la API se le sigue mandando texto (ver `cuerpo`).
  const [salePrice, setSalePrice] = useState<number | string>("");
  const [costPrice, setCostPrice] = useState<number | string>("");
  const [reorder, setReorder] = useState<number | string>(0);
  const [inMarketplace, setInMarketplace] = useState(false);
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<number | string>(0);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [launchDate, setLaunchDate] = useState<Date | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [components, setComponents] = useState<Componente[]>([]);
  // Se hidrata una vez por apertura: con el id al editar (los refetch del mismo
  // producto no pisan lo que se está escribiendo) y con "nuevo" al dar de alta.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const clave = existente ? existente.id : producto === "nuevo" ? "nuevo" : null;

  if (!clave && hydratedFor !== null) setHydratedFor(null);
  if (clave && hydratedFor !== clave) {
    setHydratedFor(clave);
    setName(existente?.name ?? "");
    setCategory(existente?.category ?? "supplement");
    setSalePrice(existente ? String(existente.sale_price ?? "") : "");
    setCostPrice(existente ? String(existente.cost_price ?? "") : "");
    setReorder(existente?.reorder_level ?? 0);
    setInMarketplace(existente?.show_in_marketplace ?? false);
    setDescription(existente?.description ?? "");
    setSizes(existente?.sizes ?? []);
    setColors(existente?.colors ?? []);
    setDeliveryDays(existente?.delivery_days ?? 0);
    setIsUpcoming(existente?.is_upcoming ?? false);
    setLaunchDate(existente?.launch_date ? new Date(`${existente.launch_date}T00:00:00`) : null);
    setPhoto(null);
    setPrepared((existente?.components ?? []).length > 0);
    setComponents((existente?.components ?? []).map((c) => ({ component: c.component, qty: c.qty })));
  }

  const cuerpo = () => ({
    name,
    category: category ?? "other",
    // Mismo formato que antes del NumberInput: decimal como texto.
    sale_price: String(salePrice),
    cost_price: costPrice === "" ? "0" : String(costPrice),
    reorder_level: Number(reorder) || 0,
    show_in_marketplace: inMarketplace,
    description: description.trim(),
    sizes: category === "merch" ? sizes : [],
    colors: category === "merch" ? colors : [],
    delivery_days: Number(deliveryDays) || 0,
    is_upcoming: isUpcoming,
    launch_date: fechaIso(launchDate),
    components: prepared ? components : [],
  });

  /** La foto va aparte: si falla, los datos ya quedaron y hay que decirlo así. */
  const subirFotoDe = async (id: string, verbo: string) => {
    if (!photo) return true;
    try {
      await subirFoto.mutateAsync({ id, file: photo });
      return true;
    } catch (error) {
      const motivo = errMsg(error, "");
      notifications.show({
        color: "red",
        message: `${verbo}, pero no se pudo subir la foto${motivo ? `: ${motivo}` : "."}`,
      });
      return false;
    }
  };

  const guardar = async () => {
    if (existente) {
      // Antes cualquier fallo decía solo «No se pudo actualizar.»: se tragaba el
      // motivo del servidor (precio inválido, receta circular…).
      try {
        await actualizar.mutateAsync({ id: existente.id, body: cuerpo() });
      } catch (error) {
        notifications.show({ color: "red", message: errMsg(error, "No se pudo actualizar el producto.") });
        return;
      }
      if (!(await subirFotoDe(existente.id, "Los datos se guardaron"))) return;
      notifications.show({ color: "teal", message: "Producto actualizado." });
      onClose();
      return;
    }
    let creado: ErpProduct;
    try {
      creado = await crear.mutateAsync(cuerpo());
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el producto.") });
      return;
    }
    // Ya existe: aunque falle la foto se cierra, o un segundo «Crear» lo duplicaría.
    if (await subirFotoDe(creado.id, "El producto se creó")) {
      notifications.show({ color: "teal", message: "Producto creado." });
    }
    onClose();
  };

  const puedeGuardar = !!name.trim() && String(salePrice).trim() !== "";
  const ocupado = crear.isPending || actualizar.isPending || subirFoto.isPending;

  return (
    <Modal opened={!!producto} onClose={onClose} title={existente ? "Editar producto" : "Nuevo producto"} centered size="lg">
      {/* Formulario de verdad: «Intro» / «Ir» del teclado del celular guarda. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!puedeGuardar || ocupado) return;
          void guardar();
        }}
      >
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput label="Nombre" value={name} onChange={(e) => setName(e.currentTarget.value)} data-autofocus />
          <Select label="Categoría" value={category} onChange={setCategory} data={CATEGORIES} allowDeselect={false} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          {/* NumberInput y no texto libre: no deja escribir letras ni negativos. */}
          <NumberInput
            label="Precio (Q)"
            prefix="Q"
            min={0}
            decimalScale={2}
            thousandSeparator=","
            hideControls
            value={salePrice}
            onChange={setSalePrice}
          />
          <NumberInput
            label="Costo (Q)"
            prefix="Q"
            min={0}
            decimalScale={2}
            thousandSeparator=","
            hideControls
            value={costPrice}
            onChange={setCostPrice}
          />
          <NumberInput label="Mínimo en bodega" value={reorder} onChange={setReorder} min={0} allowDecimal={false} />
        </SimpleGrid>

        {category === "merch" && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TagsInput label="Tallas" placeholder="S, M, L… (Enter)" value={sizes} onChange={setSizes} />
            <TagsInput label="Colores" placeholder="Negro, Naranja… (Enter)" value={colors} onChange={setColors} />
          </SimpleGrid>
        )}

        <Switch
          label="Vender en la tienda del app"
          checked={inMarketplace}
          onChange={(e) => setInMarketplace(e.currentTarget.checked)}
          mt="xs"
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
            />
            <Group gap="sm" align="flex-end" wrap="nowrap">
              {existente?.photo && !photo && (
                <img
                  src={existente.photo}
                  alt={existente.name}
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--a-line)" }}
                />
              )}
              <FileInput
                label={existente?.photo ? "Cambiar foto" : "Foto"}
                placeholder="Subir imagen"
                accept="image/*"
                value={photo}
                onChange={setPhoto}
                clearable
                style={{ flex: 1, minWidth: 0 }}
              />
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label="Días de entrega"
                value={deliveryDays}
                onChange={setDeliveryDays}
                min={0}
                max={120}
                allowDecimal={false}
              />
              {isUpcoming && (
                <DateInput
                  label="Fecha de lanzamiento"
                  value={launchDate}
                  onChange={setLaunchDate}
                  valueFormat="YYYY-MM-DD"
                  clearable
                  popoverProps={{ withinPortal: true }}
                />
              )}
            </SimpleGrid>
            <Switch
              label="Próximo lanzamiento (se puede apartar)"
              checked={isUpcoming}
              onChange={(e) => setIsUpcoming(e.currentTarget.checked)}
            />
          </>
        )}

        <Switch
          label="Es un preparado (receta)"
          checked={prepared}
          onChange={(e) => setPrepared(e.currentTarget.checked)}
          mt="xs"
        />
        {prepared && <Receta productos={productos} selfId={existente?.id} value={components} onChange={setComponents} />}

        {existente && (inMarketplace || (existente.images ?? []).length > 0) && (
          <Galeria producto={existente} gymId={gymId} />
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeGuardar} loading={ocupado}>
            {existente ? "Guardar" : "Crear producto"}
          </Button>
        </Group>
      </Stack>
      </form>
    </Modal>
  );
}

/** Fotos extra del producto (además de la portada). Se suben y quitan al momento. */
function Galeria({ producto, gymId }: { producto: ErpProduct; gymId: string }) {
  const subir = useUploadProductImages(gymId);
  const quitar = useDeleteProductImage(gymId);
  const [archivos, setArchivos] = useState<File[]>([]);
  // La «✕» borraba al primer toque (y en celular se roza fácil): ahora pregunta.
  const [porQuitar, setPorQuitar] = useState<string | null>(null);

  const confirmarQuitar = (imageId: string) =>
    quitar.mutate(
      { id: producto.id, imageId },
      {
        onSuccess: () => setPorQuitar(null),
        onError: (error) => notifications.show({ color: "red", message: errMsg(error, "No se pudo quitar la imagen.") }),
      },
    );

  const onSubir = async () => {
    // Si falla se avisa y se conservan las fotos elegidas para reintentar.
    try {
      await subir.mutateAsync({ id: producto.id, files: archivos });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudieron subir las imágenes.") });
      return;
    }
    setArchivos([]);
    notifications.show({ color: "teal", message: "Imágenes agregadas." });
  };

  return (
    <div>
      <Title order={5} mt="xs" mb="xs">
        Galería
      </Title>
      {(producto.images ?? []).length > 0 && (
        <Group gap="xs" mb="sm">
          {(producto.images ?? []).map((im) => (
            <div key={im.id} style={{ position: "relative" }}>
              <img
                src={im.url}
                alt=""
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--a-line)" }}
              />
              <ActionIcon
                color="red"
                variant="filled"
                radius="xl"
                size="sm"
                style={{ position: "absolute", top: -8, right: -8 }}
                onClick={() => setPorQuitar(im.id)}
                aria-label="Quitar imagen de la galería"
              >
                <X size={14} />
              </ActionIcon>
            </div>
          ))}
        </Group>
      )}
      {porQuitar && (
        <Group gap="xs" mb="sm" wrap="wrap" role="alert">
          <Text size="sm" fw={600} style={{ flex: "1 1 180px" }}>
            ¿Quitar esta imagen de la galería?
          </Text>
          <Button variant="default" size="xs" onClick={() => setPorQuitar(null)}>
            Cancelar
          </Button>
          <Button
            color="red"
            size="xs"
            loading={quitar.isPending && quitar.variables?.imageId === porQuitar}
            onClick={() => confirmarQuitar(porQuitar)}
          >
            Quitar imagen
          </Button>
        </Group>
      )}
      <Group align="flex-end" gap="sm" wrap="nowrap">
        <FileInput
          label="Agregar imágenes"
          placeholder="Una o varias…"
          accept="image/*"
          multiple
          value={archivos}
          onChange={(v) => setArchivos(v as File[])}
          clearable
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button variant="default" disabled={!archivos.length} loading={subir.isPending} onClick={onSubir}>
          Subir
        </Button>
      </Group>
    </div>
  );
}

/** Insumos de un preparado (licuado): se descuentan del inventario al venderlo. */
function Receta({
  productos,
  selfId,
  value,
  onChange,
}: {
  productos: ErpProduct[];
  selfId?: string;
  value: Componente[];
  onChange: (v: Componente[]) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState<number | string>(1);

  const nameOf = (id: string) => productos.find((p) => p.id === id)?.name ?? id;
  const options = productos
    .filter((p) => p.id !== selfId && !value.some((c) => c.component === p.id))
    .map((p) => ({ value: p.id, label: `${p.name} (stock ${p.stock_qty})` }));

  const add = () => {
    if (!pick) return;
    onChange([...value, { component: pick, qty: Number(qty) || 1 }]);
    setPick(null);
    setQty(1);
  };

  return (
    <Stack gap={6}>
      {value.map((c, i) => (
        <Group key={c.component} gap="xs" wrap="nowrap">
          <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate>
            {nameOf(c.component)}
          </Text>
          {/* Sin flechas: en 80 px se comían el número. */}
          <NumberInput
            w={80}
            min={1}
            hideControls
            aria-label={`Unidades de ${nameOf(c.component)}`}
            value={c.qty}
            onChange={(v) => onChange(value.map((x, idx) => (idx === i ? { ...x, qty: Number(v) || 1 } : x)))}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`Quitar ${nameOf(c.component)} de la receta`}
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      ))}
      {/* En celular el selector baja a su propio renglón: en una sola fila quedaba
          en ~100 px y no se leía el nombre del insumo. */}
      <Group gap="xs" align="flex-end" wrap="wrap">
        <Select
          placeholder="Agregar insumo…"
          aria-label="Agregar insumo"
          data={options}
          value={pick}
          onChange={setPick}
          searchable
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
        <NumberInput w={80} min={1} hideControls aria-label="Unidades del insumo" value={qty} onChange={setQty} />
        <Button variant="default" size="sm" onClick={add} disabled={!pick}>
          Añadir
        </Button>
      </Group>
    </Stack>
  );
}
