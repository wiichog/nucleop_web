import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
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
import { PageError, PageLoading, useCuentaSinCargar } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
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
  new: "yellow",
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

// Un atajo por cada estado de `ESTADOS` (el backend acepta cualquiera tal cual,
// además de `open` y `all`): sin ellos, lo cerrado o descartado sólo se veía en
// «Todos», revuelto con lo demás.
export const FILTROS_ESTADO = [
  { value: "open", label: "Abiertos" },
  { value: "new", label: "Nuevos" },
  { value: "triaged", label: "Revisados" },
  { value: "in_pr", label: "En PR" },
  { value: "resolved", label: "Resueltos" },
  { value: "closed", label: "Cerrados" },
  { value: "discarded", label: "Descartados" },
  { value: "all", label: "Todos" },
];

const FILTROS_SUPERFICIE = [
  { value: "", label: "Todas" },
  { value: "mobile_ios", label: "App iOS" },
  { value: "mobile_android", label: "App Android" },
  { value: "web_admin", label: "Admin web" },
];

export const ESTADOS = [
  { value: "new", label: "Nuevo" },
  { value: "triaged", label: "Revisado" },
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

/**
 * Escribe en el portapapeles con respaldo. La Clipboard API se niega en varias
 * situaciones normales (sin foco, sin permiso, fuera de un contexto seguro) y ahí
 * el `textarea` + `execCommand` de toda la vida sí funciona: como TODO el valor de
 * este botón es que el prompt quede copiado, no puede depender de una sola vía.
 */
async function escribirEnPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Cae al respaldo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand("copy");
    document.body.removeChild(area);
    return copiado;
  } catch {
    return false;
  }
}

/**
 * Copia el prompt de fix. Lo comparten la fila de la bandeja y la ficha: el flujo
 * real es copiar y pegar en Claude Code sin abrir el ticket, así que el prompt ya
 * viene en la lista (`with_prompt=1`) y aquí no hay ida al servidor de por medio.
 */
async function copiarPrompt(prompt?: string) {
  if (!prompt) {
    notifications.show({
      color: "red",
      message: "Este reporte no trae el prompt; ábrelo para copiarlo desde la ficha.",
    });
    return;
  }
  if (await escribirEnPortapapeles(prompt)) {
    notifications.show({ color: "teal", message: "Prompt copiado. Pégalo en Claude Code." });
  } else {
    notifications.show({
      color: "red",
      message: "El navegador bloqueó el portapapeles. Abre el reporte y copia desde la ficha.",
    });
  }
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

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Text c="dimmed" size="xs" style={{ minWidth: 0, flex: 1 }}>
          {fecha(r.created_at)} · {r.reporter_email || "sin correo"}
          {r.reporter_role ? ` (${r.reporter_role})` : ""}
        </Text>
        <Button size="xs" leftSection={<Copy size={14} />} onClick={() => copiarPrompt(r.fix_prompt)}>
          Copiar prompt de fix
        </Button>
      </Group>

      {/* Triage arriba: es lo que se viene a hacer con cada reporte. Cada cambio
          se guarda al elegirlo. */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Select
          size="xs"
          label="Estado"
          data={ESTADOS}
          value={r.status}
          allowDeselect={false}
          disabled={triage.isPending}
          onChange={(v) => v && v !== r.status && aplicar({ status: v })}
        />
        <Select
          size="xs"
          label="Tipo"
          data={TIPOS}
          value={r.kind}
          allowDeselect={false}
          disabled={triage.isPending}
          onChange={(v) => v && v !== r.kind && aplicar({ kind: v })}
        />
        <Select
          size="xs"
          label="Severidad"
          data={SEVERIDADES}
          value={r.severity}
          allowDeselect={false}
          disabled={triage.isPending}
          onChange={(v) => v && v !== r.severity && aplicar({ severity: v })}
        />
      </SimpleGrid>

      <Box p="sm" style={{ border: "1px solid var(--a-line)", borderRadius: "var(--a-r-control)" }}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {r.description}
        </Text>
        {r.attachment && (
          // La captura completa abre en otra pestaña: un modal dentro de este
          // modal se apila mal y en celular tapa los botones.
          <Anchor href={r.attachment} target="_blank" rel="noreferrer" display="inline-block" mt="sm">
            <img
              src={r.attachment}
              alt="captura del reporte"
              style={{
                height: "calc(120 * var(--u))",
                borderRadius: "calc(12 * var(--u))",
                border: "1px solid var(--a-line)",
                cursor: "zoom-in",
                display: "block",
              }}
            />
          </Anchor>
        )}
      </Box>

      <div>
        <SectionLabel mb={6}>Contexto capturado</SectionLabel>
        <Stack gap={3}>
          <Dato label="Pantalla" value={r.screen} />
          <Dato label="Versión / build" value={[r.app_version, r.build].filter(Boolean).join(" / ")} />
          <Dato label="Sistema" value={[r.os_name, r.os_version].filter(Boolean).join(" ")} />
          <Dato label="Dispositivo" value={r.device_model} />
          <Dato label="Gimnasio" value={r.gym_name} />
          <Dato label="Idioma / zona" value={[r.locale, r.timezone].filter(Boolean).join(" · ")} />
          <Dato label="Navegador" value={r.user_agent} />
        </Stack>
      </div>

      {r.stack_trace && (
        <div>
          <SectionLabel mb={6}>Stack trace</SectionLabel>
          <Code block style={{ maxHeight: "calc(220 * var(--u))", overflow: "auto", fontSize: 11 }}>
            {r.stack_trace}
          </Code>
        </div>
      )}

      <div>
        <Textarea
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
      </div>

      {r.resolved_at && (
        <Text size="xs" c="dimmed">
          Resuelto el {fecha(r.resolved_at)}.
        </Text>
      )}
    </Stack>
  );
}

/** Una fila de la bandeja: tocarla abre la ficha; el ícono copia sin abrirla. */
function FilaReporte({ r, onAbrir }: { r: BugReport; onAbrir: () => void }) {
  return (
    <Tarjeta etiqueta={r.description} aviso={r.status === "new"}>
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <UnstyledButton
          onClick={onAbrir}
          aria-label={`Abrir reporte: ${r.description.slice(0, 80)}`}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Text size="sm" fw={500} lineClamp={2}>
            {r.description}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {fecha(r.created_at)} · {r.surface_display} {r.app_version || ""}
            {r.screen ? ` · ${r.screen}` : ""} · {r.reporter_email || "sin correo"}
          </Text>
          <Group gap={4} mt={4} wrap="wrap">
            <Badge size="xs" variant="light" color={ESTADO_COLOR[r.status] ?? "gray"}>
              {r.status_display}
            </Badge>
            <Badge size="xs" variant="light" color={SEVERIDAD_COLOR[r.severity] ?? "gray"}>
              {r.severity_display}
            </Badge>
          </Group>
        </UnstyledButton>
        {/* Copiar sin abrir el ticket: el flujo real es tomar el prompt, pegarlo
            en Claude Code y pasar al siguiente. */}
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Copiar prompt de fix"
          title="Copiar prompt de fix"
          onClick={() => copiarPrompt(r.fix_prompt)}
        >
          <Copy size={16} />
        </ActionIcon>
      </Group>
    </Tarjeta>
  );
}

export function PlatformReportsPage() {
  const { isSuperuser } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  const [estado, setEstado] = useState("open");
  const [superficie, setSuperficie] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const reportes = usePlatformReports({ status: estado, surface: superficie, q }, isSuperuser);
  // El contador amarillo es de toda la bandeja, no del filtro: si dependiera de
  // él, elegir «Resueltos» haría parecer que no hay nada nuevo.
  const nuevos = usePlatformReports({ status: "new" }, isSuperuser);

  // Si /me falló, `isSuperuser` también es false: no negarle el acceso a un superadmin.
  if (sinCuenta) return sinCuenta;
  if (!isSuperuser) {
    return (
      <Stack>
        <PageHeader title="Reportes del app" />
        <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />
      </Stack>
    );
  }

  const filas = reportes.data ?? [];
  const cuantosNuevos = nuevos.data?.length ?? 0;
  const seleccionado: BugReport | undefined = filas.find((r) => r.id === selectedId);
  // El detalle sigue al id, no a la fila: si le cambias el estado a uno que ya no
  // entra en el filtro, el reporte sale de la bandeja pero la ficha se queda
  // abierta (antes se cerraba de golpe a media clasificación).
  const abierto = selectedId !== "";

  return (
    <div>
      <PageHeader kicker="Plataforma · Software" title="Reportes del app" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Bandeja"
          avisos={
            cuantosNuevos > 0 && (
              <Badge
                component="button"
                type="button"
                color="yellow"
                variant="light"
                style={{ cursor: "pointer", border: 0 }}
                title="Ver los nuevos"
                onClick={() => setEstado("new")}
              >
                {cuantosNuevos} {cuantosNuevos === 1 ? "nuevo" : "nuevos"}
              </Badge>
            )
          }
        >
          <Select
            aria-label="Estado"
            data={FILTROS_ESTADO}
            value={estado}
            onChange={(v) => v && setEstado(v)}
            allowDeselect={false}
            w={{ base: "100%", xs: 150 }}
          />
          <Select
            aria-label="Origen"
            data={FILTROS_SUPERFICIE}
            value={superficie}
            onChange={(v) => setSuperficie(v ?? "")}
            allowDeselect={false}
            w={{ base: "100%", xs: 150 }}
          />
          <TextInput
            aria-label="Buscar"
            w={{ base: "100%", sm: 240 }}
            placeholder="Buscar en descripción, correo, pantalla…"
            leftSection={<Search size={14} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && setQ(busqueda.trim())}
            onBlur={() => setQ(busqueda.trim())}
          />
        </Encabezado>

        {reportes.isError ? (
          <PageError
            message={errMsg(reportes.error, "No se pudieron cargar los reportes.")}
            onRetry={() => reportes.refetch()}
          />
        ) : reportes.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando…
          </Text>
        ) : !filas.length ? (
          <Text c="dimmed" size="sm">
            Sin reportes con estos filtros.
          </Text>
        ) : (
          <>
            <Text size="xs" c="dimmed" mb="xs">
              {filas.length} {filas.length === 1 ? "reporte" : "reportes"}
            </Text>
            <Stack gap={6}>
              {filas.map((r) => (
                <FilaReporte key={r.id} r={r} onAbrir={() => setSelectedId(r.id)} />
              ))}
            </Stack>
          </>
        )}
      </GlassCard>

      <Modal
        opened={abierto}
        onClose={() => setSelectedId("")}
        title={seleccionado?.surface_display ?? "Reporte"}
        centered
        size="lg"
      >
        {abierto && (
          <>
            {!seleccionado && !reportes.isLoading && (
              <Text size="xs" c="dimmed" mb="xs">
                Este reporte ya no entra en el filtro de la bandeja.
              </Text>
            )}
            <DetalleReporte reportId={selectedId} key={selectedId} />
          </>
        )}
      </Modal>
    </div>
  );
}
