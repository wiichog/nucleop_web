import { fireEvent, render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "./PhoneInput";

// jsdom no implementa ResizeObserver (el Select de Mantine usa ScrollArea).
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom no implementa matchMedia y MantineProvider lo usa.
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

function setup(value: string) {
  const onChange = vi.fn();
  const { container } = render(
    <MantineProvider>
      <PhoneInput value={value} onChange={onChange} />
    </MantineProvider>,
  );
  const num = container.querySelector('input[inputmode="tel"]') as HTMLInputElement;
  return { num, onChange };
}

describe("PhoneInput", () => {
  it("separa un E.164 existente en su número nacional", () => {
    expect(setup("+50255887744").num.value).toBe("55887744");
  });

  it("emite E.164 con +502 por defecto al escribir", () => {
    const { num, onChange } = setup("");
    fireEvent.change(num, { target: { value: "5588 7744" } });
    expect(onChange).toHaveBeenCalledWith("+50255887744");
  });

  it("emite cadena vacía al borrar el número", () => {
    const { num, onChange } = setup("+50255887744");
    fireEvent.change(num, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });
});
