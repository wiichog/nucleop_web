import { describe, expect, it, vi } from "vitest";
import { downloadCsv } from "./csv";

describe("downloadCsv", () => {
  it("crea un enlace de descarga con BOM UTF-8", () => {
    const click = vi.fn();
    const revoke = vi.fn();
    const anchor = { click, download: "", href: "" } as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:test"),
        revokeObjectURL: revoke,
      }),
    );

    downloadCsv("test.csv", ["a", "b"], [["1", "2"]]);

    expect(anchor.download).toBe("test.csv");
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
});
