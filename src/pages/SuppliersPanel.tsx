import { FormEvent, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DataTable, type DataTableSortStatus } from "mantine-datatable";
import {
  useCreateErpSupplier,
  useDeleteErpSupplier,
  useErpSuppliers,
  useUpdateErpSupplier,
} from "../api/hooks";
import type { ErpSupplier } from "../api/types";
import { PageError } from "../components/PageStatus";
import { RowActions } from "../components/RowActions";
import { GlassCard, Reveal } from "../components/aurora";
import { SectionLabel } from "../components/ui";
import { errMsg } from "../lib/errors";
import { sortRecords } from "../lib/sortRecords";

/** Campos editables del proveedor (los mismos en el alta y en la edición). */
interface FormProveedor {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  tax_id: string;
  notes: string;
}

const VACIO: FormProveedor = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  tax_id: "",
  notes: "",
};

/**
 * Proveedores del gym: a quién se le compra el inventario. Es el catálogo del
 * que cuelgan las órdenes de compra, así que darlos de alta aquí es el paso
 * previo a cargar mercadería.
 */
export function SuppliersPanel({ gymId }: { gymId: string }) {
  const [search, setSearch] = useState("");
  const [activos, setActivos] = useState<string | null>("activos");
  const suppliers = useErpSuppliers(gymId, {
    is_active: activos === "todos" ? undefined : activos === "activos",
  });
  const crear = useCreateErpSupplier(gymId);
  const actualizar = useUpdateErpSupplier(gymId);
  const borrar = useDeleteErpSupplier(gymId);

  const [alta, setAlta] = useState<FormProveedor>(VACIO);
  const [editando, setEditando] = useState<ErpSupplier | null>(null);
  const [edicion, setEdicion] = useState<FormProveedor>(VACIO);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ErpSupplier>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const onCrear = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await crear.mutateAsync(alta);
      setAlta(VACIO);
      notifications.show({ color: "teal", message: "Proveedor agregado." });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo agregar el proveedor."),
      });
    }
  };

  const abrirEdicion = (s: ErpSupplier) => {
    setEditando(s);
    setEdicion({
      name: s.name,
      contact_name: s.contact_name ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      tax_id: s.tax_id ?? "",
      notes: s.notes ?? "",
    });
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    try {
      await actualizar.mutateAsync({ id: editando.id, body: edicion });
      setEditando(null);
      notifications.show({ color: "teal", message: "Proveedor actualizado." });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo actualizar el proveedor."),
      });
    }
  };

  const darDeBaja = async (s: ErpSupplier) => {
    if (
      !window.confirm(
        `Dar de baja a "${s.name}". Sus órdenes de compra se conservan; solo deja de aparecer al crear órdenes nuevas. ¿Continuar?`,
      )
    )
      return;
    try {
      await borrar.mutateAsync(s.id);
      notifications.show({ color: "teal", message: "Proveedor dado de baja." });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo dar de baja al proveedor."),
      });
    }
  };

  const filas = sortRecords(
    (suppliers.data ?? []).filter((s) => {
      const term = search.trim().toLowerCase();
      return (
        !term ||
        s.name.toLowerCase().includes(term) ||
        (s.contact_name ?? "").toLowerCase().includes(term) ||
        (s.tax_id ?? "").toLowerCase().includes(term)
      );
    }),
    sortStatus,
  );

  return (
    <div>
      {suppliers.isError && <PageError onRetry={() => suppliers.refetch()} />}

      {/* Alta: primera tanda del ritmo Aurora (0.6s). */}
      <Reveal anim="slide-r" delay={0.6}>
      <Card mb="lg" component="form" onSubmit={onCrear}>
        <SectionLabel as="h2" mb={6}>Nuevo proveedor</SectionLabel>
        <Text c="dimmed" size="sm" mb="md">
          A quién le compras. Después le levantas órdenes de compra y, al recibirlas, el stock
          entra solo con su costo real.
        </Text>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {/*
            En cada onChange el valor se lee ANTES de llamar al setter, nunca dentro del
            updater. React pone `currentTarget` en null en cuanto el handler termina, y el
            updater que recibe `setState` no siempre corre en ese mismo tick: si ya hay otra
            actualización en cola, React lo difiere y para entonces `e.currentTarget` ya es
            null. Leerlo ahí revienta con un "Cannot read properties of null" que solo
            aparece al escribir rápido en dos campos seguidos, que es justo lo que hace la
            gente, y sin error boundary desmonta la página entera.
          */}
            <TextInput
              label="Nombre"
              value={alta.name}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, name: valor }));
              }}
            />
            <TextInput
              label="Contacto"
              value={alta.contact_name}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, contact_name: valor }));
              }}
            />
            <TextInput
              label="Teléfono"
              value={alta.phone}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, phone: valor }));
              }}
            />
            <TextInput
              label="Correo"
              value={alta.email}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, email: valor }));
              }}
            />
            <TextInput
              label="NIT"
              value={alta.tax_id}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, tax_id: valor }));
              }}
            />
            <TextInput
              label="Notas"
              value={alta.notes}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setAlta((f) => ({ ...f, notes: valor }));
              }}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button type="submit" disabled={!alta.name.trim()} loading={crear.isPending}>
              Agregar proveedor
            </Button>
          </Group>
        </Stack>
      </Card>
      </Reveal>

      <GlassCard
        padding={16}
        delay={0.72}
        style={{ marginBottom: "calc(16 * var(--u))" }}
      >
        <Group align="flex-end" gap="md" wrap="wrap">
          <TextInput
            label="Buscar"
            placeholder="Nombre, contacto o NIT…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={{ base: "100%", sm: 280 }}
          />
          <Select
            label="Estado"
            value={activos}
            onChange={setActivos}
            w={{ base: "100%", sm: 180 }}
            data={[
              { value: "activos", label: "Activos" },
              { value: "inactivos", label: "Inactivos" },
              { value: "todos", label: "Todos" },
            ]}
          />
        </Group>
      </GlassCard>

      <SectionLabel as="h2" mb="xs">Proveedores del gym</SectionLabel>
      <GlassCard padding={14} delay={0.84}>
        <DataTable<ErpSupplier>
          minHeight={160}
          highlightOnHover
          striped
          idAccessor="id"
          records={filas}
          fetching={suppliers.isLoading}
          noRecordsText="Agrega tu primer proveedor para poder levantar órdenes de compra."
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          columns={[
            { accessor: "name", title: "Proveedor", sortable: true },
            {
              accessor: "contact_name",
              title: "Contacto",
              sortable: true,
              render: (s) => s.contact_name || "—",
            },
            { accessor: "phone", title: "Teléfono", render: (s) => s.phone || "—" },
            { accessor: "email", title: "Correo", render: (s) => s.email || "—" },
            { accessor: "tax_id", title: "NIT", render: (s) => s.tax_id || "—" },
            {
              accessor: "is_active",
              title: "Estado",
              sortable: true,
              render: (s) => (
                <Badge color={s.is_active ? "teal" : "gray"} variant="light">
                  {s.is_active ? "Activo" : "Inactivo"}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "Acciones",
              render: (s) => (
                <RowActions
                  actions={[
                    { label: "Editar", onClick: () => abrirEdicion(s) },
                    {
                      label: "Dar de baja",
                      color: "red",
                      variant: "subtle" as const,
                      onClick: () => darDeBaja(s),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </GlassCard>

      <Modal
        opened={!!editando}
        onClose={() => setEditando(null)}
        title="Editar proveedor"
        centered
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Nombre"
              value={edicion.name}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setEdicion((f) => ({ ...f, name: valor }));
              }}
            />
            <TextInput
              label="Contacto"
              value={edicion.contact_name}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setEdicion((f) => ({ ...f, contact_name: valor }));
              }}
            />
            <TextInput
              label="Teléfono"
              value={edicion.phone}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setEdicion((f) => ({ ...f, phone: valor }));
              }}
            />
            <TextInput
              label="Correo"
              value={edicion.email}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setEdicion((f) => ({ ...f, email: valor }));
              }}
            />
            <TextInput
              label="NIT"
              value={edicion.tax_id}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                setEdicion((f) => ({ ...f, tax_id: valor }));
              }}
            />
          </SimpleGrid>
          <Textarea
            label="Notas"
            value={edicion.notes}
            onChange={(e) => {
              const valor = e.currentTarget.value;
              setEdicion((f) => ({ ...f, notes: valor }));
            }}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={guardarEdicion}
              disabled={!edicion.name.trim()}
              loading={actualizar.isPending}
            >
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
