# Aurora — lenguaje visual del admin web de Nucleo

> Referencia viva: **`design/aurora-reference.html`** (ábrela con doble clic).
> Es el dashboard "liquid glass" original, reproducido pixel a pixel sobre su
> retícula de 1357×871. Todo lo que sigue es su traducción a Nucleo.

---

## 1. La idea en una frase

Superficies de **vidrio blanco translúcido** flotando sobre un **backdrop de
marca luminoso** (carbón + halos flame), con tipografía **Inter / Inter Tight**,
cifras enormes y una **coreografía de entrada** que ordena la lectura.

### La regla que más se rompe

El vidrio necesita algo luminoso debajo. En la referencia hay una foto de
tormenta, y por eso sus tarjetas usan `rgba(255,255,255,.25)`. Sobre el negro
carbón de Nucleo ese mismo 25 % se lee como **gris plano**, no como vidrio.

Por eso Aurora conserva la **estructura exacta** de los degradados (los mismos
4 stops, en las mismas paradas: 0 % / 24 % / 78 % / 100 %) y escala los alfas
≈0.45×, compensando con más `saturate()` y un highlight interior superior.

**No subas los alfas para "que se vea más".** Si una tarjeta se ve apagada, el
problema está en el backdrop de esa pantalla, no en el vidrio.

---

## 2. Tokens

| Token | Qué es |
|---|---|
| `--u` | Unidad de la retícula. `clamp(0.82px, 100vw/1357, 1.06px)`. **Todo el cromo mide en `calc(N * var(--u))`.** |
| `--e-out` / `--e-soft` / `--e-pen` | Las tres curvas de la referencia. No inventes otras. |
| `--a-line` / `--a-line-strong` | Hairlines del material. |
| `--a-font-display` | `Inter Tight` — display, títulos y cifras. |
| `--nucleo-accent` | `#FC4C02`. **Acento, nunca fondo de superficie.** |

En móvil (`≤767.98px`) `--u` se ancla a `1px`: la tipografía y las áreas
táctiles no se encogen nunca.

### `--u` escala el cromo, NO hunde el texto

`--u` mide radios, blurs, paddings y la geometría del rail. **Toda medida
tipográfica lleva `clamp(piso, calc(N * var(--u)), techo)`.** Sin piso, en una
laptop de 1280px (`--u` = 0.82) un `calc(11 * var(--u))` daría 9px y los
encabezados de tabla quedarían ilegibles. Si agregas texto nuevo al sistema,
copia el patrón: `clamp(10px, calc(11 * var(--u)), 12px)`.

---

## 3. Materiales (clases de `lib/aurora.css`)

| Clase | Uso |
|---|---|
| `.a-glass-card` | Tarjeta estándar. Ya está aplicada a `<Card>` y `<Paper>` de Mantine por el tema. |
| `.a-glass-card--big` | La protagonista de la pantalla (más luminosa, radio 26u). |
| `.a-glass-card--core` | La que manda: borde flame encendido. **Máximo una por pantalla.** |
| `.a-glass-rail` | Material del rail lateral. |
| `.a-chip` | Pastilla de vidrio (filtros, contexto, pendientes). |
| `.a-tool` | Botón circular de 52u del header. |
| `.a-sheen` | Destello especular de coda. **Máximo 1–2 por pantalla**, o parece una discoteca. |
| `.a-rule` | Hairline editorial con tick flame. |
| `.nucleo-glass` | Material único de modales, drawers, menús y popovers (lo aplica el tema). |

---

## 4. Tipografía

| Clase | Rol |
|---|---|
| `.a-h1` | Titular hero. Inter Tight 500. |
| `.a-metric` / `.a-metric--sm` | Cifra protagonista / cifra de tile. Tabular. |
| `.a-kicker` | Overline en mayúsculas con tracking `.18em`. |
| `.a-blurb` | Párrafo de apoyo del hero. |
| `.a-tabular` | Dígitos de ancho fijo (dinero, columnas). |

---

## 5. Coreografía

Keyframes: `a-rise`, `a-slide-l`, `a-slide-r`, `a-pop`, `a-grow-y`,
`a-line-up`, `a-wipe-down`, `a-wipe-right`, `a-draw-line`, `a-wipe-x`,
`a-sheen`. Se aplican con las clases homónimas (`.a-rise`, `.a-slide-r`, …) y
el retardo se pasa por la variable `--d`:

```tsx
<div className="a-rise" style={{ "--d": ".3s" } as CSSProperties} />
// o, mejor:
<Reveal anim="rise" delay={0.3}>…</Reveal>
```

Para listas y retículas, `<Stagger from={0.4}>` reparte retardos a sus hijos
directos (paso 55 ms) sin escribir CSS nuevo.

**Ritmo de una pantalla** (segundos desde el montaje):

| Momento | Qué entra |
|---|---|
| 0.06 → 0.5 | Hero: chip, titular por línea, blurb, hairline |
| 0.6 → 0.9 | Tarjetas principales (`slide-r`, escalonadas 0.11 s) |
| 1.0 → 1.4 | Contenido de las tarjetas (cifras, métricas, filas) |
| 1.5+ | La onda se dibuja; el relleno la sigue 220 ms después |
| 2.55 | Coda: el destello especular |

`prefers-reduced-motion: reduce` apaga todo y deja el gráfico dibujado.

---

## 6. Primitivos (`components/aurora.tsx`)

```tsx
<AuroraHero kicker="Operación" title={["Tu gimnasio,", "en un vistazo"]}
            subtitle="…" action={<Button/>} />
<GlassCard variant="big|core" sheen lift delay={0.8} padding={24}>…</GlassCard>
<GlassChip delay={0.44}>Filtro</GlassChip>
<FilterChip active={f === "morosos"} onClick={…}>Morosos</FilterChip>
<ToolButton label="Buscar"><Search/></ToolButton>
<BigMetric label="Ingresos" value="Q12,400" unit="GTQ" fz="…" delay={1.04} />
<MetricTile label="Morosos" value={12} icon={<Flame/>} tone="var(--nucleo-danger)" fz="…" />
<SectionLabel as="h2">Padrón · 184 atletas</SectionLabel>
<WaveChart values={[…]} labels={[…]} activeIndex={2} delay={1.5} />
<Reveal anim="slide-r" delay={0.8}>…</Reveal>
<Stagger from={1.0}>…</Stagger>
```

`PageHeader` de `components/ui.tsx` ya es `AuroraHero` por dentro: **las
pantallas que lo usan heredan el hero sin tocarse.**

Notas que evitan repetir errores ya cometidos:

- **`FilterChip`, no pastillas a mano.** El encendido flame vive en
  `.a-chip--on`, una sola vez. Reimplementarlo inline produce alfas distintos
  por pantalla.
- **`SectionLabel as="h2"` cuando es el encabezado de una sección.** El hero
  emite el único `<h1>`; sin el `as`, el overline es un `<div>` y la página
  se queda sin esquema de encabezados. Para etiquetas sueltas dentro de una
  tarjeta ("Tarjeta", "Manual", campos de una ficha) déjalo en `div`.
- **`GlassCard` lleva `forwardRef`**: se puede envolver en `Tooltip` o
  `Menu.Target` sin que el popup pierda su ancla.
- **`GlassCard` recorta al radio** (`overflow: hidden`). Cualquier popup que
  metas dentro debe portalarse (`withinPortal`, que es el default de Mantine).
- **`GlassCard` es un `<div>` y no acepta `component="form"`.** Para un
  formulario real: `<GlassCard><form onSubmit=…>` o deja el `<Card component="form">`
  de Mantine, que el tema ya viste de vidrio.
- **`PageError` NO es `core`.** Se renderiza en línea dentro de pantallas que ya
  tienen su tarjeta protagonista; señala el fallo con tinta de peligro, no
  peleando por el acento de marca.

---

## 7. Convertir una pantalla — la receta

1. **`PageHeader`** con `kicker` + `title` + `subtitle`. El título puede ser un
   arreglo de líneas para el revelado por línea.
2. **Filtros** → `.a-chip` o inputs dentro de un `<GlassCard padding={16}>`.
3. **KPIs** → `<Stagger>` + `<MetricTile>`. La cifra que más importa sube a
   `<BigMetric>` dentro de una `GlassCard variant="core" sheen`.
4. **Tablas** → dentro de una `<GlassCard padding={0}>` con un `SectionLabel`
   arriba. **No cambies la densidad** (`verticalSpacing`, columnas, paginación).
5. **Fichas de detalle** → `DetailSheet` (ya es glass).
6. **Escalona**: tarjetas con `delay` 0.6 / 0.72 / 0.84…; retículas con
   `<Stagger from={…}>`.

### Sin halos: el naranja no resplandece

`#FC4C02` se usa como **relleno, borde o texto sólido**. Nunca como halo,
`box-shadow` de color, `text-shadow` ni `drop-shadow`. Un resplandor naranja
alrededor de botones y tarjetas abarata el conjunto y pelea con el vidrio.

- Profundidad → sombra **neutra** (`rgba(0,0,0,…)`).
- Jerarquía → borde flame sólido (`.a-glass-card--core`), no un aura.
- El átomo de la marca va limpio en el panel (`<AtomLogo glow={false} />`).
- Se conservan: el **anillo de foco** de los inputs (es una afordancia, no
  decoración) y los **blooms del backdrop**, que son atmósfera de fondo —
  lo que el vidrio refracta— y no un halo pegado a un componente.

Esta regla aplica igual al app móvil (`nucleo-app-mobile`).

### Emojis: permitidos

**No hay veda de emojis.** Decisión del dueño (2026-08-03) tras un barrido que
los quitó de más: el 🥇🥈🥉 del podio, el ⭐ de la calificación y el ♥/💬 del
feed se restauraron. Úsalos donde comuniquen algo (un dato, un rango, un tipo
de reacción); no los uses como relleno decorativo de un titular.

### Prohibido

- ❌ Tocar lógica, hooks, queries, permisos o el contrato de la API. Esto es
  **solo presentación**.
- ❌ Cambiar la densidad de una tabla o quitarle columnas.
- ❌ Fondos opacos (`#131316`, `rgba(255,255,255,0.9)`) sobre el backdrop.
- ❌ Sombras apiladas, gradientes morados, halos naranjas.
- ❌ Más de un `variant="core"` o más de dos `.a-sheen` por pantalla.
- ❌ Space Grotesk en el cuerpo del panel (queda solo en el wordmark y la
  landing). El display del panel es **Inter Tight**.
- ❌ Animar filas de una tabla larga (se siente lento). Anima el contenedor.

---

## 8. Verificar

```bash
npm run build && npm test
```
