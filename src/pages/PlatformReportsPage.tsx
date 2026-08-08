import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Copy, Search } from "lucide-react";
import {
  usePlatformReport,
  usePlatformReports,
  useTriagePlatformReport,
} from "../api/hooks";
import type { BugReport } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { FilterChip, GlassCard, Stagger } from "../components/aurora";
import { errMsg } from "../lib/errors";
import { useAuth } from "../lib/auth";

/**
 * Bandeja de **reportes de fallas del software** (`apps.bugreports`): lo que la
 * gente manda desde el botón flotante / shake del app y desde el ícono de bug del
 * panel. No confundir con `/panel/tickets` (GymTicket = soporte atleta↔gimnasio).
 *
 * Es del operador de plataforma, no de los gimnasios: el backend la reserva a
 * `IsSuperadmin` y aquí no hay ninguna variante filtrada por gym. El Django admin
 * sigue siendo la consola completa (acciones en lote); esta pantalla existe para
 * leer y triar lo del app sin entrar a /admin/.
 */

const ESTADO_COLOR: Record<string, string> = {
  new: "flame",
  triaged: "blue",
  in_pr: "violet",
  resolved: "teal",
  closed: "gray",
  discarded: "gray",
};

const SEVERIDAD_COLOR: Record<string, string> = {
  low: "gray",
  medium: "yellow",
  high: "orange",
  critical: "red",
};

const FILTROS_ESTADO = [
  { value: "open", label: "Abiertos" },
  { value: "new", label: "Nuevos" },
  { value: "in_pr", label: "En PR" },
  { value: "resolved", label: "Resueltos" },
  { value: "all", label: "Todos" },
];

const FILTROS_SUPERFICIE = [
  { value: "", label: "Todas" },
  { value: "mobile_ios", label: "App iOS" },
  { value: "mobile_android", label: "App Android" },
  { value: "web_admin", label: "Admin web" },
];

const ESTADOS = [
  { value: "new", label: "Nuevo" },
  { value: "triaged", label: "Triaged" },
  { value: "in_pr", label: "En PR" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
  { value: "discarded", label: "Descartado" },
];

const TIPOS = [
  { value: "bug", label: "Error (bug)" },
  { value: "feature", label: "Sugerencia / mejora" },
  { value: "support", label: "Soporte" },
  { value: "noise", label: "Ruido" },
  { value: "duplicate", label: "Duplicado" },
];

const SEVERIDADES = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const fecha = (iso: string) => new Date(iso).toLocaleString("es-GT");

/** Adjunto: miniatura clicable (la captura completa abre en modal). */
function Adjunto({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="captura del reporte"
        onClick={() => setOpen(true)}
        style={{
          height: "calc(120 * var(--u))",
          borderRadius: "calc(12 * var(--u))",
          border: "1px solid var(--a-line)",
          cursor: "zoom-in",
        }}
      />
      <Modal opened={open} onClose={() => setOpen(false)} size="lg" centered title="Captura">
        <img src={src} alt="captura del reporte" style={{ width: "100%", borderRadius: "calc(14 * var(--u))" }} />
      </Modal>
    </>
  );
}

/** Un dato de la metadata capturada. Se omite si vino vacío. */
function Dato({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Text size="xs" c="dimmed">
      <Text span size="xs" fw={600} c="var(--mantine-color-text)">
        {label}:
      </Text>{" "}
      {value}
    </Text>
  );
}

/** Ficha del reporte seleccionado: metadata + triage + prompt de fix. */
function DetalleReporte({ reportId }: { reportId: string }) {
  const detalle = usePlatformReport(reportId);
  const triage = useTriagePlatformReport();
  const [notas, setNotas] = useState<string | null>(null);

  if (detalle.isLoading) return <PageLoading />;
  if (detalle.isError)
    return (
      <PageError
        message={errMsg(detalle.error, "No se pudo cargar el reporte.")}
        onRetry={() => detalle.refetch()}
      />
    );
  const r = detalle.data;
  if (!r) return null;

  const aplicar = (cambios: { status?: string; kind?: string; severity?: string; operator_notes?: string }) =>
    triage.mutate(
      { reportId, ...cambios },
      {
        onSuccess: () => notifications.show({ color: "teal", message: "Reporte actualizado." }),
        onError: (err) =>
          notifications.show({ color: "red", message: errMsg(err, "No se pudo actualizar.") }),
      },
    );

  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(r.fix_prompt);
      notifications.show({ color: "teal", message: "Prompt copiado. Pégalo en Claude Code." });
    } catch {
      notifications.show({ color: "red", message: "El navegador bloqueó el portapapeles." });
    }
  };

  return (
    <GlassCard variant="big" padding={22} delay={0.06}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Title order={4}>{r.surface_display}</Title>
          <Text c="dimmed" size="xs">
            {fecha(r.created_at)} · {r.reporter_email || "sin correo"}
            {r.reporter_role ? ` (${r.reporter_role})` : ""}
          </Text>
        </div>
        <Button size="xs" variant="default" leftSection={<Copy size={14} />} onClick={copiarPrompt}>
          Copiar prompt de fix
        </Button>
      </Group>

      <Box
        p="sm"
        mt="md"
        style={{ border: "1px solid var(--a-line)", borderRadius: "var(--a-r-control)" }}
      >
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {r.description}
        </Text>
        {r.attachment && (
          <Box mt="sm">
            <Adjunto src={r.attachment} />
          </Box>
        )}
      </Box>

      <SectionLabel mb={6} mt="md">
        Contexto capturado
      </SectionLabel>
      <Stack gap={3}>
        <Dato label="Pantalla" value={r.screen} />
        <Dato label="Versión / build" value={[r.app_version, r.build].filter(Boolean).join(" / ")} />
        <Dato label="Sistema" value={[r.os_name, r.os_version].filter(Boolean).join(" ")} />
        <Dato label="Dispositivo" value={r.device_model} />
        <Dato label="Gimnasio" value={r.gym_name} />
        <Dato label="Idioma / zona" value={[r.locale, r.timezone].filter(Boolean).join(" · ")} />
        <Dato label="Navegador" value={r.user_agent} />
      </Stack>

      {r.stack_trace && (
        <>
          <SectionLabel mb={6} mt="md">
            Stack trace
          </SectionLabel>
          <Code block style={{ maxHeight: "calc(220 * var(--u))", overflow: "auto", fontSize: 11 }}>
            {r.stack_trace}
          </Code>
        </>
      )}

      <SectionLabel mb={6} mt="md">
        Triage
      </SectionLabel>
      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Select
            size="xs"
            label="Estado"
            data={ESTADOS}
            value={r.status}
            allowDeselect={false}
            disabled={triage.isPending}
            onChange={(v) => v && v !== r.status && aplicar({ status: v })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Select
            size="xs"
            label="Tipo"
            data={TIPOS}
            value={r.kind}
            allowDeselect={false}
            disabled={triage.isPending}
            onChange={(v) => v && v !== r.kind && aplicar({ kind: v })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Select
            size="xs"
            label="Severidad"
            data={SEVERIDADES}
            value={r.severity}
            allowDeselect={false}
            disabled={triage.isPending}
            onChange={(v) => v && v !== r.severity && aplicar({ severity: v })}
          />
        </Grid.Col>
      </Grid>

      <Textarea
        mt="sm"
        size="xs"
        label="Notas del operador"
        placeholder="Commit del fix, hipótesis, por qué se descartó…"
        autosize
        minRows={2}
        value={notas ?? r.operator_notes}
        onChange={(e) => setNotas(e.currentTarget.value)}
      />
      <Group justify="flex-end" mt="xs">
        <Button
          size="xs"
          variant="default"
          loading={triage.isPending}
          disabled={notas === null || notas === r.operator_notes}
          onClick={() => {
            aplicar({ operator_notes: notas ?? "" });
            setNotas(null);
          }}
        >
          Guardar notas
        </Button>
      </Group>

      {r.resolved_at && (
        <Text size="xs" c="dimmed" mt="sm">
          Resuelto el {fecha(r.resolved_at)}.
        </Text>
      )}
    </GlassCard>
  );
}

export function PlatformReportsPage() {
  const { isSuperuser } = useAuth();
  const [estado, setEstado] = useState("open");
  const [superficie, setSuperficie] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const reportes = usePlatformReports(
    { status: estado, surface: superficie, q },
    isSuperuser,
  );

  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Reportes del software" />
        <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />
      </Stack>
    );
  }

  const filas = reportes.data ?? [];
  const seleccionado: BugReport | undefined = filas.find((r) => r.id === selectedId);

  return (
    <div>
      <PageHeader
        kicker="Plataforma · Software"
        title="Reportes del app"
        subtitle="Fallas que reporta la gente desde el app y desde el panel. Distinto de los tickets de soporte de cada gimnasio."
      />

      <Stagger
        from={0.52}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "calc(10 * var(--u))",
          marginBottom: "calc(14 * var(--u))",
        }}
      >
        {FILTROS_ESTADO.map((f) => (
          <FilterChip key={f.value} active={estado === f.value} onClick={() => setEstado(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </Stagger>

      <Group gap="sm" mb="md" wrap="wrap">
        {FILTROS_SUPERFICIE.map((f) => (
          <FilterChip
            key={f.value || "todas"}
            active={superficie === f.value}
            onClick={() => setSuperficie(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
        <TextInput
          size="xs"
          w={{ base: "100%", sm: 260 }}
          placeholder="Buscar en descripción, correo, pantalla…"
          leftSection={<Search size={14} />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && setQ(busqueda.trim())}
          onBlur={() => setQ(busqueda.trim())}
        />
      </Group>

      <Grid gutter="lg" align="stretch">
        <Grid.Col span={{ base: 12, lg: seleccionado ? 6 : 12 }}>
          <SectionLabel as="h2">Bandeja · {filas.length}</SectionLabel>
          {reportes.isError ? (
            <PageError
              message={errMsg(reportes.error, "No se pudieron cargar los reportes.")}
              onRetry={() => reportes.refetch()}
            />
          ) : reportes.isLoading ? (
            <PageLoading />
          ) : !filas.length ? (
            <EmptyState
              title="Sin reportes"
              description="Nada pendiente con estos filtros. Lo que reporten desde el app aparece aquí."
            />
          ) : (
            <GlassCard padding={12} delay={0.6}>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Reporte</Table.Th>
                    <Table.Th>Origen</Table.Th>
                    <Table.Th>Estado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filas.map((r) => (
                    <Table.Tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        cursor: "pointer",
                        background: r.id === selectedId ? "rgba(255,255,255,0.09)" : undefined,
                      }}
                    >
                      <Table.Td>
                        <Text size="sm" fw={500} lineClamp={2}>
                          {r.description}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {fecha(r.created_at)} · {r.reporter_email || "sin correo"}
                          {r.screen ? ` · ${r.screen}` : ""}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{r.surface_display}</Text>
                        <Text size="xs" c="dimmed">
                          {r.app_version || "sin versión"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="wrap">
                          <Badge size="xs" variant="light" color={ESTADO_COLOR[r.status] ?? "gray"}>
                            {r.status_display}
                          </Badge>
                          <Badge
                            size="xs"
                            variant="light"
                            color={SEVERIDAD_COLOR[r.severity] ?? "gray"}
                          >
                            {r.severity_display}
                          </Badge>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </GlassCard>
          )}
        </Grid.Col>

        {seleccionado && (
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <SectionLabel as="h2">Detalle</SectionLabel>
            <DetalleReporte reportId={seleccionado.id} />
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}
