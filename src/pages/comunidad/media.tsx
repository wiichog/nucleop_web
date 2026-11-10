import { Group } from "@mantine/core";
import type { FeedMedia } from "../../api/types";

/**
 * Marco del material para fotos y videos: hairline y radio del sistema, sin
 * fondo propio. En esta pantalla el contenido es la imagen; el borde la
 * enmarca, no compite con ella.
 */
export const MEDIA_FRAME = {
  borderRadius: "calc(14 * var(--u))",
  border: "1px solid var(--a-line)",
  display: "block",
} as const;

/** Miniatura cuadrada (atleta del mes, avatares, anuncios). */
export function thumb(size: number, round = false) {
  return {
    width: size,
    height: size,
    flex: "0 0 auto",
    objectFit: "cover" as const,
    borderRadius: round ? "50%" : "calc(12 * var(--u))",
    border: "1px solid var(--a-line)",
    display: "block",
  };
}

/**
 * Fotos y videos de una publicación. `width` + `maxWidth: 100%`: en el celular
 * se encogen con la tarjeta en vez de desbordarla.
 */
export function Medios({ media, ancho = 280 }: { media: FeedMedia[]; ancho?: number }) {
  if (!media.length) return null;
  return (
    <Group gap="xs" mt={8}>
      {media.map((m, i) =>
        m.kind === "video" ? (
          <video key={i} src={m.url} controls style={{ ...MEDIA_FRAME, width: ancho, maxWidth: "100%" }} />
        ) : (
          <img key={i} src={m.url} alt="" style={{ ...MEDIA_FRAME, width: ancho, maxWidth: "100%" }} />
        ),
      )}
    </Group>
  );
}

/** Fecha y hora corta, en el formato de Guatemala. */
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-GT");
