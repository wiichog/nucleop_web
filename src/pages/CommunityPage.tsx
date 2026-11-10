import { useMemo } from "react";
import { Group, Tabs } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import {
  useAthletesOfMonth,
  useGymAppeals,
  useGymPendingPosts,
  useGymReportedComments,
  useServiceTypes,
} from "../api/hooks";
import { NoGymAssigned } from "../components/PageStatus";
import { CountBadge, PageHeader } from "../components/ui";
import { delayVar } from "../components/aurora";
import { administraGym, useAuth } from "../lib/auth";
import { AnunciosTab } from "./comunidad/AnunciosTab";
import { AtletaDelMesTab } from "./comunidad/AtletaDelMesTab";
import { FeedTab } from "./comunidad/FeedTab";
import { ModeracionTab } from "./comunidad/ModeracionTab";

/**
 * Comunidad del gym, en cuatro pestañas con la misma idea que Clases: lo que
 * espera una decisión va primero («Moderar», con su contador), crear un anuncio
 * es un botón que abre una ventana y tocar una cosa abre sus acciones.
 */
export function CommunityPage() {
  const { primaryGymId, roles, isSuperuser } = useAuth();
  const gymId = primaryGymId ?? "";
  // Publicar anuncios y elegir al atleta del mes es del `gym_admin` (el backend le
  // responde 403 al coach). El coach entra a esta misma pantalla para moderar: no
  // se le ofrece la pestaña de anuncios ni las tarjetas para elegir, en vez de
  // dejarlo llenar un formulario que va a fallar.
  const esAdmin = administraGym(roles, isSuperuser, gymId);
  // El catálogo de servicios es del `gym_admin` (403 al coach): solo se pide si administra.
  const servicios = useServiceTypes(esAdmin ? gymId : "");
  const awards = useAthletesOfMonth(gymId);

  // El contador de la pestaña suma las tres colas: si solo contara posts, un
  // comentario reportado (ya oculto del feed) se quedaría escondido para siempre.
  // Mismas consultas que la pestaña: React Query no las repite.
  const pendingPosts = useGymPendingPosts(gymId);
  const reportedComments = useGymReportedComments(gymId);
  const appeals = useGymAppeals(gymId);
  const pendientes =
    (pendingPosts.data ?? []).length +
    (reportedComments.data ?? []).length +
    (appeals.data ?? []).length;

  // La pestaña vive en la URL (mismo patrón que Clases): un aviso puede abrir
  // directo donde se resuelve.
  const [searchParams, setSearchParams] = useSearchParams();
  const pedida = searchParams.get("tab") || "moderar";
  const tab = !esAdmin && pedida === "anuncios" ? "moderar" : pedida;

  // Las opciones de «Segmento» y las tarjetas del atleta del mes salen del catálogo de
  // servicios activos, no de las clases ya cargadas: un servicio sin clases en el rango
  // también aparece. `class_type` es el nombre del servicio denormalizado en la clase.
  // Se suman los servicios que ya tienen atleta del mes aunque se hayan desactivado,
  // para que su tarjeta no desaparezca y se pueda quitar.
  const classTypes = useMemo(() => {
    const set = new Set<string>();
    (servicios.data ?? []).forEach((s) => s.is_active && s.name && set.add(s.name));
    (awards.data ?? []).forEach((a) => a.class_type && set.add(a.class_type));
    return Array.from(set).sort();
  }, [servicios.data, awards.data]);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader kicker="Comunidad · Feed" title="Comunidad del gym" />
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v && v !== "moderar" ? { tab: v } : {})}
      >
        <Tabs.List mb="lg" className="a-rise" style={delayVar(0.5)}>
          <Tabs.Tab value="moderar">
            <Group gap={6} wrap="nowrap">
              Moderar
              {pendientes ? <CountBadge count={pendientes} /> : null}
            </Group>
          </Tabs.Tab>
          {esAdmin && <Tabs.Tab value="anuncios">Anuncios</Tabs.Tab>}
          <Tabs.Tab value="atleta">Atleta del mes</Tabs.Tab>
          <Tabs.Tab value="feed">Feed</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="moderar">
          <ModeracionTab gymId={gymId} />
        </Tabs.Panel>
        {esAdmin && (
          <Tabs.Panel value="anuncios">
            <AnunciosTab gymId={gymId} classTypes={classTypes} />
          </Tabs.Panel>
        )}
        <Tabs.Panel value="atleta">
          <AtletaDelMesTab gymId={gymId} esAdmin={esAdmin} classTypes={classTypes} />
        </Tabs.Panel>
        <Tabs.Panel value="feed">
          <FeedTab gymId={gymId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
