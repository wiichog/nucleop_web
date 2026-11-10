import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button, Group, SimpleGrid, Tabs, Text, TextInput } from "@mantine/core";
import { Search } from "lucide-react";
import { usePlatformGyms } from "../api/hooks";
import type { GymAdmin } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { PageError, useCuentaSinCargar } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { PageHeader } from "../components/ui";
import { GlassCard, delayVar } from "../components/aurora";
import { PlatformBillingPanel } from "./PlatformBillingPanel";
import { AltaGimnasioModal } from "./plataforma/AltaGimnasioModal";
import { GimnasioModal } from "./plataforma/GimnasioModal";
import { ESTADOS_SUSCRIPCION, etiquetaDe, faltaSuscripcion, pctTexto, SAAS_PLANS } from "./plataforma/contrato";
import { fmtQ } from "../lib/money";
import { useAuth } from "../lib/auth";

// Reexportadas: el contrato vive en `plataforma/contrato.ts` y sus pruebas lo
// importan desde la página, que es donde se usa.
export { etiquetaDe, motivoSuscripcionSinMonto } from "./plataforma/contrato";

/** Los que operan primero y por nombre; los suspendidos, al final. */
export function ordenarGyms(gyms: GymAdmin[]): GymAdmin[] {
  return gyms
    .slice()
    .sort(
      (a, b) =>
        Number(a.is_active === false) - Number(b.is_active === false) ||
        a.name.localeCompare(b.name, "es"),
    );
}

const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-GT", { day: "numeric", month: "short" });

export function PlatformGymsPage() {
  const { isSuperuser } = useAuth();
  const sinCuenta = useCuentaSinCargar();
  // La pestaña vive en la URL para poder enlazar directo al estado de cuenta.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "gimnasios";

  // Si /me falló, `isSuperuser` también es false: no negarle el acceso a un superadmin.
  if (sinCuenta) return sinCuenta;
  if (!isSuperuser)
    return <EmptyState title="Sin acceso" description="Esta bandeja es del equipo de Nucleo." />;

  return (
    <div>
      <PageHeader kicker="Plataforma" title="Gimnasios" />

      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v && v !== "gimnasios" ? { tab: v } : {}, { replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb="lg" className="a-wipe-right" style={delayVar(0.5)}>
          <Tabs.Tab value="gimnasios">Gimnasios</Tabs.Tab>
          <Tabs.Tab value="cuenta">Estado de cuenta</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="gimnasios">
          <GimnasiosTab />
        </Tabs.Panel>
        <Tabs.Panel value="cuenta">
          <PlatformBillingPanel />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function GimnasiosTab() {
  const navigate = useNavigate();
  const { primaryGymId, setPrimaryGymId } = useAuth();
  const gyms = usePlatformGyms(true);
  const [nuevo, setNuevo] = useState(false);
  // Se guarda el id y no el gym: así la ficha abierta ve al instante lo que cambia
  // (suspender, guardar contrato) cuando la lista se vuelve a pedir.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const todos = (gyms.data ?? []) as GymAdmin[];
  const abierto = todos.find((g) => g.id === abiertoId) ?? null;
  const sinSuscripcion = todos.filter(faltaSuscripcion).length;
  const suspendidos = todos.filter((g) => g.is_active === false).length;
  const q = busqueda.trim().toLowerCase();
  const filas = ordenarGyms(todos).filter(
    (g) => !q || g.name.toLowerCase().includes(q) || (g.location_text ?? "").toLowerCase().includes(q),
  );

  const entrar = (gym: GymAdmin) => {
    setPrimaryGymId(gym.id);
    navigate("/panel");
  };

  if (gyms.isError) return <PageError onRetry={() => gyms.refetch()} />;

  return (
    <GlassCard delay={0.6} padding={18}>
      <Encabezado
        titulo="Gimnasios"
        avisos={
          <>
            {sinSuscripcion > 0 && (
              <Badge color="yellow" variant="light">
                {sinSuscripcion} sin suscripción
              </Badge>
            )}
            {suspendidos > 0 && (
              <Badge color="gray" variant="light">
                {suspendidos} {suspendidos === 1 ? "suspendido" : "suspendidos"}
              </Badge>
            )}
          </>
        }
      >
        {todos.length > 6 && (
          <TextInput
            aria-label="Buscar gimnasio"
            placeholder="Buscar gimnasio"
            leftSection={<Search size={14} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            w={{ base: "100%", sm: 220 }}
          />
        )}
        <Button onClick={() => setNuevo(true)}>Nuevo gimnasio</Button>
      </Encabezado>

      {gyms.isLoading ? (
        <Text c="dimmed" size="sm">
          Cargando…
        </Text>
      ) : filas.length === 0 ? (
        <Text c="dimmed" size="sm">
          {todos.length ? "Ningún gimnasio coincide con la búsqueda." : "Aún no hay gimnasios en la red."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="sm">
          {filas.map((g) => {
            const suspendido = g.is_active === false;
            const falta = faltaSuscripcion(g);
            const sub = g.subscription;
            const pct = pctTexto(g.platform_commission_pct);
            return (
              <Tarjeta
                key={g.id}
                etiqueta={`Abrir ${g.name}`}
                onClick={() => setAbiertoId(g.id)}
                aviso={falta}
                apagada={suspendido}
              >
                <Group gap={8} wrap="nowrap" justify="space-between">
                  <Text fw={700} truncate>
                    {g.name}
                  </Text>
                  {suspendido ? (
                    <Badge size="xs" color="red" variant="light">
                      Suspendido
                    </Badge>
                  ) : falta ? (
                    <Badge size="xs" color="yellow" variant="light">
                      Sin suscripción
                    </Badge>
                  ) : g.is_public === false ? (
                    <Badge size="xs" color="gray" variant="light">
                      Privado
                    </Badge>
                  ) : null}
                </Group>
                {g.location_text ? (
                  <Text size="xs" c="dimmed" truncate>
                    {g.location_text}
                  </Text>
                ) : null}
                <Text size="sm" mt={6}>
                  {etiquetaDe(SAAS_PLANS, g.saas_plan)}
                  {sub ? ` · ${fmtQ(sub.monthly_price)}/mes` : ""}
                  {sub && sub.status && sub.status !== "active"
                    ? ` · ${etiquetaDe(ESTADOS_SUSCRIPCION, sub.status)}`
                    : ""}
                </Text>
                <Text size="xs" c="dimmed">
                  Recargo {pct ?? "—"}
                  {g.fixed_fee ? ` · fee ${fmtQ(g.fixed_fee)}` : ""}
                  {sub?.next_billing_date ? ` · cobro ${fechaCorta(sub.next_billing_date)}` : ""}
                </Text>
              </Tarjeta>
            );
          })}
        </SimpleGrid>
      )}

      <AltaGimnasioModal opened={nuevo} onClose={() => setNuevo(false)} />
      <GimnasioModal
        gym={abierto}
        esElActual={!!abierto && abierto.id === primaryGymId}
        onClose={() => setAbiertoId(null)}
        onEntrar={entrar}
      />
    </GlassCard>
  );
}
