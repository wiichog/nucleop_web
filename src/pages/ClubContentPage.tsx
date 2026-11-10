import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Image,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useDecideClubContent,
  useDecidePlatformClubContent,
  useGymClubContent,
  useGymClubs,
  usePlatformClubContent,
} from "../api/hooks";
import { CLUB_CONTENT_KIND, MOTIVOS_MODERACION } from "../api/types";
import type { ClubContentRow, MotivoModeracion } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
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
 * pastillas, mismo modal de motivo obligatorio. Lo que cambia es el modelo de
 * moderación:
 *
 *  - El feed del gym revisa los posts ANTES de publicarlos; aquí la moderación es
 *    **reactiva** (lo publicado ya se ve). Un club puede no tener gimnasio y sus
 *    avisos son perecederos: retenerlos hasta que un humano entre sería apagar la
 *    función.
 *  - Por eso lo **denunciado por los miembros** va primero, en amarillo y en su
 *    propia pestaña: ninguna IA lee texto, así que un `report_count > 0` es la
 *    única alarma que existe sobre lo que se ESCRIBE.
 *
 * Cómo funciona la cola se explica en el manual de la pantalla, no aquí.
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

/** Qué se dice en cada pestaña cuando no hay nada. */
const VACIO: Record<Bandeja, string> = {
  denunciado: "Nadie ha denunciado contenido en tus clubes.",
  todo: "Tus clubes todavía no han publicado nada.",
  retirado: "No has retirado nada.",
};

/**
 * Una publicación de la cola. La usan las dos colas: la del gimnasio y la de la
 * plataforma (clubes legados sin gym). Lo denunciado y aún publicado sale en
 * amarillo: es lo que espera una decisión.
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
    <Tarjeta
      etiqueta={`${CLUB_CONTENT_KIND[fila.kind] ?? fila.kind} en ${fila.club_name}`}
      aviso={fila.report_count > 0 && !retirado}
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
          <Badge size="xs" variant="light" color="orange" title="Ya no lo ven los miembros del club. El texto se conserva.">
            Retirado
          </Badge>
        )}
        {fila.moderation_label && (
          <Badge size="xs" variant="light" color="orange" title="Imagen marcada por la moderación automática (IA)">
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
        // "(sin texto)" sólo cuando de verdad no hay NADA: sobre una foto, esa
        // palabra era la única señal que recibía el moderador de una imagen.
        <Text size="sm" c="dimmed">
          (sin texto)
        </Text>
      )}

      {/* LA FOTO: el gimnasio no tiene otra vía de ver una imagen publicada en un
          club —el feed del club le responde 403 a propósito—. Con tope de ancho:
          la cola se recorre comparando filas. */}
      {fila.photo_url && (
        <Image
          src={fila.photo_url}
          alt="Imagen de la publicación"
          radius="md"
          fit="cover"
          h={200}
          w="auto"
          maw={{ base: "100%", sm: 360 }}
          mt={8}
        />
      )}

      <Text size="xs" c="dimmed" mt={6}>
        {fila.author_email || "Autor sin registrar"} · {new Date(fila.created_at).toLocaleString("es-GT")}
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
          <Button size="xs" variant="light" color="red" onClick={() => onRetirar(fila)}>
            Retirar…
          </Button>
        )}
      </Group>
    </Tarjeta>
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
  const retirados = useMemo(
    () => filas.filter((f) => f.moderation_status === RETIRADO),
    [filas],
  );
  // Lo que espera decisión: denunciado y todavía publicado. Lo ya retirado sigue
  // en la pestaña «Denunciado» (para poder devolverlo), pero no cuenta como pendiente.
  const porRevisar = (denuncias.data ?? []).filter((f) => f.moderation_status !== RETIRADO).length;
  const nDenunciado = (denuncias.data ?? []).length;

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
  const n = (x: number) => (cargando ? "—" : x);

  return (
    <div>
      <PageHeader kicker="Comunidad · Clubes" title="Contenido de los clubes" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Publicaciones"
          avisos={
            porRevisar > 0 ? (
              <Badge color="yellow" variant="light">
                {porRevisar} por revisar
              </Badge>
            ) : null
          }
        >
          <Select
            aria-label="Club"
            value={clubId}
            onChange={setClubId}
            searchable
            allowDeselect={false}
            w={{ base: "100%", sm: 200 }}
            data={[
              { value: "", label: "Todos los clubes" },
              ...(clubes.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            aria-label="Tipo de contenido"
            value={kind}
            onChange={setKind}
            allowDeselect={false}
            w={{ base: "100%", sm: 180 }}
            data={[
              { value: "", label: "Todos los tipos" },
              ...Object.entries(CLUB_CONTENT_KIND).map(([value, label]) => ({ value, label })),
            ]}
          />
        </Encabezado>

        <SegmentedControl
          value={bandeja}
          onChange={(v) => setBandeja(v as Bandeja)}
          mb="md"
          data={[
            { value: "denunciado", label: `Denunciado (${n(nDenunciado)})` },
            { value: "todo", label: `Todo (${n(filas.length)})` },
            { value: "retirado", label: `Retirado (${n(retirados.length)})` },
          ]}
        />

        {/* Un fallo silencioso aquí diría "no hay nada que moderar", que es el peor
            error posible en una cola de moderación. */}
        {consulta.isError ? (
          <PageError
            message="No se pudo cargar el contenido de los clubes. Puede haber denuncias esperando."
            onRetry={() => consulta.refetch()}
          />
        ) : cargando ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : !listaActiva.length ? (
          <Text c="dimmed" size="sm">
            {VACIO[bandeja]}
          </Text>
        ) : (
          <Stack gap={6}>
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
        <GlassCard delay={0.7} padding={18} style={{ marginTop: "calc(20 * var(--u))" }}>
          <Encabezado
            titulo="Clubes sin gimnasio (Nucleo)"
            avisos={
              (huerfanos.data ?? []).length > 0 ? (
                <Badge color="yellow" variant="light">
                  {(huerfanos.data ?? []).length} denunciado
                </Badge>
              ) : null
            }
          />
          {huerfanos.isError ? (
            <PageError
              message="No se pudo cargar la cola de clubes sin gimnasio."
              onRetry={() => huerfanos.refetch()}
            />
          ) : huerfanos.isLoading ? (
            <Text c="dimmed" size="sm">
              Cargando…
            </Text>
          ) : !(huerfanos.data ?? []).length ? (
            <Text c="dimmed" size="sm">
              No hay denuncias en clubes sin gimnasio.
            </Text>
          ) : (
            <Stack gap={6}>
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
        title={retiro ? `Retirar de ${retiro.fila.club_name}` : "Retirar del club"}
        centered
      >
        <Stack gap="md">
          <Select
            label="Motivo"
            placeholder="Elige un motivo (lo ve el autor)"
            value={motivo}
            onChange={(v) => setMotivo(v as MotivoModeracion | null)}
            data={MOTIVOS_MODERACION}
          />
          <Textarea
            label="Nota para el autor (opcional)"
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
