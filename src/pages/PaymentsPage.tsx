import { FormEvent, useState } from "react";
import {
  useGymPayments,
  useMemberships,
  useRefundPayment,
  useRegisterManualPayment,
} from "../api/hooks";
import type { Payment } from "../api/types";
import { useAuth } from "../lib/auth";
import { downloadCsv } from "../lib/csv";

export function PaymentsPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const payments = useGymPayments(gymId);
  const memberships = useMemberships(gymId);
  const registerManual = useRegisterManualPayment(gymId);
  const refundPayment = useRefundPayment(gymId);

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

  const onRefund = async (payment: Payment) => {
    const amount = window.prompt("Monto a reembolsar", payment.amount);
    if (!amount || !window.confirm(`Registrar reembolso administrativo por Q${amount}?`)) return;
    await refundPayment.mutateAsync({ paymentId: payment.id, amount });
  };

  if (!gymId) return <p>No tienes un gimnasio asignado.</p>;

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
                {m.athlete_name} ({m.status})
              </option>
            ))}
          </select>
          {method === "bank_transfer" && (
            <>
              <label>Comprobante</label>
              <input
                className="nucleo-input"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setProofFile(event.target.files?.[0])}
                style={{ marginBottom: 16 }}
              />
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
          <button
            className="nucleo-btn"
            style={{ width: "100%" }}
            disabled={!membershipId || !amount || registerManual.isPending}
          >
            Registrar pago
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
                  ["fecha", "monto", "metodo", "estado", "fel", "comision"],
                  (payments.data ?? []).map((payment) => [
                    payment.created_at,
                    payment.amount,
                    payment.method,
                    payment.status,
                    payment.fel_status,
                    payment.platform_commission,
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
                <th>Monto</th>
                <th>Método</th>
                <th>Estado</th>
                <th>FEL</th>
                <th>Comisión</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(payments.data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>Q{p.amount}</td>
                  <td>{p.method}</td>
                  <td>{p.status}</td>
                  <td>{p.fel_status}</td>
                  <td>Q{p.platform_commission}</td>
                  <td>
                    {p.status === "succeeded" && !p.refund_of && (
                      <button className="link-btn" onClick={() => onRefund(p)}>
                        Reembolsar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
