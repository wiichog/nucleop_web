import { FormEvent, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MapPin } from "lucide-react";
import { useGymConfig, useUpdateGymProfile } from "../api/hooks";
import type { GymAdmin } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Encabezado } from "../components/Tarjeta";
import { PageHeader, SectionLabel } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

/**
 * **La ficha del gimnasio: lo que el atleta ve.**
 *
 * Nombre, logo, descripción y ubicación viajan a la app en cada tarjeta de
 * gimnasio (`GymHubScreen`) y en el descubrimiento de la red. Hasta hoy solo se
 * podían cambiar desde el Django admin, así que un box que se mudaba, se
 * rebautizaba o quería estrenar logo dependía de que alguien de Nucleo entrara a
 * la base por él.
 *
 * Lo que NO está aquí, y no es olvido:
 *  - `platform_commission_pct`, `fixed_fee`, `saas_plan` e `is_active` son de
 *    PLATAFORMA. El backend los pone de solo lectura para el gym y un PATCH suyo
 *    los ignora **en silencio** (200 sin aplicar), que es la peor forma de fallar:
 *    ofrecer el campo sería prometer un guardado que no ocurre.
 *  - las perillas de operación (reservas futuras, umbral de riesgo, gracia de
 *    mora) viven donde se usan — Clases y Atletas—, no en una pantalla de
 *    “configuración” que nadie relaciona con la lista que gobiernan.
 */

/** Campos de la ficha. Se editan como texto y el backend valida el formato. */
interface FichaForm {
  name: string;
  logo_url: string;
  description: string;
  location_text: string;
  address: string;
  lat: string;
  lng: string;
  is_public: boolean;
}

const VACIA: FichaForm = {
  name: "",
  logo_url: "",
  description: "",
  location_text: "",
  address: "",
  lat: "",
  lng: "",
  is_public: true,
};

/** Coordenada válida o `null`; el texto vacío borra la coordenada guardada. */
function coordenada(valor: string, tope: number): string | null | undefined {
  const limpio = valor.trim();
  if (!limpio) return null;
  const numero = Number(limpio);
  if (!Number.isFinite(numero) || Math.abs(numero) > tope) return undefined;
  return limpio;
}

/**
 * Lo que el atleta ve de este gimnasio, con la misma jerarquía que la tarjeta de
 * su app: logo, nombre, ubicación y descripción. Se pinta con el formulario EN
 * VIVO (no con lo guardado) para que el operador vea el resultado antes de
 * apretar Guardar — un logo roto o una descripción de tres párrafos se detectan
 * aquí, no cuando un socio se queja.
 */
export function VistaDelAtleta({ ficha }: { ficha: FichaForm }) {
  const nombre = ficha.name.trim() || "Tu gimnasio";
  return (
    <Group gap="md" wrap="nowrap" align="flex-start">
      <Avatar src={ficha.logo_url.trim() || undefined} size={64} radius="lg" color="flame">
        {nombre[0]?.toUpperCase()}
      </Avatar>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text fw={700} size="lg" style={{ letterSpacing: "-0.01em" }}>
          {nombre}
        </Text>
        <Group gap={6} wrap="nowrap" c="dimmed">
          <MapPin size={14} style={{ flex: "none" }} />
          <Text size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {ficha.location_text.trim() || "Sin ubicación"}
          </Text>
        </Group>
        <Text size="sm" c="dimmed" mt={6} style={{ whiteSpace: "pre-wrap" }}>
          {ficha.description.trim() || "Sin descripción. Cuenta en dos líneas qué se entrena aquí."}
        </Text>
      </div>
    </Group>
  );
}

/** La ficha guardada, como texto editable. */
function fichaDe(g: GymAdmin | undefined): FichaForm {
  if (!g) return VACIA;
  return {
    name: g.name ?? "",
    logo_url: g.logo_url ?? "",
    description: g.description ?? "",
    location_text: g.location_text ?? "",
    address: g.address ?? "",
    lat: g.lat ?? "",
    lng: g.lng ?? "",
    is_public: g.is_public ?? true,
  };
}

/**
 * Lo que le falta a la ficha para que un atleta la encuentre y la entienda. Sale
 * en amarillo arriba: sin logo, sin descripción o sin coordenadas el gimnasio se
 * ve a medias o cae al final de «gimnasios cerca».
 */
export function faltantesDeFicha(f: FichaForm): string[] {
  const faltan: string[] = [];
  if (!f.logo_url.trim()) faltan.push("logo");
  if (!f.description.trim()) faltan.push("descripción");
  if (!f.location_text.trim() && !f.address.trim()) faltan.push("ubicación");
  if (!f.lat.trim() || !f.lng.trim()) faltan.push("coordenadas");
  return faltan;
}

export function GymProfilePage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const gym = useGymConfig(gymId);
  const [editando, setEditando] = useState(false);

  if (!gymId) return <NoGymAssigned />;
  if (gym.isError) return <PageError onRetry={() => gym.refetch()} />;
  if (!gym.data) return <PageLoading label="Cargando la ficha del gimnasio…" />;

  const guardada = fichaDe(gym.data);
  const faltan = faltantesDeFicha(guardada);
  const coords = guardada.lat && guardada.lng ? `${guardada.lat}, ${guardada.lng}` : "—";

  return (
    <div>
      <PageHeader kicker="Operación · Ficha" title="Cómo se ve tu gimnasio" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Tu ficha"
          avisos={
            faltan.length > 0 && (
              <Badge color="yellow" variant="light">
                Falta {faltan.join(", ")}
              </Badge>
            )
          }
        >
          <Button onClick={() => setEditando(true)}>Editar ficha</Button>
        </Encabezado>

        <VistaDelAtleta ficha={guardada} />

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="lg">
          <div>
            <SectionLabel mb={4}>Dirección</SectionLabel>
            <Text size="sm">{guardada.address || "—"}</Text>
          </div>
          <div>
            <SectionLabel mb={4}>Coordenadas</SectionLabel>
            <Text size="sm" className="a-tabular">
              {coords}
            </Text>
          </div>
          <div>
            <SectionLabel mb={4}>Directorio público</SectionLabel>
            <Text size="sm">{guardada.is_public ? "Apareces" : "Oculto"}</Text>
          </div>
        </SimpleGrid>
      </GlassCard>

      <EditarFicha gymId={gymId} gym={gym.data} opened={editando} onClose={() => setEditando(false)} />
    </div>
  );
}

/** La ventana de edición, con la vista previa arriba que sigue a lo que escribes. */
function EditarFicha({
  gymId,
  gym,
  opened,
  onClose,
}: {
  gymId: string;
  gym: GymAdmin;
  opened: boolean;
  onClose: () => void;
}) {
  const guardar = useUpdateGymProfile(gymId);
  const [form, setForm] = useState<FichaForm>(() => fichaDe(gym));
  // Se rellena al abrir (y si cambia el gimnasio con el selector del header):
  // cerrar sin guardar descarta lo escrito.
  const [hidratadaCon, setHidratadaCon] = useState<GymAdmin | null>(opened ? gym : null);
  if (opened && hidratadaCon !== gym) {
    setHidratadaCon(gym);
    setForm(fichaDe(gym));
  }
  if (!opened && hidratadaCon) setHidratadaCon(null);

  const set = (campo: keyof FichaForm, valor: string | boolean) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  /**
   * Guarda la ficha y **verifica contra la respuesta** antes de cantar éxito: el
   * backend ignora en silencio los campos que el gym no puede escribir, así que
   * un 200 no significa que se haya aplicado lo que se mandó.
   */
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nombre = form.name.trim();
    if (!nombre) {
      fail("El gimnasio necesita un nombre: es lo primero que ve el atleta.");
      return;
    }
    const lat = coordenada(form.lat, 90);
    const lng = coordenada(form.lng, 180);
    if (lat === undefined || lng === undefined) {
      fail("Las coordenadas no son válidas (latitud −90 a 90, longitud −180 a 180).");
      return;
    }
    try {
      const saved = await guardar.mutateAsync({
        name: nombre,
        logo_url: form.logo_url.trim(),
        description: form.description.trim(),
        location_text: form.location_text.trim(),
        address: form.address.trim(),
        lat,
        lng,
        is_public: form.is_public,
      });
      if (saved.name !== nombre || (saved.description ?? "") !== form.description.trim()) {
        fail("La API no guardó la ficha. Avisa a soporte de Nucleo.");
        return;
      }
      ok("Ficha actualizada. Los atletas ya la ven así en su app.");
      onClose();
    } catch (error) {
      // 400 típico: `logo_url` que no es una URL absoluta (el backend valida el
      // formato) — el mensaje del campo llega en el cuerpo y hay que mostrarlo.
      fail(errMsg(error, "No se pudo guardar la ficha del gimnasio."));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Editar ficha" size="lg" centered>
      <form onSubmit={onSubmit}>
        <Box
          p="sm"
          mb="md"
          aria-label="Vista previa del atleta"
          style={{ borderRadius: 10, border: "1px solid var(--a-line, var(--mantine-color-default-border))" }}
        >
          <VistaDelAtleta ficha={form} />
        </Box>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Nombre del gimnasio"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => set("name", e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label="Logo (URL)"
            placeholder="https://…"
            value={form.logo_url}
            onChange={(e) => set("logo_url", e.currentTarget.value)}
          />
        </SimpleGrid>
        <Textarea
          mt="sm"
          label="Descripción"
          placeholder="Qué se entrena aquí y para quién"
          autosize
          minRows={3}
          maxRows={8}
          value={form.description}
          onChange={(e) => set("description", e.currentTarget.value)}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
          <TextInput
            label="Zona o ciudad"
            placeholder="Zona 15, Guatemala"
            maxLength={255}
            value={form.location_text}
            onChange={(e) => set("location_text", e.currentTarget.value)}
          />
          <TextInput
            label="Dirección"
            maxLength={255}
            value={form.address}
            onChange={(e) => set("address", e.currentTarget.value)}
          />
          {/* Las coordenadas no son decorativas: ordenan el listado de
              "gimnasios cerca" del atleta. Sin ellas el gym cae al final. */}
          <TextInput
            label="Latitud"
            placeholder="14.599512"
            value={form.lat}
            onChange={(e) => set("lat", e.currentTarget.value)}
          />
          <TextInput
            label="Longitud"
            placeholder="-90.518944"
            value={form.lng}
            onChange={(e) => set("lng", e.currentTarget.value)}
          />
        </SimpleGrid>
        <Switch
          mt="md"
          label="Aparecer en el directorio público de Nucleo"
          checked={form.is_public}
          onChange={(e) => set("is_public", e.currentTarget.checked)}
        />
        <Group justify="flex-end" mt="lg" gap="xs">
          <Button variant="default" disabled={guardar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Guardar ficha
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
