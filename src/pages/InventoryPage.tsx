import { FormEvent, useState } from "react";
import {
  useCreateErpMovement,
  useCreateErpProduct,
  useErpProducts,
} from "../api/hooks";
import { EmptyState } from "../components/EmptyState";
import { NoGymAssigned, PageLoading } from "../components/PageStatus";
import { useAuth } from "../lib/auth";

const CATEGORIES = [
  { value: "supplement", label: "Suplemento" },
  { value: "merch", label: "Merch" },
  { value: "drink", label: "Bebida" },
  { value: "gear", label: "Equipamiento" },
  { value: "service", label: "Servicio" },
  { value: "other", label: "Otro" },
];

export function InventoryPage() {
  const { primaryGymId } = useAuth();
  const gymId = primaryGymId ?? "";
  const { data, isLoading } = useErpProducts(gymId);
  const createProduct = useCreateErpProduct(gymId);
  const createMovement = useCreateErpMovement(gymId);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("supplement");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorder, setReorder] = useState("0");
  const [restock, setRestock] = useState<Record<string, string>>({});

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    await createProduct.mutateAsync({
      name,
      category,
      sale_price: salePrice,
      cost_price: costPrice || "0",
      reorder_level: parseInt(reorder, 10) || 0,
    });
    setName("");
    setSalePrice("");
    setCostPrice("");
    setReorder("0");
  };

  const onRestock = async (productId: string) => {
    const qty = parseInt(restock[productId] ?? "", 10);
    if (!Number.isFinite(qty) || qty <= 0) return;
    await createMovement.mutateAsync({ product_id: productId, type: "purchase", qty });
    setRestock((prev) => ({ ...prev, [productId]: "" }));
  };

  if (!gymId) return <NoGymAssigned />;

  return (
    <div>
      <h1>Inventario</h1>
      <form className="nucleo-card" style={{ marginBottom: 16 }} onSubmit={onCreate}>
        <h2 style={{ marginTop: 0 }}>Nuevo producto</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input className="nucleo-input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="nucleo-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input className="nucleo-input" placeholder="Precio venta (Q)" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          <input className="nucleo-input" placeholder="Costo (Q)" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          <input className="nucleo-input" placeholder="Reorden" style={{ width: 90 }} value={reorder} onChange={(e) => setReorder(e.target.value)} />
          <button className="nucleo-btn" disabled={!name || !salePrice || createProduct.isPending}>
            Agregar
          </button>
        </div>
      </form>

      <div className="nucleo-card">
        {isLoading ? (
          <PageLoading />
        ) : !(data ?? []).length ? (
          <EmptyState
            title="Sin productos"
            description="Agrega tu primer producto (suplemento, merch o bebida) para vender en recepción."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Costo</th>
                <th>Margen</th>
                <th>Stock</th>
                <th>Reabastecer</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>Q{p.sale_price}</td>
                  <td>Q{p.cost_price}</td>
                  <td>Q{p.margin_unit}</td>
                  <td style={{ color: p.needs_reorder ? "var(--nucleo-danger)" : undefined }}>
                    {p.stock_qty}
                    {p.needs_reorder ? " ⚠" : ""}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <input
                      className="nucleo-input"
                      style={{ width: 70 }}
                      placeholder="Qty"
                      value={restock[p.id] ?? ""}
                      onChange={(e) => setRestock((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="nucleo-btn nucleo-btn--secondary"
                      onClick={() => onRestock(p.id)}
                      disabled={createMovement.isPending}
                    >
                      Entrada
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
