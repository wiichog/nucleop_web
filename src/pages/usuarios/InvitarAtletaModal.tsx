import { FormEvent, useState } from "react";
import { Button, Group, Modal, SimpleGrid, Text, TextInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useInviteAthlete } from "../../api/hooks";
import { PhoneInput } from "../../components/PhoneInput";

const iso = (d: Date | null) => (d ? d.toLocaleDateString("en-CA") : null);

/** Extrae el mensaje real de la API (detail o error de campo) para no esconder la causa. */
export function inviteErrorMessage(err: unknown): string | null {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response?.data;
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  // `detail` puede ser string (errores de negocio) u objeto de errores de campo.
  if (typeof obj.detail === "string") return obj.detail;
  const bag = (
    obj.detail && typeof obj.detail === "object" ? obj.detail : obj
  ) as Record<string, unknown>;
  for (const key of ["trial_start", "trial_end", "phone", "email"]) {
    const v = bag[key];
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    if (typeof v === "string") return v;
  }
  return null;
}

const VACIO = { email: "", first_name: "", last_name: "", phone: "" };

/**
 * Invitar a alguien al gimnasio. Lo comparten Atletas y Solicitudes: es el mismo
 * `POST /gym/{id}/invitations`, solo cambia desde dónde se llega. La invitación
 * aparece en la bandeja de Solicitudes hasta que la persona la acepta.
 */
export function InvitarAtletaModal({
  gymId,
  opened,
  onClose,
}: {
  gymId: string;
  opened: boolean;
  onClose: () => void;
}) {
  const invite = useInviteAthlete(gymId);
  const [form, setForm] = useState(VACIO);
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [abiertoAntes, setAbiertoAntes] = useState(false);

  // Cada vez que se abre arranca en blanco .
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    setForm(VACIO);
    setTrialStart(null);
    setTrialEnd(null);
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  // Al cerrar se olvida el error: la próxima vez arranca limpio.
  const cerrar = () => {
    invite.reset?.();
    onClose();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // El error lo pinta `invite.isError` debajo del formulario; el catch existe
    // para que el rechazo no quede sin dueño (promesa colgada en consola).
    try {
      await invite.mutateAsync({ ...form, trial_start: iso(trialStart), trial_end: iso(trialEnd) });
      notifications.show({
        color: "teal",
        message: `Invitación enviada a ${form.email}. La ves en Solicitudes hasta que la acepte.`,
      });
      cerrar();
    } catch {
      /* mensaje ya visible en el formulario */
    }
  };

  return (
    <Modal opened={opened} onClose={cerrar} title="Invitar atleta" centered size="lg">
      <form onSubmit={onSubmit}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Correo electrónico"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
            data-autofocus
          />
          <PhoneInput
            label="Teléfono (opcional)"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
          <TextInput
            label="Nombre"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.currentTarget.value })}
          />
          <TextInput
            label="Apellido"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.currentTarget.value })}
          />
          {/* No se permiten fechas en el pasado (el backend lo revalida). */}
          <DateInput
            label="Prueba desde (opcional)"
            value={trialStart}
            onChange={setTrialStart}
            valueFormat="YYYY-MM-DD"
            minDate={new Date()}
            clearable
            popoverProps={{ withinPortal: true }}
          />
          <DateInput
            label="Prueba hasta (opcional)"
            value={trialEnd}
            onChange={setTrialEnd}
            valueFormat="YYYY-MM-DD"
            minDate={trialStart ?? new Date()}
            clearable
            popoverProps={{ withinPortal: true }}
          />
        </SimpleGrid>
        {invite.isError && (
          <Text c="red" size="sm" mt="sm">
            {inviteErrorMessage(invite.error) ?? "No se pudo enviar la invitación. Verifica los datos."}
          </Text>
        )}
        <Group justify="flex-end" mt="lg" gap="xs">
          <Button variant="default" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={invite.isPending}
            disabled={!form.email || !form.first_name || !form.last_name}
          >
            Enviar invitación
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
