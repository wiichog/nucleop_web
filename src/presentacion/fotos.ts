/** Fotos de la presentación comercial (`/presentacion`).
 *
 * Todas son de Unsplash con su licencia libre: se verificó en su API, una por
 * una, que `premium` y `plus` son false (ninguna es de Unsplash+). Se sirven
 * desde su CDN con el tamaño que pide cada pantalla y en blanco y negro
 * (`sat=-100`, lo hace el propio CDN): la marca es negro y blanco con el naranja
 * solo como acento sólido.
 *
 * Revisadas a tamaño completo: sin logos, marcas ni letreros legibles. Se
 * descartaron por eso hCdFM3lELyA (logo de una cadena de gimnasios en la
 * camiseta), qZ-U9z4TQ6A y Lx_GDv7VA9M (logos en el short), Yuv-iwByVRQ,
 * Ca8FQMjEJ3g y 8LWo8v0mKik (discos y cajones con marca), JjdGVeUzb78 (botella
 * de hotel y frase en la pared) y una de la cuenta de una franquicia.
 * Si cambias una, verifica que no sea de Unsplash+ y mira también el recorte del
 * teléfono, que enseña otra parte de la foto.
 */
export type Foto = {
  /** Id de la foto en unsplash.com/photos/<id>. */
  id: string;
  /** Base de images.unsplash.com, sin parámetros. */
  base: string;
  autor: string;
};

export const FOTOS = {
  grupo: {
    id: "VB5i6ZmXUoI",
    base: "https://images.unsplash.com/photo-1563953715689-335fe4271a1e",
    autor: "Marvin Meyer",
  },
  vacio: {
    id: "fNnOt7ZDj_Y",
    base: "https://images.unsplash.com/photo-1681474172645-3931276cf5c3",
    autor: "Kirill Bogomolov",
  },
  coach: {
    id: "ihxOnF1T2CY",
    base: "https://images.unsplash.com/photo-1758875569286-109f63a93a8f",
    autor: "Vitaly Gariev",
  },
  clase: {
    id: "buWcS7G1_28",
    base: "https://images.unsplash.com/photo-1534258936925-c58bed479fcb",
    autor: "Meghan Holmes",
  },
  tableta: {
    id: "5p8vhHUEEgY",
    base: "https://images.unsplash.com/photo-1758875570137-8691b7c55033",
    autor: "Vitaly Gariev",
  },
  argollas: {
    id: "uH8JDWuxFX8",
    base: "https://images.unsplash.com/photo-1584970496149-097946651c57",
    autor: "Julien Dumas",
  },
} satisfies Record<string, Foto>;

const ANCHOS = [960, 1600, 2400];

export function fotoSrc(foto: Foto, ancho = 1600): string {
  return `${foto.base}?auto=format&fit=crop&w=${ancho}&q=70&sat=-100`;
}

export function fotoSrcSet(foto: Foto): string {
  return ANCHOS.map((ancho) => `${fotoSrc(foto, ancho)} ${ancho}w`).join(", ");
}

/** La vista previa del enlace (WhatsApp, redes): 1200×630. */
export const FOTO_OG = `${FOTOS.grupo.base}?auto=format&fit=crop&w=1200&h=630&q=70&sat=-100`;

/** Autores, sin repetir, para el crédito de la última lámina. */
export const AUTORES = Array.from(new Set(Object.values(FOTOS).map((foto) => foto.autor)));
