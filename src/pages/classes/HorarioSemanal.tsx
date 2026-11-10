import { Box, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import type { ClassSchedule } from "../../api/types";
import { armarCuadricula, horaDe } from "../../lib/horarioSemanal";

const DIA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIA_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Props = {
  franjas: ClassSchedule[];
  /** Nombre del coach por defecto de la franja, o null si no tiene. */
  coachDe: (f: ClassSchedule) => string | null;
  /** Si en la cuadrícula hay más de un servicio, cada clase dice cuál es. */
  conServicio: boolean;
  onAbrir: (f: ClassSchedule) => void;
  onNueva: (dia: number, hora: string) => void;
};

/**
 * El horario semanal como se ve en la pared del box: horas en filas, días en
 * columnas. Cada clase dice su coach y su cupo; las que no tienen coach se ven
 * en amarillo. Un espacio vacío es un botón para agregar ahí.
 *
 * En celular la cuadrícula no cabe: pasa a una lista por día.
 */
export function HorarioSemanal(props: Props) {
  return (
    <>
      <Box visibleFrom="sm">
        <Cuadricula {...props} />
      </Box>
      <Box hiddenFrom="sm">
        <PorDia {...props} />
      </Box>
    </>
  );
}

function Cuadricula({ franjas, coachDe, conServicio, onAbrir, onNueva }: Props) {
  const { horas, dias, celda } = armarCuadricula(franjas);
  return (
    <ScrollArea type="auto" offsetScrollbars>
      <div
        role="grid"
        aria-label="Horario semanal"
        style={{
          display: "grid",
          gridTemplateColumns: `56px repeat(${dias.length}, minmax(112px, 1fr))`,
          gap: 6,
          minWidth: 56 + dias.length * 118,
        }}
      >
        <div />
        {dias.map((d) => (
          <Text key={d} fw={700} size="sm" ta="center" role="columnheader">
            {DIA_CORTO[d]}
          </Text>
        ))}
        {horas.map((hora) => (
          <Fila key={hora}>
            <Text fw={700} size="sm" c="dimmed" pt={8} role="rowheader">
              {hora}
            </Text>
            {dias.map((d) => {
              const aqui = celda(hora, d);
              return (
                <Stack key={d} gap={4} role="gridcell">
                  {aqui.length ? (
                    aqui.map((f) => (
                      <Clase key={f.id} franja={f} coach={coachDe(f)} conServicio={conServicio} onAbrir={onAbrir} />
                    ))
                  ) : (
                    <Hueco etiqueta={`Agregar clase el ${DIA_LARGO[d]} a las ${hora}`} onClick={() => onNueva(d, hora)} />
                  )}
                </Stack>
              );
            })}
          </Fila>
        ))}
      </div>
    </ScrollArea>
  );
}

/** Una fila de la cuadrícula sin caja propia: sus hijos caen en las columnas del grid. */
function Fila({ children }: { children: ReactNode }) {
  return (
    <div role="row" style={{ display: "contents" }}>
      {children}
    </div>
  );
}

function PorDia({ franjas, coachDe, conServicio, onAbrir }: Props) {
  const { dias } = armarCuadricula(franjas);
  return (
    <Stack gap="md">
      {dias.map((d) => {
        const delDia = franjas
          .filter((f) => f.weekday === d)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        return (
          <div key={d}>
            <Text fw={700} size="sm" mb={6}>
              {DIA_LARGO[d]}
            </Text>
            {delDia.length ? (
              <Stack gap={6}>
                {delDia.map((f) => (
                  <Clase
                    key={f.id}
                    franja={f}
                    coach={coachDe(f)}
                    conServicio={conServicio}
                    conHora
                    onAbrir={onAbrir}
                  />
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Sin clases
              </Text>
            )}
          </div>
        );
      })}
    </Stack>
  );
}

function Clase({
  franja,
  coach,
  conServicio,
  conHora,
  onAbrir,
}: {
  franja: ClassSchedule;
  coach: string | null;
  conServicio: boolean;
  conHora?: boolean;
  onAbrir: (f: ClassSchedule) => void;
}) {
  const color = franja.color || "#888888";
  const sinCoach = !coach;
  const detalle = [conServicio ? franja.service_type_name : null, `cupo ${franja.capacity}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <UnstyledButton
      onClick={() => onAbrir(franja)}
      aria-label={`${franja.service_type_name} ${DIA_LARGO[franja.weekday]} ${horaDe(franja)}, ${
        coach ?? "sin coach"
      }`}
      style={{ display: "block", width: "100%" }}
    >
      {/* Box y no Paper: el tema le pone vidrio y radio de tarjeta a todo Paper. */}
      <Box
        px={8}
        py={6}
        style={{
          borderRadius: 8,
          background: sinCoach
            ? "var(--mantine-color-yellow-light)"
            : `color-mix(in srgb, ${color} 14%, transparent)`,
          border: sinCoach
            ? "1px dashed var(--mantine-color-yellow-filled)"
            : `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
        }}
      >
        <Text size="sm" fw={700} truncate c={sinCoach ? "var(--mantine-color-yellow-light-color)" : undefined}>
          {conHora ? `${horaDe(franja)} · ` : ""}
          {coach ?? "Sin coach"}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {detalle}
        </Text>
      </Box>
    </UnstyledButton>
  );
}

function Hueco({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        borderRadius: 8,
        border: "1px dashed var(--mantine-color-default-border)",
        color: "var(--mantine-color-dimmed)",
        fontSize: 18,
      }}
    >
      +
    </UnstyledButton>
  );
}
