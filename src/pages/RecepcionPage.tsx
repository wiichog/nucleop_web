import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, ScanLine } from "lucide-react";
import {
  type AccessResolve,
  type ClassRosterRow,
  useAccessAdmit,
  useAccessResolve,
  useClassCheckins,
  useClassRoster,
  useGymClasses,
  useNoShow,
  usePublicDropins,
  useReceptionCheckin,
  useSellDropin,
  useUndoCheckin,
} from "../api/hooks";
import type { GymClass } from "../api/types";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { Encabezado, Tarjeta } from "../components/Tarjeta";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/errors";
import { fmtQ } from "../lib/money";
import { ClassQrBlock, RecepcionBuscador } from "./ClassesPage";

const ok = (message: string) => notifications.show({ color: "teal", message });
const fail = (error: unknown, porDefecto: string) =>
  notifications.show({ color: "red", message: errMsg(error, porDefecto) });

/** Minutos antes del inicio en que se abre la lista (`CHECKIN_LEAD_MIN` del backend). */
const ABRE_ANTES_MIN = 30;
/** Minutos después del final en que se cierra (`fin_ventana_asistencia`). */
const CIERRA_DESPUES_MIN = 60;

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

function ventanaAbierta(c: GymClass, ahora = Date.now()): boolean {
  const inicio = new Date(c.starts_at).getTime();
  const fin = inicio + (c.duration_min ?? 60) * 60_000;
  return ahora >= inicio - ABRE_ANTES_MIN * 60_000 && ahora <= fin + CIERRA_DESPUES_MIN * 60_000;
}

/** Las clases de HOY (hora local), sin las canceladas, por hora de inicio. */
export function clasesDeHoy(clases: GymClass[], hoy = new Date()): GymClass[] {
  const dia = hoy.toLocaleDateString("en-CA");
  return clases
    .filter((c) => new Date(c.starts_at).toLocaleDateString("en-CA") === dia)
    .filter((c) => c.status !== "cancelled")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** La que toca ahora: la de lista abierta más reciente; si no, la próxima; si no, la última. */
export function claseSugerida(hoy: GymClass[], ahora = Date.now()): GymClass | undefined {
  const abiertas = hoy.filter((c) => ventanaAbierta(c, ahora));
  if (abiertas.length) return abiertas[abiertas.length - 1];
  return hoy.find((c) => new Date(c.starts_at).getTime() > ahora) ?? hoy[hoy.length - 1];
}

/**
 * La pantalla de la RECEPCIÓN (y del admin cuando atiende la puerta): leer el
 * carnet de quien llega, pasar lista de la clase de ahora y vender un pase
 * drop-in al que no es socio. Todo lo que escribe lo decide el backend: aquí no
 * se elige qué pase se consume ni se calcula si alguien puede entrar.
 */
export function RecepcionPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const clases = useGymClasses(gymId);
  const hoy = useMemo(() => clasesDeHoy(clases.data ?? []), [clases.data]);
  const sugerida = useMemo(() => claseSugerida(hoy), [hoy]);
  const [elegida, setElegida] = useState<string | null>(null);
  const claseId = (elegida && hoy.some((c) => c.id === elegida) ? elegida : sugerida?.id) ?? "";
  const clase = hoy.find((c) => c.id === claseId);
  const [vendiendo, setVendiendo] = useState<{ id: string; name: string } | null>(null);
  // Cada venta sube este contador: el lector vuelve a leer el carnet que tiene en
  // pantalla para que pase de «sin pase» a poder entrar sin escanear otra vez.
  const [ventas, setVentas] = useState(0);

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <PageHeader
        kicker="Mostrador"
        title="Recepción"
        subtitle="Quién llega, la lista de la clase y la venta de pases."
      />
      <Stack gap="lg">
        <LectorDeCodigo gymId={gymId} classId={claseId} onVender={setVendiendo} ventas={ventas} />

        <div>
          <Encabezado titulo="Clase de hoy" />
          {clases.isError ? (
            <PageError onRetry={() => clases.refetch()} />
          ) : clases.isLoading ? (
            <Text size="sm" c="dimmed">
              Cargando clases…
            </Text>
          ) : hoy.length === 0 ? (
            <Text size="sm" c="dimmed">
              Hoy no hay clases programadas. Puedes leer carnets y vender pases arriba.
            </Text>
          ) : (
            <Stack gap="md">
              <Select
                label="Clase"
                value={claseId}
                onChange={setElegida}
                allowDeselect={false}
                w={{ base: "100%", sm: 360 }}
                data={hoy.map((c) => ({
                  value: c.id,
                  label: `${hora(c.starts_at)} · ${c.service_type_name || c.class_type}${
                    c.coach_name ? ` · ${c.coach_name}` : ""
                  }${ventanaAbierta(c) ? " · lista abierta" : ""}`,
                }))}
              />
              {clase && <ListaDeClase gymId={gymId} clase={clase} />}
              {clase && (
                <Tarjeta etiqueta="Llegó sin reservar">
                  <RecepcionBuscador gymId={gymId} classId={clase.id} onVender={setVendiendo} />
                </Tarjeta>
              )}
              {clase && (
                <Tarjeta etiqueta="QR de la clase">
                  <ClassQrBlock gymId={gymId} classId={clase.id} />
                </Tarjeta>
              )}
            </Stack>
          )}
        </div>
      </Stack>

      <VenderPaseModal
        gymId={gymId}
        atleta={vendiendo}
        onClose={() => setVendiendo(null)}
        onVendido={() => setVentas((n) => n + 1)}
      />
    </div>
  );
}

/** Estado de una fila, en las palabras que usa el app del coach. */
function estadoDeFila(f: ClassRosterRow): { texto: string; color: string } {
  if (f.checked_in) return { texto: f.reserved ? "Presente" : "Walk-in", color: "teal" };
  if (f.no_show) return { texto: "No Show", color: "red" };
  if (f.waitlist) return { texto: "Lista de espera", color: "gray" };
  if (f.reserved) return { texto: "Reservó", color: "blue" };
  return { texto: "Sin reserva", color: "gray" };
}

/**
 * Pasar lista: «Sign In» a quien llegó, «No Show» a quien reservó y no vino.
 * Una clase solo se le paga al coach si al menos un atleta quedó presente.
 */
function ListaDeClase({ gymId, clase }: { gymId: string; clase: GymClass }) {
  const roster = useClassRoster(gymId, clase.id);
  // La lista trae a quienes RESERVARON; el que entró sin reserva (walk-in, por el
  // buscador, su carnet o el QR) solo está en los check-ins. Va aparte, como en el app.
  const checkins = useClassCheckins(gymId, clase.id);
  const signIn = useReceptionCheckin(gymId, clase.id);
  const noShow = useNoShow(gymId, clase.id);
  const undo = useUndoCheckin(gymId, clase.id);
  const [ocupado, setOcupado] = useState("");
  const [confirmar, setConfirmar] = useState<
    { tipo: "no_show" | "quitar"; fila: ClassRosterRow } | null
  >(null);
  const abierta = ventanaAbierta(clase);

  const filas = roster.data ?? [];
  const enLista = new Set(filas.map((f) => f.athlete));
  const walkIns = (checkins.data ?? []).filter((c) => !enLista.has(c.athlete));
  const esperados = filas.filter((f) => f.reserved && !f.waitlist).length;
  const presentes = filas.filter((f) => f.checked_in).length + walkIns.length;

  const accion = async (clave: string, fn: () => Promise<unknown>, exito: string, error: string) => {
    setOcupado(clave);
    try {
      await fn();
      ok(exito);
    } catch (e) {
      fail(e, error);
    } finally {
      setOcupado("");
    }
  };

  const onSignIn = (f: ClassRosterRow) =>
    accion(
      `in-${f.athlete}`,
      () =>
        signIn.mutateAsync(
          f.membership ? { membershipId: f.membership } : { dropinPurchaseId: f.dropin ?? undefined },
        ),
      `${f.name}: presente.`,
      `No quedó el Sign In de ${f.name}.`,
    );

  const onConfirmar = async () => {
    if (!confirmar) return;
    const { tipo, fila } = confirmar;
    setConfirmar(null);
    if (tipo === "no_show" && fila.reservation) {
      await accion(
        `ns-${fila.athlete}`,
        () => noShow.mutateAsync({ reservationId: fila.reservation!, marcar: true }),
        `${fila.name}: No Show.`,
        `No quedó el No Show de ${fila.name}.`,
      );
    } else if (tipo === "quitar" && fila.checkin) {
      await accion(
        `q-${fila.athlete}`,
        () => undo.mutateAsync(fila.checkin!),
        `Se quitó la asistencia de ${fila.name}.`,
        `No se pudo quitar la asistencia de ${fila.name}.`,
      );
    }
  };

  if (roster.isError) return <PageError onRetry={() => roster.refetch()} />;

  return (
    <Tarjeta etiqueta="Lista de la clase">
      <Group justify="space-between" align="baseline" wrap="wrap" gap="sm" mb="sm">
        <Group gap="xs" align="baseline">
          <Text fw={800} fz={32} style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
            {presentes}/{esperados}
          </Text>
          <Text size="sm" c="dimmed">
            presentes
          </Text>
        </Group>
        {!abierta ? (
          <Badge variant="light" color="gray">
            La lista abre {ABRE_ANTES_MIN} min antes y cierra 1 h después de la clase
          </Badge>
        ) : presentes === 0 && esperados > 0 ? (
          <Badge variant="light" color="yellow">
            Sin asistencia, la clase no se le paga al coach
          </Badge>
        ) : null}
      </Group>

      {roster.isLoading ? (
        <Text size="sm" c="dimmed">
          Cargando lista…
        </Text>
      ) : filas.length === 0 ? (
        <Text size="sm" c="dimmed">
          Nadie reservó esta clase. Si llega alguien, búscalo abajo en «Buscar a quien llegó» o lee su carnet arriba.
        </Text>
      ) : (
        <Stack gap="xs">
          {filas.map((f) => {
            const estado = estadoDeFila(f);
            const puedeEntrar = !f.checked_in && !f.no_show && !f.waitlist && (!!f.membership || !!f.dropin);
            return (
              <Group key={f.athlete} justify="space-between" wrap="wrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                  <Avatar src={f.photo} color="flame" radius="xl" size={36}>
                    {f.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600}>
                      {f.name}
                    </Text>
                    <Badge size="xs" variant="light" color={estado.color}>
                      {estado.texto}
                    </Badge>
                  </div>
                </Group>
                <Group gap="xs">
                  {puedeEntrar && (
                    <Button
                      size="xs"
                      disabled={!abierta}
                      loading={ocupado === `in-${f.athlete}`}
                      onClick={() => onSignIn(f)}
                    >
                      Sign In
                    </Button>
                  )}
                  {f.reserved && !f.checked_in && !f.no_show && !f.waitlist && f.reservation && (
                    <Button
                      size="xs"
                      variant="default"
                      disabled={!abierta}
                      loading={ocupado === `ns-${f.athlete}`}
                      onClick={() => setConfirmar({ tipo: "no_show", fila: f })}
                    >
                      No Show
                    </Button>
                  )}
                  {f.no_show && f.reservation && (
                    <Button
                      size="xs"
                      variant="subtle"
                      disabled={!abierta}
                      loading={ocupado === `ns-${f.athlete}`}
                      onClick={() =>
                        accion(
                          `ns-${f.athlete}`,
                          () => noShow.mutateAsync({ reservationId: f.reservation!, marcar: false }),
                          `${f.name}: se deshizo el No Show.`,
                          `No se pudo deshacer el No Show de ${f.name}.`,
                        )
                      }
                    >
                      Deshacer
                    </Button>
                  )}
                  {f.checked_in && f.checkin && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<Check size={14} />}
                      loading={ocupado === `q-${f.athlete}`}
                      onClick={() => setConfirmar({ tipo: "quitar", fila: f })}
                    >
                      Quitar
                    </Button>
                  )}
                  {!f.membership && !f.dropin && !f.checked_in && (
                    <Text size="xs" c="dimmed">
                      Sin membresía ni pase
                    </Text>
                  )}
                </Group>
              </Group>
            );
          })}
        </Stack>
      )}

      {walkIns.length > 0 && (
        <Stack gap="xs" mt="md">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>
            Walk-ins
          </Text>
          {walkIns.map((c) => (
            <Group key={c.id} justify="space-between" wrap="wrap" gap="sm">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                <Avatar color="flame" radius="xl" size={36}>
                  {c.athlete_name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600}>
                    {c.athlete_name}
                  </Text>
                  <Badge size="xs" variant="light" color="teal">
                    Entró {hora(c.checked_in_at)}
                  </Badge>
                </div>
              </Group>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<Check size={14} />}
                loading={ocupado === `q-${c.athlete}`}
                onClick={() =>
                  setConfirmar({
                    tipo: "quitar",
                    fila: {
                      athlete: c.athlete,
                      name: c.athlete_name,
                      checkin: c.id,
                      membership: c.membership,
                      photo: null,
                      reserved: false,
                      waitlist: false,
                      checked_in: true,
                      no_show: false,
                    },
                  })
                }
              >
                Quitar
              </Button>
            </Group>
          ))}
        </Stack>
      )}

      <Modal
        opened={!!confirmar}
        onClose={() => setConfirmar(null)}
        title={confirmar?.tipo === "no_show" ? "Marcar No Show" : "Quitar asistencia"}
        centered
      >
        <Text size="sm">
          {confirmar?.tipo === "no_show"
            ? `${confirmar.fila.name} no vino. Su reserva se cierra y, si la clase todavía no empieza, su lugar pasa a la lista de espera. No pierde puntos ni se le descuenta la clase.`
            : `${confirmar?.fila.name ?? ""} queda sin asistencia y pierde los puntos de esta clase.`}
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirmar(null)}>
            Cancelar
          </Button>
          <Button color={confirmar?.tipo === "quitar" ? "red" : undefined} onClick={onConfirmar}>
            {confirmar?.tipo === "no_show" ? "Marcar No Show" : "Quitar asistencia"}
          </Button>
        </Group>
      </Modal>
    </Tarjeta>
  );
}

/**
 * Lee el código del carnet o del pase. Una lectora USB «teclea» el contenido del
 * QR y manda Enter; también sirve pegarlo. Es lo que encuentra a un visitante de
 * otro box, que el buscador por nombre no ve.
 */
function LectorDeCodigo({
  gymId,
  classId,
  onVender,
  ventas,
}: {
  gymId: string;
  classId: string;
  onVender: (atleta: { id: string; name: string }) => void;
  /** Sube con cada pase vendido: la ficha en pantalla se vuelve a leer. */
  ventas: number;
}) {
  const [codigo, setCodigo] = useState("");
  const resolver = useAccessResolve(gymId, classId);
  const admitir = useAccessAdmit(gymId, classId);
  const [ficha, setFicha] = useState<AccessResolve | null>(null);
  const ultimo = useRef("");

  const leer = async (texto: string) => {
    try {
      setFicha(await resolver.mutateAsync(texto));
      ultimo.current = texto;
      setCodigo("");
    } catch (e) {
      fail(e, "No se pudo leer el código.");
    }
  };

  const onLeer = () => {
    const texto = codigo.trim();
    if (texto) leer(texto);
  };

  // Tras vender un pase, la ficha que sigue en pantalla todavía dice «sin pase».
  const ventasVistas = useRef(ventas);
  useEffect(() => {
    if (ventas === ventasVistas.current) return;
    ventasVistas.current = ventas;
    if (ficha && ultimo.current) leer(ultimo.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas]);

  const onAdmitir = async (action: "class_checkin" | "dropin_entry") => {
    if (!ficha?.athlete) return;
    try {
      const r = await admitir.mutateAsync({ athleteId: ficha.athlete.id, action });
      ok(r.already_registered ? `${ficha.athlete.name} ya estaba registrado.` : `${ficha.athlete.name}: adentro.`);
      setFicha(null);
    } catch (e) {
      fail(e, `No se pudo registrar a ${ficha.athlete.name}.`);
    }
  };

  const acciones = ficha?.actions ?? [];
  const entrar = acciones.find((a) => a.via === "admit" && (a.action === "class_checkin" || a.action === "dropin_entry"));
  const vender = acciones.find((a) => a.action === "sell_dropin");

  return (
    <Tarjeta etiqueta="Leer carnet o pase">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLeer();
        }}
      >
        <Group align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            label="Carnet o pase"
            description="Escanéalo con la lectora o pega el código."
            placeholder="Código del QR"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={codigo}
            onChange={(e) => setCodigo(e.currentTarget.value)}
            style={{ flex: "1 1 260px" }}
          />
          <Button type="submit" leftSection={<ScanLine size={16} />} loading={resolver.isPending}>
            Leer
          </Button>
        </Group>
      </form>

      {ficha && (
        <Stack gap="xs" mt="md">
          {ficha.athlete ? (
            <Group gap="sm" wrap="nowrap">
              <Avatar src={ficha.athlete.photo} color="flame" radius="xl" size={44}>
                {ficha.athlete.name?.[0]?.toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Text fw={700}>{ficha.athlete.name}</Text>
                <Group gap={6} wrap="wrap">
                  {ficha.relationship && (
                    <Badge size="xs" variant="light" color={ficha.relationship.is_member ? "teal" : "cyan"}>
                      {ficha.relationship.label}
                    </Badge>
                  )}
                  {ficha.dropin && (
                    <Badge size="xs" variant="light" color={ficha.dropin.usable ? "teal" : "gray"}>
                      {ficha.dropin.product_name}
                    </Badge>
                  )}
                </Group>
              </div>
            </Group>
          ) : null}
          {/* El mensaje lo redacta el backend: es el que sabe por qué sí o por qué no. */}
          {ficha.message && (
            <Text size="sm" c="dimmed">
              {ficha.message}
            </Text>
          )}
          {entrar && !entrar.enabled && entrar.reason_message && (
            <Text size="sm" c="dimmed">
              {entrar.reason_message}
            </Text>
          )}
          <Group gap="xs">
            {entrar && (
              <Button
                size="sm"
                disabled={!entrar.enabled}
                loading={admitir.isPending}
                onClick={() => onAdmitir(entrar.action as "class_checkin" | "dropin_entry")}
              >
                {entrar.label || "Marcar presente"}
              </Button>
            )}
            {vender && ficha.athlete && (
              <Button
                size="sm"
                variant="light"
                disabled={!vender.enabled}
                onClick={() => onVender({ id: ficha.athlete!.id, name: ficha.athlete!.name })}
              >
                Vender pase
              </Button>
            )}
            <Button size="sm" variant="subtle" color="gray" onClick={() => setFicha(null)}>
              Listo
            </Button>
          </Group>
        </Stack>
      )}
    </Tarjeta>
  );
}

const METODOS = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "card", label: "Datáfono" },
];

/** Vende un pase y lo cobra en el momento. Sin recargo de Nucleo: es cobro manual. */
function VenderPaseModal({
  gymId,
  atleta,
  onClose,
  onVendido,
}: {
  gymId: string;
  atleta: { id: string; name: string } | null;
  onClose: () => void;
  onVendido: () => void;
}) {
  const pases = usePublicDropins(gymId);
  const vender = useSellDropin(gymId);
  const [productoId, setProductoId] = useState<string | null>(null);
  const [metodo, setMetodo] = useState("cash");
  const [nit, setNit] = useState("");
  const [nombreFactura, setNombreFactura] = useState("");

  const producto = (pases.data ?? []).find((p) => p.id === productoId);
  const cerrar = () => {
    setProductoId(null);
    setMetodo("cash");
    setNit("");
    setNombreFactura("");
    onClose();
  };

  const onCobrar = async () => {
    if (!atleta || !producto) return;
    try {
      await vender.mutateAsync({
        dropin_product_id: producto.id,
        athlete_id: atleta.id,
        method: metodo as "cash" | "bank_transfer" | "card",
        billing_nit: nit.trim() || "CF",
        billing_name: nombreFactura.trim() || "CONSUMIDOR FINAL",
      });
      ok(`${atleta.name}: pase «${producto.name || producto.type_label}» cobrado. Ya puede entrar.`);
      onVendido();
      cerrar();
    } catch (e) {
      fail(e, "No se pudo vender el pase.");
    }
  };

  return (
    <Modal opened={!!atleta} onClose={cerrar} title={`Vender pase · ${atleta?.name ?? ""}`} centered>
      <Stack gap="sm">
        <Select
          label="Pase"
          placeholder={pases.isLoading ? "Cargando pases…" : "Elige el pase"}
          disabled={pases.isLoading}
          value={productoId}
          onChange={setProductoId}
          error={pases.isError ? "No se pudieron cargar los pases." : undefined}
          nothingFoundMessage="Este gimnasio no tiene pases activos."
          data={(pases.data ?? []).map((p) => ({
            value: p.id,
            label: `${p.name || p.type_label} · ${fmtQ(p.price, { decimals: 2 })}`,
          }))}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Cómo paga
          </Text>
          <SegmentedControl fullWidth value={metodo} onChange={setMetodo} data={METODOS} />
        </div>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput label="NIT" placeholder="CF" value={nit} onChange={(e) => setNit(e.currentTarget.value)} />
          <TextInput
            label="Nombre en la factura"
            placeholder="CONSUMIDOR FINAL"
            value={nombreFactura}
            onChange={(e) => setNombreFactura(e.currentTarget.value)}
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Se registra como pagado al tocar el botón: cobra primero el dinero o la tarjeta.
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={cerrar}>
            Cancelar
          </Button>
          <Button disabled={!producto} loading={vender.isPending} onClick={onCobrar}>
            {producto ? `Cobrar ${fmtQ(producto.price, { decimals: 2 })}` : "Cobrar"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
