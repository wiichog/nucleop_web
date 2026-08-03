import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Tema del panel en el lenguaje **Aurora** (ver `lib/aurora.css` y la referencia
 * `design/aurora-reference.html`).
 *
 * Reparto de responsabilidades, a propósito:
 *  - AQUÍ viven la paleta, la tipografía, los radios y los `defaultProps`.
 *  - EL MATERIAL (glass, hairlines, sombras, hover) vive en `aurora.css`, y se
 *    engancha por `classNames`. Así el vidrio se afina en un solo archivo y no
 *    queda incrustado como estilos inline en cada componente.
 *
 * Es la palanca que redefine las 22 pantallas sin editarlas una por una: todo
 * input, botón, tabla, badge o superficie flotante del panel pasa por acá.
 */

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

// Escala oscura alineada a los tokens Nucleo (carbón #050507, superficies).
const dark: MantineColorsTuple = [
  "#f2f4f8",
  "#c9ccd4",
  "#9aa0ac",
  "#6f7682",
  "#4a4f59",
  "#2a2d34",
  "#1d1d22", // 6 = bordes/superficie-2
  "#131316", // 7 = superficies
  "#08080c", // 8 = fondo base
  "#050507", // 9
];

const DISPLAY = '"Inter Tight", "Inter", sans-serif';

export const mantineTheme = createTheme({
  primaryColor: "flame",
  primaryShade: 6,
  colors: { flame, dark },
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, monospace",
  // Display = Inter Tight 500, la tipografía del titular de la referencia.
  headings: {
    fontFamily: DISPLAY,
    fontWeight: "500",
    sizes: {
      h1: { fontSize: "34px", lineHeight: "1.12" },
      h2: { fontSize: "26px", lineHeight: "1.18" },
      h3: { fontSize: "20px", lineHeight: "1.24" },
      h4: { fontSize: "17px", lineHeight: "1.3" },
    },
  },
  defaultRadius: "lg",
  cursorType: "pointer",

  components: {
    // ── Superficies ───────────────────────────────────────────────────────
    Card: {
      defaultProps: { withBorder: false, radius: "lg", padding: "lg" },
      classNames: { root: "a-glass-card" },
    },
    Paper: {
      defaultProps: { withBorder: false, radius: "lg" },
      classNames: { root: "a-glass-card" },
    },

    // ── Controles ─────────────────────────────────────────────────────────
    Button: { defaultProps: { radius: "xl" } },
    ActionIcon: { defaultProps: { radius: "xl" } },
    Badge: { defaultProps: { radius: "xl" } },
    Chip: { defaultProps: { radius: "xl" } },

    TextInput: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
    Textarea: { defaultProps: { radius: "md" } },
    NumberInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md", checkIconPosition: "right" } },
    MultiSelect: { defaultProps: { radius: "md" } },
    Autocomplete: { defaultProps: { radius: "md" } },
    DatePickerInput: { defaultProps: { radius: "md" } },
    DateInput: { defaultProps: { radius: "md" } },
    FileInput: { defaultProps: { radius: "md" } },
    SegmentedControl: { defaultProps: { radius: "xl" } },
    Tabs: { defaultProps: { radius: "xl" } },
    Switch: { defaultProps: { radius: "xl" } },

    InputWrapper: {
      styles: {
        label: {
          fontFamily: DISPLAY,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          marginBottom: 6,
        },
      },
    },

    // ── Superficies flotantes: UN solo material (`.nucleo-glass`) ─────────
    // Modales, drawers, menús, popovers, hovercards y el dropdown de los
    // Select comparten el mismo vidrio, con el velo que congela el fondo.
    Modal: {
      defaultProps: {
        centered: true,
        radius: "lg",
        overlayProps: { color: "#050507", backgroundOpacity: 0.6, blur: 8 },
        transitionProps: {
          transition: "pop",
          duration: 240,
          timingFunction: "cubic-bezier(0.16,1,0.3,1)",
        },
      },
      classNames: { content: "nucleo-glass" },
      styles: {
        header: { background: "transparent" },
        title: { fontFamily: DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      },
    },
    Drawer: {
      defaultProps: {
        overlayProps: { color: "#050507", backgroundOpacity: 0.6, blur: 8 },
      },
      classNames: { content: "nucleo-glass" },
      styles: {
        header: { background: "transparent" },
        title: { fontFamily: DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      },
    },
    Menu: { classNames: { dropdown: "nucleo-glass" } },
    Popover: { classNames: { dropdown: "nucleo-glass" } },
    HoverCard: { classNames: { dropdown: "nucleo-glass" } },
    // Cubre Select/MultiSelect/Autocomplete (todos usan Combobox debajo).
    Combobox: { classNames: { dropdown: "nucleo-glass" } },
    Tooltip: {
      defaultProps: { radius: "md", withArrow: true },
      classNames: { tooltip: "nucleo-glass" },
    },
    Notification: { classNames: { root: "nucleo-glass" } },

    // ── Datos ─────────────────────────────────────────────────────────────
    // La densidad NO se toca: cambia el material (encabezado editorial,
    // hairlines finos, hover luminoso), no el ritmo vertical del listado.
    Table: {
      defaultProps: { verticalSpacing: "sm", highlightOnHover: false },
      classNames: { table: "a-table" },
    },

    Divider: { styles: { root: { borderColor: "var(--a-line)" } } },
    Alert: { defaultProps: { radius: "lg" } },
    Title: { styles: { root: { letterSpacing: "-0.018em" } } },
  },
});
