import { useMemo, useState } from "react";
import { useBranches, useCreateErpSale, useErpProducts, useErpSales } from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

interface CartLine {
  product_id: string;
  name: string;
  qty: number;
  unit_price: string;
}

export function PosPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data: products, isLoading } = useErpProducts(gymId);
  const { data: sales } = useErpSales(gymId);
  const { data: branches } = useBranches(gymId);
  const createSale = useCreateErpSale(gymId);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [athleteId, setAthleteId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [error, setError] = useState("");

  const total = useMemo(
    () => cart.reduce((acc, l) => acc + Number(l.unit_price) * l.qty, 0),
    [cart],
  );

  const addLine = () => {
    const product = (products ?? []).find((p) => p.id === productId);
    const q = parseInt(qty, 10);
    if (!product || !Number.isFinite(q) || q <= 0) return;
    setCart((prev) => [
      ...prev,
      { product_id: product.id, name: product.name, qty: q, unit_price: product.sale_price },
    ]);
    setProductId("");
    setQty("1");
  };

  const submit = async () => {
    setError("");
    try {
      await createSale.mutateAsync({
        athlete_id: athleteId.trim() || null,
        branch_id: branchId || null,
        method,
        lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      });
      setCart([]);
      setAthleteId("");
    } catch (e: unknown) {
      const detail =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { detail?: string; qty?: string } } }).response?.data
          : undefined;
      setError(detail?.detail ?? detail?.qty ?? "No se pudo registrar la venta.");
    }
  };

  if (!gymId) return <NoGymAssigned />;
  if (isLoading) return <PageLoading />;

  return (
    <div>
      <h1>Punto de venta (recepción)</h1>
      <div className="nucleo-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Nueva venta</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <select className="nucleo-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Selecciona producto…</option>
            {(products ?? [])
              .filter((p) => p.is_active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Q{p.sale_price} (stock {p.stock_qty})
                </option>
              ))}
          </select>
          <input className="nucleo-input" style={{ width: 80 }} value={qty} onChange={(e) => setQty(e.target.value)} />
          <button type="button" className="nucleo-btn nucleo-btn--secondary" onClick={addLine} disabled={!productId}>
            Añadir
          </button>
        </div>

        {cart.length === 0 ? (
          <EmptyState title="Carrito vacío" description="Añade productos para registrar la venta." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.map((l, i) => (
                <tr key={`${l.product_id}-${i}`}>
                  <td>{l.name}</td>
                  <td>{l.qty}</td>
                  <td>Q{l.unit_price}</td>
                  <td>Q{(Number(l.unit_price) * l.qty).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      className="nucleo-btn nucleo-btn--secondary"
                      onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <input
            className="nucleo-input"
            placeholder="ID de atleta (opcional)"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            title="Vincula la venta a un atleta para emitir su pago. Déjalo vacío para venta anónima."
          />
          {(branches ?? []).length > 0 && (
            <select className="nucleo-input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Sin sede</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select className="nucleo-input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="bank_transfer">Transferencia</option>
          </select>
          <strong style={{ marginLeft: "auto" }}>Total: Q{total.toFixed(2)}</strong>
          <button className="nucleo-btn" onClick={submit} disabled={cart.length === 0 || createSale.isPending}>
            Registrar venta
          </button>
        </div>
        {error && <p style={{ color: "var(--nucleo-danger)", marginTop: 8 }}>{error}</p>}
      </div>

      <div className="nucleo-card">
        <h2 style={{ marginTop: 0 }}>Ventas recientes</h2>
        {!(sales ?? []).length ? (
          <EmptyState title="Aún no hay ventas" description="Las ventas POS aparecerán aquí." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {(sales ?? []).map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.created_at).toLocaleString("es-GT")}</td>
                  <td>{s.lines.map((l) => `${l.product_name} ×${l.qty}`).join(", ")}</td>
                  <td>Q{s.total}</td>
                  <td>Q{s.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
