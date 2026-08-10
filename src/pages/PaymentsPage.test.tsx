// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import type { Payment } from "../api/types";
import { CeldaFactura, EstadoDePago } from "./PaymentsPage";

/**
 * La celda de factura del historial de pagos. Se prueba lo único cuyo fallo es
 * caro de verdad: que los datos con los que se concilia ante la SAT (serie,
 * número y referencia) estén A LA VISTA con su documento, y que una factura
 * fallida se pueda reintentar desde el panel — antes eso solo existía en el
 * Django admin, que el staff del gimnasio no tiene.
 *
 * Se prueba la celda suelta y no la página: `mantine-datatable` no pinta las
 * celdas bajo jsdom (renderiza `<tr>` vacíos), así que a través de la tabla no
 * se puede afirmar nada.
 */

// jsdom no implementa matchMedia y MantineProvider lo usa para el color scheme.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function pago(over: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    athlete: "at-1",
    athlete_name: "Ana López",
    gym: "gym-1",
    concept: "membership",
    amount: "350.00",
    method: "card",
    status: "succeeded",
    gateway: "pagalo",
    fel_status: "issued",
    fel_reference: "SAT-REF-9911",
    fel_document_url: "https://facturas.example/p1.pdf",
    fel_serie: "A",
    fel_number: "1234",
    fel_message: "",
    can_retry_fel: false,
    created_at: "2026-08-01T15:00:00Z",
    ...over,
  } as Payment;
}

function pintar(payment: Payment, onRetry = vi.fn()) {
  render(
    <MantineProvider>
      <CeldaFactura payment={payment} onRetry={onRetry} retrying={false} />
    </MantineProvider>,
  );
  return onRetry;
}

describe("PaymentsPage · celda de factura (FEL)", () => {
  it("una emitida muestra serie-número enlazado al documento y su referencia", () => {
    pintar(pago());

    const enlace = screen.getByRole("link", { name: /A-1234/ });
    expect(enlace.getAttribute("href")).toBe("https://facturas.example/p1.pdf");
    expect(screen.getByText(/SAT-REF-9911/)).toBeTruthy();
    // Sin nada que reintentar, el botón no aparece.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("una fallida dice POR QUÉ falló y ofrece reintentar la emisión", () => {
    const onRetry = pintar(
      pago({
        fel_status: "failed",
        fel_serie: "",
        fel_number: "",
        fel_reference: "",
        fel_document_url: "",
        fel_message: "NIT del receptor inválido",
        can_retry_fel: true,
      }),
    );

    expect(screen.getByText("NIT del receptor inválido")).toBeTruthy();
    // El estado sigue legible cuando todavía no hay folio.
    expect(screen.getByText("Fallida")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar factura/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("una emitida sin documento ofrece recuperarlo, no volver a certificar", () => {
    pintar(pago({ fel_document_url: "", can_retry_fel: true }));

    expect(screen.getByRole("button", { name: /Recuperar documento/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Reintentar factura/ })).toBeNull();
    // El folio sigue legible aunque no haya enlace al PDF.
    expect(screen.getByText("A-1234")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("una pendiente se EMITE (nunca llegó a la SAT), no se 'reintenta'", () => {
    pintar(
      pago({
        fel_status: "pending",
        fel_serie: "",
        fel_number: "",
        fel_reference: "",
        fel_document_url: "",
        can_retry_fel: true,
      }),
    );

    expect(screen.getByRole("button", { name: /Emitir factura/ })).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });
});

/**
 * Contracargo vs. reembolso. Los dos llegan como un `Payment` NEGATIVO en estado
 * `refunded`, así que sin `is_chargeback` el panel le decía "Reembolsado" al gym
 * sobre plata que él nunca devolvió: se la quitó el banco del atleta. Para el
 * gimnasio no son lo mismo — uno lo decidió él y el otro se lo impusieron y
 * todavía puede pelearlo con evidencia dentro de una ventana.
 */
describe("PaymentsPage · un contracargo no se pinta como reembolso", () => {
  it("la fila de una disputa dice Contracargo, nunca Reembolsado", () => {
    render(
      <MantineProvider>
        <EstadoDePago payment={pago({ status: "refunded", is_chargeback: true })} />
      </MantineProvider>,
    );

    expect(screen.getByText("Contracargo")).toBeTruthy();
    expect(screen.queryByText("Reembolsado")).toBeNull();
  });

  it("un reembolso de verdad (el gym lo decidió) sigue diciendo Reembolsado", () => {
    render(
      <MantineProvider>
        <EstadoDePago payment={pago({ status: "refunded", is_chargeback: false })} />
      </MantineProvider>,
    );

    expect(screen.getByText("Reembolsado")).toBeTruthy();
    expect(screen.queryByText("Contracargo")).toBeNull();
  });

  it("un cobro normal no se confunde con ninguno de los dos", () => {
    render(
      <MantineProvider>
        <EstadoDePago payment={pago()} />
      </MantineProvider>,
    );

    expect(screen.getByText("Exitoso")).toBeTruthy();
    expect(screen.queryByText("Contracargo")).toBeNull();
  });
});
