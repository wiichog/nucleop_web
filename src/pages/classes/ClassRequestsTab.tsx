import { useState } from "react";
import { Badge, Button, Group, Popover, Stack, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useClassRequests, useDecideClassRequest } from "../../api/hooks";
import type { ClassAssignmentRequest } from "../../api/types";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { CountBadge } from "../../components/ui";
import { Encabezado, nombreCorto, Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { coincideServicio, FiltroServicio, opcionesDeServicio } from "./FiltroServicio";

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

/** Una postulación con sus dos decisiones. El rechazo pide motivo al presionarlo. */
function Solicitud({ s, gymId }: { s: ClassAssignmentRequest; gymId: string }) {
  const decidir = useDecideClassRequest(gymId);
  const [nota, setNota] = useState("");
  const [rechazando, setRechazando] = useState(false);

  const ok = (m: string) => notifications.show({ color: "teal", message: m });
  const fail = (m: string) => notifications.show({ color: "red", message: m });

  const decidir_ = (action: "approve" | "reject") =>
    decidir.mutate(
      { requestId: s.id, action, note: action === "reject" ? nota : "" },
      {
        onSuccess: () =>
          ok(
            action === "approve"
              ? `${s.coach_name} queda asignado a ${s.class_type}.`
              : "Solicitud rechazada. El coach recibe tu motivo.",
          ),
        onError: (error) => fail(errMsg(error, "No se pudo completar la acción.")),
      },
    );

  return (
    <Tarjeta etiqueta={`${s.coach_name} pide ${s.class_type}`}>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <div style={{ minWidth: 220, flex: 1 }}>
          <Text size="sm">
            <b>{nombreCorto(s.coach_name)}</b>{" "}
            <Text span c="dimmed">
              pide {s.class_type} · {cuando(s.starts_at)} · {s.reserved_count}/{s.capacity}
            </Text>
          </Text>
          {s.message ? (
            <Text size="xs" fs="italic" c="dimmed" mt={2}>
              «{s.message}»
            </Text>
          ) : null}
        </div>
        <Group gap="xs">
          <Button size="xs" loading={decidir.isPending && !rechazando} onClick={() => decidir_("approve")}>
            Asignar
          </Button>
          {/* El motivo viaja al aviso del coach. Es opcional a propósito: obligarlo
              haría que se escribiera "no" con tal de cerrar la fila. */}
          <Popover opened={rechazando} onChange={setRechazando} position="bottom-end" withArrow trapFocus>
            <Popover.Target>
              <Button size="xs" color="red" variant="light" disabled={decidir.isPending} onClick={() => setRechazando((v) => !v)}>
                Rechazar
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs" w={240}>
                <TextInput
                  size="xs"
                  placeholder="Motivo (opcional, lo ve el coach)"
                  value={nota}
                  onChange={(e) => setNota(e.currentTarget.value)}
                  data-autofocus
                />
                <Button size="xs" color="red" loading={decidir.isPending} onClick={() => decidir_("reject")}>
                  Rechazar solicitud
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Group>
    </Tarjeta>
  );
}

/** Una clase que TÚ ofreciste y espera respuesta del coach. Aquí no hay botones:
 *  decide él, y el único movimiento posible es asignársela a otro. */
function Ofrecida({ s }: { s: ClassAssignmentRequest }) {
  return (
    <Tarjeta etiqueta={`Ofreciste ${s.class_type} a ${s.coach_name}`}>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" style={{ flex: 1, minWidth: 220 }}>
          <b>{nombreCorto(s.coach_name)}</b>{" "}
          <Text span c="dimmed">
            · {s.class_type} · {cuando(s.starts_at)}
          </Text>
        </Text>
        <Badge variant="light" color="gray">
          Esperando respuesta
        </Badge>
      </Group>
    </Tarjeta>
  );
}

/**
 * Las clases en conversación con tus coaches, en los dos sentidos.
 *
 * **Te piden** (`request`): un coach mira la agenda y pide una clase futura sin
 * asignar. Aprobar **asigna la clase** y cierra lo demás que colgaba de ella (las
 * otras postulaciones y la cobertura que hubiera pedido un atleta). Pedir no
 * asigna nada: repartir la agenda sigue siendo decisión del gimnasio y no una
 * carrera por tocar primero el botón, que es lo que ya hace el handoff cuando la
 * clase se quedó huérfana con el reloj en contra.
 *
 * **Ofreciste** (`invite`): se la propusiste a alguien desde el calendario y la
 * pelota la tiene él. Se listan porque una clase esperando un sí no es una clase
 * asignada, y sin verlas el viernes se llega al lunes creyendo que estaba dada.
 */
export function ClassRequestsTab({
  gymId,
  servicio = null,
  setServicio,
}: {
  gymId: string;
  servicio?: string | null;
  setServicio?: (s: string | null) => void;
}) {
  const solicitudes = useClassRequests(gymId);
  const todas = solicitudes.data ?? [];
  const filas = todas.filter((f) => coincideServicio(f.class_type, servicio));
  const pedidas = filas.filter((f) => f.kind !== "invite");
  const ofrecidas = filas.filter((f) => f.kind === "invite");

  if (solicitudes.isError) {
    return (
      <PageError
        message={errMsg(solicitudes.error, "No se pudieron cargar las solicitudes.")}
        onRetry={() => solicitudes.refetch()}
      />
    );
  }

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Te piden"
        avisos={pedidas.length > 0 ? <CountBadge count={pedidas.length} /> : null}
      >
        {setServicio && (todas.length > 0 || servicio) ? (
          <FiltroServicio
            opciones={opcionesDeServicio(
              todas.map((f) => f.class_type),
              servicio,
            )}
            value={servicio}
            onChange={setServicio}
          />
        ) : null}
      </Encabezado>
      {solicitudes.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando…
        </Text>
      ) : pedidas.length === 0 ? (
        <Text size="sm" c="dimmed">
          {servicio && todas.some((f) => f.kind !== "invite")
            ? `Ninguna solicitud de ${servicio}.`
            : "Nada pendiente."}
        </Text>
      ) : (
        <Stack gap={6}>
          {pedidas.map((s) => (
            <Solicitud key={s.id} s={s} gymId={gymId} />
          ))}
        </Stack>
      )}

      {ofrecidas.length > 0 && (
        <>
          <Title order={4} mt="xl" mb="sm">
            Ofreciste
          </Title>
          <Stack gap={6}>
            {ofrecidas.map((s) => (
              <Ofrecida key={s.id} s={s} />
            ))}
          </Stack>
        </>
      )}
    </GlassCard>
  );
}
