import { Button, Card, SimpleGrid, Table, Text } from "@mantine/core";
import { Download } from "lucide-react";
import { useAtRisk, useOverdue } from "../api/hooks";
import { NoGymAssigned } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { Membership } from "../api/types";
import { downloadCsv } from "../lib/csv";
import { MEMBERSHIP_STATUS, PAYMENT_STATUS, label } from "../lib/labels";

export function RetentionPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const atRisk = useAtRisk(gymId);
  const overdue = useOverdue(gymId);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        title="Retención y morosidad"
        subtitle="El gancho de Nucleo: deja de perder alumnos."
        action={
          <Button
            variant="default"
            leftSection={<Download size={16} />}
            onClick={() =>
              downloadCsv(
                "retencion-nucleo.csv",
                ["segmento", "atleta", "estado", "cuota", "pago"],
                [
                  ...(atRisk.data ?? []).map((membership) => ["en riesgo", membership] as const),
                  ...(overdue.data ?? []).map((membership) => ["moroso", membership] as const),
                ].map(([segment, membership]) => [
                  segment,
                  membership.athlete_name,
                  label(MEMBERSHIP_STATUS, membership.status),
                  membership.effective_fee,
                  label(PAYMENT_STATUS, membership.payment_status),
                ]),
              )
            }
          >
            Exportar CSV
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card>
          <Text fw={600} mb="sm">
            Atletas en riesgo
          </Text>
          <RelationTable rows={atRisk.data ?? []} empty="Nadie en riesgo. 💪" tone="orange" />
        </Card>
        <Card>
          <Text fw={600} mb="sm">
            Morosidad
          </Text>
          <RelationTable rows={overdue.data ?? []} empty="Sin morosos." tone="red" />
        </Card>
      </SimpleGrid>
    </div>
  );
}

function RelationTable({
  rows,
  empty,
  tone,
}: {
  rows: Membership[];
  empty: string;
  tone: "orange" | "red";
}) {
  if (!rows.length)
    return (
      <Text c="dimmed" size="sm">
        {empty}
      </Text>
    );
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Atleta</Table.Th>
          <Table.Th>Estado</Table.Th>
          <Table.Th>Cuota</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((m) => (
          <Table.Tr key={m.id}>
            <Table.Td>{m.athlete_name}</Table.Td>
            <Table.Td>
              <Text c={tone === "red" ? "red" : "flame"} size="sm">
                {label(MEMBERSHIP_STATUS, m.status)}
              </Text>
            </Table.Td>
            <Table.Td>Q{m.effective_fee ?? "—"}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
