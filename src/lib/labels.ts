// Etiquetas en español para mostrar estados y acciones legibles en el panel.

export const MEMBERSHIP_STATUS: Record<string, string> = {
  requested: "Solicitada",
  invited: "Invitado",
  pending_approval: "Pendiente de aprobación",
  approved_no_plan: "Aprobada sin plan",
  active: "Activa",
  trial: "En prueba",
  paused: "Pausada",
  expired: "Vencida",
  rejected: "Rechazada",
  pending_leave: "Baja pendiente",
  former_member: "Exmiembro",
  blocked: "Bloqueada",
  drop_in: "Drop-in",
};

export const PAYMENT_STATUS: Record<string, string> = {
  up_to_date: "Al día",
  due_soon: "Por vencer",
  overdue: "Vencido",
};

export const PAYMENT_TX_STATUS: Record<string, string> = {
  pending: "Pendiente",
  succeeded: "Exitoso",
  failed: "Fallido",
  refunded: "Reembolsado",
};

export const PAYMENT_METHOD: Record<string, string> = {
  card: "Tarjeta",
  cash: "Efectivo",
  bank_transfer: "Transferencia",
};

export const FEL_STATUS: Record<string, string> = {
  not_required: "No requiere",
  pending: "Pendiente",
  issued: "Emitida",
  failed: "Fallida",
};

export const CLASS_STATUS: Record<string, string> = {
  scheduled: "Programada",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

export const CLUB_STATUS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export const AUDIT_ACTION: Record<string, string> = {
  create: "Creó",
  update: "Actualizó",
  update_photo: "Actualizó la foto",
  membership_transition: "Cambió el estado de una membresía",
  assign_plan: "Asignó plan/cuota",
  admin_password_reset: "Restableció una contraseña",
  password_change: "Cambió su contraseña",
  password_reset: "Restableció su contraseña",
  save_card: "Guardó una tarjeta",
  club_requested: "Solicitó crear un club",
  club_decided: "Resolvió una solicitud de club",
  branch_create: "Creó una sucursal",
  classes_recurring_create: "Creó clases recurrentes",
  "erp.sale": "Registró una venta",
  "erp.product_create": "Creó un producto",
  "erp.product_update": "Actualizó un producto",
  "erp.expense_create": "Registró un gasto",
  "erp.inventory_movement": "Movió inventario",
  refund: "Registró un reembolso",
  manual_payment: "Registró un pago manual",
  export: "Exportó la bitácora",
};

export const AUDIT_ENTITY: Record<string, string> = {
  membership: "membresía",
  Membership: "membresía",
  payment: "pago",
  Payment: "pago",
  user: "usuario",
  athlete: "atleta",
  Club: "club",
  GymBranch: "sucursal",
  GymClass: "clase",
  Product: "producto",
  Sale: "venta",
  Expense: "gasto",
  SavedCard: "tarjeta",
  gym: "gimnasio",
  audit_log: "bitácora",
};

export const AUDIT_ROLE: Record<string, string> = {
  gym_admin: "Admin de gym",
  coach: "Coach",
  trainer: "Personal trainer",
  club_admin: "Admin de club",
  superadmin: "Superadmin",
};

export function label(map: Record<string, string>, value?: string | null): string {
  if (!value) return "—";
  return map[value] ?? value;
}
