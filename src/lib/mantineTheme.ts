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
  headings: { fontFamily: '"Space Grotesk", Inter, sans-serif', fontWeight: "700" },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "md", padding: "lg" } },
    Paper: { defaultProps: { radius: "md" } },
    Button: { defaultProps: { radius: "md" } },
    TextInput: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md", checkIconPosition: "right" } },
    NumberInput: { defaultProps: { radius: "md" } },
    Table: { defaultProps: { verticalSpacing: "sm", highlightOnHover: true } },
  },
});
