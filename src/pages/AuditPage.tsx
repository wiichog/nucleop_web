import { useAuditLogs, useExportAudit } from "../api/hooks";
import { useAuth } from "../lib/auth";
import { AUDIT_ACTION, AUDIT_ENTITY, AUDIT_ROLE, label } from "../lib/labels";

function describe(log: { action: string; entity: string }): string {
  const accion = AUDIT_ACTION[log.action] ?? log.action;
  const entidad = AUDIT_ENTITY[log.entity] ?? log.entity;
  const selfContained = [
    "membership_transition",
    "password_change",
    "password_reset",
    "club_requested",
    "club_decided",
    "branch_create",
    "classes_recurring_create",
    "erp.sale",
    "erp.product_create",
    "erp.product_update",
    "erp.expense_create",
    "manual_payment",
    "refund",
    "export",
  ];
  if (selfContained.includes(log.action)) return accion;
  return `${accion} · ${entidad}`;
}

export function AuditPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const logs = useAuditLogs(gymId);
  const exportAudit = useExportAudit(gymId);

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1>Actividad del gimnasio</h1>
          <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
            Quién hizo qué y cuándo, dentro de este gimnasio.
          </p>
        </div>
        <button
          className="nucleo-btn"
          style={{ alignSelf: "center" }}
          disabled={exportAudit.isPending}
          onClick={() => exportAudit.mutate()}
        >
          Exportar CSV
        </button>
      </div>
      <section className="nucleo-card">
        {(logs.data ?? []).length === 0 ? (
          <p>Sin actividad registrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Quién</th>
                <th>Qué hizo</th>
              </tr>
            </thead>
            <tbody>
              {(logs.data ?? []).map((log) => {
                const extra = log as unknown as { descripcion?: string; actor_rol?: string };
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString("es-GT")}</td>
                    <td>
                      {extra.actor_rol ?? (log.actor_role
                        ? label(AUDIT_ROLE, log.actor_role)
                        : "Sistema/atleta")}
                    </td>
                    <td>{extra.descripcion ?? describe(log)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
