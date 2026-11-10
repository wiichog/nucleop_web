import { Badge, Button, Divider, Group, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import type { Wod } from "../../api/types";
import { bloquesConScore, partesOrdenadas, tienePartes } from "../../lib/wodPartes";
import { diasDeSemana, etiquetaColumna, isoLocal, wodDelDia } from "../../lib/semanaWod";

/**
 * La semana programada de un programa, un día por columna y cada workout
 * completo, bloque por bloque: así la lee el coach, igual que en su sistema de
 * programación. Antes el workout creado salía en una fila de tabla con el texto
 * cortado, y el box decía que «no se veía».
 */
export function SemanaWods({
  wods,
  lunes,
  programa,
  hoy,
  cargando,
  ocupado,
  etiquetaScore,
  onProgramar,
  onEditar,
  onBoard,
  onPublicar,
  onEliminar,
}: {
  wods: Wod[];
  lunes: Date;
  /** Id del servicio; "" = General. */
  programa: string;
  hoy: string;
  cargando: boolean;
  ocupado: boolean;
  etiquetaScore: (s: string) => string;
  onProgramar: (fecha: string) => void;
  onEditar: (w: Wod) => void;
  onBoard: (w: Wod) => void;
  onPublicar: (w: Wod) => void;
  onEliminar: (w: Wod) => void;
}) {
  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Group wrap="nowrap" align="stretch" gap="sm" pb="xs">
        {diasDeSemana(lunes).map((d) => {
          const fecha = isoLocal(d);
          const wod = wodDelDia(wods, fecha, programa);
          const esHoy = fecha === hoy;
          // Un día por venir (lunes a sábado) sin workout: lo que falta programar.
          const pendiente = !cargando && !wod && fecha >= hoy && d.getDay() !== 0;
          return (
            <Paper
              key={fecha}
              withBorder
              radius="md"
              p="sm"
              w={250}
              style={{
                flex: "0 0 auto",
                borderColor: esHoy
                  ? "var(--mantine-color-flame-6)"
                  : pendiente
                    ? "var(--mantine-color-yellow-filled)"
                    : undefined,
                borderWidth: esHoy ? 2 : undefined,
                borderStyle: pendiente && !esHoy ? "dashed" : undefined,
                background: pendiente ? "var(--mantine-color-yellow-light)" : undefined,
              }}
              data-dia={fecha}
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Text fw={700}>{etiquetaColumna(d)}</Text>
                <Group gap={4} wrap="nowrap">
                  {esHoy && (
                    <Badge size="xs" color="flame">
                      Hoy
                    </Badge>
                  )}
                  {wod && <EstadoBadge wod={wod} />}
                </Group>
              </Group>

              {cargando ? (
                <Text size="sm" c="dimmed">
                  Cargando…
                </Text>
              ) : wod ? (
                <DiaConWod
                  wod={wod}
                  ocupado={ocupado}
                  etiquetaScore={etiquetaScore}
                  onEditar={onEditar}
                  onBoard={onBoard}
                  onPublicar={onPublicar}
                  onEliminar={onEliminar}
                />
              ) : (
                <Stack gap="xs" align="flex-start">
                  <Text size="sm" c="dimmed">
                    Sin workout
                  </Text>
                  <Button size="compact-xs" variant="light" onClick={() => onProgramar(fecha)}>
                    Programar
                  </Button>
                </Stack>
              )}
            </Paper>
          );
        })}
      </Group>
    </ScrollArea>
  );
}

function EstadoBadge({ wod }: { wod: Wod }) {
  if (wod.published)
    return (
      <Badge size="xs" color="green">
        Publicado
      </Badge>
    );
  if (wod.publish_at)
    return (
      <Badge size="xs" color="yellow" variant="light">
        Programado
      </Badge>
    );
  return (
    <Badge size="xs" color="gray" variant="light">
      Borrador
    </Badge>
  );
}

function DiaConWod({
  wod,
  ocupado,
  etiquetaScore,
  onEditar,
  onBoard,
  onPublicar,
  onEliminar,
}: {
  wod: Wod;
  ocupado: boolean;
  etiquetaScore: (s: string) => string;
  onEditar: (w: Wod) => void;
  onBoard: (w: Wod) => void;
  onPublicar: (w: Wod) => void;
  onEliminar: (w: Wod) => void;
}) {
  const conBoard = bloquesConScore(wod).length > 0;
  return (
    <Stack gap="xs">
      {/* Un workout de antes de los bloques: su texto es todo lo que tiene. */}
      {!tienePartes(wod) && (
        <>
          <Text fw={700} size="sm">
            {wod.title}
          </Text>
          {wod.description && <Texto>{wod.description}</Texto>}
        </>
      )}
      {partesOrdenadas(wod).map((p, i) => {
        const tipo = p.score_type ?? "none";
        return (
          <div key={p.id ?? i}>
            {i > 0 && <Divider mb="xs" />}
            <Group gap={6} wrap="nowrap" align="flex-start" justify="space-between">
              <Text fw={700} size="sm">
                {p.title}
              </Text>
              {tipo !== "none" && (
                <Badge size="xs" variant="light" style={{ flex: "0 0 auto" }}>
                  {etiquetaScore(tipo)}
                </Badge>
              )}
            </Group>
            {p.description && <Texto>{p.description}</Texto>}
          </div>
        );
      })}
      {wod.results_count > 0 && (
        <Text size="xs" c="dimmed">
          {wod.results_count} {wod.results_count === 1 ? "score" : "scores"}
        </Text>
      )}
      <Group gap={4} mt={4}>
        <Button size="compact-xs" variant="default" onClick={() => onEditar(wod)}>
          Editar
        </Button>
        {conBoard && (
          <Button size="compact-xs" variant="light" onClick={() => onBoard(wod)}>
            Board
          </Button>
        )}
        <Button size="compact-xs" variant="light" loading={ocupado} onClick={() => onPublicar(wod)}>
          {wod.published ? "Despublicar" : "Publicar"}
        </Button>
        <Button size="compact-xs" variant="subtle" color="red" loading={ocupado} onClick={() => onEliminar(wod)}>
          Eliminar
        </Button>
      </Group>
    </Stack>
  );
}

/** El texto tal como lo escribió el coach: con sus saltos de línea. */
function Texto({ children }: { children: string }) {
  return (
    <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
      {children}
    </Text>
  );
}
