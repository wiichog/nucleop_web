import { FormEvent, useState } from "react";
import { useGymPayments, useMemberships, useRegisterManualPayment } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageError } from "../components/PageStatus";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";
import {
  FEL_STATUS,
  MEMBERSHIP_STATUS,
  PAYMENT_METHOD,
  PAYMENT_TX_STATUS,
  label,
} from "../lib/labels";

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const payments = useGymPayments(gymId);
  const memberships = useMemberships(gymId);
  const registerManual = useRegisterManualPayment(gymId);

  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [proofFile, setProofFile] = useState<File>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await registerManual.mutateAsync({
      membership_id: membershipId,
      amount,
      method,
      proof_file: proofFile,
    });
    setAmount("");
    setProofFile(undefined);
  };

  if (!gymId) return <NoGymAssigned />;
  if (payments.isError) {
    return <PageError onRetry={() => payments.refetch()} />;
  }

  return (
    <div>
      <h1>Pagos</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <form className="nucleo-card" style={{ width: 320 }} onSubmit={onSubmit}>
          <h2 style={{ marginTop: 0 }}>Registrar pago manual</h2>
          <p style={{ color: "var(--nucleo-muted)", fontSize: 13 }}>
            Efectivo o transferencia. No genera comisión, pero activa la membresía.
          </p>
          <label>Membresía</label>
          <select
            className="nucleo-input"
            value={membershipId}
            onChange={(e) => setMembershipId(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            <option value="">Selecciona…</option>
            {(memberships.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.athlete_name} ({label(MEMBERSHIP_STATUS, m.status)})
              </option>
            ))}
          </select>
          {method === "bank_transfer" && (
            <>
              <label>Comprobante</label>
              <div className="nucleo-file" style={{ marginBottom: 16 }}>
                <label className="nucleo-file__btn">
                  <span>📎</span>
                  {proofFile ? "Cambiar archivo" : "Adjuntar comprobante"}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setProofFile(event.target.files?.[0])}
                  />
                </label>
                {proofFile && (
                  <>
                    <span className="nucleo-file__name">{proofFile.name}</span>
                    <button
                      type="button"
                      className="nucleo-file__clear"
                      onClick={() => setProofFile(undefined)}
                    >
                      Quitar
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          <label>Monto (Q)</label>
          <input
            className="nucleo-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <label>Método</label>
          <select
            className="nucleo-input"
            value={method}
            onChange={(e) => setMethod(e.target.value as "cash" | "bank_transfer")}
            style={{ marginBottom: 16 }}
          >
            <option value="cash">Efectivo</option>
            <option value="bank_transfer">Transferencia</option>
          </select>
          {registerManual.isError && (
            <p style={{ color: "var(--nucleo-danger)", fontSize: 13, marginBottom: 12 }}>
              No se pudo registrar el pago. Verifica los datos.
            </p>
          )}
          <button
            className="nucleo-btn"
            style={{ width: "100%" }}
            disabled={!membershipId || !amount || registerManual.isPending}
          >
            {registerManual.isPending ? "Registrando…" : "Registrar pago"}
          </button>
        </form>

        <section className="nucleo-card" style={{ flex: 1, minWidth: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <h2 style={{ marginTop: 0 }}>Historial</h2>
            <button
              className="nucleo-btn nucleo-btn--secondary"
              style={{ alignSelf: "center" }}
              onClick={() =>
                downloadCsv(
                  "pagos-nucleo.csv",
                  ["fecha", "concepto", "monto", "método", "estado", "factura"],
                  (payments.data ?? []).map((payment) => [
                    new Date(payment.created_at).toLocaleString("es-GT"),
                    payment.concept,
                    payment.amount,
                    label(PAYMENT_METHOD, payment.method),
                    label(PAYMENT_TX_STATUS, payment.status),
                    label(FEL_STATUS, payment.fel_status),
                  ]),
                )
              }
            >
              Exportar CSV
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Factura (FEL)</th>
              </tr>
            </thead>
            <tbody>
              {!payments.data?.length && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Sin pagos registrados"
                      description="Los pagos con tarjeta y manuales aparecerán aquí."
                    />
                  </td>
                </tr>
              )}
              {(payments.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("es-GT")}</td>
                  <td>{p.concept}</td>
                  <td>Q{p.amount}</td>
                  <td>{label(PAYMENT_METHOD, p.method)}</td>
                  <td>{label(PAYMENT_TX_STATUS, p.status)}</td>
                  <td>{label(FEL_STATUS, p.fel_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
