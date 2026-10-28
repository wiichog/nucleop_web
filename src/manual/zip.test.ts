import { describe, expect, it } from "vitest";

import { armarZip, crc32 } from "./zip";

describe("zip", () => {
  it("crc32 da el valor de referencia", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("cada archivo queda tal cual y el directorio central los encuentra", () => {
    const a = new TextEncoder().encode("<svg/>");
    const b = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255]);
    const zip = armarZip([
      { nombre: "nucleo-logos/a.svg", datos: a },
      { nombre: "nucleo-logos/b.png", datos: b },
    ]);
    const v = new DataView(zip.buffer);
    const fin = zip.length - 22;
    expect(v.getUint32(fin, true)).toBe(0x06054b50);
    expect(v.getUint16(fin + 10, true)).toBe(2);

    let central = v.getUint32(fin + 16, true);
    const leidos: Array<[string, number[]]> = [];
    for (let i = 0; i < 2; i++) {
      expect(v.getUint32(central, true)).toBe(0x02014b50);
      const largo = v.getUint32(central + 24, true);
      const nLen = v.getUint16(central + 28, true);
      const local = v.getUint32(central + 42, true);
      const nombre = new TextDecoder().decode(zip.subarray(central + 46, central + 46 + nLen));
      const inicio = local + 30 + v.getUint16(local + 26, true);
      leidos.push([nombre, Array.from(zip.subarray(inicio, inicio + largo))]);
      central += 46 + nLen;
    }
    expect(leidos).toEqual([
      ["nucleo-logos/a.svg", Array.from(a)],
      ["nucleo-logos/b.png", Array.from(b)],
    ]);
  });
});
