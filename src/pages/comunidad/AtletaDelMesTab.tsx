import { useMemo, useState } from "react";
import { Badge, Button, Group, Modal, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useAthletesOfMonth,
  useAthletesOfMonthHistory,
  useMemberships,
  useSetAthleteOfMonth,
} from "../../api/hooks";
import type { AthleteOfMonth } from "../../api/types";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { Encabezado, nombreCorto, Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { thumb } from "./media";

/** "" es la fila de todo el gimnasio; el resto, un servicio por nombre. */
const nombreDe = (ct: string) => ct || "Todo el gym";

/**
 * El atleta del mes: una tarjeta por clase («Todo el gym» + un servicio activo
 * cada una). Las que no tienen a nadie salen en amarillo. Tocar una abre la
 * ventana para elegir y confirmar con «Publicar»: elegir en la lista no publica.
 *
 * Elegir es del `gym_admin` (403 al coach): el coach solo ve el histórico.
 */
export function AtletaDelMesTab({
  gymId,
  esAdmin,
  classTypes,
}: {
  gymId: string;
  esAdmin: boolean;
  classTypes: string[];
}) {
  return (
    <>
      {esAdmin && <Vigentes gymId={gymId} classTypes={classTypes} />}
      <Historico gymId={gymId} conMargen={esAdmin} />
    </>
  );
}

function Vigentes({ gymId, classTypes }: { gymId: string; classTypes: string[] }) {
  const memberships = useMemberships(gymId);
  const awards = useAthletesOfMonth(gymId);
  // null = cerrado; si no, la clase ("" = todo el gym) que se está eligiendo.
  const [abierta, setAbierta] = useState<string | null>(null);

  const activos = useMemo(
    () => (memberships.data ?? []).filter((m) => ["active", "trial"].includes(m.status ?? "")),
    [memberships.data],
  );
  const awardFor = (ct: string) => (awards.data ?? []).find((a) => (a.class_type ?? "") === ct);
  const filas = ["", ...classTypes];
  const sinElegir = awards.isLoading ? 0 : filas.filter((ct) => !awardFor(ct)).length;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Atleta del mes"
        avisos={
          sinElegir > 0 ? (
            <Badge color="yellow" variant="light">
              {sinElegir} sin elegir
            </Badge>
          ) : null
        }
      />
      {memberships.isError || awards.isError ? (
        // Sin padrón el selector queda vacío y parece que no hay atletas.
        <PageError
          message="No se pudo cargar el padrón o los destacados publicados."
          onRetry={() => {
            if (memberships.isError) memberships.refetch();
            if (awards.isError) awards.refetch();
          }}
        />
      ) : memberships.isLoading || awards.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {filas.map((ct) => {
            const actual = awardFor(ct);
            return (
              <Tarjeta
                key={ct || "__all__"}
                etiqueta={`Atleta del mes de ${nombreDe(ct)}`}
                onClick={() => setAbierta(ct)}
                aviso={!actual}
              >
                <Group gap="sm" wrap="nowrap">
                  {actual?.image || actual?.athlete_photo ? (
                    <img src={(actual.image || actual.athlete_photo) as string} alt="" style={thumb(44)} />
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700} truncate>
                      {nombreDe(ct)}
                    </Text>
                    <Text size="sm" c={actual ? undefined : "dimmed"} truncate>
                      {actual ? nombreCorto(actual.athlete_name) : "Sin elegir"}
                    </Text>
                  </div>
                </Group>
              </Tarjeta>
            );
          })}
        </SimpleGrid>
      )}
      <ElegirModal
        gymId={gymId}
        clase={abierta}
        actual={abierta === null ? undefined : awardFor(abierta)}
        atletas={activos.map((m) => ({ value: m.athlete, label: m.athlete_name }))}
        onClose={() => setAbierta(null)}
      />
    </GlassCard>
  );
}

function ElegirModal({
  gymId,
  clase,
  actual,
  atletas,
  onClose,
}: {
  gymId: string;
  clase: string | null;
  actual: AthleteOfMonth | undefined;
  atletas: { value: string; label: string }[];
  onClose: () => void;
}) {
  const setAom = useSetAthleteOfMonth(gymId);
  // Borrador: el cambio del Select NO publica; se confirma con el botón.
  const [elegido, setElegido] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  if (clase !== null && hydratedFor !== clase) {
    setHydratedFor(clase);
    setElegido(actual?.athlete ?? null);
  }
  if (clase === null && hydratedFor !== null) setHydratedFor(null);

  /** Publica (o quita, con `null`) y cierra solo si de verdad se aplicó. */
  const publicar = async (athleteId: string | null) => {
    if (clase === null) return;
    try {
      await setAom.mutateAsync({ class_type: clase, athlete_id: athleteId });
      notifications.show({
        color: "teal",
        message: athleteId
          ? `Atleta del mes publicado para ${clase || "todo el gym"}. Ya aparece en el feed con su imagen.`
          : `Atleta del mes de ${clase || "todo el gym"} quitado.`,
      });
      onClose();
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo publicar el atleta del mes",
        message: errMsg(e, "Revisa que el atleta siga activo en el gimnasio e intenta de nuevo."),
      });
    }
  };

  const cambia = !!elegido && elegido !== (actual?.athlete ?? null);

  return (
    <Modal
      opened={clase !== null}
      onClose={onClose}
      title={`Atleta del mes · ${nombreDe(clase ?? "")}`}
      centered
    >
      <Stack gap="md">
        {actual?.image && (
          <a href={actual.image} target="_blank" rel="noreferrer" aria-label="Ver la imagen publicada">
            <img src={actual.image} alt={actual.athlete_name} style={thumb(160)} />
          </a>
        )}
        <Select
          label="Atleta"
          placeholder="Busca por nombre"
          value={elegido}
          onChange={setElegido}
          clearable
          searchable
          nothingFoundMessage="Nadie con ese nombre"
          data={atletas}
          data-autofocus
        />
        <Group justify="space-between" gap="sm">
          {actual ? (
            <Button variant="subtle" color="red" loading={setAom.isPending && !cambia} onClick={() => publicar(null)}>
              Quitar
            </Button>
          ) : (
            <span />
          )}
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button color="flame" disabled={!cambia} loading={setAom.isPending && cambia} onClick={() => publicar(elegido)}>
              Publicar
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

/** Todos los destacados publicados, del mes más reciente al más antiguo. */
function Historico({ gymId, conMargen }: { gymId: string; conMargen: boolean }) {
  const historia = useAthletesOfMonthHistory(gymId);
  const filas = historia.data ?? [];
  return (
    <GlassCard delay={0.7} padding={18} style={conMargen ? { marginTop: "calc(20 * var(--u))" } : undefined}>
      <Encabezado titulo="Histórico" />
      {historia.isError ? (
        <PageError
          message="No se pudo cargar el histórico de atletas del mes."
          onRetry={() => historia.refetch()}
        />
      ) : historia.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : !filas.length ? (
        <Text c="dimmed" size="sm">
          Aún no has publicado atletas del mes.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {filas.map((a) => (
            <Tarjeta key={a.id} etiqueta={`${a.athlete_name}, ${a.period}`}>
              <Group gap="sm" wrap="nowrap">
                {a.image ? (
                  <a href={a.image} target="_blank" rel="noreferrer" aria-label={`Ver la imagen de ${a.period}`}>
                    <img src={a.image} alt="" style={thumb(48)} />
                  </a>
                ) : a.athlete_photo ? (
                  <img src={a.athlete_photo} alt="" style={thumb(48, true)} />
                ) : null}
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {a.athlete_name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {a.period} · {nombreDe(a.class_type)}
                  </Text>
                </div>
              </Group>
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}
    </GlassCard>
  );
}
