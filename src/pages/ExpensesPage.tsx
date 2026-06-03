import { FormEvent, useState } from "react";
import { useCreateErpExpense, useErpExpenses } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

const CATEGORIES = [
  { value: "rent", label: "Renta" },
  { value: "utilities", label: "Servicios" },
  { value: "equipment", label: "Equipo" },
  { value: "marketing", label: "Marketing" },
  { value: "payroll", label: "Nómina" },
  { value: "inventory", label: "Compra de inventario" },
  { value: "other", label: "Otro" },
];

export function ExpensesPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useErpExpenses(gymId);
  const createExpense = useCreateErpExpense(gymId);

  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createExpense.mutateAsync({ category, amount, description, incurred_on: date });
    setAmount("");
    setDescription("");
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Gastos</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Registrar gasto</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select className="nucleo-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input className="nucleo-input" placeholder="Monto (Q)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="nucleo-input" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="nucleo-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="nucleo-btn" disabled={!amount || createExpense.isPending}>
            Registrar
          </button>
        </div>
      </form>

      <div className="nucleo-card">
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState title="Sin gastos" description="Registra los costos del gym para ver tu utilidad real." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{e.incurred_on}</td>
                  <td>{e.category}</td>
                  <td>{e.description || "—"}</td>
                  <td>Q{e.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
