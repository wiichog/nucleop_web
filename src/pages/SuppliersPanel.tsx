import { type ChangeEvent, useState } from "react";
import { Badge, Button, Group, Modal, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCreateErpSupplier, useErpSuppliers, useUpdateErpSupplier } from "../api/hooks";
import type { ErpSupplier } from "../api/types";
import { PageError } from "../components/PageStatus";
import { GlassCard } from "../components/aurora";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { errMsg } from "../lib/errors";

/** Campos editables del proveedor (los mismos en el alta y en la edición). */
interface FormProveedor {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  tax_id: string;
  notes: string;
}

const VACIO: FormProveedor = { name: "", contact_name: "", phone: "", email: "", tax_id: "", notes: "" };

const formDe = (s: ErpSupplier): FormProveedor => ({
  name: s.name,
  contact_name: s.contact_name ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  tax_id: s.tax_id ?? "",
  notes: s.notes ?? "",
});

/**
 * Proveedores del gym: a quién se le compra el inventario. Es el catálogo del
 * que cuelgan las órdenes de compra. Tocar uno abre la misma ventana del alta,
 * con sus datos y con «Dar de baja» o «Reactivar».
 */
export function SuppliersPanel({ gymId }: { gymId: string }) {
  const [search, setSearch] = useState("");
  const [activos, setActivos] = useState<string | null>("activos");
  const suppliers = useErpSuppliers(gymId, {
    is_active: activos === "todos" ? undefined : activos === "activos",
  });
  const crear = useCreateErpSupplier(gymId);
  const actualizar = useUpdateErpSupplier(gymId);

  // null = cerrado · "nuevo" = alta · un proveedor = edición.
  const [abierto, setAbierto] = useState<ErpSupplier | "nuevo" | null>(null);
  const [form, setForm] = useState<FormProveedor>(VACIO);
  const existente = abierto && abierto !== "nuevo" ? abierto : null;

  const abrir = (s: ErpSupplier | "nuevo") => {
    setAbierto(s);
    setForm(s === "nuevo" ? VACIO : formDe(s));
  };

  /*
   * En cada onChange el valor se lee ANTES de llamar al setter, nunca dentro del
   * updater: React pone `currentTarget` en null en cuanto el handler termina y el
   * updater puede correr después. Leerlo ahí revienta al escribir rápido.
   */
  const campo = (k: keyof FormProveedor) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const valor = e.currentTarget.value;
    setForm((f) => ({ ...f, [k]: valor }));
  };

  const guardar = async () => {
    try {
      if (existente) {
        await actualizar.mutateAsync({ id: existente.id, body: form });
        notifications.show({ color: "teal", message: "Proveedor actualizado." });
      } else {
        await crear.mutateAsync(form);
        notifications.show({ color: "teal", message: "Proveedor agregado." });
      }
      setAbierto(null);
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, existente ? "No se pudo actualizar el proveedor." : "No se pudo agregar el proveedor."),
      });
    }
  };

  /*
   * Dar de baja y reactivar son el mismo PATCH sobre `is_active`, a propósito.
   * El DELETE del backend es soft-delete con `deleted_at`, y el listado filtra
   * `.alive()`: un proveedor borrado así desaparece incluso del filtro
   * «Inactivos» y ya no hay forma de traerlo de vuelta desde el panel. Con
   * `is_active=false` sigue listado como inactivo, sus órdenes se conservan y la
   * baja se puede deshacer con «Reactivar».
   */
  const darDeBaja = async (s: ErpSupplier) => {
    if (
      !window.confirm(
        `Dar de baja a "${s.name}". Sus órdenes de compra se conservan; solo deja de aparecer al crear órdenes nuevas. Puedes reactivarlo cuando quieras. ¿Continuar?`,
      )
    )
      return;
    try {
      await actualizar.mutateAsync({ id: s.id, body: { is_active: false } });
      notifications.show({ color: "teal", message: "Proveedor dado de baja." });
      setAbierto(null);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo dar de baja al proveedor.") });
    }
  };

  const reactivar = async (s: ErpSupplier) => {
    try {
      await actualizar.mutateAsync({ id: s.id, body: { is_active: true } });
      notifications.show({ color: "teal", message: "Proveedor reactivado." });
      setAbierto(null);
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo reactivar al proveedor.") });
    }
  };

  const term = search.trim().toLowerCase();
  const filas = (suppliers.data ?? [])
    .filter(
      (s) =>
        !term ||
        s.name.toLowerCase().includes(term) ||
        (s.contact_name ?? "").toLowerCase().includes(term) ||
        (s.tax_id ?? "").toLowerCase().includes(term),
    )
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "es"));

  if (suppliers.isError) return <PageError onRetry={() => suppliers.refetch()} />;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado titulo="Proveedores">
        <TextInput
          placeholder="Nombre, contacto o NIT…"
          aria-label="Buscar proveedor"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: "100%", sm: 220 }}
        />
        <Select
          aria-label="Estado"
          value={activos}
          onChange={setActivos}
          allowDeselect={false}
          w={{ base: "100%", sm: 140 }}
          data={[
            { value: "activos", label: "Activos" },
            { value: "inactivos", label: "Inactivos" },
            { value: "todos", label: "Todos" },
          ]}
        />
        <Button onClick={() => abrir("nuevo")}>Nuevo proveedor</Button>
      </Encabezado>

      {suppliers.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : filas.length === 0 ? (
        <Text c="dimmed" size="sm" py="md">
          {term
            ? "Ningún proveedor coincide con la búsqueda."
            : activos === "inactivos"
              ? "No tienes proveedores dados de baja."
              : "Agrega tu primer proveedor para poder hacer órdenes de compra."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {filas.map((s) => (
            <Tarjeta key={s.id} etiqueta={`Abrir ${s.name}`} onClick={() => abrir(s)} apagada={!s.is_active}>
              <Group justify="space-between" gap={6} wrap="nowrap">
                <Text fw={700} truncate>
                  {s.name}
                </Text>
                {!s.is_active && (
                  <Badge size="xs" color="gray" variant="light">
                    Inactivo
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {[s.contact_name, s.phone].filter(Boolean).join(" · ") || "Sin contacto"}
              </Text>
              {s.tax_id && (
                <Text size="xs" c="dimmed" truncate>
                  NIT {s.tax_id}
                </Text>
              )}
            </Tarjeta>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={!!abierto}
        onClose={() => setAbierto(null)}
        title={existente ? "Editar proveedor" : "Nuevo proveedor"}
        centered
      >
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Nombre" value={form.name} onChange={campo("name")} data-autofocus />
            <TextInput label="Contacto" value={form.contact_name} onChange={campo("contact_name")} />
            <TextInput label="Teléfono" type="tel" value={form.phone} onChange={campo("phone")} />
            <TextInput label="Correo" type="email" value={form.email} onChange={campo("email")} />
            <TextInput label="NIT" value={form.tax_id} onChange={campo("tax_id")} />
          </SimpleGrid>
          <Textarea label="Notas" value={form.notes} onChange={campo("notes")} autosize minRows={2} />
          <Group justify="space-between" mt="xs" wrap="wrap">
            {existente ? (
              existente.is_active ? (
                <Button variant="subtle" color="red" loading={actualizar.isPending} onClick={() => darDeBaja(existente)}>
                  Dar de baja
                </Button>
              ) : (
                <Button variant="light" color="teal" loading={actualizar.isPending} onClick={() => reactivar(existente)}>
                  Reactivar
                </Button>
              )
            ) : (
              <span />
            )}
            <Group gap="xs">
              <Button variant="default" onClick={() => setAbierto(null)}>
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={!form.name.trim()}
                loading={crear.isPending || (actualizar.isPending && !!existente)}
              >
                {existente ? "Guardar" : "Crear proveedor"}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </GlassCard>
  );
}
