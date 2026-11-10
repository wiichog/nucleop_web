import { type ChangeEvent, FormEvent, useState } from "react";
import { Button, Checkbox, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCrearGimnasioCompleto } from "../../api/hooks";
import { SectionLabel } from "../../components/ui";
import { errMsg } from "../../lib/errors";
import { pctTexto, SAAS_PLANS } from "./contrato";

const ALTA_VACIA = {
  name: "",
  location_text: "",
  address: "",
  is_public: true,
  saas_plan: "starter" as string | null,
  monthly_price: "299.00",
  commission_pct: "0.0300",
  plan_name: "Membresía mensual",
  plan_price: "650.00",
  admin_email: "",
  admin_first_name: "",
  admin_last_name: "",
  admin_phone: "",
};

type Campo = Exclude<keyof typeof ALTA_VACIA, "is_public" | "saas_plan">;

/**
 * Alta COMPLETA de un gimnasio: el gym, su suscripción con Nucleo, un plan
 * vendible y el acceso del dueño, en una sola ventana. Al terminar se cierra y el
 * aviso dice qué se creó (incluido si el dueño ya tenía cuenta).
 */
export function AltaGimnasioModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const crear = useCrearGimnasioCompleto();
  const [alta, setAlta] = useState(ALTA_VACIA);

  /*
   * El valor se lee ANTES de llamar al setter, nunca dentro del updater: React pone
   * `currentTarget` en null en cuanto el handler termina, y el updater no siempre
   * corre en ese mismo tick. Leerlo ahí revienta al escribir rápido en dos campos.
   */
  const campo = (k: Campo) => ({
    value: alta[k],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const valor = e.currentTarget.value;
      setAlta((a) => ({ ...a, [k]: valor }));
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const creado = await crear.mutateAsync({
        name: alta.name.trim(),
        location_text: alta.location_text,
        address: alta.address,
        is_public: alta.is_public,
        saas_plan: alta.saas_plan ?? "starter",
        monthly_price: alta.monthly_price || undefined,
        commission_pct: alta.commission_pct || null,
        plan_name: alta.plan_name || undefined,
        plan_price: alta.plan_price || undefined,
        admin_email: alta.admin_email.trim(),
        admin_first_name: alta.admin_first_name,
        admin_last_name: alta.admin_last_name,
        admin_phone: alta.admin_phone,
      });
      notifications.show({
        color: "teal",
        autoClose: 10000,
        title: `«${creado.name}» ya puede operar`,
        message: `Se creó la suscripción, el plan vendible y ${
          creado.admin_email
            ? `el acceso de ${creado.admin_email}${
                creado.admin_created
                  ? " (cuenta nueva; recibió el correo de bienvenida)"
                  : " (ya tenía cuenta en Nucleo)"
              }`
            : "ningún administrador todavía: invítalo desde «Administradores»"
        }.`,
      });
      setAlta(ALTA_VACIA);
      onClose();
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo crear el gimnasio.") });
    }
  };

  const pct = pctTexto(alta.commission_pct);

  return (
    <Modal opened={opened} onClose={onClose} title="Nuevo gimnasio" centered size="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <SectionLabel mb={0}>Gimnasio</SectionLabel>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Nombre" required data-autofocus {...campo("name")} />
            <TextInput label="Ubicación" placeholder="Zona 10, Ciudad de Guatemala" {...campo("location_text")} />
          </SimpleGrid>
          <TextInput label="Dirección" {...campo("address")} />

          <SectionLabel mb={0} mt="xs">
            Contrato con Nucleo
          </SectionLabel>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Plan SaaS"
              value={alta.saas_plan}
              onChange={(v) => setAlta((a) => ({ ...a, saas_plan: v }))}
              data={SAAS_PLANS}
              allowDeselect={false}
            />
            <TextInput label="Cuota mensual (Q)" inputMode="decimal" {...campo("monthly_price")} />
            <TextInput
              label="Recargo en tarjeta"
              inputMode="decimal"
              rightSection={
                pct ? (
                  <Text size="xs" c="dimmed" pr={6}>
                    {pct}
                  </Text>
                ) : null
              }
              rightSectionWidth={72}
              {...campo("commission_pct")}
            />
          </SimpleGrid>

          <SectionLabel mb={0} mt="xs">
            Primer plan vendible
          </SectionLabel>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Nombre del plan" {...campo("plan_name")} />
            <TextInput label="Precio del plan (Q)" inputMode="decimal" {...campo("plan_price")} />
          </SimpleGrid>

          <SectionLabel mb={0} mt="xs">
            Administrador del gimnasio
          </SectionLabel>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Correo" type="email" {...campo("admin_email")} />
            <TextInput label="Teléfono" {...campo("admin_phone")} />
            <TextInput label="Nombre" {...campo("admin_first_name")} />
            <TextInput label="Apellido" {...campo("admin_last_name")} />
          </SimpleGrid>

          <Group justify="space-between" align="center" mt="xs">
            <Checkbox
              label="Visible en el directorio público"
              checked={alta.is_public}
              onChange={(e) => {
                const marcado = e.currentTarget.checked;
                setAlta((a) => ({ ...a, is_public: marcado }));
              }}
            />
            <Button type="submit" disabled={!alta.name.trim()} loading={crear.isPending}>
              Dar de alta
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
