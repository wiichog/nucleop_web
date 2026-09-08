import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  FlaskConical,
  Rocket,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  descargarDocumento,
  fetchApplication,
  provisionApplication,
  updateApplication,
  type ProvisionResult,
} from "../../api/onboarding";
import { errMsg } from "../../lib/errors";
import { label } from "../../lib/labels";
import { fmtQ } from "../../lib/money";
import { DetailSheet } from "../DetailSheet";
import { PageError, PageLoading } from "../PageStatus";
import { SectionLabel } from "../ui";
import { GlassCard } from "../aurora";
import { copiarTexto } from "./clipboard";
import {
  CANAL_CONTACTO,
  ESTADO_SOLICITUD,
  ESTADO_SOLICITUD_COLOR,
  MODALIDAD_COMISION,
  RECURSOS_MONTAJE,
  RENUNCIAS,
} from "./labels";

/**
 * Ficha de una solicitud de alta: qué firmó, con qué condiciones, con qué evidencia y
 * qué se crearía al montarla.
 *
 * Dos cosas mandan sobre el diseño de esta pantalla:
 * 1. La solicitud es EVIDENCIA. Nada de lo firmado se edita aquí; solo se anota y se
 *    decide. Lo único mutable son las notas de revisión y el estado (menos "aprobada",
 *    que la pone el montaje).
 * 2. Montar es irreversible y con efectos hacia afuera: crea usuarios reales y les manda
 *    correo. Por eso primero está el simulacro y el botón de verdad pide confirmación.
 */

const fechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—";

/**
 * Las tasas llegan como FRACCIÓN (0.03 = 3%), igual que en `settings`. Pintarlas crudas
 * diría "0.03%" y eso es una cifra comercial mal comunicada, no un detalle de formato.
 */
const pct = (valor: string) => `${(Number(valor) * 100).toFixed(2).replace(/\.00$/, "")}%`;

/** Código de error del contrato `{detail, code}` de la API. */
function codigoDeError(error: unknown): string {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response?.data;
  return typeof data?.code === "string" ? data.code : "";
}

function Dato({ label: etiqueta, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <Text size="xs" c="dimmed">
        {etiqueta}
      </Text>
      <Text size="sm">{value}</Text>
    </div>
  );
}

/** Bloque de montaje: simulacro, montaje real, avisos y credenciales de una sola vez. */
function Montaje({
  applicationId,
  estado,
  gymId,
}: {
  applicationId: string;
  estado: string;
  gymId: string | null;
}) {
  const qc = useQueryClient();
  const [resultado, setResultado] = useState<ProvisionResult | null>(null);
  const [credenciales, setCredenciales] = useState<{ email: string; password: string }[]>([]);
  // Mensaje del 409 `incomplete_dossier`. Mientras esté puesto se ofrece reintentar
  // saltándose la condición suspensiva de la cláusula 8, marcándolo explícitamente.
  const [expedienteIncompleto, setExpedienteIncompleto] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  // La ficha se reutiliza al abrir otra solicitud: sin esto, las credenciales y los
  // avisos de una se quedarían pintados encima de otra.
  useEffect(() => {
    setResultado(null);
    setCredenciales([]);
    setExpedienteIncompleto("");
    setConfirmando(false);
  }, [applicationId]);

  const montar = useMutation({
    mutationFn: (opciones: { dry_run: boolean; allow_incomplete_dossier: boolean }) =>
      provisionApplication(applicationId, opciones),
    onSuccess: (salida) => {
      setResultado(salida);
      setExpedienteIncompleto("");
      setConfirmando(false);
      if (salida.dry_run) return;
      setCredenciales(salida.credentials);
      qc.invalidateQueries({ queryKey: ["onboarding-applications"] });
      qc.invalidateQueries({ queryKey: ["onboarding-application", applicationId] });
      qc.invalidateQueries({ queryKey: ["onboarding-pipeline"] });
      notifications.show({ color: "teal", message: `${salida.gym_name} quedó montado.` });
    },
    onError: (error) => {
      setConfirmando(false);
      if (codigoDeError(error) === "incomplete_dossier") {
        setExpedienteIncompleto(errMsg(error, "Falta parte del expediente."));
        return;
      }
      notifications.show({ color: "red", message: errMsg(error, "No se pudo montar.") });
    },
  });

  const yaMontado = !!gymId || estado === "approved";

  const copiarCredenciales = async () => {
    const texto = credenciales.map((c) => `${c.email} / ${c.password}`).join("\n");
    notifications.show(
      (await copiarTexto(texto))
        ? { color: "teal", message: "Credenciales copiadas." }
        : {
            color: "red",
            autoClose: false,
            message: "El navegador bloqueó el portapapeles. Cópialas a mano ANTES de cerrar.",
          },
    );
  };

  return (
    <>
      <SectionLabel as="h3" mt="lg">
        Montaje
      </SectionLabel>

      {yaMontado ? (
        <Alert color="teal" icon={<Check size={16} />}>
          Esta solicitud ya tiene su gimnasio montado. Un segundo montaje se rechaza:
          duplicaría usuarios y planes.
        </Alert>
      ) : (
        <Group gap="sm" wrap="wrap">
          <Button
            variant="default"
            leftSection={<FlaskConical size={15} />}
            loading={montar.isPending && montar.variables?.dry_run === true}
            onClick={() => montar.mutate({ dry_run: true, allow_incomplete_dossier: false })}
          >
            Simular
          </Button>
          <Button
            leftSection={<Rocket size={15} />}
            loading={montar.isPending && montar.variables?.dry_run === false}
            onClick={() => setConfirmando(true)}
          >
            Montar gimnasio
          </Button>
        </Group>
      )}

      {expedienteIncompleto && (
        <Alert
          mt="sm"
          color="yellow"
          icon={<TriangleAlert size={16} />}
          title="Expediente incompleto"
        >
          <Text size="sm">{expedienteIncompleto}</Text>
          <Text size="xs" c="dimmed" mt={6}>
            La cláusula 8 condiciona la activación a que el expediente esté completo.
            Saltársela queda escrito en la auditoría con tu nombre.
          </Text>
          <Button
            mt="sm"
            size="xs"
            color="yellow"
            variant="light"
            loading={montar.isPending}
            onClick={() => montar.mutate({ dry_run: false, allow_incomplete_dossier: true })}
          >
            Montar de todos modos
          </Button>
        </Alert>
      )}

      {/* `GlassCard` es un div, no un componente de Mantine: no admite props de
          espaciado (`mt`), así que su margen va por estilo. */}
      {resultado && (
        <GlassCard padding={16} style={{ marginTop: "var(--mantine-spacing-sm)" }}>
          <Text size="sm" fw={600}>
            {resultado.dry_run ? "Simulacro: esto se crearía" : `Montado: ${resultado.gym_name}`}
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs" mt="sm">
            {Object.entries(resultado.created)
              .filter(([, cuantos]) => cuantos > 0)
              .map(([recurso, cuantos]) => (
                <Text key={recurso} size="xs">
                  <Text span size="xs" fw={600}>
                    {cuantos}
                  </Text>{" "}
                  {label(RECURSOS_MONTAJE, recurso)}
                </Text>
              ))}
          </SimpleGrid>
          {resultado.warnings.length > 0 && (
            <>
              <SectionLabel mt="md" mb={6}>
                Avisos
              </SectionLabel>
              <Stack gap={4}>
                {resultado.warnings.map((aviso) => (
                  <Text key={aviso} size="xs" c="dimmed">
                    · {aviso}
                  </Text>
                ))}
              </Stack>
            </>
          )}
        </GlassCard>
      )}

      {credenciales.length > 0 && (
        <Alert
          mt="sm"
          color="flame"
          icon={<TriangleAlert size={16} />}
          title="Credenciales: se muestran una sola vez"
        >
          <Text size="xs" mb="xs">
            La contraseña temporal quedó hasheada en el backend, igual que cualquier otra.
            Si cierras esta ficha sin copiarla, no hay forma de volver a verla: habría que
            mandar un restablecimiento de contraseña.
          </Text>
          <Code block>
            {credenciales.map((c) => `${c.email} / ${c.password}`).join("\n")}
          </Code>
          <Button
            mt="xs"
            size="xs"
            variant="light"
            leftSection={<Copy size={14} />}
            onClick={copiarCredenciales}
          >
            Copiar credenciales
          </Button>
        </Alert>
      )}

      <Modal
        opened={confirmando}
        onClose={() => setConfirmando(false)}
        centered
        title="Montar el gimnasio"
      >
        <Stack gap="sm">
          <Text size="sm">
            Se crean el gimnasio, su plan, sus disciplinas y las cuentas del equipo, y a
            esas personas les llega un correo con su acceso. No se puede deshacer desde el
            panel. Corre el simulacro antes si todavía no lo hiciste.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              loading={montar.isPending}
              onClick={() => montar.mutate({ dry_run: false, allow_incomplete_dossier: false })}
            >
              Montar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

/** Contenido de la ficha. Se separa para que el sheet no monte nada sin `id`. */
function Contenido({ applicationId }: { applicationId: string }) {
  const qc = useQueryClient();
  const [notas, setNotas] = useState<string | null>(null);

  const solicitud = useQuery({
    queryKey: ["onboarding-application", applicationId],
    queryFn: () => fetchApplication(applicationId),
  });

  const actualizar = useMutation({
    mutationFn: (cambios: { status?: string; review_notes?: string }) =>
      updateApplication(applicationId, cambios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-application", applicationId] });
      qc.invalidateQueries({ queryKey: ["onboarding-applications"] });
      qc.invalidateQueries({ queryKey: ["onboarding-pipeline"] });
      notifications.show({ color: "teal", message: "Solicitud actualizada." });
    },
    onError: (error) =>
      notifications.show({ color: "red", message: errMsg(error, "No se pudo actualizar.") }),
  });

  // Las notas se reinician al cambiar de solicitud: si no, el borrador de una se
  // guardaría sobre otra.
  useEffect(() => setNotas(null), [applicationId]);

  if (solicitud.isLoading) return <PageLoading />;
  if (solicitud.isError)
    return (
      <PageError
        message={errMsg(solicitud.error, "No se pudo cargar la solicitud.")}
        onRetry={() => solicitud.refetch()}
      />
    );

  const s = solicitud.data;
  if (!s) return null;

  const descargar = (campo: string) =>
    descargarDocumento(applicationId, campo, `solicitud-${s.folio}-${campo}`).catch((error) =>
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo descargar el documento."),
      }),
    );

  return (
    <Stack gap={0}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
        <div style={{ minWidth: 0 }}>
          <Title order={4}>{s.gym_name}</Title>
          <Text size="xs" c="dimmed">
            Solicitud #{s.folio} · recibida {fechaHora(s.created_at)}
          </Text>
        </div>
        <Badge variant="light" color={ESTADO_SOLICITUD_COLOR[s.status] ?? "gray"}>
          {label(ESTADO_SOLICITUD, s.status)}
        </Badge>
      </Group>

      <SectionLabel as="h3" mt="lg">
        El gimnasio
      </SectionLabel>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Dato label="Razón social" value={s.gym_legal_name} />
        <Dato label="NIT" value={s.gym_nit} />
        <Dato label="Cadena" value={s.organization_name} />
        <Dato
          label="Personalidad jurídica"
          value={s.has_legal_personality ? "Propia" : "No: responde el firmante"}
        />
        <Dato
          label="Domicilio"
          value={[s.gym_municipality, s.gym_department].filter(Boolean).join(", ")}
        />
        <Dato label="Sedes declaradas" value={s.branches_count} />
        <Dato label="Atletas estimados" value={s.estimated_members} />
      </SimpleGrid>

      <SectionLabel as="h3" mt="lg">
        Contacto
      </SectionLabel>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Dato label="Nombre" value={s.contact_name} />
        <Dato label="Puesto" value={s.contact_role} />
        <Dato label="Correo" value={s.contact_email} />
        <Dato label="Teléfono" value={s.contact_phone} />
        <Dato
          label="Canal preferido"
          value={
            typeof s.data.contact_preferred_channel === "string"
              ? label(CANAL_CONTACTO, s.data.contact_preferred_channel)
              : null
          }
        />
      </SimpleGrid>

      <SectionLabel as="h3" mt="lg">
        Condiciones congeladas
      </SectionLabel>
      {/* Las cifras las estampó el servidor al firmar, no el formulario. Son las que
          rigen para ESTE gimnasio aunque las de settings ya hayan cambiado. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Dato label="Modalidad" value={label(MODALIDAD_COMISION, s.commission_mode)} />
        <Dato
          label="Cobro con tarjeta"
          value={s.enable_online_payments ? "Habilitado" : "Solo pagos manuales"}
        />
        <Dato label="Tasa total" value={pct(s.platform_commission_pct)} />
        <Dato
          label="Desglose"
          value={`${pct(s.platform_nucleo_pct)} Nucleo + ${pct(s.platform_gateway_pct)} pasarela`}
        />
        <Dato
          label="Licencia mensual"
          value={`${fmtQ(s.saas_monthly_price)} · ${s.saas_plan}`}
        />
        <Dato label="Depósito" value={`${s.settlement_business_hours} horas hábiles`} />
      </SimpleGrid>

      <SectionLabel as="h3" mt="lg">
        Constancia de aceptación
      </SectionLabel>
      {!s.contract_matches_current && (
        <Alert mb="sm" color="yellow" icon={<TriangleAlert size={16} />}>
          El articulado cambió después de esta firma. Lo que vale es el PDF congelado que
          se le mandó a este gimnasio, no el contrato vigente hoy.
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Dato label="Firmante" value={s.signer_name} />
        <Dato label="Puesto del firmante" value={s.signer_position} />
        <Dato label="Fecha de aceptación" value={fechaHora(s.accepted_at)} />
        <Dato label="IP" value={s.accepted_ip} />
        <Dato label="Versión de términos" value={s.terms_version} />
      </SimpleGrid>
      <Text size="xs" c="dimmed" mt="xs">
        Navegador
      </Text>
      <Text size="xs" style={{ wordBreak: "break-all" }}>
        {s.accepted_user_agent || "—"}
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        Hash del articulado
      </Text>
      <Code block style={{ fontSize: 11, wordBreak: "break-all" }}>
        {s.contract_hash}
      </Code>

      <SectionLabel as="h3" mt="lg">
        Renuncias aceptadas · {s.waivers.filter((w) => w.accepted).length}/{s.waivers.length}
      </SectionLabel>
      <Stack gap={4}>
        {s.waivers.map((w) => (
          <Group key={w.key} gap={8} wrap="nowrap" align="flex-start">
            {w.accepted ? (
              <Check size={15} color="var(--nucleo-success, #2fb283)" style={{ flex: "none" }} />
            ) : (
              <X size={15} color="var(--nucleo-danger, #ff5a5f)" style={{ flex: "none" }} />
            )}
            <Text size="xs" c={w.accepted ? undefined : "dimmed"}>
              {w.letra}) {RENUNCIAS[w.key] ?? w.titulo}
            </Text>
          </Group>
        ))}
      </Stack>

      <SectionLabel as="h3" mt="lg">
        Expediente
      </SectionLabel>
      <Stack gap={6}>
        {s.documents.map((d) => (
          <Group key={d.field} justify="space-between" wrap="nowrap" gap="sm">
            <Text size="xs" c={d.present ? undefined : "dimmed"} style={{ minWidth: 0 }}>
              {d.label}
            </Text>
            {d.present ? (
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<Download size={13} />}
                onClick={() => descargar(d.field)}
              >
                Descargar
              </Button>
            ) : (
              <Badge size="xs" variant="light" color="gray">
                Falta
              </Badge>
            )}
          </Group>
        ))}
      </Stack>

      {typeof s.data.contract_observations === "string" && s.data.contract_observations && (
        <>
          <SectionLabel as="h3" mt="lg">
            Observaciones del firmante
          </SectionLabel>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {s.data.contract_observations}
          </Text>
        </>
      )}

      <SectionLabel as="h3" mt="lg">
        Revisión
      </SectionLabel>
      <Select
        size="xs"
        label="Estado"
        // "Aprobada" no está: el backend la rechaza a propósito. Una solicitud se
        // aprueba montando el gimnasio, no cambiándole el estado a mano.
        data={[
          { value: "received", label: "Recibida" },
          { value: "in_review", label: "En revisión" },
          { value: "rejected", label: "Rechazada" },
        ]}
        value={s.status}
        allowDeselect={false}
        disabled={actualizar.isPending || s.status === "approved"}
        onChange={(v) => v && v !== s.status && actualizar.mutate({ status: v })}
      />
      <Textarea
        mt="sm"
        size="xs"
        label="Notas de revisión"
        placeholder="Qué verificaste, qué falta, con quién hablaste…"
        autosize
        minRows={2}
        value={notas ?? s.review_notes}
        onChange={(e) => setNotas(e.currentTarget.value)}
      />
      <Group justify="flex-end" mt="xs">
        <Button
          size="xs"
          variant="default"
          loading={actualizar.isPending}
          disabled={notas === null || notas === s.review_notes}
          onClick={() => {
            actualizar.mutate({ review_notes: notas ?? "" });
            setNotas(null);
          }}
        >
          Guardar notas
        </Button>
      </Group>
      {s.reviewed_at && (
        <Text size="xs" c="dimmed" mt={4}>
          Revisada el {fechaHora(s.reviewed_at)}.
        </Text>
      )}

      <Divider my="lg" />
      <Montaje applicationId={applicationId} estado={s.status} gymId={s.gym_id} />
    </Stack>
  );
}

export function ApplicationDetail({
  applicationId,
  onClose,
}: {
  applicationId: string | null;
  onClose: () => void;
}) {
  return (
    // `min(...)` y no un ancho fijo: 860px de drawer en un teléfono se sale de la
    // pantalla y deja la ficha inservible justo donde más se revisa de pie.
    <DetailSheet
      opened={!!applicationId}
      onClose={onClose}
      size="min(860px, 100vw)"
      title="Solicitud de alta"
    >
      {applicationId && <Contenido applicationId={applicationId} />}
    </DetailSheet>
  );
}
