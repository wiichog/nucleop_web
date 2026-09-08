import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSignature,
  Info,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  PASOS,
  aplanarErrores,
  pasoDelPrimerError,
  reportProgress,
  submitGymApplication,
  uploadApplicationDocument,
  type CommissionMode,
  type ContractDoc,
  type OnboardingTerms,
} from "../../api/onboarding";
import { PageHeader, SectionLabel } from "../../components/ui";
import { GlassCard } from "../../components/aurora";
import { errMsg } from "../../lib/errors";
import { fmtQ } from "../../lib/money";
import { RECAPTCHA_ACTIVO, Recaptcha, type RecaptchaHandle } from "./Recaptcha";
import {
  AreaTexto,
  Archivo,
  Campo,
  Casilla,
  Correo,
  Fecha,
  Hora,
  Numero,
  Opcion,
  OpcionMultiple,
  Repetidor,
  Telefono,
  Texto,
  type OpcionItem,
} from "./campos";

/**
 * El contrato de alta tal como lo llena un prospecto: diez pasos, el articulado
 * completo, doce renuncias aceptadas una por una y la firma.
 *
 * Tres cosas mandan sobre el diseño de este archivo:
 *
 * 1. **El catálogo `PASOS` de `api/onboarding.ts` es la autoridad.** Los nombres
 *    de campo de este formulario tienen que ser los suyos, letra por letra: son
 *    los mismos que usa el serializer y los mismos con los que se calcula el
 *    avance. Un nombre distinto no rompe nada de forma visible — simplemente el
 *    avance miente y un 400 deja de encontrar su campo.
 * 2. **Un 400 tiene que aterrizar en el campo que falló.** Diez pasos y ~80
 *    campos: decirle a alguien "revisa el formulario" al final es abandonarlo.
 *    `aplanarErrores` + `pasoDelPrimerError` saltan al paso correcto y pintan
 *    el campo en rojo.
 * 3. **Esto NO crea el gimnasio.** Crea una solicitud que una persona revisa.
 *    Toda la copia lo dice para que nadie se quede esperando un acceso que no
 *    va a llegar solo.
 */

// --------------------------------------------------------------------------
// Tipos del estado
// --------------------------------------------------------------------------
type TipoGym = "crossfit_box" | "gym" | "studio" | "training_center" | "other";
type TipoSede = "main" | "branch";
type RolPanel = "gym_admin" | "coach" | "trainer";
type Canal = "whatsapp" | "email" | "phone";
type Intervalo = "monthly" | "quarterly" | "yearly";
type TipoCargo = "recurring" | "one_time";
type MetodoOffline = "cash" | "transfer" | "card_pos";
type TipoCuenta = "" | "monetaria" | "ahorro";
type MetodoCheckin = "qr" | "manual" | "none";

type Sede = {
  name: string;
  kind: TipoSede;
  address: string;
  municipality: string;
  capacity: number | null;
};
type UsuarioPanel = { name: string; email: string; phone: string; role: RolPanel };
type Disciplina = {
  name: string;
  requires_wod: boolean;
  opening_time: string;
  closing_time: string;
  available_weekdays: string[];
  rules: string;
};
type ServicioExtra = { name: string; amount: number | null; charge_type: TipoCargo };

export type EstadoFormulario = {
  manages_multiple_gyms: boolean;
  organization_name: string;
  organization_legal_name: string;
  organization_nit: string;

  gym_name: string;
  gym_type: TipoGym;
  gym_legal_name: string;
  gym_nit: string;
  has_legal_personality: boolean;
  registry_details: string;
  gym_address_line: string;
  gym_zone: string;
  gym_municipality: string;
  gym_department: string;
  gym_reference_point: string;
  estimated_members: number | null;
  active_members: number | null;

  has_branches: boolean;
  branches: Sede[];

  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  contact_preferred_channel: Canal;
  legal_representative_name: string;
  legal_representative_id: string;
  panel_users: UsuarioPanel[];

  base_plan_name: string;
  base_plan_amount: number | null;
  plan_interval: Intervalo;
  cutoff_day_of_month: number | null;
  grace_days: number | null;
  dropin_price: number | null;
  extra_services: ServicioExtra[];
  has_pending_balances: boolean;
  pending_balances_notes: string;
  billing_contact_email: string;

  service_types: Disciplina[];
  class_capacity: number | null;
  block_reservations_when_in_arrears: boolean;

  enable_online_payments: boolean;
  commission_mode: CommissionMode;
  offline_payment_methods: MetodoOffline[];
  settlement_bank_name: string;
  settlement_account_type: TipoCuenta;
  settlement_account_number: string;
  settlement_account_holder: string;
  settlement_account_holder_id: string;
  settlement_notification_email: string;
  expected_monthly_collection: number | null;

  has_coaches: boolean;
  coaches_count: number | null;
  enrolls_minors: boolean;
  checkin_method: MetodoCheckin;
  no_show_policy: string;
  office_phone: string;

  current_management_tool: string;
  data_migration_needed: boolean;
  target_go_live_date: string;
  how_did_you_hear: string;
  additional_notes: string;

  signer_name: string;
  signer_position: string;
  signer_id_document: string;
  is_authorized_representative: boolean;
  accepts_terms: boolean;
  accepts_platform_commission: boolean;
  accepts_commission_mode: boolean;
  accepts_settlement_terms: boolean;
  accepts_data_controller_role: boolean;
  accepts_athlete_passport: boolean;
  understands_manual_review: boolean;
  accepts_commercial_communications: boolean;
  accepted_waivers: string[];
  contract_observations: string;
};

// --------------------------------------------------------------------------
// Catálogos (espejo exacto de los `choices` del serializer)
// --------------------------------------------------------------------------
const TIPOS_GYM: OpcionItem<TipoGym>[] = [
  { value: "crossfit_box", label: "Box de CrossFit" },
  { value: "gym", label: "Gimnasio tradicional" },
  { value: "studio", label: "Estudio (pilates, yoga, funcional)" },
  { value: "training_center", label: "Centro de alto rendimiento" },
  { value: "other", label: "Otro" },
];

const TIPOS_SEDE: OpcionItem<TipoSede>[] = [
  { value: "main", label: "Principal" },
  { value: "branch", label: "Sucursal" },
];

const ROLES_PANEL: OpcionItem<RolPanel>[] = [
  { value: "gym_admin", label: "Administración" },
  { value: "coach", label: "Coach" },
  { value: "trainer", label: "Entrenador personal" },
];

const CANALES: OpcionItem<Canal>[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
  { value: "phone", label: "Llamada" },
];

const INTERVALOS: OpcionItem<Intervalo>[] = [
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

const TIPOS_CARGO: OpcionItem<TipoCargo>[] = [
  { value: "recurring", label: "Mensual" },
  { value: "one_time", label: "Pase único" },
];

const METODOS_OFFLINE: OpcionItem<MetodoOffline>[] = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "card_pos", label: "Terminal propia" },
];

// El valor inicial es `""` (sin elegir), que el serializer admite con `allow_blank`.
// Por eso el catálogo se tipa con `TipoCuenta` completo aunque solo ofrezca dos:
// así el genérico de `Opcion` no infiere un tipo más angosto que el del estado.
const TIPOS_CUENTA: OpcionItem<TipoCuenta>[] = [
  { value: "monetaria", label: "Monetaria" },
  { value: "ahorro", label: "Ahorro" },
];

const METODOS_CHECKIN: OpcionItem<MetodoCheckin>[] = [
  { value: "qr", label: "Código QR" },
  { value: "manual", label: "Manual" },
  { value: "none", label: "Sin control" },
];

// 0 = lunes … 6 = domingo, igual que `ClassSchedule.weekday` en todo el sistema.
const DIAS: OpcionItem<string>[] = [
  { value: "0", label: "Lun" },
  { value: "1", label: "Mar" },
  { value: "2", label: "Mié" },
  { value: "3", label: "Jue" },
  { value: "4", label: "Vie" },
  { value: "5", label: "Sáb" },
  { value: "6", label: "Dom" },
];

/** Los 22 departamentos, en el mismo orden y con la misma grafía que el serializer. */
const DEPARTAMENTOS = [
  "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso",
  "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén",
  "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos",
  "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa",
];

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const vacio = (valor: string) => !valor.trim();

/**
 * ¿Esta fila de un repetidor tiene ALGO escrito?
 *
 * La pregunta se hace en dos sitios y tiene que responderse igual en los dos:
 * `construirCuerpo` descarta las filas en blanco (agregar una sede "por si acaso"
 * y dejarla vacía no puede costar un 400) y `validarPaso` solo le exige datos a
 * las que sí tienen algo. Con dos criterios distintos aparecen las dos formas de
 * romperlo: filas que el formulario da por buenas y el envío rechaza, o filas con
 * datos escritos que se descartan en silencio camino al servidor.
 *
 * El valor por defecto de una pastilla (`kind`, `role`, `charge_type`) no cuenta
 * como contenido: nadie lo eligió.
 */
const sedeConAlgo = (s: Sede) =>
  Boolean(s.name.trim() || s.address.trim() || s.municipality.trim() || s.capacity !== null);

const usuarioConAlgo = (u: UsuarioPanel) =>
  Boolean(u.name.trim() || u.email.trim() || u.phone.trim());

const disciplinaConAlgo = (d: Disciplina) =>
  Boolean(
    d.name.trim() ||
      d.opening_time ||
      d.closing_time ||
      d.available_weekdays.length ||
      d.rules.trim() ||
      d.requires_wod,
  );

const extraConAlgo = (s: ServicioExtra) => Boolean(s.name.trim() || s.amount !== null);

// --------------------------------------------------------------------------
// Estado inicial
// --------------------------------------------------------------------------
function estadoInicial(prefill: {
  contact_email: string;
  contact_name: string;
  gym_name: string;
}): EstadoFormulario {
  return {
    manages_multiple_gyms: false,
    organization_name: "",
    organization_legal_name: "",
    organization_nit: "",

    gym_name: prefill.gym_name ?? "",
    gym_type: "crossfit_box",
    gym_legal_name: "",
    gym_nit: "",
    has_legal_personality: true,
    registry_details: "",
    gym_address_line: "",
    gym_zone: "",
    gym_municipality: "",
    gym_department: "",
    gym_reference_point: "",
    estimated_members: null,
    active_members: null,

    has_branches: false,
    branches: [],

    contact_name: prefill.contact_name ?? "",
    contact_email: prefill.contact_email ?? "",
    contact_phone: "",
    contact_role: "",
    contact_preferred_channel: "whatsapp",
    legal_representative_name: "",
    legal_representative_id: "",
    panel_users: [],

    base_plan_name: "",
    base_plan_amount: null,
    plan_interval: "monthly",
    cutoff_day_of_month: null,
    grace_days: null,
    dropin_price: null,
    extra_services: [],
    has_pending_balances: false,
    pending_balances_notes: "",
    billing_contact_email: "",

    service_types: [],
    class_capacity: null,
    block_reservations_when_in_arrears: true,

    enable_online_payments: false,
    commission_mode: "passed_on",
    offline_payment_methods: [],
    settlement_bank_name: "",
    settlement_account_type: "",
    settlement_account_number: "",
    settlement_account_holder: "",
    settlement_account_holder_id: "",
    settlement_notification_email: "",
    expected_monthly_collection: null,

    has_coaches: true,
    coaches_count: null,
    enrolls_minors: false,
    checkin_method: "qr",
    no_show_policy: "",
    office_phone: "",

    current_management_tool: "",
    data_migration_needed: false,
    target_go_live_date: "",
    how_did_you_hear: "",
    additional_notes: "",

    signer_name: "",
    signer_position: "",
    signer_id_document: "",
    is_authorized_representative: false,
    accepts_terms: false,
    accepts_platform_commission: false,
    accepts_commission_mode: false,
    accepts_settlement_terms: false,
    accepts_data_controller_role: false,
    accepts_athlete_passport: false,
    understands_manual_review: false,
    accepts_commercial_communications: false,
    accepted_waivers: [],
    contract_observations: "",
  };
}

// --------------------------------------------------------------------------
// Avance
// --------------------------------------------------------------------------
/**
 * Qué campos cuentan como "llenos" para el reporte de avance.
 *
 * La regla es una sola: **nada que la persona no haya tocado y que siga como
 * nació cuenta como lleno**. No basta con excluir los booleanos: un formulario
 * recién abierto trae ocho `BooleanField` con default, cinco pastillas con una
 * opción ya marcada (`gym_type`, `contact_preferred_channel`, `plan_interval`,
 * `commission_mode`, `checkin_method`) y los tres datos que la invitación
 * pre-llena. Contándolos, un enlace que nadie tecleó reporta ~15 % y la lista de
 * "a quién llamar" deja de distinguir al que empezó del que solo abrió.
 *
 * Se compara contra la foto del estado inicial, no contra una lista de campos:
 * agregar un campo con default al formulario no puede volver a romper esto.
 */
function camposLlenos(
  form: EstadoFormulario,
  inicial: EstadoFormulario,
  tocados: Set<string>,
): string[] {
  const llenos: string[] = [];
  const bolsa = form as unknown as Record<string, unknown>;
  const base = inicial as unknown as Record<string, unknown>;
  for (const paso of PASOS) {
    for (const campo of paso.campos) {
      const valor = bolsa[campo];
      // Los repetidores nacen como `[]` y `set` siempre crea un arreglo nuevo, así
      // que la identidad basta para saber si alguien los tocó.
      if (!tocados.has(campo) && valor === base[campo]) continue;
      if (typeof valor === "boolean") {
        llenos.push(campo);
      } else if (Array.isArray(valor)) {
        if (valor.length > 0) llenos.push(campo);
      } else if (typeof valor === "number") {
        llenos.push(campo);
      } else if (typeof valor === "string" && valor.trim()) {
        llenos.push(campo);
      }
    }
  }
  return llenos;
}

// --------------------------------------------------------------------------
// Validación local
// --------------------------------------------------------------------------
/**
 * Lo mínimo para poder avanzar. No duplica al backend —el backend sigue siendo
 * la autoridad— sino que evita el viaje: mandar diez pasos para que vuelva un
 * 400 por un campo del paso 2 es la forma más rápida de perder una firma.
 */
function validarPaso(
  indice: number,
  f: EstadoFormulario,
  contrato: ContractDoc,
): Record<string, string> {
  const e: Record<string, string> = {};
  const paso = PASOS[indice]?.key;

  if (paso === "organizacion") {
    if (f.manages_multiple_gyms && vacio(f.organization_name)) {
      e.organization_name = "Indica el nombre de la cadena o franquicia.";
    }
  }

  if (paso === "gimnasio") {
    if (vacio(f.gym_name)) e.gym_name = "¿Cómo se llama el gimnasio?";
    // El NIT dejó de ser opcional en el serializer: el numeral 1.2 del contrato
    // declara que el formulario lo exige, y con él se emite la factura.
    if (vacio(f.gym_nit)) e.gym_nit = "Hace falta el NIT: con él se factura.";
    // Y si declara personalidad jurídica propia, el mismo numeral exige sus datos
    // de inscripción registral.
    if (f.has_legal_personality && vacio(f.registry_details)) {
      e.registry_details =
        "Indica los datos de inscripción (registro, número y folio) de la sociedad.";
    }
    if (vacio(f.gym_address_line)) e.gym_address_line = "Hace falta la dirección.";
    if (vacio(f.gym_municipality)) e.gym_municipality = "Hace falta el municipio.";
    if (vacio(f.gym_department)) e.gym_department = "Elige el departamento.";
    if (
      f.estimated_members !== null &&
      f.active_members !== null &&
      f.active_members > f.estimated_members
    ) {
      e.active_members = "Los atletas activos no pueden superar el total inscrito.";
    }
  }

  if (paso === "sedes") {
    // Se juzga lo que de verdad se va a enviar: las filas en blanco se descartan y,
    // con la casilla apagada, no viaja ninguna. Exigirle datos a una fila que nadie
    // va a mandar es pedir que arreglen algo que ya no existe.
    const sedes = f.has_branches ? f.branches.filter(sedeConAlgo) : [];
    if (f.has_branches && sedes.length === 0) {
      e.branches = "Indicaste que tienes sedes: agrega al menos una.";
    } else if (
      // Nombre, dirección y municipio son obligatorios por fila desde que el
      // serializer los exige (numeral 1.2: se pide el domicilio de cada Sede).
      sedes.some((s) => vacio(s.name) || vacio(s.address) || vacio(s.municipality))
    ) {
      e.branches = "Cada sede necesita nombre, dirección y municipio.";
    }
  }

  if (paso === "contacto") {
    if (vacio(f.contact_name)) e.contact_name = "¿Con quién hablamos?";
    if (!CORREO_RE.test(f.contact_email)) e.contact_email = "Escribe un correo válido.";
    if (vacio(f.contact_phone)) e.contact_phone = "Hace falta un teléfono.";
    if (
      f.panel_users
        .filter(usuarioConAlgo)
        .some((u) => vacio(u.name) || !CORREO_RE.test(u.email))
    ) {
      e.panel_users = "Cada persona del panel necesita nombre y un correo válido.";
    }
  }

  if (paso === "planes") {
    if (vacio(f.base_plan_name)) e.base_plan_name = "Ponle nombre a tu plan principal.";
    if (f.base_plan_amount === null) e.base_plan_amount = "¿Cuánto cuesta al mes?";
    if (f.extra_services.filter(extraConAlgo).some((s) => vacio(s.name) || s.amount === null)) {
      e.extra_services = "Cada servicio extra necesita nombre y precio.";
    }
    if (f.billing_contact_email && !CORREO_RE.test(f.billing_contact_email)) {
      e.billing_contact_email = "Escribe un correo válido.";
    }
  }

  if (paso === "disciplinas") {
    const disciplinas = f.service_types.filter(disciplinaConAlgo);
    if (disciplinas.some((d) => vacio(d.name))) {
      e.service_types = "Cada disciplina necesita un nombre.";
    } else if (
      disciplinas.some(
        (d) => d.opening_time && d.closing_time && d.closing_time <= d.opening_time,
      )
    ) {
      e.service_types = "La hora de cierre debe ser posterior a la de apertura.";
    }
  }

  if (paso === "cobro") {
    if (f.enable_online_payments) {
      if (vacio(f.settlement_bank_name)) e.settlement_bank_name = "Hace falta para poder depositarte.";
      if (vacio(f.settlement_account_number)) {
        e.settlement_account_number = "Hace falta para poder depositarte.";
      }
      if (vacio(f.settlement_account_holder)) {
        e.settlement_account_holder = "Hace falta para poder depositarte.";
      }
    }
    if (f.settlement_notification_email && !CORREO_RE.test(f.settlement_notification_email)) {
      e.settlement_notification_email = "Escribe un correo válido.";
    }
  }

  if (paso === "aceptacion") {
    if (vacio(f.signer_name)) e.signer_name = "¿Quién firma?";
    if (vacio(f.signer_position)) e.signer_position = "¿Con qué cargo firma?";
    if (vacio(f.signer_id_document)) e.signer_id_document = "Hace falta el documento del firmante.";
    if (!f.is_authorized_representative) {
      e.is_authorized_representative = "Es obligatorio para poder firmar.";
    }
    if (!f.accepts_terms) e.accepts_terms = "Es obligatorio para poder firmar.";
    if (!f.accepts_data_controller_role) {
      e.accepts_data_controller_role = "Es obligatorio para poder firmar.";
    }
    if (!f.accepts_athlete_passport) e.accepts_athlete_passport = "Es obligatorio para poder firmar.";
    if (!f.understands_manual_review) {
      e.understands_manual_review = "Es obligatorio para poder firmar.";
    }
    if (f.enable_online_payments) {
      const mensaje = "Es obligatorio si vas a cobrar con tarjeta por la plataforma.";
      if (!f.accepts_platform_commission) e.accepts_platform_commission = mensaje;
      if (!f.accepts_commission_mode) e.accepts_commission_mode = mensaje;
      if (!f.accepts_settlement_terms) e.accepts_settlement_terms = mensaje;
    }
    const faltan = contrato.waivers.filter((w) => !f.accepted_waivers.includes(w.key));
    if (faltan.length) {
      e.accepted_waivers = `Falta aceptar ${faltan.length} de las ${contrato.waivers.length} estipulaciones destacadas.`;
    }
  }

  return e;
}

// --------------------------------------------------------------------------
// Cuerpo del envío
// --------------------------------------------------------------------------
const oNulo = (valor: string): string | null => (valor.trim() ? valor.trim() : null);

/**
 * Traduce el estado a lo que espera el serializer.
 *
 * Dos cosas que no son cosméticas: las horas y fechas vacías viajan como `null`
 * (una cadena vacía no es un `TimeField` válido ni con `allow_null`), y las filas
 * de un repetidor que quedaron completamente en blanco se descartan. Si no se
 * descartaran, agregar una sede "por si acaso" y dejarla vacía sería un 400 sin
 * salida en un paso que la persona creía terminado.
 */
function construirCuerpo(
  f: EstadoFormulario,
  contrato: ContractDoc,
  recaptchaToken: string,
): Record<string, unknown> {
  // El mismo criterio que usa `validarPaso`: se descarta la fila en blanco y se
  // conserva TODA la que tenga algo escrito. Filtrar aquí por el nombre —como se
  // hacía— tiraba en silencio la sede a la que alguien le puso la dirección y se
  // le olvidó el nombre, y el formulario la daba por enviada.
  const sedes = f.has_branches ? f.branches.filter(sedeConAlgo) : [];
  const usuarios = f.panel_users.filter(usuarioConAlgo);
  const disciplinas = f.service_types.filter(disciplinaConAlgo);
  const extras = f.extra_services.filter(extraConAlgo);

  return {
    manages_multiple_gyms: f.manages_multiple_gyms,
    organization_name: f.organization_name.trim(),
    organization_legal_name: f.organization_legal_name.trim(),
    organization_nit: f.organization_nit.trim(),

    gym_name: f.gym_name.trim(),
    gym_type: f.gym_type,
    gym_legal_name: f.gym_legal_name.trim(),
    gym_nit: f.gym_nit.trim(),
    has_legal_personality: f.has_legal_personality,
    registry_details: f.registry_details.trim(),
    gym_address_line: f.gym_address_line.trim(),
    gym_zone: f.gym_zone.trim(),
    gym_municipality: f.gym_municipality.trim(),
    gym_department: f.gym_department,
    gym_reference_point: f.gym_reference_point.trim(),
    estimated_members: f.estimated_members,
    active_members: f.active_members,

    has_branches: f.has_branches,
    branches: sedes.map((s) => ({
      name: s.name.trim(),
      kind: s.kind,
      address: s.address.trim(),
      municipality: s.municipality.trim(),
      capacity: s.capacity,
    })),

    contact_name: f.contact_name.trim(),
    contact_email: f.contact_email.trim(),
    contact_phone: f.contact_phone.trim(),
    contact_role: f.contact_role.trim(),
    contact_preferred_channel: f.contact_preferred_channel,
    legal_representative_name: f.legal_representative_name.trim(),
    legal_representative_id: f.legal_representative_id.trim(),
    panel_users: usuarios.map((u) => ({
      name: u.name.trim(),
      email: u.email.trim(),
      phone: u.phone.trim(),
      role: u.role,
    })),

    base_plan_name: f.base_plan_name.trim(),
    base_plan_amount: f.base_plan_amount,
    plan_interval: f.plan_interval,
    cutoff_day_of_month: f.cutoff_day_of_month,
    grace_days: f.grace_days,
    dropin_price: f.dropin_price,
    extra_services: extras.map((s) => ({
      name: s.name.trim(),
      amount: s.amount,
      charge_type: s.charge_type,
    })),
    has_pending_balances: f.has_pending_balances,
    pending_balances_notes: f.pending_balances_notes.trim(),
    billing_contact_email: f.billing_contact_email.trim(),

    service_types: disciplinas.map((d) => ({
      name: d.name.trim(),
      requires_wod: d.requires_wod,
      opening_time: oNulo(d.opening_time),
      closing_time: oNulo(d.closing_time),
      available_weekdays: d.available_weekdays.map((dia) => Number(dia)).sort((a, b) => a - b),
      rules: d.rules.trim(),
    })),
    class_capacity: f.class_capacity,
    block_reservations_when_in_arrears: f.block_reservations_when_in_arrears,

    enable_online_payments: f.enable_online_payments,
    commission_mode: f.commission_mode,
    offline_payment_methods: f.offline_payment_methods,
    settlement_bank_name: f.settlement_bank_name.trim(),
    settlement_account_type: f.settlement_account_type,
    settlement_account_number: f.settlement_account_number.trim(),
    settlement_account_holder: f.settlement_account_holder.trim(),
    settlement_account_holder_id: f.settlement_account_holder_id.trim(),
    settlement_notification_email: f.settlement_notification_email.trim(),
    expected_monthly_collection: f.expected_monthly_collection,

    has_coaches: f.has_coaches,
    coaches_count: f.coaches_count,
    enrolls_minors: f.enrolls_minors,
    checkin_method: f.checkin_method,
    no_show_policy: f.no_show_policy.trim(),
    office_phone: f.office_phone.trim(),

    current_management_tool: f.current_management_tool.trim(),
    data_migration_needed: f.data_migration_needed,
    target_go_live_date: oNulo(f.target_go_live_date),
    how_did_you_hear: f.how_did_you_hear.trim(),
    additional_notes: f.additional_notes.trim(),

    signer_name: f.signer_name.trim(),
    signer_position: f.signer_position.trim(),
    signer_id_document: f.signer_id_document.trim(),
    is_authorized_representative: f.is_authorized_representative,
    accepts_terms: f.accepts_terms,
    accepts_platform_commission: f.accepts_platform_commission,
    accepts_commission_mode: f.accepts_commission_mode,
    accepts_settlement_terms: f.accepts_settlement_terms,
    accepts_data_controller_role: f.accepts_data_controller_role,
    accepts_athlete_passport: f.accepts_athlete_passport,
    understands_manual_review: f.understands_manual_review,
    accepts_commercial_communications: f.accepts_commercial_communications,
    accepted_waivers: f.accepted_waivers,
    contract_observations: f.contract_observations.trim(),

    // La evidencia de QUÉ documento tenía a la vista. El servidor compara el hash
    // con el vigente y rechaza la firma si el articulado cambió mientras llenaba.
    terms_version: contrato.version,
    contract_hash: contrato.hash,
    recaptcha_token: recaptchaToken,
  };
}

// --------------------------------------------------------------------------
// Componente
// --------------------------------------------------------------------------
export type OnboardingFormProps = {
  token: string;
  terms: OnboardingTerms;
  contract: ContractDoc;
  prefill: { contact_email: string; contact_name: string; gym_name: string };
  /** El enlace dejó de servir (403 `invitation_*`) o el contrato no es firmable (409). */
  onEnlaceMuerto: (detalle: string) => void;
};

export function OnboardingForm({
  token,
  terms,
  contract,
  prefill,
  onEnlaceMuerto,
}: OnboardingFormProps) {
  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(prefill));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [paso, setPaso] = useState(0);
  const [maxPaso, setMaxPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ id: string; folio: number } | null>(null);

  const arriba = useRef<HTMLDivElement>(null);
  const captcha = useRef<RecaptchaHandle>(null);
  const tocados = useRef<Set<string>>(new Set());
  const primerRender = useRef(true);
  // Foto del formulario al abrirlo. Es contra esto que se decide qué está "lleno":
  // lo que sigue igual que al nacer y nadie tocó no es avance de nadie.
  const inicial = useRef(form);

  // Telemetría de avance con 4 s de reposo. Va con debounce y no por paso porque
  // la mayoría de los abandonos ocurren A MEDIO paso: sin esto, alguien que llena
  // media pantalla y se va figura con el avance del paso anterior.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    const temporizador = window.setTimeout(() => {
      // Un fallo aquí no puede interrumpir a quien está escribiendo: se traga.
      reportProgress(token, camposLlenos(form, inicial.current, tocados.current)).catch(
        () => undefined,
      );
    }, 4000);
    return () => window.clearTimeout(temporizador);
  }, [form, token]);

  const irArriba = () => {
    arriba.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function set<K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) {
    tocados.current.add(campo as string);
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
    // El error se borra al primer cambio: dejarlo puesto mientras se corrige hace
    // creer que la corrección no sirvió.
    setErrores((anteriores) => {
      if (!(campo in anteriores)) return anteriores;
      const copia = { ...anteriores };
      delete copia[campo as string];
      return copia;
    });
  }

  const irAPaso = (destino: number) => {
    setPaso(destino);
    irArriba();
  };

  const siguiente = () => {
    const problemas = validarPaso(paso, form, contract);
    if (Object.keys(problemas).length) {
      setErrores(problemas);
      irArriba();
      return;
    }
    const destino = Math.min(paso + 1, PASOS.length - 1);
    setMaxPaso((max) => Math.max(max, destino));
    irAPaso(destino);
  };

  const alternarRenuncia = (llave: string, marcada: boolean) => {
    set(
      "accepted_waivers",
      marcada
        ? [...form.accepted_waivers, llave]
        : form.accepted_waivers.filter((k) => k !== llave),
    );
  };

  const enviar = async () => {
    // Se validan TODOS los pasos, no solo el último: un campo obligatorio puede
    // haber quedado vacío en el paso 2 si la persona navegó hacia atrás.
    for (let i = 0; i < PASOS.length; i += 1) {
      const problemas = validarPaso(i, form, contract);
      if (Object.keys(problemas).length) {
        setErrores(problemas);
        irAPaso(i);
        notifications.show({
          color: "red",
          title: "Falta algo en este paso",
          message: "Revisa los campos marcados y vuelve a intentarlo.",
        });
        return;
      }
    }

    const tokenCaptcha = captcha.current?.token() ?? "";
    if (RECAPTCHA_ACTIVO && !tokenCaptcha) {
      notifications.show({
        color: "red",
        message: "Confirma que no eres un robot antes de firmar.",
      });
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await submitGymApplication(
        token,
        construirCuerpo(form, contract, tokenCaptcha),
      );
      setResultado({ id: respuesta.application_id, folio: respuesta.folio });
      irArriba();
    } catch (error) {
      captcha.current?.reiniciar();
      const respuesta = (error as { response?: { status?: number; data?: unknown } }).response;
      const cuerpo = respuesta?.data as { detail?: unknown; code?: string } | undefined;
      const detalle = typeof cuerpo?.detail === "string" ? cuerpo.detail : "";
      const codigo = typeof cuerpo?.code === "string" ? cuerpo.code : "";

      // El enlace murió o el articulado no es publicable: no hay nada que corregir
      // en el formulario, así que lo resuelve la página, no este componente.
      if (codigo.startsWith("invitation_") || codigo === "contract_not_publishable") {
        onEnlaceMuerto(detalle || errMsg(error));
        return;
      }

      const porCampo = aplanarErrores(cuerpo);

      // El articulado cambió mientras llenaba el formulario. No hay campo que
      // corregir ni paso al que saltar —`contract_hash` y `terms_version` no viven
      // en ningún paso, los pone la página—, así que el salto genérico dejaría el
      // aviso como un error mudo. Se dice qué pasó, qué hacer y qué se pierde.
      if (porCampo.contract_hash || porCampo.terms_version) {
        notifications.show({
          color: "red",
          autoClose: false,
          title: "El contrato cambió mientras lo llenabas",
          message:
            "Se publicó una versión nueva del articulado, así que esta firma no se guardó. " +
            "Recarga la página para leer la versión vigente. Ojo: al recargar se pierde lo " +
            "que escribiste, así que cópialo antes si te sirve.",
        });
        return;
      }

      const destino = pasoDelPrimerError(porCampo);
      if (destino !== null) {
        setErrores(porCampo);
        irAPaso(destino);
        notifications.show({
          color: "red",
          title: `Revisa "${PASOS[destino].label}"`,
          message: "Marcamos en rojo lo que hay que corregir.",
        });
        return;
      }
      notifications.show({ color: "red", message: errMsg(error) });
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <PantallaExito token={token} applicationId={resultado.id} folio={resultado.folio} />
    );
  }

  const actual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  return (
    <Stack gap="lg" ref={arriba}>
      {/* Cabecera: dónde estoy, cuánto falta y cómo regreso. */}
      <GlassCard variant="core" padding={22}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="sm">
          <div style={{ minWidth: 0 }}>
            <SectionLabel mb={6}>
              Contrato de alta · versión {contract.version}
            </SectionLabel>
            <Title order={2}>{actual.label}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {actual.hint}
            </Text>
          </div>
          <Badge variant="light" size="lg">
            Paso {paso + 1} de {PASOS.length}
          </Badge>
        </Group>

        <Progress value={((paso + 1) / PASOS.length) * 100} size="sm" radius="xl" mb="md" />

        {/* Los pasos ya recorridos son clicables: revisar lo que uno escribió es
            parte de firmar, y obligar a volver con "Atrás" diez veces no lo es. */}
        <Group gap={6}>
          {PASOS.map((p, i) => {
            const alcanzable = i <= maxPaso;
            return (
              <Button
                key={p.key}
                size="compact-xs"
                variant={i === paso ? "filled" : alcanzable ? "default" : "subtle"}
                color={i === paso ? "flame" : undefined}
                disabled={!alcanzable}
                onClick={() => irAPaso(i)}
              >
                {i + 1}. {p.label}
              </Button>
            );
          })}
        </Group>
      </GlassCard>

      <GlassCard padding={24}>
        {paso === 0 && <PasoOrganizacion form={form} errores={errores} set={set} />}
        {paso === 1 && <PasoGimnasio form={form} errores={errores} set={set} />}
        {paso === 2 && <PasoSedes form={form} errores={errores} set={set} />}
        {paso === 3 && <PasoContacto form={form} errores={errores} set={set} />}
        {paso === 4 && <PasoPlanes form={form} errores={errores} set={set} />}
        {paso === 5 && <PasoDisciplinas form={form} errores={errores} set={set} />}
        {paso === 6 && <PasoCobro form={form} errores={errores} set={set} terms={terms} />}
        {paso === 7 && <PasoOperacion form={form} errores={errores} set={set} />}
        {paso === 8 && <PasoArranque form={form} errores={errores} set={set} />}
        {paso === 9 && (
          <PasoFirma
            form={form}
            errores={errores}
            set={set}
            terms={terms}
            contract={contract}
            alternarRenuncia={alternarRenuncia}
            captcha={captcha}
          />
        )}
      </GlassCard>

      <Group justify="space-between" wrap="wrap" gap="sm">
        <Button
          variant="default"
          leftSection={<ArrowLeft size={16} />}
          disabled={paso === 0 || enviando}
          onClick={() => irAPaso(Math.max(0, paso - 1))}
        >
          Atrás
        </Button>
        {esUltimo ? (
          <Button
            leftSection={<FileSignature size={16} />}
            loading={enviando}
            onClick={() => void enviar()}
          >
            Firmar y enviar
          </Button>
        ) : (
          <Button rightSection={<ArrowRight size={16} />} onClick={siguiente}>
            Continuar
          </Button>
        )}
      </Group>
    </Stack>
  );
}

// --------------------------------------------------------------------------
// Pasos
// --------------------------------------------------------------------------
type PropsPaso = {
  form: EstadoFormulario;
  errores: Record<string, string>;
  set: <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) => void;
};

const DOS_COLUMNAS = { base: 1, sm: 2 };

function PasoOrganizacion({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <Casilla
        checked={form.manages_multiple_gyms}
        onChange={(v) => set("manages_multiple_gyms", v)}
        label="Este gimnasio pertenece a una cadena, franquicia o grupo"
        descripcion="Si es un box independiente, deja la casilla vacía y continúa."
      />
      {form.manages_multiple_gyms && (
        <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
          <Texto
            label="Nombre de la cadena"
            requerido
            value={form.organization_name}
            onChange={(v) => set("organization_name", v)}
            error={errores.organization_name}
            maxLength={140}
          />
          <Texto
            label="Razón social de la cadena"
            value={form.organization_legal_name}
            onChange={(v) => set("organization_legal_name", v)}
            error={errores.organization_legal_name}
            maxLength={200}
          />
          <Texto
            label="NIT de la cadena"
            value={form.organization_nit}
            onChange={(v) => set("organization_nit", v)}
            error={errores.organization_nit}
            maxLength={30}
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}

function PasoGimnasio({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Nombre comercial"
          requerido
          value={form.gym_name}
          onChange={(v) => set("gym_name", v)}
          error={errores.gym_name}
          maxLength={140}
        />
        <Texto
          label="Razón social"
          descripcion="A nombre de quién factura el gimnasio."
          value={form.gym_legal_name}
          onChange={(v) => set("gym_legal_name", v)}
          error={errores.gym_legal_name}
          maxLength={200}
        />
      </SimpleGrid>

      <Opcion
        label="Tipo de gimnasio"
        value={form.gym_type}
        onChange={(v) => set("gym_type", v)}
        opciones={TIPOS_GYM}
        error={errores.gym_type}
      />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="NIT"
          descripcion="Con este NIT se emiten tus facturas."
          requerido
          value={form.gym_nit}
          onChange={(v) => set("gym_nit", v)}
          error={errores.gym_nit}
          maxLength={30}
        />
        <Texto
          label="Datos de inscripción registral"
          // Obligatorio solo con personalidad jurídica propia: si el gimnasio opera a
          // nombre de una persona no hay sociedad inscrita que declarar.
          descripcion={
            form.has_legal_personality
              ? "Registro, número y folio de la sociedad o empresa individual."
              : "Registro, folio y libro, si los tienes a mano."
          }
          requerido={form.has_legal_personality}
          value={form.registry_details}
          onChange={(v) => set("registry_details", v)}
          error={errores.registry_details}
          maxLength={200}
        />
      </SimpleGrid>

      <Casilla
        checked={form.has_legal_personality}
        onChange={(v) => set("has_legal_personality", v)}
        label="El gimnasio tiene personalidad jurídica propia (sociedad o empresa individual inscrita)"
        descripcion="Si opera a nombre de una persona, quita la casilla: el documento del firmante pasa a ser obligatorio."
        error={errores.has_legal_personality}
      />

      <Divider label="Dónde está" labelPosition="left" />

      <Texto
        label="Dirección"
        requerido
        value={form.gym_address_line}
        onChange={(v) => set("gym_address_line", v)}
        error={errores.gym_address_line}
        maxLength={200}
      />
      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Zona"
          value={form.gym_zone}
          onChange={(v) => set("gym_zone", v)}
          error={errores.gym_zone}
          maxLength={40}
        />
        <Texto
          label="Municipio"
          requerido
          value={form.gym_municipality}
          onChange={(v) => set("gym_municipality", v)}
          error={errores.gym_municipality}
          maxLength={80}
        />
        <Select
          label="Departamento"
          withAsterisk
          data={DEPARTAMENTOS}
          value={form.gym_department || null}
          onChange={(v) => set("gym_department", v ?? "")}
          error={errores.gym_department}
          searchable
          placeholder="Elige uno"
          comboboxProps={{ withinPortal: true }}
        />
        <Texto
          label="Punto de referencia"
          value={form.gym_reference_point}
          onChange={(v) => set("gym_reference_point", v)}
          error={errores.gym_reference_point}
          maxLength={200}
        />
      </SimpleGrid>

      <Divider label="Cuánta gente entrena" labelPosition="left" />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Numero
          label="Atletas inscritos"
          descripcion="Todos los que tienes en tu lista hoy."
          value={form.estimated_members}
          onChange={(v) => set("estimated_members", v)}
          error={errores.estimated_members}
        />
        <Numero
          label="Atletas activos"
          descripcion="Los que de verdad están entrenando este mes."
          value={form.active_members}
          onChange={(v) => set("active_members", v)}
          error={errores.active_members}
        />
      </SimpleGrid>
    </Stack>
  );
}

function PasoSedes({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <Casilla
        checked={form.has_branches}
        onChange={(v) => set("has_branches", v)}
        label="Entreno en más de un local"
        descripcion="Cada sede se crea en el panel con su propia capacidad y horarios."
        error={errores.has_branches}
      />
      {form.has_branches && (
        <Repetidor<Sede>
          label="Sedes"
          error={errores.branches}
          filas={form.branches}
          onChange={(filas) => set("branches", filas)}
          nueva={() => ({
            name: "",
            kind: form.branches.length === 0 ? "main" : "branch",
            address: "",
            municipality: "",
            capacity: null,
          })}
          textoAgregar="Agregar sede"
          vacio="Todavía no agregaste ninguna sede."
        >
          {(sede, actualizar) => (
            <Stack gap="sm">
              <SimpleGrid cols={DOS_COLUMNAS} spacing="sm">
                <Texto
                  label="Nombre de la sede"
                  requerido
                  value={sede.name}
                  onChange={(v) => actualizar({ name: v })}
                  maxLength={120}
                />
                <Numero
                  label="Capacidad por clase"
                  value={sede.capacity}
                  onChange={(v) => actualizar({ capacity: v })}
                  min={1}
                />
              </SimpleGrid>
              <Opcion
                label="Tipo"
                value={sede.kind}
                onChange={(v) => actualizar({ kind: v })}
                opciones={TIPOS_SEDE}
              />
              <SimpleGrid cols={DOS_COLUMNAS} spacing="sm">
                <Texto
                  label="Dirección"
                  requerido
                  value={sede.address}
                  onChange={(v) => actualizar({ address: v })}
                  maxLength={200}
                />
                <Texto
                  label="Municipio"
                  requerido
                  value={sede.municipality}
                  onChange={(v) => actualizar({ municipality: v })}
                  maxLength={80}
                />
              </SimpleGrid>
            </Stack>
          )}
        </Repetidor>
      )}
    </Stack>
  );
}

function PasoContacto({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Nombre de quien administra"
          requerido
          value={form.contact_name}
          onChange={(v) => set("contact_name", v)}
          error={errores.contact_name}
          maxLength={140}
        />
        <Texto
          label="Cargo"
          value={form.contact_role}
          onChange={(v) => set("contact_role", v)}
          error={errores.contact_role}
          maxLength={80}
        />
        <Correo
          label="Correo"
          descripcion="Con este correo se abre el acceso al panel."
          requerido
          value={form.contact_email}
          onChange={(v) => set("contact_email", v)}
          error={errores.contact_email}
        />
        <Telefono
          label="Teléfono"
          requerido
          value={form.contact_phone}
          onChange={(v) => set("contact_phone", v)}
          error={errores.contact_phone}
          maxLength={32}
        />
      </SimpleGrid>

      <Opcion
        label="¿Por dónde te escribimos?"
        value={form.contact_preferred_channel}
        onChange={(v) => set("contact_preferred_channel", v)}
        opciones={CANALES}
        error={errores.contact_preferred_channel}
      />

      <Divider label="Representante legal" labelPosition="left" />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Nombre del representante legal"
          value={form.legal_representative_name}
          onChange={(v) => set("legal_representative_name", v)}
          error={errores.legal_representative_name}
          maxLength={140}
        />
        <Texto
          label="Documento del representante"
          value={form.legal_representative_id}
          onChange={(v) => set("legal_representative_id", v)}
          error={errores.legal_representative_id}
          maxLength={30}
        />
      </SimpleGrid>

      <Repetidor<UsuarioPanel>
        label="Quién más entra al panel"
        descripcion="Cada persona recibe su propio acceso; nadie comparte contraseña."
        error={errores.panel_users}
        filas={form.panel_users}
        onChange={(filas) => set("panel_users", filas)}
        nueva={() => ({ name: "", email: "", phone: "", role: "gym_admin" })}
        textoAgregar="Agregar persona"
        vacio="Solo entrarás tú, por ahora."
      >
        {(usuario, actualizar) => (
          <Stack gap="sm">
            <SimpleGrid cols={DOS_COLUMNAS} spacing="sm">
              <Texto
                label="Nombre"
                value={usuario.name}
                onChange={(v) => actualizar({ name: v })}
                maxLength={140}
              />
              <Correo
                label="Correo"
                value={usuario.email}
                onChange={(v) => actualizar({ email: v })}
              />
              <Telefono
                label="Teléfono"
                value={usuario.phone}
                onChange={(v) => actualizar({ phone: v })}
                maxLength={32}
              />
            </SimpleGrid>
            <Opcion
              label="Rol"
              value={usuario.role}
              onChange={(v) => actualizar({ role: v })}
              opciones={ROLES_PANEL}
            />
          </Stack>
        )}
      </Repetidor>
    </Stack>
  );
}

function PasoPlanes({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Nombre del plan principal"
          requerido
          value={form.base_plan_name}
          onChange={(v) => set("base_plan_name", v)}
          error={errores.base_plan_name}
          maxLength={80}
          placeholder="Membresía ilimitada"
        />
        <Numero
          label="Precio del plan"
          requerido
          value={form.base_plan_amount}
          onChange={(v) => set("base_plan_amount", v)}
          error={errores.base_plan_amount}
          decimales={2}
          prefijo="Q "
        />
      </SimpleGrid>

      <Opcion
        label="Cada cuánto se cobra"
        value={form.plan_interval}
        onChange={(v) => set("plan_interval", v)}
        opciones={INTERVALOS}
        error={errores.plan_interval}
      />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Numero
          label="Día de corte"
          descripcion="Del 1 al 28. En blanco = se cobra en la fecha de alta de cada atleta."
          value={form.cutoff_day_of_month}
          onChange={(v) => set("cutoff_day_of_month", v)}
          error={errores.cutoff_day_of_month}
          min={1}
          max={28}
        />
        <Numero
          label="Días de gracia"
          descripcion="Cuántos días aguantas antes de considerar a alguien en mora."
          value={form.grace_days}
          onChange={(v) => set("grace_days", v)}
          error={errores.grace_days}
          min={0}
          max={365}
        />
        <Numero
          label="Precio del drop-in"
          descripcion="Lo que cobras por una clase suelta a alguien de otro box."
          value={form.dropin_price}
          onChange={(v) => set("dropin_price", v)}
          error={errores.dropin_price}
          decimales={2}
          prefijo="Q "
        />
        <Correo
          label="Correo de facturación"
          value={form.billing_contact_email}
          onChange={(v) => set("billing_contact_email", v)}
          error={errores.billing_contact_email}
        />
      </SimpleGrid>

      <Repetidor<ServicioExtra>
        label="Servicios que cobras aparte"
        descripcion="Personal trainer, nutrición, casillero… lo que no va incluido en la membresía."
        error={errores.extra_services}
        filas={form.extra_services}
        onChange={(filas) => set("extra_services", filas)}
        nueva={() => ({ name: "", amount: null, charge_type: "one_time" })}
        textoAgregar="Agregar servicio"
        vacio="Todo lo tuyo va incluido en la membresía."
      >
        {(servicio, actualizar) => (
          <Stack gap="sm">
            <SimpleGrid cols={DOS_COLUMNAS} spacing="sm">
              <Texto
                label="Nombre"
                value={servicio.name}
                onChange={(v) => actualizar({ name: v })}
                maxLength={80}
              />
              <Numero
                label="Precio"
                value={servicio.amount}
                onChange={(v) => actualizar({ amount: v })}
                decimales={2}
                prefijo="Q "
              />
            </SimpleGrid>
            <Opcion
              label="Cómo se cobra"
              value={servicio.charge_type}
              onChange={(v) => actualizar({ charge_type: v })}
              opciones={TIPOS_CARGO}
            />
          </Stack>
        )}
      </Repetidor>

      <Divider label="Saldos pendientes" labelPosition="left" />

      <Casilla
        checked={form.has_pending_balances}
        onChange={(v) => set("has_pending_balances", v)}
        label="Traigo atletas con saldo pendiente de antes"
        descripcion="Se registran como saldo previo; Nucleo no cobra nada de lo que se generó antes del alta."
        error={errores.has_pending_balances}
      />
      {form.has_pending_balances && (
        <AreaTexto
          label="Cuéntanos de esos saldos"
          value={form.pending_balances_notes}
          onChange={(v) => set("pending_balances_notes", v)}
          error={errores.pending_balances_notes}
          maxLength={400}
        />
      )}
    </Stack>
  );
}

function PasoDisciplinas({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <Repetidor<Disciplina>
        label="Disciplinas"
        descripcion="Cada una se crea con su calendario. Las que marques con WOD llevan rutina del día y tabla de resultados."
        error={errores.service_types}
        filas={form.service_types}
        onChange={(filas) => set("service_types", filas)}
        nueva={() => ({
          name: "",
          requires_wod: false,
          opening_time: "",
          closing_time: "",
          available_weekdays: [],
          rules: "",
        })}
        textoAgregar="Agregar disciplina"
        vacio="Agrega al menos una para que tu calendario nazca con clases."
      >
        {(disciplina, actualizar) => (
          <Stack gap="sm">
            <SimpleGrid cols={DOS_COLUMNAS} spacing="sm">
              <Texto
                label="Nombre"
                value={disciplina.name}
                onChange={(v) => actualizar({ name: v })}
                maxLength={80}
                placeholder="CrossFit"
              />
              <Group align="flex-end" gap="sm" wrap="nowrap">
                <Hora
                  label="Abre"
                  value={disciplina.opening_time}
                  onChange={(v) => actualizar({ opening_time: v })}
                />
                <Hora
                  label="Cierra"
                  value={disciplina.closing_time}
                  onChange={(v) => actualizar({ closing_time: v })}
                />
              </Group>
            </SimpleGrid>
            <OpcionMultiple
              label="Días"
              value={disciplina.available_weekdays}
              onChange={(v) => actualizar({ available_weekdays: v })}
              opciones={DIAS}
            />
            <Casilla
              checked={disciplina.requires_wod}
              onChange={(v) => actualizar({ requires_wod: v })}
              label="Lleva WOD (rutina del día y tabla de resultados)"
            />
            <Texto
              label="Reglas de la clase"
              value={disciplina.rules}
              onChange={(v) => actualizar({ rules: v })}
              maxLength={300}
            />
          </Stack>
        )}
      </Repetidor>

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Numero
          label="Capacidad por clase"
          descripcion="Cuántos entran a una clase. Lo demás se va a lista de espera."
          value={form.class_capacity}
          onChange={(v) => set("class_capacity", v)}
          error={errores.class_capacity}
          min={1}
          max={500}
        />
      </SimpleGrid>

      <Casilla
        checked={form.block_reservations_when_in_arrears}
        onChange={(v) => set("block_reservations_when_in_arrears", v)}
        label="Bloquear la reserva de clases a quien está en mora"
        descripcion="Se puede cambiar después desde el panel."
        error={errores.block_reservations_when_in_arrears}
      />
    </Stack>
  );
}

/**
 * El paso comercialmente importante.
 *
 * `commission_mode` no es una preferencia de interfaz: queda congelado en la
 * evidencia de la aceptación y define quién paga el costo de cobrar con tarjeta
 * durante toda la relación. Por eso son dos tarjetas grandes con un ejemplo en
 * quetzales, y no un `Select` con dos etiquetas que nadie entiende.
 */
function PasoCobro({
  form,
  errores,
  set,
  terms,
}: PropsPaso & { terms: OnboardingTerms }) {
  const tasa = Number(terms.platform_commission_pct) || 0;
  const fijo = Number(terms.platform_fixed_fee) || 0;
  const ejemplo = 500;
  // La fórmula real es `base × tasa + fijo` (billing/services.py:calcular_recargo). Si el
  // ejemplo omitiera el fijo, enseñaría en quetzales una cifra distinta de la que después
  // se cobra, y es sobre este ejemplo que el gimnasio elige su modalidad.
  const recargo = ejemplo * tasa + fijo;
  const porcentaje = `${(tasa * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

  const modos: {
    valor: CommissionMode;
    titulo: string;
    resumen: string;
    paga: string;
    recibes: string;
  }[] = [
    {
      valor: "passed_on",
      titulo: "Lo paga el atleta",
      resumen: "El recargo se SUMA al precio de lista. Tu ingreso no se toca.",
      paga: fmtQ(ejemplo + recargo, { decimals: 2 }),
      recibes: fmtQ(ejemplo, { decimals: 2 }),
    },
    {
      valor: "absorbed",
      titulo: "Lo absorbe el gimnasio",
      resumen: "El atleta paga el precio de lista tal cual y el costo sale de tu liquidación.",
      paga: fmtQ(ejemplo, { decimals: 2 }),
      recibes: fmtQ(ejemplo - recargo, { decimals: 2 }),
    },
  ];

  return (
    <Stack gap="md">
      <Casilla
        checked={form.enable_online_payments}
        onChange={(v) => set("enable_online_payments", v)}
        label="Quiero cobrar con tarjeta desde la plataforma"
        descripcion="Si no lo activas, sigues cobrando en efectivo, transferencia o con tu propia terminal, y no hay recargo de ningún tipo."
        error={errores.enable_online_payments}
      />

      <Campo
        label={`Quién paga el costo de cobrar con tarjeta (${porcentaje})`}
        descripcion={
          form.enable_online_payments
            ? `Ejemplo sobre una membresía de ${fmtQ(ejemplo, { decimals: 2 })}.`
            : "Queda firmado igual: si más adelante activas el cobro con tarjeta, aplica esta modalidad."
        }
        error={errores.commission_mode}
        requerido
      >
        <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
          {modos.map((modo) => {
            const elegido = form.commission_mode === modo.valor;
            return (
              <GlassCard
                key={modo.valor}
                lift
                padding={18}
                role="button"
                tabIndex={0}
                aria-pressed={elegido}
                onClick={() => set("commission_mode", modo.valor)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    set("commission_mode", modo.valor);
                  }
                }}
                style={{
                  cursor: "pointer",
                  borderColor: elegido ? "var(--mantine-color-flame-6)" : undefined,
                }}
              >
                <Group justify="space-between" align="center" mb={8}>
                  <Text fw={600}>{modo.titulo}</Text>
                  {elegido && (
                    <Badge color="flame" variant="filled" size="sm">
                      Elegida
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed" mb="sm">
                  {modo.resumen}
                </Text>
                <Divider mb="sm" />
                <Group justify="space-between" gap="xs">
                  <Text size="xs" c="dimmed">
                    El atleta paga
                  </Text>
                  <Text size="sm" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {modo.paga}
                  </Text>
                </Group>
                <Group justify="space-between" gap="xs">
                  <Text size="xs" c="dimmed">
                    Tú recibes
                  </Text>
                  <Text size="sm" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {modo.recibes}
                  </Text>
                </Group>
              </GlassCard>
            );
          })}
        </SimpleGrid>
      </Campo>

      <OpcionMultiple
        label="Formas de pago que aceptas en el box"
        descripcion="Estos pagos se registran a mano y nunca llevan recargo."
        value={form.offline_payment_methods}
        onChange={(v) => set("offline_payment_methods", v)}
        opciones={METODOS_OFFLINE}
        error={errores.offline_payment_methods}
      />

      {/* Los datos bancarios solo existen si hay algo que depositar. Pedirlos con
          el cobro en línea apagado sería pedir una cuenta bancaria sin motivo. */}
      {form.enable_online_payments && (
        <>
          <Divider
            label={`Dónde te depositamos (dentro de ${terms.settlement_business_hours} horas hábiles)`}
            labelPosition="left"
          />
          <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
            <Texto
              label="Banco"
              requerido
              value={form.settlement_bank_name}
              onChange={(v) => set("settlement_bank_name", v)}
              error={errores.settlement_bank_name}
              maxLength={80}
            />
            <Texto
              label="Número de cuenta"
              requerido
              value={form.settlement_account_number}
              onChange={(v) => set("settlement_account_number", v)}
              error={errores.settlement_account_number}
              maxLength={40}
            />
            <Texto
              label="A nombre de"
              requerido
              value={form.settlement_account_holder}
              onChange={(v) => set("settlement_account_holder", v)}
              error={errores.settlement_account_holder}
              maxLength={140}
            />
            <Texto
              label="NIT o documento del titular"
              value={form.settlement_account_holder_id}
              onChange={(v) => set("settlement_account_holder_id", v)}
              error={errores.settlement_account_holder_id}
              maxLength={30}
            />
          </SimpleGrid>
          <Opcion
            label="Tipo de cuenta"
            value={form.settlement_account_type}
            onChange={(v) => set("settlement_account_type", v)}
            opciones={TIPOS_CUENTA}
            error={errores.settlement_account_type}
          />
          <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
            <Correo
              label="Correo para avisos de liquidación"
              value={form.settlement_notification_email}
              onChange={(v) => set("settlement_notification_email", v)}
              error={errores.settlement_notification_email}
            />
            <Numero
              label="Cuánto esperas cobrar al mes"
              descripcion="Un estimado basta. Sirve para preparar tus límites con la pasarela."
              value={form.expected_monthly_collection}
              onChange={(v) => set("expected_monthly_collection", v)}
              error={errores.expected_monthly_collection}
              decimales={2}
              prefijo="Q "
            />
          </SimpleGrid>
        </>
      )}

      {/* Aquí había dos campos de emisor FEL. Se quitaron con el serializer que los
          dejó de aceptar: hoy la factura electrónica se emite con un emisor ÚNICO y
          global de Nucleo, y `Gym.fiscal_data` no lo lee nadie. Pedirle su NIT de
          emisor le hacía creer que iba a facturar con el suyo. */}
    </Stack>
  );
}

function PasoOperacion({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <Casilla
        checked={form.has_coaches}
        onChange={(v) => set("has_coaches", v)}
        label="Tengo coaches dando clase"
        error={errores.has_coaches}
      />
      {form.has_coaches && (
        <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
          <Numero
            label="Cuántos coaches"
            value={form.coaches_count}
            onChange={(v) => set("coaches_count", v)}
            error={errores.coaches_count}
          />
        </SimpleGrid>
      )}

      <Casilla
        checked={form.enrolls_minors}
        onChange={(v) => set("enrolls_minors", v)}
        label="Inscribo a menores de edad"
        descripcion="Si los inscribes, el contrato te obliga a recabar el consentimiento de quien ejerce la patria potestad."
        error={errores.enrolls_minors}
      />

      <Opcion
        label="Cómo tomas asistencia"
        value={form.checkin_method}
        onChange={(v) => set("checkin_method", v)}
        opciones={METODOS_CHECKIN}
        error={errores.checkin_method}
      />

      <AreaTexto
        label="Tu política de faltas (no-show)"
        descripcion="Qué pasa cuando alguien reserva y no llega."
        value={form.no_show_policy}
        onChange={(v) => set("no_show_policy", v)}
        error={errores.no_show_policy}
        maxLength={300}
      />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Telefono
          label="Teléfono del box"
          value={form.office_phone}
          onChange={(v) => set("office_phone", v)}
          error={errores.office_phone}
          maxLength={32}
        />
      </SimpleGrid>
    </Stack>
  );
}

function PasoArranque({ form, errores, set }: PropsPaso) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Con qué manejas el gimnasio hoy"
          descripcion="Excel, WhatsApp, otro sistema… lo que sea."
          value={form.current_management_tool}
          onChange={(v) => set("current_management_tool", v)}
          error={errores.current_management_tool}
          maxLength={120}
        />
        <Fecha
          label="Para cuándo quieres estar operando"
          value={form.target_go_live_date}
          onChange={(v) => set("target_go_live_date", v)}
          error={errores.target_go_live_date}
        />
      </SimpleGrid>

      <Casilla
        checked={form.data_migration_needed}
        onChange={(v) => set("data_migration_needed", v)}
        label="Necesito que migren mis datos actuales"
        descripcion="Atletas, planes y saldos. Te decimos qué formato nos sirve."
        error={errores.data_migration_needed}
      />

      <Texto
        label="¿Cómo supiste de Nucleo?"
        value={form.how_did_you_hear}
        onChange={(v) => set("how_did_you_hear", v)}
        error={errores.how_did_you_hear}
        maxLength={160}
      />

      <AreaTexto
        label="Algo más que debamos saber"
        value={form.additional_notes}
        onChange={(v) => set("additional_notes", v)}
        error={errores.additional_notes}
        maxLength={1000}
        filas={4}
      />
    </Stack>
  );
}

/**
 * La firma.
 *
 * El articulado completo se despliega aquí y no detrás de un enlace: un contrato
 * que hay que ir a buscar a otra pestaña es un contrato que nadie lee, y la
 * evidencia que se guarda dice que esta persona lo tuvo a la vista.
 */
function PasoFirma({
  form,
  errores,
  set,
  terms,
  contract,
  alternarRenuncia,
  captcha,
}: PropsPaso & {
  terms: OnboardingTerms;
  contract: ContractDoc;
  alternarRenuncia: (llave: string, marcada: boolean) => void;
  captcha: RefObject<RecaptchaHandle>;
}) {
  const tasa = Number(terms.platform_commission_pct) || 0;
  const porcentaje = `${(tasa * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  const marcadas = form.accepted_waivers.length;

  return (
    <Stack gap="lg">
      {/* ── El articulado ──────────────────────────────────────────────── */}
      <div>
        <SectionLabel as="h2">
          Contrato completo · versión {contract.version} · {contract.clauses.length} cláusulas
        </SectionLabel>
        <Text c="dimmed" size="sm" mb="sm">
          Prestador: {contract.provider.legal_name} (NIT {contract.provider.tax_id}),{" "}
          {contract.provider.address}. Representante: {contract.provider.representative}.
          Contacto: {contract.provider.email} · {contract.provider.phone}.
        </Text>

        <Box
          // Scroll propio: el articulado mide varias pantallas y, suelto, empujaría
          // las casillas de aceptación tan abajo que nadie las encontraría.
          style={{
            maxHeight: 430,
            overflowY: "auto",
            padding: 18,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Stack gap="lg">
            {contract.clauses.map((clausula) => (
              <div key={clausula.numero}>
                <Text fw={600} size="sm" mb={6}>
                  {clausula.numero}. {clausula.titulo}
                </Text>
                {clausula.texto.split("\n\n").map((parrafo, indice) => (
                  <Text
                    key={indice}
                    size="sm"
                    c="dimmed"
                    mb={6}
                    style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}
                  >
                    {parrafo}
                  </Text>
                ))}
              </div>
            ))}
          </Stack>
        </Box>
      </div>

      {/* ── Las renuncias, una por una ─────────────────────────────────── */}
      <div>
        <Group justify="space-between" align="center" mb="xs" wrap="wrap">
          <SectionLabel as="h2" mb={0}>
            Estipulaciones destacadas
          </SectionLabel>
          <Badge
            variant="light"
            color={marcadas === contract.waivers.length ? "teal" : "flame"}
          >
            {marcadas} de {contract.waivers.length} aceptadas
          </Badge>
        </Group>
        <Text c="dimmed" size="sm" mb="sm">
          Cada una se acepta por separado. No hay una casilla que las marque todas: la
          ley exige que consten expresamente y que puedas leerlas de una en una.
        </Text>

        <Stack gap="sm">
          {contract.waivers.map((renuncia) => {
            const marcada = form.accepted_waivers.includes(renuncia.key);
            return (
              <Box
                key={renuncia.key}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: `1px solid ${marcada ? "rgba(46,204,143,0.34)" : "rgba(255,255,255,0.10)"}`,
                  borderLeft: `3px solid ${marcada ? "var(--mantine-color-teal-6)" : "var(--mantine-color-flame-6)"}`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Casilla
                  checked={marcada}
                  onChange={(v) => alternarRenuncia(renuncia.key, v)}
                  label={
                    <Text fw={600} size="sm">
                      {renuncia.letra}) {renuncia.titulo}
                    </Text>
                  }
                  descripcion={
                    <Text size="xs" c="dimmed" mt={6} style={{ lineHeight: 1.55 }}>
                      {renuncia.texto}
                    </Text>
                  }
                />
              </Box>
            );
          })}
        </Stack>
        {errores.accepted_waivers && (
          <Text c="red" size="sm" mt="xs">
            {errores.accepted_waivers}
          </Text>
        )}
      </div>

      <Divider label="Quién firma" labelPosition="left" />

      <SimpleGrid cols={DOS_COLUMNAS} spacing="md">
        <Texto
          label="Nombre completo"
          requerido
          value={form.signer_name}
          onChange={(v) => set("signer_name", v)}
          error={errores.signer_name}
          maxLength={140}
        />
        <Texto
          label="Cargo con el que firma"
          requerido
          value={form.signer_position}
          onChange={(v) => set("signer_position", v)}
          error={errores.signer_position}
          maxLength={120}
          placeholder="Representante legal"
        />
        <Texto
          label="Documento de identificación (DPI o pasaporte)"
          requerido
          value={form.signer_id_document}
          onChange={(v) => set("signer_id_document", v)}
          error={errores.signer_id_document}
          maxLength={30}
        />
      </SimpleGrid>

      <Casilla
        checked={form.is_authorized_representative}
        onChange={(v) => set("is_authorized_representative", v)}
        label="Declaro que cuento con facultades suficientes para obligar al gimnasio y que todo lo que escribí es cierto."
        error={errores.is_authorized_representative}
      />

      <Divider label="Aceptación" labelPosition="left" />

      <Stack gap="sm">
        <Casilla
          checked={form.accepts_terms}
          onChange={(v) => set("accepts_terms", v)}
          label={`He leído y acepto íntegramente el contrato en su versión ${contract.version}.`}
          error={errores.accepts_terms}
        />
        <Casilla
          checked={form.accepts_data_controller_role}
          onChange={(v) => set("accepts_data_controller_role", v)}
          label="Acepto que el gimnasio es el responsable de los datos de sus atletas y que Nucleo los trata por su cuenta."
          error={errores.accepts_data_controller_role}
        />
        <Casilla
          checked={form.accepts_athlete_passport}
          onChange={(v) => set("accepts_athlete_passport", v)}
          label="Entiendo que la identidad del atleta es portátil: su historial le pertenece y lo conserva aunque deje mi gimnasio."
          error={errores.accepts_athlete_passport}
        />
        <Casilla
          checked={form.understands_manual_review}
          onChange={(v) => set("understands_manual_review", v)}
          label="Entiendo que esto es una solicitud: una persona de Nucleo la revisa y habilita el gimnasio, no queda activo al enviar."
          error={errores.understands_manual_review}
        />

        {form.enable_online_payments && (
          <>
            <Casilla
              checked={form.accepts_platform_commission}
              onChange={(v) => set("accepts_platform_commission", v)}
              label={`Acepto el costo transaccional de ${porcentaje} sobre cada cobro con tarjeta hecho por la plataforma.`}
              error={errores.accepts_platform_commission}
            />
            <Casilla
              checked={form.accepts_commission_mode}
              onChange={(v) => set("accepts_commission_mode", v)}
              label={
                form.commission_mode === "passed_on"
                  ? "Acepto la modalidad elegida: el recargo se suma al precio y lo paga el atleta."
                  : "Acepto la modalidad elegida: el costo lo absorbe el gimnasio y se deduce de la liquidación."
              }
              error={errores.accepts_commission_mode}
            />
            <Casilla
              checked={form.accepts_settlement_terms}
              onChange={(v) => set("accepts_settlement_terms", v)}
              label={`Acepto que el depósito se practique dentro de las ${terms.settlement_business_hours} horas hábiles siguientes al cierre del período, sobre los fondos que la pasarela ya haya acreditado.`}
              error={errores.accepts_settlement_terms}
            />
          </>
        )}

        <Casilla
          checked={form.accepts_commercial_communications}
          onChange={(v) => set("accepts_commercial_communications", v)}
          label="Quiero recibir novedades y comunicaciones comerciales de Nucleo (opcional)."
        />
      </Stack>

      <AreaTexto
        label="Observaciones al contrato"
        descripcion="Si algo te hace ruido, escríbelo aquí: queda en el expediente y una persona lo lee."
        value={form.contract_observations}
        onChange={(v) => set("contract_observations", v)}
        error={errores.contract_observations}
        maxLength={1000}
      />

      <Recaptcha ref={captcha} />

      <Alert
        color="gray"
        variant="light"
        icon={<ShieldCheck size={17} />}
        title="Qué queda registrado"
      >
        Al firmar se guarda la versión del contrato, su huella digital, la fecha y hora,
        tu dirección IP y el navegador desde el que firmaste. Te mandamos una copia en PDF
        al correo de contacto.
      </Alert>
    </Stack>
  );
}

// --------------------------------------------------------------------------
// Éxito + expediente
// --------------------------------------------------------------------------
type Documento = { campo: "doc_patente" | "doc_signer_id"; label: string; descripcion: string };

const DOCUMENTOS: Documento[] = [
  {
    campo: "doc_patente",
    label: "Patente de comercio o constancia del RTU",
    descripcion: "Acredita que el negocio existe y a nombre de quién factura.",
  },
  {
    campo: "doc_signer_id",
    label: "Documento de identificación del firmante",
    descripcion: "Ambos lados, en un solo archivo o en dos envíos.",
  },
];

type EstadoDocumento = {
  archivo: File | null;
  subiendo: boolean;
  subido: boolean;
  error: string;
};

const DOCUMENTO_VACIO: EstadoDocumento = {
  archivo: null,
  subiendo: false,
  subido: false,
  error: "",
};

/**
 * Lo que se ve después de firmar.
 *
 * El expediente se sube AQUÍ y no antes de firmar a propósito: hasta que existe
 * la solicitud no hay a qué adjuntar los archivos, y meter una subida en medio
 * de diez pasos es la forma más fácil de que alguien se atore buscando su patente
 * y abandone el contrato a medio llenar. El enlace sigue sirviendo para esto
 * aunque ya se haya gastado al firmar, así que se puede cerrar y volver.
 */
function PantallaExito({
  token,
  applicationId,
  folio,
}: {
  token: string;
  applicationId: string;
  folio: number;
}) {
  const [estados, setEstados] = useState<Record<string, EstadoDocumento>>({
    doc_patente: DOCUMENTO_VACIO,
    doc_signer_id: DOCUMENTO_VACIO,
  });

  const cambiar = (campo: string, parcial: Partial<EstadoDocumento>) =>
    setEstados((anterior) => ({ ...anterior, [campo]: { ...anterior[campo], ...parcial } }));

  const subir = async (documento: Documento) => {
    const estado = estados[documento.campo];
    if (!estado.archivo) return;
    cambiar(documento.campo, { subiendo: true, error: "" });
    try {
      // Un archivo por petición: el 413 de nginx no trae cuerpo JSON y dejaría a
      // la persona sin saber qué pasó (ver `uploadApplicationDocument`).
      await uploadApplicationDocument(token, applicationId, documento.campo, estado.archivo);
      cambiar(documento.campo, { subiendo: false, subido: true });
      notifications.show({ color: "teal", message: `${documento.label}: recibido.` });
    } catch (error) {
      cambiar(documento.campo, { subiendo: false, error: errMsg(error) });
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        kicker={`Solicitud #${folio}`}
        title="Contrato recibido"
        subtitle="Te mandamos una copia en PDF al correo de contacto. Una persona de Nucleo revisa la solicitud y habilita tu gimnasio; te avisamos por el canal que elegiste."
      />

      <GlassCard variant="core" padding={22}>
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <CheckCircle2 size={22} color="var(--mantine-color-teal-5)" style={{ flex: "none" }} />
          <div>
            <Text fw={600} mb={4}>
              Firmado y guardado
            </Text>
            <Text size="sm" c="dimmed">
              Quedó registrada la versión del contrato que aceptaste y su huella digital.
              El gimnasio todavía no está activo: lo montamos nosotros después de revisar.
            </Text>
          </div>
        </Group>
      </GlassCard>

      <GlassCard padding={22}>
        <SectionLabel as="h2">Falta el expediente</SectionLabel>
        <Text size="sm" c="dimmed" mb="md">
          Son dos documentos y son la condición para habilitar el gimnasio. Puedes cerrar
          esta página y volver con el mismo enlace cuando los tengas a mano; el enlace
          sigue sirviendo para subirlos.
        </Text>

        <Stack gap="lg">
          {DOCUMENTOS.map((documento) => {
            const estado = estados[documento.campo];
            return (
              <div key={documento.campo}>
                <Archivo
                  label={documento.label}
                  descripcion={documento.descripcion}
                  valor={estado.archivo}
                  onSeleccionar={(archivo) =>
                    cambiar(documento.campo, { archivo, subido: false, error: "" })
                  }
                  subido={estado.subido}
                  subiendo={estado.subiendo}
                  error={estado.error}
                />
                {estado.archivo && !estado.subido && (
                  <Button
                    mt="xs"
                    size="xs"
                    leftSection={<Upload size={14} />}
                    loading={estado.subiendo}
                    onClick={() => void subir(documento)}
                  >
                    {estado.error ? "Reintentar" : "Subir"}
                  </Button>
                )}
              </div>
            );
          })}
        </Stack>
      </GlassCard>

      <Alert color="gray" variant="light" icon={<Info size={17} />}>
        Guarda el enlace de esta página. Si cierras ahora, puedes volver a abrirlo para
        terminar de subir los documentos: tu contrato ya quedó firmado con el folio #{folio}.
      </Alert>
    </Stack>
  );
}
