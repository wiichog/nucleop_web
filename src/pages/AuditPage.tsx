import { useState } from "react";
import { Button, Code, Group, Modal, SimpleGrid, Stack, Table, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Download } from "lucide-react";
import { useAuditLogs, useExportAudit } from "../api/hooks";
import type { AuditLog } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader, SectionLabel } from "../components/ui";
import { GlassCard } from "../components/aurora";
import { Encabezado } from "../components/Tarjeta";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { AUDIT_ACTION, AUDIT_ENTITY, AUDIT_ROLE, label } from "../lib/labels";

/** Cuántas filas se pintan de entrada; «Ver más» suma otras tantas. */
const PAGINA = 100;

function describir(log: { action: string; entity: string }): string {
  const accion = AUDIT_ACTION[log.action] ?? log.action;
  const entidad = AUDIT_ENTITY[log.entity] ?? log.entity;
  const selfContained = [
    "membership_transition",
    "password_change",
    "password_reset",
    "club_requested",
    "club_decided",
    "branch_create",
    "classes_recurring_create",
    "erp.sale",
    "erp.product_create",
    "erp.product_update",
    "erp.expense_create",
    "manual_payment",
    "refund",
    "export",
  ];
  if (selfContained.includes(log.action)) return accion;
  return `${accion} · ${entidad}`;
}

/** Lo que se muestra de una fila, ya resuelto: quién, con qué rol y qué hizo. */
export function filaDeBitacora(log: AuditLog) {
  const rol = log.actor_rol || (log.actor_role ? label(AUDIT_ROLE, log.actor_role) : "Sistema/atleta");
  return {
    quien: log.actor_nombre || "",
    rol,
    que: log.descripcion || describir(log),
  };
}

/** ¿La fila coincide con lo buscado? Busca en quién, rol y qué hizo, sin acentos. */
export function coincideBusqueda(log: AuditLog, texto: string): boolean {
  const q = sinAcentos(texto.trim());
  if (!q) return true;
  const f = filaDeBitacora(log);
  return sinAcentos(`${f.quien} ${f.rol} ${f.que}`).includes(q);
}

function sinAcentos(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export function AuditPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const logs = useAuditLogs(gymId);
  const exportAudit = useExportAudit(gymId);
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(PAGINA);
  const [abierto, setAbierto] = useState<AuditLog | null>(null);

  if (!gymId) return <NoGymAssigned />;

  const registros = logs.data ?? [];
  const filtrados = registros.filter((l) => coincideBusqueda(l, busqueda));

  return (
    <div>
      <PageHeader kicker="Operación · Bitácora" title="Actividad del gimnasio" />

      <GlassCard delay={0.6} padding={18}>
        <Encabezado
          titulo="Movimientos"
          avisos={
            registros.length > 0 && (
              <Text c="dimmed" size="sm">
                {busqueda.trim() ? `${filtrados.length} de ${registros.length}` : registros.length}
              </Text>
            )
          }
        >
          {registros.length > 0 && (
            <TextInput
              placeholder="Buscar persona o movimiento…"
              aria-label="Buscar en la bitácora"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.currentTarget.value);
                setVisibles(PAGINA);
              }}
              w={{ base: "100%", sm: 260 }}
            />
          )}
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            loading={exportAudit.isPending}
            onClick={() =>
              exportAudit.mutate(undefined, {
                onError: (error) =>
                  notifications.show({
                    color: "red",
                    message: errMsg(error, "No se pudo exportar la bitácora."),
                  }),
              })
            }
          >
            Exportar CSV
          </Button>
        </Encabezado>

        {/* La bitácora es la prueba de quién hizo qué: decir "sin actividad"
            cuando en realidad falló la carga es peor que no mostrarla. */}
        {logs.isError ? (
          <PageError message="No se pudo cargar la bitácora del gimnasio." onRetry={() => logs.refetch()} />
        ) : logs.isLoading ? (
          <Text c="dimmed" size="sm">
            Cargando la bitácora…
          </Text>
        ) : registros.length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin actividad registrada.
          </Text>
        ) : filtrados.length === 0 ? (
          <Text c="dimmed" size="sm">
            Nada coincide con «{busqueda.trim()}».
          </Text>
        ) : (
          <>
            <Table.ScrollContainer minWidth={480}>
              <Table highlightOnHover verticalSpacing={6}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={120}>Fecha</Table.Th>
                    <Table.Th>Quién</Table.Th>
                    <Table.Th>Qué hizo</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtrados.slice(0, visibles).map((log) => {
                    const f = filaDeBitacora(log);
                    const abrir = () => setAbierto(log);
                    return (
                      <Table.Tr
                        key={log.id}
                        onClick={abrir}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrir();
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver detalle: ${f.que}`}
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <Text size="sm" className="a-tabular" style={{ whiteSpace: "nowrap" }}>
                            {fechaCorta(log.created_at)}
                          </Text>
                        </Table.Td>
                        {/* Con dos admins el rol solo no dice quién fue: va el nombre
                            (o el correo de la cuenta) y debajo el rol. */}
                        <Table.Td>
                          {f.quien ? (
                            <>
                              <Text size="sm">{f.quien}</Text>
                              <Text size="xs" c="dimmed">
                                {f.rol}
                              </Text>
                            </>
                          ) : (
                            <Text size="sm">{f.rol}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{f.que}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {filtrados.length > visibles && (
              <Group justify="center" mt="md">
                <Button variant="subtle" onClick={() => setVisibles((v) => v + PAGINA)}>
                  Ver más ({filtrados.length - visibles})
                </Button>
              </Group>
            )}
          </>
        )}
      </GlassCard>

      <DetalleMovimiento log={abierto} onClose={() => setAbierto(null)} />
    </div>
  );
}

const hayDato = (v: unknown) =>
  v != null && !(typeof v === "object" && Object.keys(v as object).length === 0);

/** El movimiento completo: fecha exacta, quién y, si lo hay, el antes y el después. */
function DetalleMovimiento({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  const f = log ? filaDeBitacora(log) : null;
  return (
    <Modal opened={!!log} onClose={onClose} title={f?.que ?? ""} centered size="lg">
      {log && f && (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <div>
              <SectionLabel mb={4}>Fecha</SectionLabel>
              <Text size="sm">{new Date(log.created_at).toLocaleString("es-GT")}</Text>
            </div>
            <div>
              <SectionLabel mb={4}>Quién</SectionLabel>
              <Text size="sm">{f.quien || f.rol}</Text>
              {f.quien && (
                <Text size="xs" c="dimmed">
                  {f.rol}
                </Text>
              )}
            </div>
          </SimpleGrid>
          {hayDato(log.before) && (
            <div>
              <SectionLabel mb={4}>Antes</SectionLabel>
              <Code block>{JSON.stringify(log.before, null, 2)}</Code>
            </div>
          )}
          {hayDato(log.after) && (
            <div>
              <SectionLabel mb={4}>Después</SectionLabel>
              <Code block>{JSON.stringify(log.after, null, 2)}</Code>
            </div>
          )}
        </Stack>
      )}
    </Modal>
  );
}
