import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useDeleteAnnouncement,
  useGymAnnouncements,
  usePostAnnouncement,
  useUpdateAnnouncement,
} from "../../api/hooks";
import type { GymAnnouncement } from "../../api/types";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { Encabezado, Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { fecha, MEDIA_FRAME, thumb } from "./media";

/**
 * Anuncios del gimnasio en el feed: la lista de lo publicado y, con
 * «Nuevo anuncio», el alta. Tocar un anuncio abre la MISMA ventana para
 * corregirlo o quitarlo.
 *
 * Corregir NO vuelve a notificar (repetir el push por arreglar una tilde es
 * spam) y quitar es en blando: desaparece del feed, pero queda el rastro de que
 * se publicó. Solo el `gym_admin`: al coach el backend le responde 403.
 */
export function AnunciosTab({ gymId, classTypes }: { gymId: string; classTypes: string[] }) {
  const anuncios = useGymAnnouncements(gymId);
  // null = cerrado · "nuevo" = alta · un anuncio = corrección.
  const [abierto, setAbierto] = useState<GymAnnouncement | "nuevo" | null>(null);
  const filas = anuncios.data ?? [];

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Anuncios">
        <Button onClick={() => setAbierto("nuevo")}>Nuevo anuncio</Button>
      </Encabezado>

      {anuncios.isError ? (
        <PageError
          message="No se pudieron cargar los anuncios publicados."
          onRetry={() => anuncios.refetch()}
        />
      ) : anuncios.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !filas.length ? (
        <Text c="dimmed" size="sm">
          Todavía no has publicado ningún anuncio.
        </Text>
      ) : (
        <Stack gap={6}>
          {filas.map((a) => (
            <Tarjeta key={a.id} etiqueta={`Editar anuncio ${a.title}`} onClick={() => setAbierto(a)}>
              <Group gap="sm" wrap="nowrap" align="flex-start">
                {a.photo && <img src={a.photo} alt="" style={thumb(44)} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={600} truncate>
                    {a.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {a.body}
                  </Text>
                  <Group gap={6} mt={4}>
                    <Badge variant="light" color={a.class_type ? "flame" : "gray"} size="xs">
                      {a.class_type || "Todo el gym"}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {fecha(a.created_at)}
                      {a.updated_at && a.updated_at !== a.created_at
                        ? ` · Corregido el ${fecha(a.updated_at)}`
                        : ""}
                    </Text>
                  </Group>
                </div>
              </Group>
            </Tarjeta>
          ))}
        </Stack>
      )}

      <AnuncioModal
        gymId={gymId}
        anuncio={abierto}
        classTypes={classTypes}
        onClose={() => setAbierto(null)}
      />
    </GlassCard>
  );
}

function AnuncioModal({
  gymId,
  anuncio,
  classTypes,
  onClose,
}: {
  gymId: string;
  anuncio: GymAnnouncement | "nuevo" | null;
  classTypes: string[];
  onClose: () => void;
}) {
  const publicar = usePostAnnouncement(gymId);
  const actualizar = useUpdateAnnouncement(gymId);
  const borrar = useDeleteAnnouncement(gymId);

  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [segmento, setSegmento] = useState<string | null>("");
  const [foto, setFoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [hydratedFor, setHydratedFor] = useState<GymAnnouncement | "nuevo" | null>(null);
  const existente = anuncio && anuncio !== "nuevo" ? anuncio : null;

  if (anuncio && hydratedFor !== anuncio) {
    setHydratedFor(anuncio);
    setTitulo(existente?.title ?? "");
    setCuerpo(existente?.body ?? "");
    setSegmento(existente?.class_type ?? "");
    setFoto(null);
    setVideo(null);
  }

  // Vista previa de la foto nueva, liberada al cambiarla o cerrar.
  const vistaPrevia = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(
    () => () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia],
  );

  const segmentos = [
    { value: "", label: "Todo el gym" },
    ...classTypes.map((ct) => ({ value: ct, label: `Solo ${ct}` })),
  ];

  /**
   * Publica o corrige. Siempre con catch: antes, si el backend rechazaba el
   * anuncio (archivo muy pesado, segmento inválido) el admin no veía nada y
   * creía haber publicado. Si falla, lo escrito se queda en la ventana.
   */
  const guardar = async () => {
    try {
      if (existente) {
        await actualizar.mutateAsync({
          id: existente.id,
          title: titulo,
          body: cuerpo,
          class_type: segmento ?? "",
          photo: foto,
          video,
        });
        notifications.show({
          color: "teal",
          message: "Anuncio corregido. No se volvió a notificar a nadie.",
        });
      } else {
        await publicar.mutateAsync({
          title: titulo,
          body: cuerpo,
          class_type: segmento || undefined,
          photo: foto,
          video,
        });
        notifications.show({
          color: "teal",
          message: segmento
            ? `Anuncio publicado para ${segmento}. Ya está en el feed de esos atletas.`
            : "Anuncio publicado. Ya está en el feed de todo el gimnasio.",
        });
      }
      onClose();
    } catch (e) {
      notifications.show({
        color: "red",
        message: existente
          ? errMsg(e, "No se pudo corregir el anuncio.")
          : errMsg(e, "No se pudo publicar el anuncio. Intenta de nuevo."),
      });
    }
  };

  const quitar = () => {
    if (!existente) return;
    if (
      !window.confirm(
        `¿Quitar del feed el anuncio "${existente.title}"?\n\nDeja de verse en la app. El push que ya salió no se puede deshacer.`,
      )
    )
      return;
    borrar.mutate(existente.id, {
      onSuccess: () => {
        notifications.show({ color: "teal", message: "Anuncio quitado del feed." });
        onClose();
      },
      onError: (e) =>
        notifications.show({ color: "red", message: errMsg(e, "No se pudo quitar el anuncio.") }),
    });
  };

  return (
    <Modal
      opened={!!anuncio}
      onClose={onClose}
      title={existente ? "Corregir anuncio" : "Nuevo anuncio"}
      centered
      size="lg"
    >
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.currentTarget.value)}
            data-autofocus
          />
          <Select label="Segmento" value={segmento} onChange={setSegmento} data={segmentos} allowDeselect={false} />
        </SimpleGrid>
        <Textarea
          label="Mensaje"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.currentTarget.value)}
          autosize
          minRows={3}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <FileInput
            label={existente ? "Reemplazar foto" : "Foto (opcional)"}
            placeholder="Subir imagen"
            accept="image/*"
            clearable
            value={foto}
            onChange={setFoto}
          />
          <FileInput
            label={existente ? "Reemplazar video" : "Video (opcional)"}
            placeholder="Subir video"
            accept="video/*"
            clearable
            value={video}
            onChange={setVideo}
          />
        </SimpleGrid>
        {vistaPrevia ? (
          <img src={vistaPrevia} alt="Vista previa" style={{ ...MEDIA_FRAME, width: 200, maxWidth: "100%" }} />
        ) : existente?.photo ? (
          <img src={existente.photo} alt="Foto actual" style={thumb(56)} />
        ) : null}

        <Group justify="space-between" mt="xs" gap="sm">
          {existente ? (
            <Button variant="subtle" color="red" loading={borrar.isPending} onClick={quitar}>
              Quitar del feed
            </Button>
          ) : (
            <span />
          )}
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              loading={publicar.isPending || actualizar.isPending}
              disabled={!titulo.trim() || !cuerpo.trim()}
              onClick={guardar}
            >
              {existente ? "Guardar cambios" : "Publicar anuncio"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
