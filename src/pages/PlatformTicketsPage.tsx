import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import { ClipboardCopy } from "lucide-react";
import {
  useBulkReports,
  usePlatformReportConfig,
  usePlatformReportSummary,
  usePlatformReports,
  useReportFixPrompt,
  useTriageReport,
  useUpdateReportConfig,
} from "../api/hooks";
import type { BugReport } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, PageLoading } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

const STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "triaged", label: "Triaged" },
  { value: "in_pr", label: "En PR" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
  { value: "discarded", label: "Descartado" },
];
const SEVERITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];
const KIND_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Sugerencia" },
  { value: "support", label: "Soporte" },
  { value: "noise", label: "Ruido" },
  { value: "duplicate", label: "Duplicado" },
];
const SURFACE_OPTIONS = [
  { value: "web_admin", label: "Admin web" },
  { value: "mobile_ios", label: "App iOS" },
  { value: "mobile_android", label: "App Android" },
  { value: "other", label: "Otra" },
];

const STATUS_COLOR: Record<string, string> = {
  new: "yellow",
  triaged: "blue",
  in_pr: "violet",
  resolved: "teal",
  closed: "gray",
  discarded: "dark",
};
const SEVERITY_COLOR: Record<string, string> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  critical: "red",
};

function withAll(options: { value: string; label: string }[]) {
  return [{ value: "", label: "Todos" }, ...options];
}

/** Tira de resumen para detectar patrones (versiones, pantallas con más reportes). */
function SummaryStrip({ enabled }: { enabled: boolean }) {
  const summary = usePlatformReportSummary(enabled);
  const data = summary.data;
  if (!data) return null;
  const topVersion = data.by_app_version.filter((v) => v.app_version)[0];
  const topScreen = data.by_screen.filter((s) => s.screen)[0];
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md" spacing="sm">
      <Card padding="sm">
        <Text size="xs" c="dimmed">Abiertos</Text>
        <Text fw={700} size="xl">{data.open}</Text>
      </Card>
      <Card padding="sm">
        <Text size="xs" c="dimmed">Total</Text>
        <Text fw={700} size="xl">{data.total}</Text>
      </Card>
      <Card padding="sm">
        <Text size="xs" c="dimmed">Versión con más reportes</Text>
        <Text fw={600}>{topVersion ? `${topVersion.app_version} (${topVersion.count})` : "—"}</Text>
      </Card>
      <Card padding="sm">
        <Text size="xs" c="dimmed">Pantalla más reportada</Text>
        <Text fw={600}>{topScreen ? `${topScreen.screen} (${topScreen.count})` : "—"}</Text>
      </Card>
    </SimpleGrid>
  );
}

/** Kill-switch: encender/apagar el reporte por superficie (app móvil / admin web). */
function KillSwitchCard({ enabled }: { enabled: boolean }) {
  const config = usePlatformReportConfig(enabled);
  const update = useUpdateReportConfig();
  const data = config.data;

  const toggle = async (field: "web_enabled" | "mobile_enabled", value: boolean) => {
    try {
      await update.mutateAsync({ [field]: value });
      notifications.show({ color: "teal", message: "Configuración actualizada." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo actualizar." });
    }
  };

  return (
    <Card mb="md">
      <Text fw={600} mb={4}>Recolección de reportes</Text>
      <Text size="xs" c="dimmed" mb="sm">
        Apaga estos interruptores cuando dejes de necesitar feedback. El backend deja de
        aceptar reportes de esa superficie y el botón desaparece de la app/web.
      </Text>
      <Group gap="xl">
        <Switch
          label="App móvil"
          checked={data?.mobile_enabled ?? true}
          disabled={!data || update.isPending}
          onChange={(e) => toggle("mobile_enabled", e.currentTarget.checked)}
        />
        <Switch
          label="Admin web"
          checked={data?.web_enabled ?? true}
          disabled={!data || update.isPending}
          onChange={(e) => toggle("web_enabled", e.currentTarget.checked)}
        />
      </Group>
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <Text size="xs" c="dimmed" w={120} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="xs" style={{ wordBreak: "break-word" }}>{value}</Text>
    </Group>
  );
}

function ReportDetail({ report }: { report: BugReport }) {
  const triage = useTriageReport();
  const fixPrompt = useReportFixPrompt();
  const [notes, setNotes] = useState(report.operator_notes ?? "");

  const setField = (body: Record<string, string>) =>
    triage.mutate(
      { id: report.id, body },
      { onError: () => notifications.show({ color: "red", message: "No se pudo guardar." }) },
    );

  const saveNotes = () =>
    triage.mutate(
      { id: report.id, body: { operator_notes: notes } },
      {
        onSuccess: () => notifications.show({ color: "teal", message: "Notas guardadas." }),
        onError: () => notifications.show({ color: "red", message: "No se pudo guardar." }),
      },
    );

  const copyPrompt = async () => {
    try {
      const prompt = await fixPrompt.mutateAsync(report.id);
      await navigator.clipboard.writeText(prompt);
      notifications.show({ color: "teal", title: "Prompt copiado", message: "Pégalo en Claude Code." });
    } catch {
      notifications.show({ color: "red", message: "No se pudo copiar el prompt." });
    }
  };

  return (
    <Card h="100%">
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <Title order={4}>{report.surface_display}</Title>
          <Text size="xs" c="dimmed">
            {new Date(report.created_at).toLocaleString("es-GT")} · {report.reporter_email || "anónimo"}
          </Text>
        </div>
        <Button
          size="xs"
          leftSection={<ClipboardCopy size={15} />}
          onClick={copyPrompt}
          loading={fixPrompt.isPending}
        >
          Copiar prompt
        </Button>
      </Group>

      <Box p="sm" mb="sm" style={{ background: "var(--mantine-color-dark-6)", borderRadius: 8 }}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{report.description}</Text>
      </Box>

      {report.attachment && (
        <img
          src={report.attachment}
          alt="adjunto"
          style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }}
        />
      )}

      <Stack gap={2} mb="sm">
        <MetaRow label="Versión / build" value={[report.app_version, report.build].filter(Boolean).join(" / ")} />
        <MetaRow label="SO" value={[report.os_name, report.os_version].filter(Boolean).join(" ")} />
        <MetaRow label="Dispositivo" value={report.device_model} />
        <MetaRow label="Pantalla / ruta" value={report.screen} />
        <MetaRow label="Gimnasio" value={report.gym_name} />
        <MetaRow label="Rol" value={report.reporter_role} />
        <MetaRow label="Idioma / zona" value={[report.locale, report.timezone].filter(Boolean).join(" · ")} />
        <MetaRow label="User agent" value={report.user_agent} />
      </Stack>

      {report.stack_trace && (
        <ScrollArea.Autosize mah={160} mb="sm">
          <Box p="sm" style={{ background: "var(--mantine-color-dark-7)", borderRadius: 8 }}>
            <Text size="xs" ff="monospace" style={{ whiteSpace: "pre-wrap" }}>{report.stack_trace}</Text>
          </Box>
        </ScrollArea.Autosize>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="sm">
        <Select
          label="Tipo"
          data={KIND_OPTIONS}
          value={report.kind}
          onChange={(v) => v && setField({ kind: v })}
          comboboxProps={{ withinPortal: true }}
        />
        <Select
          label="Severidad"
          data={SEVERITY_OPTIONS}
          value={report.severity}
          onChange={(v) => v && setField({ severity: v })}
          comboboxProps={{ withinPortal: true }}
        />
        <Select
          label="Estado"
          data={STATUS_OPTIONS}
          value={report.status}
          onChange={(v) => v && setField({ status: v })}
          comboboxProps={{ withinPortal: true }}
        />
      </SimpleGrid>

      <Textarea
        label="Notas internas"
        placeholder="Notas de triage (privadas)…"
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        autosize
        minRows={2}
      />
      <Group justify="flex-end" mt="xs">
        <Button size="xs" variant="light" onClick={saveNotes} loading={triage.isPending}>
          Guardar notas
        </Button>
      </Group>
    </Card>
  );
}

export function PlatformTicketsPage() {
  const { isSuperuser } = useAuth();
  const [filters, setFilters] = useState({ status: "", severity: "", surface: "", kind: "", search: "" });
  const reports = usePlatformReports(isSuperuser, filters);
  const bulk = useBulkReports();
  const [selected, setSelected] = useState<BugReport[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string | null>("triaged");

  if (!isSuperuser) {
    return <EmptyState title="Acceso restringido" description="Se requiere rol de superadmin." />;
  }
  if (reports.isError) return <PageError onRetry={() => reports.refetch()} />;

  const rows = reports.data ?? [];
  const detail = rows.find((r) => r.id === selectedId);

  const setFilter = (key: keyof typeof filters) => (v: string | null) =>
    setFilters((f) => ({ ...f, [key]: v ?? "" }));

  const applyBulk = async (status: string) => {
    if (!selected.length) return;
    try {
      await bulk.mutateAsync({ ids: selected.map((r) => r.id), status });
      notifications.show({ color: "teal", message: `${selected.length} reporte(s) actualizado(s).` });
      setSelected([]);
    } catch {
      notifications.show({ color: "red", message: "No se pudo aplicar la acción en lote." });
    }
  };

  return (
    <div>
      <PageHeader
        title="Soporte / Reportes"
        subtitle="Errores reportados desde la app y el admin web. Triage, patrones y prompt de fix."
      />

      <KillSwitchCard enabled={isSuperuser} />
      <SummaryStrip enabled={isSuperuser} />

      <Card mb="md">
        <Group align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            label="Buscar"
            placeholder="Texto, pantalla, correo, versión…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.currentTarget.value }))}
            w={{ base: "100%", sm: 240 }}
          />
          <Select label="Estado" data={withAll(STATUS_OPTIONS)} value={filters.status} onChange={setFilter("status")} w={140} comboboxProps={{ withinPortal: true }} />
          <Select label="Severidad" data={withAll(SEVERITY_OPTIONS)} value={filters.severity} onChange={setFilter("severity")} w={130} comboboxProps={{ withinPortal: true }} />
          <Select label="Superficie" data={withAll(SURFACE_OPTIONS)} value={filters.surface} onChange={setFilter("surface")} w={140} comboboxProps={{ withinPortal: true }} />
          <Select label="Tipo" data={withAll(KIND_OPTIONS)} value={filters.kind} onChange={setFilter("kind")} w={130} comboboxProps={{ withinPortal: true }} />
        </Group>

        {selected.length > 0 && (
          <Group mt="md" gap="sm" align="flex-end">
            <Text size="sm" c="dimmed">{selected.length} seleccionado(s):</Text>
            <SegmentedControl
              size="xs"
              value={bulkStatus ?? "triaged"}
              onChange={setBulkStatus}
              data={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <Button size="xs" onClick={() => applyBulk(bulkStatus ?? "triaged")} loading={bulk.isPending}>
              Cambiar estado
            </Button>
            <Button size="xs" color="red" variant="light" onClick={() => applyBulk("discarded")} loading={bulk.isPending}>
              Descartar
            </Button>
          </Group>
        )}
      </Card>

      <Grid gutter="lg" align="stretch">
        <Grid.Col span={{ base: 12, lg: detail ? 6 : 12 }}>
          <Card>
            {reports.isLoading ? (
              <PageLoading />
            ) : !rows.length ? (
              <EmptyState title="Sin reportes" description="Los reportes de errores aparecerán aquí." />
            ) : (
              <DataTable<BugReport>
                minHeight={160}
                highlightOnHover
                idAccessor="id"
                records={rows}
                selectedRecords={selected}
                onSelectedRecordsChange={setSelected}
                onRowClick={({ record }) => setSelectedId(record.id)}
                rowStyle={(r) => (r.id === selectedId ? { background: "var(--mantine-color-dark-6)" } : undefined)}
                noRecordsText="Sin reportes."
                columns={[
                  {
                    accessor: "created_at",
                    title: "Fecha",
                    render: (r) => new Date(r.created_at).toLocaleDateString("es-GT"),
                  },
                  {
                    accessor: "description",
                    title: "Reporte",
                    ellipsis: true,
                    render: (r) => (
                      <div>
                        <Text size="sm" lineClamp={1}>{r.description}</Text>
                        <Text size="xs" c="dimmed">{r.surface_display} · {r.screen || "—"} · {r.app_version || "—"}</Text>
                      </div>
                    ),
                  },
                  {
                    accessor: "severity",
                    title: "Severidad",
                    render: (r) => <Badge color={SEVERITY_COLOR[r.severity]} variant="light">{r.severity_display}</Badge>,
                  },
                  {
                    accessor: "status",
                    title: "Estado",
                    render: (r) => <Badge color={STATUS_COLOR[r.status]} variant="light">{r.status_display}</Badge>,
                  },
                ]}
              />
            )}
          </Card>
        </Grid.Col>

        {detail && (
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <ReportDetail key={detail.id} report={detail} />
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}
