import { describe, expect, it } from "vitest";
import type { GymStatement, Payout } from "../api/types";
import { estadoDeposito } from "./PlatformBillingPanel";

/**
 * Cerrar el mes es generar y marcar depósitos: lo que falta sale en amarillo. Un
 * gym que sólo tuvo devoluciones no espera depósito, así que «Sin generar» no es
 * pendiente para él.
 */
describe("estadoDeposito", () => {
  const g = (net_to_deposit: string, payout: Partial<Payout> | null) =>
    ({ net_to_deposit, payout }) as unknown as Pick<GymStatement, "payout" | "net_to_deposit">;

  it("sin generar y con dinero por depositar es pendiente", () => {
    expect(estadoDeposito(g("1200.00", null))).toEqual({ texto: "Sin generar", color: "yellow", pendiente: true });
  });

  it("sin generar y sin dinero que depositar no es pendiente", () => {
    expect(estadoDeposito(g("0.00", null)).pendiente).toBe(false);
    expect(estadoDeposito(g("-50.00", null)).pendiente).toBe(false);
  });

  it("generado sin transferir es pendiente; depositado ya no", () => {
    expect(estadoDeposito(g("1200.00", { status: "pending" }))).toEqual({
      texto: "Pendiente",
      color: "yellow",
      pendiente: true,
    });
    expect(estadoDeposito(g("1200.00", { status: "executed" }))).toEqual({
      texto: "Depositado",
      color: "teal",
      pendiente: false,
    });
  });
});
