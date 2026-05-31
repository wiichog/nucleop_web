import { useAuditLogs, useExportAudit } from "../api/hooks";
import { useAuth } from "../lib/auth";

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
          <h1>Auditoría</h1>
          <p style={{ color: "var(--nucleo-muted)", marginTop: -8 }}>
            Bitácora de acciones sensibles dentro del gimnasio actual.
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
          <p>Sin eventos registrados.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Rol</th></tr>
            </thead>
            <tbody>
              {(logs.data ?? []).map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString("es-GT")}</td>
                  <td>{log.action}</td>
                  <td>{log.entity}</td>
                  <td>{log.entity_id || "—"}</td>
                  <td>{log.actor_role || "sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
