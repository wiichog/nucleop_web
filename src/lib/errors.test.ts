import { describe, expect, it } from "vitest";
import { errMsg } from "./errors";

describe("errMsg (contrato { detail, code, message })", () => {
  it("prefiere `detail` (mensaje amable del backend)", () => {
    const error = { response: { data: { detail: "Tarjeta rechazada por el banco.", code: "card_declined" } } };
    expect(errMsg(error)).toBe("Tarjeta rechazada por el banco.");
  });

  it("cae a `message` cuando no hay detail", () => {
    expect(errMsg({ response: { data: { message: "Fondos insuficientes." } } })).toBe(
      "Fondos insuficientes.",
    );
  });

  it("lee el primer error de validación de DRF", () => {
    expect(errMsg({ response: { data: { amount: ["Monto inválido."] } } })).toBe("Monto inválido.");
  });

  it("usa el texto por defecto si la respuesta no trae nada legible", () => {
    expect(errMsg(new Error("network"), "No se pudo registrar el pago.")).toBe(
      "No se pudo registrar el pago.",
    );
    expect(errMsg({ response: { data: "<html>502</html>" } }, "por defecto")).toBe("por defecto");
  });
});
