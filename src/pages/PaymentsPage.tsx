import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  FileInput,
  Grid,
  Group,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Download, Paperclip } from "lucide-react";
import { useGymPayments, useMemberships, useRegisterManualPayment } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import {
  FEL_STATUS,
  MEMBERSHIP_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TX_STATUS,
  label,
} from "../lib/labels";

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const payments = useGymPayments(gymId);
  const memberships = useMemberships(gymId);
  const registerManual = useRegisterManualPayment(gymId);

  const [membershipId, setMembershipId] = useState<string | null>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!membershipId) return;
    await registerManual.mutateAsync({
      membership_id: membershipId,
      amount,
      method,
      proof_file: proofFile ?? undefined,
    });
    setAmount("");
    setProofFile(null);
  };

  if (!gymId) return <NoGymAssigned />;
  if (payments.isError) return <PageError onRetry={() => payments.refetch()} />;

  return (
    <div>
      <PageHeader title="Membresías" subtitle="Registra pagos de membresía y revisa el historial." />
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card component="form" onSubmit={onSubmit}>
            <Title order={3} mb={4}>
              Registrar pago manual
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              Efectivo o transferencia. No genera comisión, pero activa la membresía.
            </Text>
            <Select
              label="Membresía"
              placeholder="Selecciona…"
              value={membershipId}
              onChange={setMembershipId}
              searchable
              mb="sm"
              data={(memberships.data ?? []).map((m) => ({
                value: m.id,
                label: `${m.athlete_name} (${label(MEMBERSHIP_STATUS, m.status)})`,
              }))}
            />
            <Select
              label="Método"
              value={method}
              onChange={(v) => setMethod((v as "cash" | "bank_transfer") ?? "cash")}
              mb="sm"
              data={[
                { value: "cash", label: "Efectivo" },
                { value: "bank_transfer", label: "Transferencia" },
              ]}
            />
            {method === "bank_transfer" && (
              <FileInput
                label="Comprobante"
                placeholder="Adjuntar comprobante"
                leftSection={<Paperclip size={16} />}
                accept="image/*,.pdf"
                value={proofFile}
                onChange={setProofFile}
                clearable
                mb="sm"
              />
            )}
            <TextInput
              label="Monto (Q)"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
              mb="md"
            />
            {registerManual.isError && (
              <Text c="red" size="sm" mb="sm">
                No se pudo registrar el pago. Verifica los datos.
              </Text>
            )}
            <Button type="submit" fullWidth disabled={!membershipId || !amount} loading={registerManual.isPending}>
              Registrar pago
            </Button>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card>
            <Group justify="space-between" mb="sm">
              <Title order={3}>Historial</Title>
              <Button
                variant="default"
                size="xs"
                leftSection={<Download size={16} />}
                onClick={() =>
                  downloadCsv(
                    "pagos-nucleo.csv",
                    ["fecha", "concepto", "monto", "método", "estado", "factura"],
                    (payments.data ?? []).map((payment) => [
                      new Date(payment.created_at).toLocaleString("es-GT"),
                      payment.concept,
                      payment.amount,
                      label(PAYMENT_METHOD, payment.method),
                      label(PAYMENT_TX_STATUS, payment.status),
                      label(FEL_STATUS, payment.fel_status),
                    ]),
                  )
                }
              >
                Exportar CSV
              </Button>
            </Group>
            {!payments.data?.length ? (
              <EmptyState
                title="Sin pagos registrados"
                description="Los pagos con tarjeta y manuales aparecerán aquí."
              />
            ) : (
              <Table.ScrollContainer minWidth={620}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Fecha</Table.Th>
                      <Table.Th>Concepto</Table.Th>
                      <Table.Th>Monto</Table.Th>
                      <Table.Th>Método</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th>Factura (FEL)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(payments.data ?? []).map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>{new Date(p.created_at).toLocaleDateString("es-GT")}</Table.Td>
                        <Table.Td>{p.concept}</Table.Td>
                        <Table.Td>Q{p.amount}</Table.Td>
                        <Table.Td>{label(PAYMENT_METHOD, p.method)}</Table.Td>
                        <Table.Td>{label(PAYMENT_TX_STATUS, p.status)}</Table.Td>
                        <Table.Td>{label(FEL_STATUS, p.fel_status)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
