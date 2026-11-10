import { useState } from "react";
import { Alert, Anchor, Button, NumberInput, SegmentedControl, Select, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCreateErpMovement, useInventoryCount } from "../../api/hooks";
import type { ErpProduct } from "../../api/types";
import { errMsg } from "../../lib/errors";

export type ModoAjuste = "entrada" | "merma" | "conteo";

const MODOS: { value: ModoAjuste; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "merma", label: "Merma" },
  { value: "conteo", label: "Conteo" },
];

/**
 * Las tres formas de mover el stock a mano, en un solo lugar: lo abre la ficha de
 * un producto (con el producto puesto) y el botón «Ajustar stock» de Movimientos
 * (eligiendo el producto). El stock nunca se escribe directo: cada modo deja su
 * movimiento en el ledger y el backend recalcula.
 *
 * **Merma y conteo NO son lo mismo y por eso van a endpoints distintos**: la merma
 * es mercadería que se perdió de verdad y el P&L la valoriza como pérdida; el
 * conteo corrige un error de captura y no debe ensuciar esa línea.
 *
 * El conteo manda lo CONTADO, nunca la diferencia: si la restara el panel, una
 * venta ocurrida entre leer el stock y mandar el ajuste quedaría borrada. La resta
 * la hace el backend con el producto bloqueado.
 */
export function AjusteStock({
  gymId,
  productos,
  productoId,
  productoInicial,
  modoInicial = "entrada",
}: {
  gymId: string;
  productos: ErpProduct[];
  /** Con producto fijo (ficha del producto) no se muestra el selector. */
  productoId?: string;
  /** Producto ya elegido en el selector (se puede cambiar). */
  productoInicial?: string;
  modoInicial?: ModoAjuste;
}) {
  const registrar = useCreateErpMovement(gymId);
  const contar = useInventoryCount(gymId);
  const [modo, setModo] = useState<ModoAjuste>(modoInicial);
  const [elegido, setElegido] = useState<string | null>(productoInicial || null);
  const producto = productoId ?? elegido;
  const stockDe = (id: string | null) => (id ? (productos.find((p) => p.id === id)?.stock_qty ?? null) : null);
  const stock = stockDe(producto);

  const [llegaron, setLlegaron] = useState("");
  const [perdidas, setPerdidas] = useState<number | string>(1);
  const [motivo, setMotivo] = useState("");
  const [contado, setContado] = useState<number | string>(() => stockDe(productoId ?? productoInicial ?? null) ?? 0);
  const [nota, setNota] = useState("");
  const [ultimo, setUltimo] = useState<string | null>(null);

  const cambiarModo = (m: ModoAjuste) => {
    setModo(m);
    setUltimo(null);
    // El conteo arranca en lo que dice el sistema: lo normal es corregir uno o dos.
    if (m === "conteo") setContado(stock ?? 0);
  };

  const entrada = async () => {
    if (!producto) return;
    // parseInt aceptaba "3.5" o "3abc" como 3, y un campo vacío no decía nada.
    const texto = llegaron.trim();
    const qty = /^\d+$/.test(texto) ? Number(texto) : NaN;
    if (!Number.isFinite(qty) || qty <= 0) {
      notifications.show({
        color: "yellow",
        message: "Escribe cuántas unidades llegaron: un número entero mayor que cero.",
      });
      return;
    }
    try {
      await registrar.mutateAsync({ product_id: producto, type: "purchase", qty });
      setLlegaron("");
      notifications.show({ color: "teal", message: "Entrada de inventario registrada." });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo registrar la entrada de inventario.") });
    }
  };

  const cantidadPerdida = Number(perdidas) || 0;
  const excede = stock !== null && cantidadPerdida > stock;
  const merma = async () => {
    if (!producto || cantidadPerdida <= 0) return;
    try {
      await registrar.mutateAsync({ product_id: producto, type: "loss", qty: cantidadPerdida, note: motivo.trim() });
      setPerdidas(1);
      setMotivo("");
      notifications.show({ color: "teal", message: "Merma registrada. Salió del stock y se contabiliza como pérdida." });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo registrar la merma.") });
    }
  };

  const contadas = Number(contado);
  const conteoValido = producto !== null && Number.isFinite(contadas) && contadas >= 0;
  // Sólo un ADELANTO: la diferencia real la calcula el backend contra el stock del
  // momento, que puede haber cambiado por una venta.
  const previsto = stock !== null && Number.isFinite(contadas) ? contadas - stock : null;
  const conteo = async () => {
    if (!conteoValido || !producto) return;
    try {
      const r = await contar.mutateAsync({ product_id: producto, counted_qty: contadas, note: nota.trim() });
      setNota("");
      setUltimo(
        r.delta === 0
          ? "Cuadró: no hizo falta asentar nada."
          : `${r.delta > 0 ? `Sobraban ${r.delta}` : `Faltaban ${Math.abs(r.delta)}`}: el sistema decía ${r.previous_qty} y ahora dice ${r.stock_qty}.`,
      );
      notifications.show({
        color: "teal",
        message: r.delta === 0 ? "El conteo cuadró con el sistema." : "Conteo aplicado: el stock quedó igual a lo que contaste.",
      });
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudo aplicar el conteo.") });
    }
  };

  return (
    <Stack gap="sm">
      <SegmentedControl
        fullWidth
        aria-label="Tipo de ajuste"
        data={MODOS}
        value={modo}
        onChange={(v) => cambiarModo(v as ModoAjuste)}
      />
      {!productoId && (
        <Select
          label="Producto"
          placeholder="Elige…"
          value={elegido}
          onChange={(v) => {
            setElegido(v);
            setContado(stockDe(v) ?? 0);
            setUltimo(null);
          }}
          data={productos.map((p) => ({ value: p.id, label: `${p.name} (stock ${p.stock_qty})` }))}
          searchable
        />
      )}

      {modo === "entrada" && (
        <>
          <TextInput
            label="Unidades que llegaron"
            inputMode="numeric"
            value={llegaron}
            onChange={(e) => setLlegaron(e.currentTarget.value)}
          />
          <Button disabled={!producto} loading={registrar.isPending} onClick={entrada}>
            Registrar entrada
          </Button>
        </>
      )}

      {modo === "merma" && (
        <>
          <NumberInput label="Cantidad perdida" value={perdidas} onChange={setPerdidas} min={1} allowDecimal={false} />
          {excede && (
            <Alert color="yellow" variant="light" p="xs">
              <Text size="sm">
                El stock quedará en negativo. Si fue un error de captura,{" "}
                <Anchor component="button" type="button" size="sm" onClick={() => cambiarModo("conteo")}>
                  usa el conteo
                </Anchor>
                .
              </Text>
            </Alert>
          )}
          <TextInput
            label="Motivo"
            placeholder="Se vencieron 3 barras"
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
          />
          <Button
            color="red"
            variant="light"
            disabled={!producto || cantidadPerdida <= 0}
            loading={registrar.isPending}
            onClick={merma}
          >
            Registrar merma
          </Button>
        </>
      )}

      {modo === "conteo" && (
        <>
          <NumberInput
            label="Unidades contadas"
            value={contado}
            onChange={(v) => {
              setContado(v);
              setUltimo(null);
            }}
            min={0}
            allowDecimal={false}
          />
          {previsto !== null && previsto !== 0 && (
            <Text size="sm" c={previsto < 0 ? "var(--nucleo-danger)" : undefined}>
              {previsto < 0 ? `Faltarían ${Math.abs(previsto)} unidades.` : `Sobrarían ${previsto} unidades.`}{" "}
              <Text component="span" size="xs" c="dimmed">
                La cifra final se ajusta al aplicar el conteo.
              </Text>
            </Text>
          )}
          <TextInput
            label="Nota"
            placeholder="Conteo de fin de mes"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
          />
          <Button disabled={!conteoValido} loading={contar.isPending} onClick={conteo}>
            Aplicar conteo
          </Button>
          {ultimo && (
            <Text size="sm" c="dimmed" role="status">
              {ultimo}
            </Text>
          )}
        </>
      )}
    </Stack>
  );
}
