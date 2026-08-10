import { FormEvent, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Group,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Eye, MapPin, RotateCcw } from "lucide-react";
import { useGymConfig, useUpdateGymProfile } from "../api/hooks";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
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

export function GymProfilePage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const gym = useGymConfig(gymId);
  const guardar = useUpdateGymProfile(gymId);
  const [form, setForm] = useState<FichaForm>(VACIA);

  // Se rellena cuando llega la ficha (y al cambiar de gimnasio con el selector
  // del header): sin esto, el formulario mostraba el gym anterior.
  useEffect(() => {
    const g = gym.data;
    if (!g) return;
    setForm({
      name: g.name ?? "",
      logo_url: g.logo_url ?? "",
      description: g.description ?? "",
      location_text: g.location_text ?? "",
      address: g.address ?? "",
      lat: g.lat ?? "",
      lng: g.lng ?? "",
      is_public: g.is_public ?? true,
    });
  }, [gym.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!gymId) return <NoGymAssigned />;
  if (gym.isError) return <PageError onRetry={() => gym.refetch()} />;
  if (!gym.data) return <PageLoading label="Cargando la ficha del gimnasio…" />;

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
    } catch (error) {
      // 400 típico: `logo_url` que no es una URL absoluta (el backend valida el
      // formato) — el mensaje del campo llega en el cuerpo y hay que mostrarlo.
      fail(errMsg(error, "No se pudo guardar la ficha del gimnasio."));
    }
  };

  const revertir = () => {
    const g = gym.data!;
    setForm({
      name: g.name ?? "",
      logo_url: g.logo_url ?? "",
      description: g.description ?? "",
      location_text: g.location_text ?? "",
      address: g.address ?? "",
      lat: g.lat ?? "",
      lng: g.lng ?? "",
      is_public: g.is_public ?? true,
    });
  };

  return (
    <div>
      <PageHeader
        kicker="Gimnasio · Ficha"
        title="Cómo se ve tu gimnasio"
        subtitle="Nombre, logo, descripción y ubicación: exactamente lo que el atleta ve en su app y en el directorio de la red."
      />

      <GlassCard
        variant="core"
        sheen
        padding={24}
        delay={0.6}
        style={{ marginBottom: "calc(20 * var(--u))" }}
      >
        <Group gap={8} mb="md" c="dimmed">
          <Eye size={15} />
          <SectionLabel mb={0} as="h2">
            Vista previa del atleta
          </SectionLabel>
        </Group>
        <VistaDelAtleta ficha={form} />
      </GlassCard>

      <form onSubmit={onSubmit}>
        <GlassCard padding={22} delay={0.74} style={{ marginBottom: "calc(18 * var(--u))" }}>
          <SectionLabel mb={6} as="h2">
            Identidad
          </SectionLabel>
          <Title order={3} mb="md">
            Nombre, logo y descripción
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Nombre del gimnasio"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set("name", e.currentTarget.value)}
            />
            <TextInput
              label="Logo (URL)"
              description="Enlace directo a la imagen (https://…). Cuadrada se ve mejor."
              placeholder="https://…"
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.currentTarget.value)}
            />
          </SimpleGrid>
          <Textarea
            mt="sm"
            label="Descripción"
            description="Dos líneas: qué se entrena aquí y para quién. Es lo que lee alguien que todavía no te conoce."
            autosize
            minRows={3}
            maxRows={8}
            value={form.description}
            onChange={(e) => set("description", e.currentTarget.value)}
          />
        </GlassCard>

        <GlassCard padding={22} delay={0.84} style={{ marginBottom: "calc(18 * var(--u))" }}>
          <SectionLabel mb={6} as="h2">
            Ubicación
          </SectionLabel>
          <Title order={3} mb="md">
            Dónde estás
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Zona o ciudad"
              description="Lo que se muestra bajo el nombre. Ej.: “Zona 15, Guatemala”."
              maxLength={255}
              value={form.location_text}
              onChange={(e) => set("location_text", e.currentTarget.value)}
            />
            <TextInput
              label="Dirección"
              description="La dirección exacta, para quien ya va en camino."
              maxLength={255}
              value={form.address}
              onChange={(e) => set("address", e.currentTarget.value)}
            />
            {/* Las coordenadas no son decorativas: ordenan el listado de
                "gimnasios cerca" del atleta. Sin ellas el gym cae al final. */}
            <TextInput
              label="Latitud"
              description="Opcional. Sin coordenadas no apareces ordenado por cercanía."
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
            description={
              form.is_public
                ? "Cualquier atleta de la red puede encontrarte y pedir entrar."
                : "Solo te encuentran quienes ya son de la casa o tienen tu invitación."
            }
            checked={form.is_public}
            onChange={(e) => set("is_public", e.currentTarget.checked)}
          />
        </GlassCard>

        <Group gap="sm">
          <Button type="submit" loading={guardar.isPending}>
            Guardar ficha
          </Button>
          <Button
            variant="default"
            leftSection={<RotateCcw size={16} />}
            disabled={guardar.isPending}
            onClick={revertir}
          >
            Descartar cambios
          </Button>
        </Group>
      </form>
    </div>
  );
}
