/**
 * Traducciones del alta de gimnasios: códigos del backend → español del panel.
 *
 * Sin dependencias a propósito (ni React ni Mantine): así lo puede importar tanto el
 * backoffice como cualquier pantalla pública sin arrastrarse medio bundle detrás.
 *
 * Los códigos espejan `apps/onboarding` (`GymApplicationStatus`, el `estado` de
 * `OnboardingInvitation`, `CommissionMode` y `contract_clauses.HIGHLIGHTED_WAIVERS`).
 * Si allá se agrega uno, aquí aparece crudo: `label()` cae al propio código en vez de
 * mostrar un vacío.
 */

/** Estado de una solicitud (`GymApplicationStatus`). */
export const ESTADO_SOLICITUD: Record<string, string> = {
  received: "Recibida",
  in_review: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const ESTADO_SOLICITUD_COLOR: Record<string, string> = {
  received: "flame",
  in_review: "yellow",
  approved: "teal",
  rejected: "gray",
};

/** Estado de un enlace de invitación (propiedad `estado` del modelo). */
export const ESTADO_ENLACE: Record<string, string> = {
  active: "Activo",
  used: "Usado",
  revoked: "Anulado",
  expired: "Vencido",
};

export const ESTADO_ENLACE_COLOR: Record<string, string> = {
  active: "teal",
  used: "blue",
  revoked: "gray",
  expired: "yellow",
};

/**
 * Modalidad de traslado del costo transaccional. NO es una preferencia de UI: se
 * congela al firmar y decide si al atleta se le suma el recargo o si lo absorbe el gym.
 */
export const MODALIDAD_COMISION: Record<string, string> = {
  passed_on: "Trasladada al atleta",
  absorbed: "Absorbida por el gimnasio",
};

/**
 * Las 12 renuncias destacadas, por su `key`.
 *
 * En el contrato van en versalitas ("LIMITACIÓN DE RESPONSABILIDAD") porque ahí el
 * énfasis es parte del requisito legal de que se destaquen. En una ficha de revisión
 * doce líneas en mayúsculas no se leen, así que aquí van en tono normal; el título
 * literal del articulado sigue viniendo en `waivers[].titulo` de la API.
 */
export const RENUNCIAS: Record<string, string> = {
  limitacion_responsabilidad: "Limitación de responsabilidad",
  danos_indirectos: "Exclusión de daños indirectos",
  plazo_reclamo: "Plazo para reclamar",
  conformidad_liquidaciones: "Conformidad de las liquidaciones",
  suspension_servicio: "Suspensión del servicio",
  riesgo_contracargo: "Riesgo de contracargo a cargo del gimnasio",
  cesion: "Cesión del contrato",
  valor_probatorio: "Valor probatorio de los registros electrónicos",
  riesgo_deportivo: "Riesgo deportivo y ausencia de criterio técnico de Nucleo",
  aptitud_y_menores: "Aptitud física y personas menores de edad",
  pasaporte_del_atleta: "Identidad portátil del atleta",
  responsabilidad_solidaria: "Responsabilidad solidaria del firmante",
};

/**
 * Qué significa cada llave de `ProvisionResult.created`. Sale de `provisioning.py`:
 * lo que el montaje siembra de verdad al aprobar una solicitud.
 */
export const RECURSOS_MONTAJE: Record<string, string> = {
  gym: "Gimnasio",
  subscription: "Suscripción SaaS",
  plan: "Plan base",
  admin_user: "Usuario administrador",
  branches: "Sedes",
  service_types: "Disciplinas",
  class_schedules: "Horarios de clase",
  extra_services: "Servicios extra",
  dropin_products: "Producto drop-in",
  staff_users: "Usuarios del panel",
};

/** Canal preferido de contacto que eligió el gimnasio al firmar. */
export const CANAL_CONTACTO: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Correo",
  phone: "Llamada",
};
