/**
 * Alta de gimnasios: tipos y llamadas del contrato digital.
 *
 * Dos clientes distintos a propósito:
 * - `publicApi` para lo que abre el prospecto con su enlace (sin sesión).
 * - `api` para el backoffice, que sí exige superadmin.
 *
 * `PASOS` es la fuente de verdad de qué campo vive en qué paso. Lo usan tres
 * cosas que se desincronizan solas si no comparten catálogo: el renderizado del
 * formulario, el reporte de avance y —la que más duele— el mapeo de un error 400
 * de la API al paso donde vive el campo que falló. Un 400 que no lleva a la
 * persona al campo equivocado es un callejón sin salida.
 *
 * Los nombres tienen que coincidir EXACTAMENTE con
 * `apps/onboarding/serializers.py` y con `apps/onboarding/onboarding_progress.py`.
 */
import { api } from "./client";
import { publicApi } from "./publicClient";

// --------------------------------------------------------------------------
// Tipos
// --------------------------------------------------------------------------
export type CommissionMode = "passed_on" | "absorbed";

export type OnboardingTerms = {
  terms_version: string;
  platform_commission_pct: string;
  platform_nucleo_pct: string;
  platform_gateway_pct: string;
  /** Monto fijo por operación, además del porcentaje. Suele ser "0.00". */
  platform_fixed_fee: string;
  saas_plan: string;
  saas_monthly_price: string;
  settlement_business_hours: number;
  currency: string;
  commission_modes: { value: CommissionMode; label: string }[];
  rate_breakdown_consistent: boolean;
};

export type ContractClause = { numero: number; titulo: string; texto: string };
export type ContractWaiver = {
  key: string;
  letra: string;
  titulo: string;
  texto: string;
};

export type ContractDoc = {
  version: string;
  hash: string;
  publishable: boolean;
  pending_placeholders: string[];
  provider: {
    legal_name: string;
    tax_id: string;
    address: string;
    representative: string;
    email: string;
    phone: string;
  };
  waivers: ContractWaiver[];
  clauses: ContractClause[];
};

export type InvitationState =
  | {
      valid: false;
      reason: "not_found" | "revoked" | "used" | "expired";
      detail: string;
      contact_email: string;
      contact_phone: string;
    }
  | {
      valid: true;
      reason: "";
      detail: "";
      prefill: { contact_email: string; contact_name: string; gym_name: string };
      expires_at: string;
    };

export type ProgressSection = {
  key: string;
  label: string;
  filled: number;
  total: number;
  percent: number;
};

export type ProgressState = {
  saved: boolean;
  filled?: number;
  total?: number;
  percent?: number;
  sections?: ProgressSection[];
};

export type ApplicationRow = {
  id: string;
  folio: number;
  status: "received" | "in_review" | "approved" | "rejected";
  gym_name: string;
  gym_municipality: string;
  gym_department: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  estimated_members: number | null;
  commission_mode: CommissionMode;
  enable_online_payments: boolean;
  accepted_at: string | null;
  gym_id: string | null;
  created_at: string;
};

export type ApplicationDetail = ApplicationRow & {
  gym_legal_name: string;
  gym_nit: string;
  organization_name: string;
  branches_count: number | null;
  contact_role: string;
  has_legal_personality: boolean;
  signer_name: string;
  signer_position: string;
  platform_commission_pct: string;
  platform_nucleo_pct: string;
  platform_gateway_pct: string;
  saas_plan: string;
  saas_monthly_price: string;
  settlement_business_hours: number;
  terms_version: string;
  contract_hash: string;
  accepted_waivers: string[];
  accepted_ip: string;
  accepted_user_agent: string;
  review_notes: string;
  reviewed_at: string | null;
  data: Record<string, unknown>;
  documents: {
    field: string;
    label: string;
    present: boolean;
    path: string | null;
  }[];
  waivers: { key: string; letra: string; titulo: string; accepted: boolean }[];
  contract_matches_current: boolean;
};

export type Invitation = {
  id: string;
  token: string;
  url: string;
  state: "active" | "used" | "revoked" | "expired";
  email: string;
  contact_name: string;
  gym_name: string;
  note: string;
  expires_at: string;
  sent_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  opened_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  progress: { percent?: number; sections?: ProgressSection[] } | null;
  progress_percent: number;
  progress_updated_at: string | null;
  application_id: string | null;
  application_folio: number | null;
  created_at: string;
  email_sent?: boolean;
};

export type ProvisionResult = {
  dry_run: boolean;
  gym_id: string | null;
  gym_name: string;
  created: Record<string, number>;
  warnings: string[];
  credentials: { email: string; password: string }[];
};

// --------------------------------------------------------------------------
// El catálogo de pasos. Espeja onboarding_progress.SECCIONES en el mismo orden.
// --------------------------------------------------------------------------
export type Paso = { key: string; label: string; hint: string; campos: string[] };

export const PASOS: Paso[] = [
  {
    key: "organizacion",
    label: "Cadena",
    hint: "Si este box pertenece a una cadena o franquicia.",
    campos: [
      "manages_multiple_gyms",
      "organization_name",
      "organization_legal_name",
      "organization_nit",
    ],
  },
  {
    key: "gimnasio",
    label: "El gimnasio",
    hint: "Cómo se llama, dónde está y a nombre de quién opera.",
    campos: [
      "gym_name",
      "gym_type",
      "gym_legal_name",
      "gym_nit",
      "has_legal_personality",
      "registry_details",
      "gym_address_line",
      "gym_zone",
      "gym_municipality",
      "gym_department",
      "gym_reference_point",
      "estimated_members",
      "active_members",
    ],
  },
  {
    key: "sedes",
    label: "Sedes",
    hint: "Si entrenas en más de un local.",
    campos: ["has_branches", "branches"],
  },
  {
    key: "contacto",
    label: "Contacto",
    hint: "Quién administra y quién más va a entrar al panel.",
    campos: [
      "contact_name",
      "contact_email",
      "contact_phone",
      "contact_role",
      "contact_preferred_channel",
      "legal_representative_name",
      "legal_representative_id",
      "panel_users",
    ],
  },
  {
    key: "planes",
    label: "Planes",
    hint: "Cuánto cobras y cómo manejas la mora.",
    campos: [
      "base_plan_name",
      "base_plan_amount",
      "plan_interval",
      "cutoff_day_of_month",
      "grace_days",
      "dropin_price",
      "extra_services",
      "has_pending_balances",
      "pending_balances_notes",
      "billing_contact_email",
    ],
  },
  {
    key: "disciplinas",
    label: "Disciplinas",
    hint: "Qué se entrena y en qué horarios.",
    campos: ["service_types", "class_capacity", "block_reservations_when_in_arrears"],
  },
  {
    key: "cobro",
    label: "Cobro",
    hint: "Si vas a cobrar con tarjeta y a qué cuenta te depositamos.",
    campos: [
      "enable_online_payments",
      "commission_mode",
      "offline_payment_methods",
      "settlement_bank_name",
      "settlement_account_type",
      "settlement_account_number",
      "settlement_account_holder",
      "settlement_account_holder_id",
      "settlement_notification_email",
      "expected_monthly_collection",
    ],
  },
  {
    key: "operacion",
    label: "Operación",
    hint: "Cómo funciona el box por dentro.",
    campos: [
      "has_coaches",
      "coaches_count",
      "enrolls_minors",
      "checkin_method",
      "no_show_policy",
      "office_phone",
    ],
  },
  {
    key: "arranque",
    label: "Arranque",
    hint: "Desde dónde vienes y para cuándo quieres estar operando.",
    campos: [
      "current_management_tool",
      "data_migration_needed",
      "target_go_live_date",
      "how_did_you_hear",
      "additional_notes",
    ],
  },
  {
    key: "aceptacion",
    label: "Firma",
    hint: "El contrato completo y la aceptación.",
    campos: [
      "signer_name",
      "signer_position",
      "signer_id_document",
      "is_authorized_representative",
      "accepts_terms",
      "accepts_platform_commission",
      "accepts_commission_mode",
      "accepts_settlement_terms",
      "accepts_data_controller_role",
      "accepts_athlete_passport",
      "understands_manual_review",
      "accepts_commercial_communications",
      "accepted_waivers",
      "contract_observations",
    ],
  },
];

/** En qué paso vive un campo. -1 si no es del formulario (p. ej. `detail`). */
export function pasoDelCampo(campo: string): number {
  return PASOS.findIndex((p) => p.campos.includes(campo));
}

/**
 * Aplana los errores de la API a `{campo: mensaje}`.
 *
 * OJO: el `nucleo_exception_handler` de Nucleo NO devuelve `{campo: [...]}` en
 * la raíz como haría DRF a secas, sino `{detail: {campo: [...]}, code, message}`.
 * Leerlo del sitio equivocado deja el formulario sin marcar ni un campo en rojo
 * y a la persona sin saber qué corregir.
 */
export function aplanarErrores(payload: unknown): Record<string, string> {
  const salida: Record<string, string> = {};
  const raiz = payload as { detail?: unknown } | undefined;
  const cuerpo =
    raiz && typeof raiz.detail === "object" && raiz.detail !== null
      ? (raiz.detail as Record<string, unknown>)
      : (payload as Record<string, unknown> | undefined);
  if (!cuerpo || typeof cuerpo !== "object") return salida;

  const texto = (valor: unknown): string | null => {
    if (typeof valor === "string") return valor.trim() || null;
    if (Array.isArray(valor)) {
      // Un repetidor devuelve una entrada POR FILA, y las filas correctas vienen como
      // `{}`. Hay que recorrerlas todas: quedarse con la primera dejaría sin marcar el
      // error de la segunda sede, que es justo el caso que ocurre en la práctica.
      for (const item of valor) {
        const t = texto(item);
        if (t) return t;
      }
      return null;
    }
    if (valor && typeof valor === "object") {
      for (const v of Object.values(valor as Record<string, unknown>)) {
        const t = texto(v);
        if (t) return t;
      }
    }
    return null;
  };

  for (const [campo, valor] of Object.entries(cuerpo)) {
    const mensaje = texto(valor);
    if (mensaje) salida[campo] = mensaje;
  }
  return salida;
}

/** Primer paso que contiene alguno de los campos con error, o null. */
export function pasoDelPrimerError(errores: Record<string, string>): number | null {
  const indices = Object.keys(errores)
    .map(pasoDelCampo)
    .filter((i) => i >= 0);
  return indices.length ? Math.min(...indices) : null;
}

// --------------------------------------------------------------------------
// Llamadas públicas
// --------------------------------------------------------------------------
export async function fetchTerms(): Promise<OnboardingTerms> {
  const { data } = await publicApi.get<OnboardingTerms>("/onboarding/terms");
  return data;
}

export async function fetchContract(): Promise<ContractDoc> {
  const { data } = await publicApi.get<ContractDoc>("/onboarding/contract");
  return data;
}

export async function fetchInvitation(token: string): Promise<InvitationState> {
  const { data } = await publicApi.get<InvitationState>(
    `/onboarding/invitation/${encodeURIComponent(token)}`,
  );
  return data;
}

export async function reportProgress(
  token: string,
  filledFields: string[],
): Promise<ProgressState> {
  const { data } = await publicApi.post<ProgressState>(
    `/onboarding/invitation/${encodeURIComponent(token)}/progress`,
    { filled_fields: filledFields },
  );
  return data;
}

export async function submitGymApplication(
  token: string,
  payload: Record<string, unknown>,
): Promise<{ detail: string; application_id: string; folio: number }> {
  const { data } = await publicApi.post(
    `/onboarding/gym-application?t=${encodeURIComponent(token)}`,
    payload,
  );
  return data;
}

/**
 * Sube UN archivo por petición a propósito.
 *
 * El nginx de producción tiene su propio `client_max_body_size`, y un 413 suyo
 * no trae cuerpo JSON: el formulario no podría explicarle nada a quien lo está
 * llenando. Mandando de a uno, el tope que manda es el del serializer, que sí
 * devuelve un mensaje legible.
 */
export async function uploadApplicationDocument(
  token: string,
  applicationId: string,
  campo: "doc_patente" | "doc_signer_id",
  archivo: File,
): Promise<{ detail: string; saved: string[] }> {
  const cuerpo = new FormData();
  cuerpo.append(campo, archivo);
  const { data } = await publicApi.post(
    `/onboarding/gym-application/${applicationId}/documents?t=${encodeURIComponent(token)}`,
    cuerpo,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// --------------------------------------------------------------------------
// Backoffice (exige superadmin)
// --------------------------------------------------------------------------
type Pagina<T> = { results: T[]; next: string | null; previous: string | null };

export async function listInvitations(state?: string): Promise<Invitation[]> {
  const { data } = await api.get<Pagina<Invitation>>("/platform/onboarding-invitations", {
    params: state ? { state } : undefined,
  });
  return data.results ?? [];
}

export async function createInvitation(cuerpo: {
  email: string;
  contact_name?: string;
  gym_name?: string;
  note?: string;
  days_valid?: number | null;
  send_email?: boolean;
}): Promise<Invitation> {
  const { data } = await api.post<Invitation>("/platform/onboarding-invitations", cuerpo);
  return data;
}

export async function resendInvitation(id: string): Promise<Invitation> {
  const { data } = await api.post<Invitation>(
    `/platform/onboarding-invitations/${id}/resend`,
    {},
  );
  return data;
}

export async function revokeInvitation(id: string): Promise<Invitation> {
  const { data } = await api.post<Invitation>(
    `/platform/onboarding-invitations/${id}/revoke`,
    {},
  );
  return data;
}

export async function listApplications(params?: {
  status?: string;
  q?: string;
}): Promise<ApplicationRow[]> {
  const { data } = await api.get<Pagina<ApplicationRow>>("/platform/gym-applications", {
    params,
  });
  return data.results ?? [];
}

export async function fetchApplication(id: string): Promise<ApplicationDetail> {
  const { data } = await api.get<ApplicationDetail>(`/platform/gym-applications/${id}`);
  return data;
}

export async function updateApplication(
  id: string,
  cuerpo: { status?: string; review_notes?: string; gym_name?: string },
): Promise<ApplicationDetail> {
  const { data } = await api.patch<ApplicationDetail>(
    `/platform/gym-applications/${id}`,
    cuerpo,
  );
  return data;
}

export async function provisionApplication(
  id: string,
  opciones: { dry_run?: boolean; allow_incomplete_dossier?: boolean } = {},
): Promise<ProvisionResult> {
  const { data } = await api.post<ProvisionResult>(
    `/platform/gym-applications/${id}/provision`,
    { dry_run: false, allow_incomplete_dossier: false, ...opciones },
  );
  return data;
}

export async function fetchPipeline(): Promise<{
  applications: Record<string, number>;
  invitations: Record<string, number>;
  stuck: {
    id: string;
    email: string;
    gym_name: string;
    opened_count: number;
    last_opened_at: string | null;
    percent: number;
  }[];
}> {
  const { data } = await api.get("/platform/onboarding/pipeline");
  return data;
}

/**
 * Descarga un documento del expediente como blob.
 *
 * Nunca se sigue una URL absoluta que venga en la respuesta: en producción el
 * storage devuelve una prefirmada de S3, y el interceptor de `api` le mandaría
 * el JWT del superadmin a AWS. Se pide siempre por la ruta protegida.
 */
export async function descargarDocumento(
  applicationId: string,
  campo: string,
  nombreSugerido: string,
): Promise<void> {
  const { data } = await api.get(
    `/onboarding/applications/${applicationId}/documents/${campo}`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreSugerido;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
