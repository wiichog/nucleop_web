import { FormEvent, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { LogIn } from "lucide-react";
import {
  useGymAdmins,
  useInviteGymAdmin,
  useSetGymActivo,
  useUpdatePlatformGym,
  useUpsertPlatformSubscription,
} from "../../api/hooks";
import type { GymAdmin } from "../../api/types";
import { PageError } from "../../components/PageStatus";
import { Tarjeta } from "../../components/Tarjeta";
import { errMsg } from "../../lib/errors";
import { ESTADOS_SUSCRIPCION, motivoSuscripcionSinMonto, pctTexto, SAAS_PLANS } from "./contrato";

/**
 * La ficha de un gimnasio de la red: tocarlo en la lista abre esto. Arriba lo que
 * se hace con el gym entero (entrar a su panel, suspender); debajo, su contrato y
 * quién administra.
 */
export function GimnasioModal({
  gym,
  esElActual,
  onClose,
  onEntrar,
}: {
  gym: GymAdmin | null;
  /** Es el gym que el superadmin ya tiene seleccionado en el panel. */
  esElActual: boolean;
  onClose: () => void;
  onEntrar: (gym: GymAdmin) => void;
}) {
  const setActivo = useSetGymActivo();

  const cambiarEstado = async (g: GymAdmin) => {
    const activo = g.is_active !== false;
    const texto = activo
      ? `Suspender «${g.name}». Sus atletas y su panel dejan de operar hasta que lo reactives. ¿Continuar?`
      : `Reactivar «${g.name}»?`;
    if (!window.confirm(texto)) return;
    try {
      await setActivo.mutateAsync({ gymId: g.id, is_active: !activo });
      notifications.show({
        color: "teal",
        message: activo ? "Gimnasio suspendido." : "Gimnasio reactivado.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo cambiar el estado del gimnasio."),
      });
    }
  };

  const suspendido = gym?.is_active === false;

  return (
    <Modal opened={!!gym} onClose={onClose} title={gym?.name ?? ""} centered size="lg">
      {gym && (
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap={6}>
              <Badge color={suspendido ? "red" : "teal"} variant="light">
                {suspendido ? "Suspendido" : "Activo"}
              </Badge>
              {gym.is_public === false && (
                <Badge color="gray" variant="light">
                  Privado
                </Badge>
              )}
              {gym.location_text ? (
                <Text size="sm" c="dimmed">
                  {gym.location_text}
                </Text>
              ) : null}
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color={suspendido ? "teal" : "red"}
                loading={setActivo.isPending}
                onClick={() => cambiarEstado(gym)}
              >
                {suspendido ? "Reactivar" : "Suspender"}
              </Button>
              {/* Soporte: el superadmin entra al panel del cliente sin pedirle su
                  contraseña (el backend ya lo autoriza). */}
              <Button size="xs" leftSection={<LogIn size={14} />} onClick={() => onEntrar(gym)}>
                {esElActual ? "Ir al panel" : "Entrar al panel"}
              </Button>
            </Group>
          </Group>

          <Tabs defaultValue="contrato" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="contrato">Contrato</Tabs.Tab>
              <Tabs.Tab value="admins">Administradores</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="contrato">
              {/* La llave rehidrata el formulario si se abre otro gym. */}
              <ContratoForm key={gym.id} gym={gym} onSaved={onClose} />
            </Tabs.Panel>
            <Tabs.Panel value="admins">
              <Administradores gymId={gym.id} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      )}
    </Modal>
  );
}

/** Contrato del gym con Nucleo: plan, recargo, fee y la suscripción mensual. */
function ContratoForm({ gym, onSaved }: { gym: GymAdmin; onSaved: () => void }) {
  const updateGym = useUpdatePlatformGym();
  const upsertSubscription = useUpsertPlatformSubscription();

  const [saasPlan, setSaasPlan] = useState<string | null>(gym.saas_plan ?? "starter");
  const [commission, setCommission] = useState(gym.platform_commission_pct ?? "0.0300");
  const [fixedFee, setFixedFee] = useState(gym.fixed_fee ?? "");
  const [isPublic, setIsPublic] = useState(gym.is_public ?? true);
  const [monthlyPrice, setMonthlyPrice] = useState(gym.subscription?.monthly_price ?? "");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    gym.subscription?.status ?? "active",
  );
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(
    gym.subscription?.next_billing_date ? new Date(gym.subscription.next_billing_date) : null,
  );
  const teniaSuscripcion = Boolean(gym.subscription);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const motivo = motivoSuscripcionSinMonto({
      monthlyPrice,
      teniaSuscripcion,
      status: subscriptionStatus,
      nextBillingDate,
    });
    if (motivo) {
      notifications.show({ color: "red", message: motivo });
      return;
    }
    try {
      await updateGym.mutateAsync({
        gymId: gym.id,
        body: {
          saas_plan: saasPlan ?? "starter",
          platform_commission_pct: commission,
          fixed_fee: fixedFee || null,
          is_public: isPublic,
        },
      });
      if (monthlyPrice.trim()) {
        await upsertSubscription.mutateAsync({
          gymId: gym.id,
          body: {
            saas_plan: saasPlan ?? "starter",
            monthly_price: monthlyPrice.trim(),
            status: subscriptionStatus ?? "active",
            next_billing_date: nextBillingDate ? nextBillingDate.toLocaleDateString("en-CA") : null,
          },
        });
      }
      notifications.show({ color: "teal", message: "Gimnasio actualizado." });
      onSaved();
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo guardar el gimnasio.") });
    }
  };

  const pct = pctTexto(commission);

  return (
    <form onSubmit={save}>
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Select
            label="Plan SaaS"
            value={saasPlan}
            onChange={setSaasPlan}
            data={SAAS_PLANS}
            allowDeselect={false}
          />
          <TextInput
            label="Recargo en tarjeta"
            placeholder="0.0300"
            inputMode="decimal"
            value={commission}
            onChange={(e) => setCommission(e.currentTarget.value)}
            rightSection={
              pct ? (
                <Text size="xs" c="dimmed" pr={6}>
                  {pct}
                </Text>
              ) : null
            }
            rightSectionWidth={72}
          />
          <TextInput
            label="Fee fijo"
            inputMode="decimal"
            value={fixedFee}
            onChange={(e) => setFixedFee(e.currentTarget.value)}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TextInput
            label="Suscripción mensual"
            inputMode="decimal"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.currentTarget.value)}
          />
          <Select
            label="Estado suscripción"
            value={subscriptionStatus}
            onChange={setSubscriptionStatus}
            data={ESTADOS_SUSCRIPCION}
            allowDeselect={false}
          />
          <DateInput
            label="Próximo cobro"
            value={nextBillingDate}
            onChange={setNextBillingDate}
            valueFormat="YYYY-MM-DD"
            clearable
          />
        </SimpleGrid>
        <Group justify="space-between" align="center" mt="xs">
          <Checkbox
            label="Visible en el directorio público"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />
          <Button
            type="submit"
            disabled={!commission}
            loading={updateGym.isPending || upsertSubscription.isPending}
          >
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Quién entra al panel del gym, y alta de uno nuevo detrás de un botón. */
function Administradores({ gymId }: { gymId: string }) {
  const admins = useGymAdmins(gymId);
  const invitar = useInviteGymAdmin(gymId);
  const [invitando, setInvitando] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const onInvitar = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await invitar.mutateAsync({ email: email.trim(), first_name: firstName, last_name: lastName, phone });
      notifications.show({
        color: "teal",
        message: "Administrador dado de alta. Recibirá un correo para entrar.",
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setInvitando(false);
    } catch (error) {
      notifications.show({
        color: "red",
        message: errMsg(error, "No se pudo dar de alta al administrador."),
      });
    }
  };

  const lista = admins.data ?? [];
  const sinReclamar = lista.filter((a) => !a.claimed).length;

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap={6}>
          <Text fw={600}>Con acceso al panel</Text>
          {sinReclamar > 0 && (
            <Badge color="yellow" variant="light">
              {sinReclamar} sin reclamar
            </Badge>
          )}
        </Group>
        {!invitando && (
          <Button size="xs" onClick={() => setInvitando(true)}>
            Invitar administrador
          </Button>
        )}
      </Group>

      {invitando && (
        <Box
          component="form"
          onSubmit={onInvitar}
          p="sm"
          style={{ border: "1px solid var(--a-line, var(--mantine-color-default-border))", borderRadius: 10 }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Correo"
              type="email"
              required
              data-autofocus
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <TextInput label="Teléfono" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
            <TextInput label="Nombre" value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
            <TextInput label="Apellido" value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end" gap="xs" mt="sm">
            <Button variant="default" size="xs" onClick={() => setInvitando(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="xs" disabled={!email.trim()} loading={invitar.isPending}>
              Invitar
            </Button>
          </Group>
        </Box>
      )}

      {admins.isError ? (
        <PageError onRetry={() => admins.refetch()} />
      ) : admins.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando…
        </Text>
      ) : !lista.length ? (
        <Text size="sm" c="dimmed">
          Nadie puede entrar al panel de este gimnasio todavía.
        </Text>
      ) : (
        <Stack gap={6}>
          {lista.map((a) => (
            <Tarjeta key={a.id} etiqueta={a.name || a.email} aviso={!a.claimed} apagada={!a.is_active}>
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {a.name || a.email}
                  </Text>
                  <Text c="dimmed" size="xs" truncate>
                    {a.email}
                    {a.phone ? ` · ${a.phone}` : ""}
                  </Text>
                </div>
                <Group gap={4} wrap="nowrap">
                  {!a.is_active && (
                    <Badge color="gray" variant="light" size="sm">
                      Inactivo
                    </Badge>
                  )}
                  {!a.claimed && (
                    <Badge color="yellow" variant="light" size="sm">
                      Sin reclamar
                    </Badge>
                  )}
                </Group>
              </Group>
            </Tarjeta>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
