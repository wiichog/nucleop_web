import { useState } from "react";
import { Badge, Group, Table, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listApplications } from "../../api/onboarding";
import { errMsg } from "../../lib/errors";
import { label } from "../../lib/labels";
import { EmptyState } from "../EmptyState";
import { PageError, PageLoading } from "../PageStatus";
import { SectionLabel } from "../ui";
import { FilterChip, GlassCard, Stagger } from "../aurora";
import { ApplicationDetail } from "./ApplicationDetail";
import {
  ESTADO_SOLICITUD,
  ESTADO_SOLICITUD_COLOR,
  MODALIDAD_COMISION,
} from "./labels";

/**
 * Bandeja de solicitudes firmadas. Una fila es un contrato que alguien ya firmó y
 * que espera a que una persona lo revise y monte el gimnasio.
 *
 * Nunca se borra ninguna: son evidencia. Por eso no hay acción destructiva en la fila;
 * todo lo que se hace con una solicitud se hace en su ficha.
 */

const FILTROS = [
  { value: "", label: "Todas" },
  { value: "received", label: "Recibidas" },
  { value: "in_review", label: "En revisión" },
  { value: "approved", label: "Aprobadas" },
  { value: "rejected", label: "Rechazadas" },
];

const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-GT", { dateStyle: "medium" }) : "—";

export function ApplicationsSection() {
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  // `q` se separa del texto que se escribe: la búsqueda va al servidor y dispararla en
  // cada tecla sería una petición por letra.
  const [q, setQ] = useState("");
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const solicitudes = useQuery({
    queryKey: ["onboarding-applications", estado, q],
    queryFn: () => listApplications({ status: estado || undefined, q: q || undefined }),
  });

  const filas = solicitudes.data ?? [];

  return (
    <section>
      <SectionLabel as="h2">Solicitudes · {filas.length}</SectionLabel>

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
            key={f.value || "todas"}
            active={estado === f.value}
            onClick={() => setEstado(f.value)}
          >
            {f.label}
          </FilterChip>
        ))}
      </Stagger>

      <Group gap="sm" mb="md" wrap="wrap">
        <TextInput
          size="xs"
          w={{ base: "100%", sm: 300 }}
          placeholder="Buscar por gimnasio, contacto, correo o NIT"
          leftSection={<Search size={14} />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && setQ(busqueda.trim())}
          onBlur={() => setQ(busqueda.trim())}
        />
      </Group>

      {solicitudes.isError ? (
        <PageError
          message={errMsg(solicitudes.error, "No se pudieron cargar las solicitudes.")}
          onRetry={() => solicitudes.refetch()}
        />
      ) : solicitudes.isLoading ? (
        <PageLoading />
      ) : !filas.length ? (
        <EmptyState
          title="Sin solicitudes"
          description="Aquí caen los contratos firmados. Emite un enlace para que un gimnasio pueda llenarlo."
        />
      ) : (
        <GlassCard padding={12}>
          <Table.ScrollContainer minWidth={860}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={70}>Folio</Table.Th>
                  <Table.Th>Gimnasio</Table.Th>
                  <Table.Th>Contacto</Table.Th>
                  <Table.Th>Cobro</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Firmada</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filas.map((a) => (
                  <Table.Tr
                    key={a.id}
                    onClick={() => setSeleccionada(a.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        #{a.folio}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {a.gym_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {[a.gym_municipality, a.gym_department].filter(Boolean).join(", ")}
                        {a.estimated_members ? ` · ~${a.estimated_members} atletas` : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{a.contact_name}</Text>
                      <Text size="xs" c="dimmed">
                        {a.contact_email}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {a.enable_online_payments ? "Con tarjeta" : "Solo manual"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {label(MODALIDAD_COMISION, a.commission_mode)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={ESTADO_SOLICITUD_COLOR[a.status] ?? "gray"}
                      >
                        {label(ESTADO_SOLICITUD, a.status)}
                      </Badge>
                      {a.gym_id && (
                        <Text size="xs" c="dimmed">
                          Montado
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{fechaCorta(a.accepted_at)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </GlassCard>
      )}

      <ApplicationDetail
        applicationId={seleccionada}
        onClose={() => setSeleccionada(null)}
      />
    </section>
  );
}
