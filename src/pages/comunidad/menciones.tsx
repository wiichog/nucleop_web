import { Text } from "@mantine/core";
import type { FeedMention } from "../../api/types";

/** Un trozo del texto: plano o una mención (`@Nombre`) que se resalta. */
export type Trozo = { texto: string; mencion: boolean };

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Parte `body` en trozos marcando cada `@Nombre` que venga en `mentions`.
 *
 * El texto es plano (un app viejo lo ve igual) y las menciones viajan aparte;
 * aquí solo se resaltan las que el backend validó, nunca cualquier `@algo`
 * escrito a mano. Los nombres más largos van primero en la alternancia para que
 * «@Ana López» no se corte en «@Ana» si también hay una «Ana». Sin menciones,
 * el texto sale entero, como antes. Sin distinguir mayúsculas: el nombre que se
 * guardó y el que quedó escrito pueden diferir solo en eso.
 */
export function partirMenciones(body: string, mentions?: FeedMention[] | null): Trozo[] {
  const nombres = Array.from(
    new Set((mentions ?? []).map((m) => m.name?.trim()).filter((n): n is string => !!n)),
  ).sort((a, b) => b.length - a.length);
  if (!body || !nombres.length) return body ? [{ texto: body, mencion: false }] : [];

  // El final exige que no siga una letra o número: «@Ana» no resalta media «@Anabel».
  const patron = new RegExp(`@(?:${nombres.map(escapar).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const trozos: Trozo[] = [];
  let desde = 0;
  for (const m of body.matchAll(patron)) {
    const i = m.index ?? 0;
    if (i > desde) trozos.push({ texto: body.slice(desde, i), mencion: false });
    trozos.push({ texto: m[0], mencion: true });
    desde = i + m[0].length;
  }
  if (desde < body.length) trozos.push({ texto: body.slice(desde), mencion: false });
  return trozos;
}

/** Estilo de la mención: el «claro» del color de marca, que Mantine calcula con contraste. */
const ESTILO_MENCION = {
  fontWeight: 600,
  color: "var(--mantine-color-flame-light-color)",
  background: "var(--mantine-color-flame-light)",
  borderRadius: 4,
  padding: "0 2px",
} as const;

/** Texto de un post o comentario con los `@Nombre` etiquetados resaltados. */
export function TextoConMenciones({
  body,
  mentions,
}: {
  body: string;
  mentions?: FeedMention[] | null;
}) {
  return (
    <Text size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {partirMenciones(body, mentions).map((t, i) =>
        t.mencion ? (
          <span key={i} data-mencion="" style={ESTILO_MENCION}>
            {t.texto}
          </span>
        ) : (
          t.texto
        ),
      )}
    </Text>
  );
}
