import { useState } from "react";
import { Badge, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useClassRequests, useDecideClassRequest } from "../../api/hooks";
import type { ClassAssignmentRequest } from "../../api/types";
import { GlassCard } from "../../components/aurora";
import { PageError } from "../../components/PageStatus";
import { CountBadge, SectionLabel } from "../../components/ui";
import { errMsg } from "../../lib/errors";

const cuando = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Una postulación con sus dos decisiones. El rechazo pide motivo. */
function Solicitud({ s, gymId }: { s: ClassAssignmentRequest; gymId: string }) {
  const decidir = useDecideClassRequest(gymId);
  const [nota, setNota] = useState("");

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
    <GlassCard>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={4} style={{ minWidth: 240, flex: 1 }}>
          <Text fw={600}>{s.coach_name}</Text>
          <Text size="sm" c="dimmed">
            Pide dar <b>{s.class_type}</b> · {cuando(s.starts_at)}
          </Text>
          <Group gap={6}>
            <Badge size="xs" variant="light">
              {s.reserved_count}/{s.capacity} inscritos
            </Badge>
            <Badge size="xs" variant="light" color="gray">
              {s.duration_min} min
            </Badge>
          </Group>
          {s.message ? (
            <Text size="sm" fs="italic">
              «{s.message}»
            </Text>
          ) : null}
        </Stack>
        <Stack gap="xs" style={{ minWidth: 260 }}>
          {/* El motivo viaja al aviso del coach: sin él, "no te la asignaron" se
              lee como un portazo. Es opcional a propósito —obligarlo haría que se
              escribiera "no" con tal de cerrar la fila—. */}
          <TextInput
            size="xs"
            placeholder="Motivo del rechazo (lo verá el coach)"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
          />
          <Group gap="xs">
            <Button size="xs" loading={decidir.isPending} onClick={() => decidir_("approve")}>
              Asignar la clase
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              disabled={decidir.isPending}
              onClick={() => decidir_("reject")}
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </Group>
    </GlassCard>
  );
}

/** Una clase que TÚ ofreciste y espera respuesta del coach. Aquí no hay botones:
 *  decide él, y el único movimiento posible es asignársela a otro. */
function Ofrecida({ s }: { s: ClassAssignmentRequest }) {
  return (
    <GlassCard>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={4} style={{ minWidth: 240, flex: 1 }}>
          <Text fw={600}>{s.coach_name}</Text>
          <Text size="sm" c="dimmed">
            Le ofreciste <b>{s.class_type}</b> · {cuando(s.starts_at)}
          </Text>
          {s.message ? (
            <Text size="sm" fs="italic">
              «{s.message}»
            </Text>
          ) : null}
        </Stack>
        <Badge variant="light" color="gray">
          Esperando su respuesta
        </Badge>
      </Group>
    </GlassCard>
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
export function ClassRequestsTab({ gymId }: { gymId: string }) {
  const solicitudes = useClassRequests(gymId);
  const filas = solicitudes.data ?? [];
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
    <Stack gap="md">
      <Group gap="sm">
        <SectionLabel>Solicitudes de clase</SectionLabel>
        {pedidas.length > 0 ? <CountBadge count={pedidas.length} /> : null}
      </Group>
      <Text size="sm" c="dimmed">
        Cuando un coach tuyo pide una clase futura que aún no tiene coach, aparece aquí. Al
        asignarla, las demás solicitudes de esa misma clase se rechazan solas y el coach recibe el
        aviso.
      </Text>
      {solicitudes.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando solicitudes…
        </Text>
      ) : pedidas.length === 0 ? (
        <GlassCard>
          <Text size="sm" c="dimmed">
            Nada pendiente. Tus coaches pueden pedir cualquier clase futura sin asignar desde la
            app.
          </Text>
        </GlassCard>
      ) : (
        pedidas.map((s) => <Solicitud key={s.id} s={s} gymId={gymId} />)
      )}

      {ofrecidas.length > 0 && (
        <>
          <Group gap="sm" mt="md">
            <SectionLabel>Clases que ofreciste</SectionLabel>
            <CountBadge count={ofrecidas.length} />
          </Group>
          <Text size="sm" c="dimmed">
            Se las propusiste desde el calendario y decide el coach. Mientras no acepte, la clase
            sigue sin asignar; te avisamos en cuanto conteste.
          </Text>
          {ofrecidas.map((s) => (
            <Ofrecida key={s.id} s={s} />
          ))}
        </>
      )}
    </Stack>
  );
}
