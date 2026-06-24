import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Naranja incendiario de la marca (#FC4C02) como color primario "flame".
const flame: MantineColorsTuple = [
  "#fff1e8",
  "#ffe0cc",
  "#ffbe99",
  "#ff9a61",
  "#ff7c35",
  "#fd6919",
  "#fc4c02", // 6 = primario
  "#e23f00",
  "#c93d02",
  "#a32f00",
];

// Escala oscura alineada a los tokens Nucleo (carbón #0a0a0b, superficies #131316).
const dark: MantineColorsTuple = [
  "#f5f7fa",
  "#c9ccd4",
  "#9aa0ac",
  "#6f7682",
  "#4a4f59",
  "#2a2d34",
  "#1d1d22", // 6 = bordes/superficie-2
  "#131316", // 7 = superficies (cards/inputs)
  "#0a0a0b", // 8 = fondo base
  "#060607", // 9
];

export const mantineTheme = createTheme({
  primaryColor: "flame",
  primaryShade: 6,
  colors: { flame, dark },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, monospace",
  headings: { fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: "600" },
  defaultRadius: "lg",
  cursorType: "pointer",
  components: {
    Card: {
      defaultProps: { withBorder: true, radius: "lg", padding: "lg" },
      // Tarjeta translúcida con borde tenue (mismo lenguaje white-dominant de la
      // landing: superficies casi-blancas muy sutiles sobre negro premium).
      styles: {
        root: {
          backgroundColor: "rgba(255,255,255,0.025)",
          borderColor: "var(--nucleo-hairline)",
        },
      },
    },
    Paper: { defaultProps: { radius: "lg" } },
    // CTA tipo pastilla (rounded-full) como los botones de la landing.
    Button: { defaultProps: { radius: "xl" } },
    TextInput: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md", checkIconPosition: "right" } },
    NumberInput: { defaultProps: { radius: "md" } },
    Table: {
      defaultProps: { verticalSpacing: "sm", highlightOnHover: true },
      // Estilo de marca aplicado SOLO al componente <Table> (antes era un
      // `table {}` global que se filtraba a calendarios y datatable).
      styles: {
        table: { "--table-border-color": "var(--nucleo-surface-2)" },
        th: { color: "var(--nucleo-muted)", fontWeight: 600, fontSize: 13 },
      },
    },
  },
});
