import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Flag, Megaphone, ShieldAlert } from "lucide-react";
import {
  useDecideClubContent,
  useDecidePlatformClubContent,
  useGymClubContent,
  useGymClubs,
  usePlatformClubContent,
} from "../api/hooks";
import { CLUB_CONTENT_KIND, MOTIVOS_MODERACION } from "../api/types";
import type { ClubContentRow, MotivoModeracion } from "../api/types";
import { NoGymAssigned, PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { BigMetric, GlassCard, MetricTile, Stagger } from "../components/aurora";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";

/**
 * **Moderación del contenido de los clubes** (`apps/clubs/moderation.py`).
 *
 * Un club es un canal de difusión a decenas de atletas creado por otro atleta, y
 * hasta ahora lo que se publicaba dentro sólo se podía leer entrando al Django
 * admin. Esta pantalla es la mitad de lectura de ese módulo.
 *
 * Sigue el patrón de la bandeja del feed (`CommunityPage`) a propósito: mismas
 * pastillas, mismo modal de motivo obligatorio, mismos textos de estado vacío.
 * Lo que cambia es el modelo de moderación:
 *
 *  - El feed del gym revisa los posts ANTES de publicarlos; aquí la moderación es
 *    **reactiva** (lo publicado ya se ve). Un club puede no tener gimnasio y sus
 *    avisos son perecederos: retenerlos hasta que un humano entre sería apagar la
 *    función.
 *  - Por eso lo **denunciado por los miembros** va arriba y en su propia pestaña:
 *    ninguna IA lee texto, así que un `report_count > 0` es la única alarma que
 *    existe sobre lo que se ESCRIBE.
 */

/** Color de la pastilla por tipo de contenido. */
const KIND_COLOR: Record<string, string> = {
  announcement: "flame",
  activity: "cyan",
  challenge: "grape",
  post: "blue",
};

/** Motivo de sanción → etiqueta legible (el backend guarda el valor crudo). */
const MOTIVO_LABEL: Record<string, string> = Object.fromEntries(
  MOTIVOS_MODERACION.map((m) => [m.value, m.label]),
);

type Bandeja = "denunciado" | "todo" | "retirado";

const RETIRADO = "rejected";

/** Qué se le dice al admin en cada pestaña cuando no hay nada. */
const VACIO: Record<Bandeja, string> = {
  denunciado:
    "Nadie ha denunciado contenido en tus clubes. Cuando un miembro denuncie algo, aparece aquí de primero y te llega un aviso.",
  todo: "Tus clubes todavía no han publicado nada.",
  retirado: "No has retirado nada. Lo que retires queda aquí con su motivo, no se borra.",
};

/**
 * Una fila de la cola. Se extrae en componente porque la usan las dos colas: la
 * del gimnasio y la de la plataforma (clubes legados sin gym).
 */
function FilaDeContenido({
  fila,
  onRetirar,
  onRestaurar,
  pendiente,
}: {
  fila: ClubContentRow;
  onRetirar: (fila: ClubContentRow) => void;
  onRestaurar: (fila: ClubContentRow) => void;
  pendiente: boolean;
}) {
  const retirado = fila.moderation_status === RETIRADO;
  return (
    <Box
      p="sm"
      style={{ border: "1px solid var(--a-line)", borderRadius: "calc(16 * var(--u))" }}
    >
      <Group gap={6} mb={6}>
        <Badge size="xs" variant="light" color={KIND_COLOR[fila.kind] ?? "gray"}>
          {CLUB_CONTENT_KIND[fila.kind] ?? fila.kind}
        </Badge>
        <Badge size="xs" variant="default">
          {fila.club_name}
        </Badge>
        {fila.report_count > 0 && (
          <Badge
            size="xs"
            variant="filled"
            color="red"
            title="Miembros del club que lo denunciaron. Denunciar no lo retira: la decisión es tuya."
          >
            Denunciado ×{fila.report_count}
          </Badge>
        )}
        {retirado && (
          <Badge
            size="xs"
            variant="light"
            color="orange"
            title="Ya no lo ven los miembros del club. El texto se conserva."
          >
            Retirado
          </Badge>
        )}
        {fila.moderation_label && (
          <Badge
            size="xs"
            variant="light"
            color="orange"
            title="Imagen marcada por la moderación automática (IA)"
          >
            IA: {fila.moderation_label}
          </Badge>
        )}
      </Group>

      {fila.title && <Text fw={600}>{fila.title}</Text>}
      {fila.body ? (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {fila.body}
        </Text>
      ) : fila.photo_url ? null : (
        // "(sin texto)" sólo cuando de verdad no hay NADA. Antes se pintaba
        // también sobre una publicación que era una foto, así que la única señal
        // que recibía el moderador sobre una imagen era la palabra "(sin texto)".
        <Text size="sm" c="dimmed">
          (sin texto)
        </Text>
      )}

      {/* LA FOTO. Es lo que faltaba para que esta cola sirva a su propósito: el
          gimnasio no tiene otra vía de ver una imagen publicada en un club —el
          feed del club le responde 403 a propósito—, así que sin esto el peor
          caso que el dueño describió en el ticket 99d9ab2e no lo miraba nadie.

          Con tope de ancho y no a sangre: en un escritorio ancho una foto de
          1200 px empujaría el resto de la fila fuera de la vista, y la cola se
          recorre comparando filas. */}
      {fila.photo_url && (
        <Image
          src={fila.photo_url}
          alt="Imagen de la publicación"
          radius="md"
          fit="cover"
          h={200}
          w="auto"
          maw={360}
          mt={8}
        />
      )}

      <Text size="xs" c="dimmed" mt={6}>
        {fila.author_email || "Autor sin registrar"} ·{" "}
        {new Date(fila.created_at).toLocaleString("es-GT")}
      </Text>

      {retirado && fila.decision_reason && (
        <Text size="xs" c="dimmed" mt={4}>
          Motivo: {MOTIVO_LABEL[fila.decision_reason] ?? fila.decision_reason}
          {fila.decision_note ? ` · ${fila.decision_note}` : ""}
        </Text>
      )}

      <Group gap="xs" mt="sm">
        {retirado ? (
          <Button size="xs" loading={pendiente} onClick={() => onRestaurar(fila)}>
            Restaurar
          </Button>
        ) : (
          <Button size="xs" variant="default" color="red" onClick={() => onRetirar(fila)}>
            Retirar…
          </Button>
        )}
      </Group>
    </Box>
  );
}

export function ClubContentPage() {
  const { primaryGymId, isSuperuser } = useAuth();
  const gymId = primaryGymId ?? "";

  const [bandeja, setBandeja] = useState<Bandeja>("denunciado");
  const [clubId, setClubId] = useState<string | null>("");
  const [kind, setKind] = useState<string | null>("");

  const clubes = useGymClubs(gymId);
  const filtros = { club_id: clubId || undefined, kind: kind || undefined };
  // Dos consultas y no una: lo denunciado se filtra en el SERVIDOR para que el
  // tope de 200 filas del backend no lo pueda dejar fuera por culpa del ruido de
  // los anuncios normales. Es la única cola que de verdad urge.
  const denuncias = useGymClubContent(gymId, { ...filtros, reported: true });
  const todo = useGymClubContent(gymId, filtros);
  const decide = useDecideClubContent(gymId);

  // Cola de la plataforma: clubes legados sin gimnasio. No son de ningún box, así
  // que si Nucleo no los mira nadie los mira.
  const huerfanos = usePlatformClubContent({ reported: true }, isSuperuser);
  const decidePlataforma = useDecidePlatformClubContent();

  // Retirar exige motivo (400 `reason_required` sin él): se resuelve en un modal.
  const [retiro, setRetiro] = useState<{ fila: ClubContentRow; plataforma: boolean } | null>(
    null,
  );
  const [motivo, setMotivo] = useState<MotivoModeracion | null>(null);
  const [nota, setNota] = useState("");

  const filas = todo.data ?? [];
  const nDenunciado = (denuncias.data ?? []).length;
  const retirados = useMemo(
    () => filas.filter((f) => f.moderation_status === RETIRADO),
    [filas],
  );
  const visibles = filas.length - retirados.length;

  const listaActiva: ClubContentRow[] =
    bandeja === "denunciado" ? denuncias.data ?? [] : bandeja === "retirado" ? retirados : filas;
  const consulta = bandeja === "denunciado" ? denuncias : todo;
  const cargando = denuncias.isLoading || todo.isLoading;

  const abrirRetiro = (fila: ClubContentRow, plataforma = false) => {
    setRetiro({ fila, plataforma });
    setMotivo(null);
    setNota("");
  };

  const restaurar = (fila: ClubContentRow, plataforma = false) => {
    const mutacion = plataforma ? decidePlataforma : decide;
    mutacion.mutate(
      { kind: fila.kind, contentId: fila.id, action: "approve" },
      {
        onSuccess: () =>
          notifications.show({
            color: "teal",
            message: `Restaurado: los miembros de ${fila.club_name} vuelven a verlo.`,
          }),
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo restaurar el contenido."),
          }),
      },
    );
  };

  /**
   * Confirma el retiro con su motivo. El motivo es OBLIGATORIO: es lo que recibe
   * el autor y lo único contra lo que puede defenderse. Retirar NO borra el texto.
   */
  const confirmarRetiro = () => {
    if (!retiro || !motivo) return;
    const mutacion = retiro.plataforma ? decidePlataforma : decide;
    mutacion.mutate(
      {
        kind: retiro.fila.kind,
        contentId: retiro.fila.id,
        action: "reject",
        reason: motivo,
        note: nota.trim(),
      },
      {
        onSuccess: () => {
          setRetiro(null);
          notifications.show({
            color: "teal",
            message: "Retirado del club. Al autor le llega el motivo.",
          });
        },
        onError: (e) =>
          notifications.show({
            color: "red",
            message: errMsg(e, "No se pudo retirar el contenido."),
          }),
      },
    );
  };

  if (!gymId) return <NoGymAssigned />;

  const decidiendo = decide.isPending || decidePlataforma.isPending;

  return (
    <div>
      <PageHeader
        kicker="Comunidad · Clubes"
        title="Contenido de los clubes"
        subtitle="Lee lo que se publica dentro de los clubes de tu gimnasio y retira lo que no debería estar. Lo que denuncian tus miembros va de primero."
      />

      <Stagger from={0.6} style={{ marginBottom: "calc(20 * var(--u))" }}>
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
          <MetricTile
            label="Denunciado por miembros"
            value={cargando ? "—" : nDenunciado}
            icon={<Flag size={16} strokeWidth={1.8} />}
            tone={nDenunciado > 0 ? "var(--nucleo-danger)" : undefined}
            hint="Alguien dice que esto no debería estar publicado."
          />
          <MetricTile
            label="Publicado ahora"
            value={cargando ? "—" : visibles}
            icon={<Megaphone size={16} strokeWidth={1.8} />}
            hint="Lo que hoy ven los miembros de tus clubes."
          />
          <MetricTile
            label="Retirado"
            value={cargando ? "—" : retirados.length}
            icon={<ShieldAlert size={16} strokeWidth={1.8} />}
            hint="Fuera del club, pero conservado con su motivo."
          />
        </SimpleGrid>
      </Stagger>

      <Alert color="gray" variant="light" mb="md" title="Cómo funciona esta cola">
        <Text size="sm">
          Dentro de un club se publica <b>al instante</b>: sus avisos son perecederos y un club
          puede no tener gimnasio que los apruebe. Las <b>imágenes</b> pasan por la misma
          moderación automática que el feed, pero <b>ningún sistema lee el texto</b>: por eso la
          denuncia de un miembro es la única alarma que existe sobre lo que se escribe, y por eso
          esta pantalla es la mitad importante del control.{" "}
          <b>Denunciar no retira nada</b> — sube el contador y te avisa; retirar sigue siendo una
          decisión tuya. Y retirar tampoco borra: el texto se conserva para que quede constancia
          de lo que se publicó.
        </Text>
      </Alert>

      {/* La tarjeta que manda: es lo único de la pantalla que exige una decisión. */}
      <GlassCard variant="core" sheen padding={24} delay={0.84}>
        <BigMetric
          label="Denuncias por revisar"
          value={cargando ? "—" : nDenunciado}
          size="sm"
          hint="Contenido que un miembro del club marcó como indebido."
          delay={1.04}
        />
        <div style={{ height: "calc(16 * var(--u))" }} />

        <SegmentedControl
          value={bandeja}
          onChange={(v) => setBandeja(v as Bandeja)}
          data={[
            { value: "denunciado", label: `Denunciado (${cargando ? "—" : nDenunciado})` },
            { value: "todo", label: `Todo (${cargando ? "—" : filas.length})` },
            { value: "retirado", label: `Retirado (${cargando ? "—" : retirados.length})` },
          ]}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="md">
          <Select
            label="Club"
            value={clubId}
            onChange={setClubId}
            searchable
            data={[
              { value: "", label: "Todos los clubes" },
              ...(clubes.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Tipo de contenido"
            value={kind}
            onChange={setKind}
            data={[
              { value: "", label: "Todos los tipos" },
              ...Object.entries(CLUB_CONTENT_KIND).map(([value, label]) => ({ value, label })),
            ]}
          />
        </SimpleGrid>

        <Text c="dimmed" size="sm" mt="md" mb="md">
          {bandeja === "denunciado"
            ? "Lo que tus propios miembros marcaron. Sigue publicado hasta que decidas."
            : bandeja === "retirado"
              ? "Lo que ya retiraste, con el motivo que recibió el autor. Puedes devolverlo."
              : "Todo lo que se ha escrito dentro de tus clubes, de lo más reciente a lo más viejo."}
        </Text>

        {/* Un fallo silencioso aquí diría "no hay nada que moderar", que es el peor
            error posible en una cola de moderación. */}
        {consulta.isError ? (
          <PageError
            message="No se pudo cargar el contenido de los clubes. Puede haber denuncias esperando."
            onRetry={() => consulta.refetch()}
          />
        ) : cargando ? (
          <PageLoading />
        ) : !listaActiva.length ? (
          <Text c="dimmed" size="sm">
            {VACIO[bandeja]}
          </Text>
        ) : (
          <Stack gap="sm">
            {listaActiva.map((fila) => (
              <FilaDeContenido
                key={`${fila.kind}-${fila.id}`}
                fila={fila}
                pendiente={decidiendo}
                onRetirar={(f) => abrirRetiro(f)}
                onRestaurar={(f) => restaurar(f)}
              />
            ))}
          </Stack>
        )}
      </GlassCard>

      {/* Clubes legados sin gimnasio: no son de ningún box, la autoridad es Nucleo. */}
      {isSuperuser && (
        <GlassCard padding={24} delay={0.96} style={{ marginTop: "calc(20 * var(--u))" }}>
          <SectionLabel as="h2" mb={8}>
            Denuncias en clubes sin gimnasio (Nucleo)
          </SectionLabel>
          <Text c="dimmed" size="sm" mb="md">
            Clubes legados que no pertenecen a ningún gimnasio: ningún box los ve ni los puede
            moderar, así que los resuelve soporte de Nucleo.
          </Text>
          {huerfanos.isError ? (
            <PageError
              message="No se pudo cargar la cola de clubes sin gimnasio."
              onRetry={() => huerfanos.refetch()}
            />
          ) : huerfanos.isLoading ? (
            <PageLoading />
          ) : !(huerfanos.data ?? []).length ? (
            <Text c="dimmed" size="sm">
              No hay denuncias en clubes sin gimnasio.
            </Text>
          ) : (
            <Stack gap="sm">
              {(huerfanos.data ?? []).map((fila) => (
                <FilaDeContenido
                  key={`plat-${fila.kind}-${fila.id}`}
                  fila={fila}
                  pendiente={decidiendo}
                  onRetirar={(f) => abrirRetiro(f, true)}
                  onRestaurar={(f) => restaurar(f, true)}
                />
              ))}
            </Stack>
          )}
        </GlassCard>
      )}

      <Modal
        opened={!!retiro}
        onClose={() => setRetiro(null)}
        title="Retirar del club"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Los miembros de {retiro?.fila.club_name} dejan de verlo. El texto <b>no se borra</b>:
            queda registrado con este motivo, que es también lo que se le avisa al autor.
          </Text>
          <Select
            label="Motivo"
            description="Obligatorio: es lo que verá el autor."
            placeholder="Elige un motivo"
            value={motivo}
            onChange={(v) => setMotivo(v as MotivoModeracion | null)}
            data={MOTIVOS_MODERACION}
          />
          <Textarea
            label="Nota para el autor (opcional)"
            placeholder="Aclaración breve: qué regla se pasó por alto…"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
            autosize
            minRows={2}
            maxLength={255}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRetiro(null)}>
              Cancelar
            </Button>
            <Button color="red" disabled={!motivo} loading={decidiendo} onClick={confirmarRetiro}>
              Retirar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
