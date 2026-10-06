# Créditos de las fotos · grilla inicial de Instagram

Todas de **Unsplash** con su licencia libre (uso comercial, sin atribución obligatoria;
se anota por trazabilidad). Verificado en la API de búsqueda que `premium` y `plus` son
`false`: ninguna es de Unsplash+. Se bajan en blanco y negro desde su CDN (`sat=-100`) y
se revisaron a tamaño completo con las reglas del manual (§06): sin marcas legibles, sin
rostros protagonistas.

| Pieza | Archivo | Unsplash | Autor |
|---|---|---|---|
| 1 | `fotos/vacio.jpg` | `fNnOt7ZDj_Y` | Kirill Bogomolov |
| 3 | `fotos/grupo.jpg` | `VB5i6ZmXUoI` | Marvin Meyer |
| 5 | `fotos/box.jpg` | `T8oxamjfNKQ` | Ricardo Henri |
| 7 | `fotos/tiza.jpg` | `cdiAOvbwEgE` | Birk Enwald |
| 9 | `fotos/argollas.jpg` | `uH8JDWuxFX8` | Julien Dumas |
| 11 | `fotos/agarre.jpg` | `MJcI-gtxr4U` | yousef samuil |

Las de las piezas 1, 3 y 9 son las mismas que ya usa `/presentacion` (`src/presentacion/fotos.ts`).

## Ojo con el recorte

- `box.jpg` (pieza 5): a la derecha hay carteles y una manta con texto junto a la puerta.
  El recorte (`background-size:185%; background-position:0% 100%`) enseña solo el ~54 %
  izquierdo y los deja fuera. **No moverlo hacia la derecha.**

## Descartadas

- `ihxOnF1T2CY` y `5p8vhHUEEgY` (las de coach y tableta de la presentación): caras como
  protagonistas.
- `GLTGWsD_yC0`: short con logo de adidas y logo del gimnasio en la pared.
- `_nq5UfCCVe0`: logo del gimnasio en la pared, detrás de las argollas.
- `wcOGQeT1jIw`: disco con «USA» impreso.
- `2h2i4hNipj0`, `CPSjcuuV8E8`, `4fH_sMlbKz8`, `l2rM0c0ovy4`, `nsJgbTlaZ8M`: pesas y discos
  con texto o marca.
- `buWcS7G1_28` (la de clase de la presentación): sirve (caras desenfocadas); quedó de repuesto.
