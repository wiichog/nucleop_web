import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Copy, Plus, Send, TriangleAlert } from "lucide-react";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type Invitation,
} from "../../api/onboarding";
import { errMsg } from "../../lib/errors";
import { label } from "../../lib/labels";
import { EmptyState } from "../EmptyState";
import { PageError, PageLoading } from "../PageStatus";
import { SectionLabel } from "../ui";
import { FilterChip, GlassCard, Stagger } from "../aurora";
import { copiarTexto } from "./clipboard";
import { ESTADO_ENLACE, ESTADO_ENLACE_COLOR } from "./labels";

/**
 * Enlaces privados de alta: emitir, reenviar, revocar y —sobre todo— copiar.
 *
 * Un enlace no se edita ni se borra nunca: es la evidencia de a quién se le mandó qué
 * y cuándo. Por eso las únicas acciones son las tres que el backend expone.
 */

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "used", label: "Usados" },
  { value: "revoked", label: "Anulados" },
  { value: "expired", label: "Vencidos" },
];

const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—";

const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-GT", { dateStyle: "medium" }) : "—";

/** Copia el enlace y avisa SIEMPRE, también cuando el navegador lo bloqueó. */
async function copiarEnlace(url: string) {
  if (await copiarTexto(url)) {
    notifications.show({ color: "teal", message: "Enlace copiado." });
  } else {
    notifications.show({
      color: "red",
      autoClose: false,
      message: "El navegador bloqueó el portapapeles. Selecciona el enlace y cópialo a mano.",
    });
  }
}

/** Formulario de emisión + el panel de "listo" con el enlace ya creado. */
function ModalEmitir({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [gymName, setGymName] = useState("");
  const [note, setNote] = useState("");
  const [dias, setDias] = useState<number | string>(14);
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  // El enlace recién creado. Se queda en pantalla hasta que la persona cierre: si el
  // correo no salió, esta es la ÚNICA vez que va a ver la URL sin ir a buscarla.
  const [creado, setCreado] = useState<Invitation | null>(null);

  const cerrar = () => {
    setCreado(null);
    onClose();
  };

  const crear = useMutation({
    mutationFn: () =>
      createInvitation({
        email: email.trim(),
        contact_name: contactName.trim(),
        gym_name: gymName.trim(),
        note: note.trim(),
        days_valid: typeof dias === "number" ? dias : null,
        send_email: enviarCorreo,
      }),
    onSuccess: (invitacion) => {
      qc.invalidateQueries({ queryKey: ["onboarding-invitations"] });
      qc.invalidateQueries({ queryKey: ["onboarding-pipeline"] });
      setCreado(invitacion);
      setEmail("");
      setContactName("");
      setGymName("");
      setNote("");
    },
    onError: (error) =>
      notifications.show({ color: "red", message: errMsg(error, "No se pudo emitir el enlace.") }),
  });

  // `email_sent` solo llega en la respuesta de creación; `undefined` = no se pidió correo.
  const correoFallo = creado ? creado.email_sent === false : false;

  return (
    <Modal
      opened={opened}
      onClose={cerrar}
      centered
      size="lg"
      title={creado ? "Enlace emitido" : "Emitir enlace de alta"}
    >
      {creado ? (
        <Stack gap="sm">
          {correoFallo ? (
            <Alert color="red" icon={<TriangleAlert size={16} />} title="El correo no salió">
              El enlace se creó bien, pero no pudimos enviarlo a{" "}
              <strong>{creado.email}</strong>. Cópialo y mándaselo tú; si cierras esta
              ventana sin copiarlo, lo encuentras en la tabla.
            </Alert>
          ) : (
            <Alert color="teal">
              {enviarCorreo
                ? `Le mandamos el enlace a ${creado.email}.`
                : "El enlace quedó creado. No se envió ningún correo: cópialo y mándaselo tú."}
            </Alert>
          )}

          <TextInput
            label="Enlace privado"
            value={creado.url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <Text size="xs" c="dimmed">
            Es de un solo uso y vence el {fechaCorta(creado.expires_at)}.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              leftSection={<Copy size={15} />}
              onClick={() => copiarEnlace(creado.url)}
            >
              Copiar enlace
            </Button>
            <Button onClick={cerrar}>Listo</Button>
          </Group>
        </Stack>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate();
          }}
        >
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Correo del contacto"
                placeholder="dueno@subox.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <TextInput
                label="Nombre del contacto"
                placeholder="Cómo se llama quien va a firmar"
                value={contactName}
                onChange={(e) => setContactName(e.currentTarget.value)}
              />
              <TextInput
                label="Nombre del gimnasio"
                placeholder="Se lo pre-llenamos en el formulario"
                value={gymName}
                onChange={(e) => setGymName(e.currentTarget.value)}
              />
              <NumberInput
                label="Días de vigencia"
                description="Entre 1 y 90"
                min={1}
                max={90}
                value={dias}
                onChange={setDias}
              />
            </SimpleGrid>
            <Textarea
              label="Nota interna"
              description="No la ve el prospecto. Para acordarte de quién es y de qué le ofreciste."
              autosize
              minRows={2}
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
            />
            <Switch
              label="Mandar el correo con el enlace"
              checked={enviarCorreo}
              onChange={(e) => setEnviarCorreo(e.currentTarget.checked)}
            />
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" loading={crear.isPending} disabled={!email.trim()}>
                Emitir enlace
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}

export function InvitationsSection() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);
  const [porRevocar, setPorRevocar] = useState<Invitation | null>(null);

  const enlaces = useQuery({
    queryKey: ["onboarding-invitations", estado],
    queryFn: () => listInvitations(estado || undefined),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["onboarding-invitations"] });
    qc.invalidateQueries({ queryKey: ["onboarding-pipeline"] });
  };

  const reenviar = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: (invitacion) => {
      refrescar();
      notifications.show(
        invitacion.email_sent === false
          ? {
              color: "red",
              autoClose: false,
              message: `No pudimos reenviar el correo a ${invitacion.email}. Copia el enlace y mándaselo a mano.`,
            }
          : { color: "teal", message: `Enlace reenviado a ${invitacion.email}.` },
      );
    },
    onError: (error) =>
      notifications.show({ color: "red", message: errMsg(error, "No se pudo reenviar.") }),
  });

  const revocar = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      refrescar();
      setPorRevocar(null);
      notifications.show({ color: "teal", message: "Enlace anulado." });
    },
    onError: (error) =>
      notifications.show({ color: "red", message: errMsg(error, "No se pudo anular.") }),
  });

  const filas = enlaces.data ?? [];

  return (
    <section>
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="xs">
        <SectionLabel as="h2" mb={0}>
          Enlaces · {filas.length}
        </SectionLabel>
        <Button size="xs" leftSection={<Plus size={15} />} onClick={() => setEmitiendo(true)}>
          Emitir enlace
        </Button>
      </Group>

      <Stagger
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "calc(10 * var(--u))",
          marginBottom: "calc(14 * var(--u))",
        }}
      >
        {FILTROS.map((f) => (
          <FilterChip
            key={f.value || "todos"}
            active={estado === f.value}
            onClick={() => setEstado(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
      </Stagger>

      {enlaces.isError ? (
        <PageError
          message={errMsg(enlaces.error, "No se pudieron cargar los enlaces.")}
          onRetry={() => enlaces.refetch()}
        />
      ) : enlaces.isLoading ? (
        <PageLoading />
      ) : !filas.length ? (
        <EmptyState
          title="Sin enlaces"
          description="Emite uno para que un gimnasio pueda llenar y firmar su contrato de alta."
          action={
            <Button size="xs" mt="xs" onClick={() => setEmitiendo(true)}>
              Emitir enlace
            </Button>
          }
        />
      ) : (
        <GlassCard padding={12}>
          <Table.ScrollContainer minWidth={860}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Destinatario</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Avance</Table.Th>
                  <Table.Th>Aperturas</Table.Th>
                  <Table.Th>Vence</Table.Th>
                  <Table.Th w={120} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filas.map((i) => (
                  <Table.Tr key={i.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {i.gym_name || i.contact_name || i.email}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {i.email}
                        {i.note ? ` · ${i.note}` : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={ESTADO_ENLACE_COLOR[i.state] ?? "gray"}
                      >
                        {label(ESTADO_ENLACE, i.state)}
                      </Badge>
                      {i.application_folio != null && (
                        <Text size="xs" c="dimmed">
                          Solicitud #{i.application_folio}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* El avance es telemetría de nombres de campo, no de valores:
                          dice cuánto llenó, nunca qué escribió. */}
                      <Text size="xs" c="dimmed">
                        {i.progress_percent}%
                      </Text>
                      <Progress value={i.progress_percent} size="xs" color="flame" w={72} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{i.opened_count}</Text>
                      <Text size="xs" c="dimmed">
                        {i.last_opened_at ? fechaHora(i.last_opened_at) : "sin abrir"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{fechaCorta(i.expires_at)}</Text>
                      <Text size="xs" c="dimmed">
                        Emitido {fechaCorta(i.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="Copiar enlace"
                          title="Copiar enlace"
                          onClick={() => copiarEnlace(i.url)}
                        >
                          <Copy size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="Reenviar"
                          title={
                            i.state === "active"
                              ? "Reenviar por correo"
                              : "Solo se reenvían enlaces activos"
                          }
                          disabled={i.state !== "active" || reenviar.isPending}
                          onClick={() => reenviar.mutate(i.id)}
                        >
                          <Send size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Anular"
                          title={
                            i.state === "used"
                              ? "Ya se usó: no tiene sentido anularlo"
                              : "Anular enlace"
                          }
                          disabled={i.state !== "active"}
                          onClick={() => setPorRevocar(i)}
                        >
                          <Ban size={15} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </GlassCard>
      )}

      <ModalEmitir opened={emitiendo} onClose={() => setEmitiendo(false)} />

      <Modal
        opened={!!porRevocar}
        onClose={() => setPorRevocar(null)}
        centered
        title="Anular este enlace"
      >
        <Stack gap="sm">
          <Text size="sm">
            El enlace de <strong>{porRevocar?.email}</strong> dejará de funcionar de
            inmediato. Si ya lo abrió y está llenando el formulario, va a perder lo que
            escribió. No se puede deshacer: para volver a intentarlo hay que emitir uno nuevo.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPorRevocar(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={revocar.isPending}
              onClick={() => porRevocar && revocar.mutate(porRevocar.id)}
            >
              Anular
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  );
}
