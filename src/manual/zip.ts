/**
 * ZIP mínimo, sin comprimir (método STORE), para bajar los logos del manual en un
 * solo archivo. No es un `.zip` estático en public/ porque la regla de Amplify
 * reescribe esa extensión al index.html (ver docs/AMPLIFY.md); se arma aquí con
 * los archivos que sí se sirven. Sin comprimir basta: PNG ya viene comprimido y
 * los SVG pesan unos KB.
 */
export type ArchivoZip = { nombre: string; datos: Uint8Array };

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en formato MS-DOS, el que guarda el ZIP (resolución de 2 s). */
function fechaDos(d: Date): { hora: number; fecha: number } {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function armarZip(archivos: ArchivoZip[], ahora = new Date()): Uint8Array<ArrayBuffer> {
  const texto = new TextEncoder();
  const { hora, fecha } = fechaDos(ahora);
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const { nombre, datos } of archivos) {
    const n = texto.encode(nombre);
    const crc = crc32(datos);

    const local = new Uint8Array(30 + n.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0x0800, true); // nombre en UTF-8
    l.setUint16(8, 0, true); // STORE
    l.setUint16(10, hora, true);
    l.setUint16(12, fecha, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, datos.length, true);
    l.setUint32(22, datos.length, true);
    l.setUint16(26, n.length, true);
    l.setUint16(28, 0, true);
    local.set(n, 30);
    locales.push(local, datos);

    const central = new Uint8Array(46 + n.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, fecha, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, datos.length, true);
    c.setUint32(24, datos.length, true);
    c.setUint16(28, n.length, true);
    // 30..45: extra, comentario, disco y atributos en cero.
    c.setUint32(42, desplazamiento, true);
    central.set(n, 46);
    centrales.push(central);

    desplazamiento += local.length + datos.length;
  }

  const tamCentral = centrales.reduce((s, b) => s + b.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, archivos.length, true);
  f.setUint16(10, archivos.length, true);
  f.setUint32(12, tamCentral, true);
  f.setUint32(16, desplazamiento, true);

  const partes = [...locales, ...centrales, fin];
  const salida = new Uint8Array(partes.reduce((s, b) => s + b.length, 0));
  let i = 0;
  for (const p of partes) {
    salida.set(p, i);
    i += p.length;
  }
  return salida;
}
