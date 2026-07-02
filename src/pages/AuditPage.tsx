import { Button, Card, Table, Text } from "@mantine/core";
import { Download } from "lucide-react";
import { useAuditLogs, useExportAudit } from "../api/hooks";
import { NoGymAssigned } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { AUDIT_ACTION, AUDIT_ENTITY, AUDIT_ROLE, label } from "../lib/labels";

function describe(log: { action: string; entity: string }): string {
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

export function AuditPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const logs = useAuditLogs(gymId);
  const exportAudit = useExportAudit(gymId);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Operación · Bitácora"
        title="Actividad del gimnasio"
        subtitle="Quién hizo qué y cuándo, dentro de este gimnasio."
        action={
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            loading={exportAudit.isPending}
            onClick={() => exportAudit.mutate()}
          >
            Exportar CSV
          </Button>
        }
      />
      <Card>
        {(logs.data ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin actividad registrada.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={520}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Quién</Table.Th>
                  <Table.Th>Qué hizo</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(logs.data ?? []).map((log) => {
                  const extra = log as unknown as { descripcion?: string; actor_rol?: string };
                  return (
                    <Table.Tr key={log.id}>
                      <Table.Td>{new Date(log.created_at).toLocaleString("es-GT")}</Table.Td>
                      <Table.Td>
                        {extra.actor_rol ??
                          (log.actor_role ? label(AUDIT_ROLE, log.actor_role) : "Sistema/atleta")}
                      </Table.Td>
                      <Table.Td>{extra.descripcion ?? describe(log)}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </div>
  );
}
