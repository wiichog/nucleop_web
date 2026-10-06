# -*- coding: utf-8 -*-
"""Genera los archivos de marca de public/marca/ — NO los dibujes a mano.

    python3 -m venv .venv-marca
    .venv-marca/bin/pip install fonttools brotli
    .venv-marca/bin/python scripts/marca.py

  · La GEOMETRÍA del átomo se copia literal de src/landing/AtomLogo.tsx (rejilla
    de 100, tres órbitas fijas, tres electrones, núcleo con gradiente). Si cambia
    ahí, se cambia aquí. Sin halo ni glow: el dueño los retiró del lenguaje.

  · La PALABRA «nucleo» (minúsculas, sin punto) se convierte a TRAZOS desde la
    Space Grotesk variable (scripts/fuentes, instanciada a 600 = font-semibold de
    la navbar). Un SVG con <text> se rompe en cualquier máquina sin la fuente;
    este no depende de nada. Lleva el tracking de la web (tracking-tight).

  · Los nombres dicen SOBRE QUÉ FONDO va cada archivo; no hay uno «por defecto».

  · Los PNG salen de Chrome headless. Chrome con --headless=new escribe la captura
    y a veces NO sale: por eso cada llamada lleva timeout.
"""
import json
import pathlib
import subprocess
import tempfile

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "marca"
FUENTE = RAIZ / "scripts" / "fuentes" / "space-grotesk-variable-latin.woff2"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

FLAME = "#FC4C02"
INK = "#0A0A0B"
LIENZO = "#E8E5E9"
BLANCO = "#FFFFFF"


def atomo(prefijo: str, mono: str | None = None) -> str:
    """Grupo del átomo en su rejilla de 100 (centro 50,50).

    `prefijo` separa los id de los gradientes. `mono` pinta todo de un color.
    """
    if mono:
        orbita, nucleo, e1, e2, e3, defs = mono, mono, mono, mono, mono, ""
    else:
        defs = (
            f'<defs><radialGradient id="{prefijo}c" cx="50%" cy="42%" r="60%">'
            '<stop offset="0%" stop-color="#fff4ec"/><stop offset="35%" stop-color="#FFB07A"/>'
            '<stop offset="70%" stop-color="#FC4C02"/><stop offset="100%" stop-color="#9e2e00"/>'
            f'</radialGradient><linearGradient id="{prefijo}o" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0%" stop-color="#FF9F1C"/><stop offset="100%" stop-color="#FC4C02"/>'
            "</linearGradient></defs>"
        )
        orbita, nucleo = f"url(#{prefijo}o)", f"url(#{prefijo}c)"
        e1, e2, e3 = "#FFB07A", "#FF9F1C", "#FF7A3D"
    # En mono, órbitas sólidas: la transparencia sobre una foto las vuelve gris.
    def op(v):
        return "" if mono else f' opacity="{v}"'

    elipse = '<ellipse cx="50" cy="50" rx="42" ry="16" stroke-width="2"'
    anillo = (
        ""
        if mono
        else '<circle cx="50" cy="50" r="9" fill="none" stroke="#fff4ec" stroke-width="0.7" opacity="0.85"/>'
    )
    return (
        f"{defs}<g fill=\"none\" stroke=\"{orbita}\">"
        f'{elipse}{op(0.85)}/>'
        f'{elipse}{op(0.7)} transform="rotate(60 50 50)"/>'
        f'{elipse}{op(0.7)} transform="rotate(120 50 50)"/></g>'
        f'<circle cx="92" cy="50" r="3.6" fill="{e1}"/>'
        f'<circle cx="29" cy="13.6" r="3.2" fill="{e2}"/>'
        f'<circle cx="29" cy="86.4" r="3.2" fill="{e3}"/>'
        f'<circle cx="50" cy="50" r="9" fill="{nucleo}"/>{anillo}'
    )


def palabra():
    """Trazos de «nucleo» en unidades de fuente, base en y=0, y su caja de tinta."""
    f = TTFont(str(FUENTE))
    f = instantiateVariableFont(f, {"wght": 600})
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    glyphs = f.getGlyphSet()
    hmtx = f["hmtx"]
    tracking = -0.025 * upm
    x = 0.0
    trazos = []
    caja = BoundsPen(glyphs)
    for ch in "nucleo":
        g = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        # Volteo vertical: la fuente crece hacia arriba, el SVG hacia abajo.
        glyphs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        glyphs[g].draw(TransformPen(caja, (1, 0, 0, -1, x, 0)))
        trazos.append(pen.getCommands())
        x += hmtx[g][0] + tracking
    return trazos, x - tracking, upm, caja.bounds


def logotipo(sobre: str) -> tuple[str, int, int]:
    """Lockup horizontal: átomo + «nucleo» con la proporción de la navbar.

    En la web: AtomLogo de 30 px + texto-base (16 px), gap-2 (8 px). El átomo
    dibuja de 8 a 92 en su rejilla, así que la caja recorta ese aire.
    """
    trazos, ancho_palabra, upm, (_, y_min, _, y_max) = palabra()
    alto = 100  # rejilla del átomo
    tam_fuente = alto * 16 / 30
    s = tam_fuente / upm
    gap = alto * 8 / 30
    # La tinta de la palabra (de la «l» a la base) queda centrada en el átomo.
    base = alto / 2 - (y_min + y_max) * s / 2
    x0 = 6  # tinta del átomo con los electrones (el gap se mide desde la caja de 100, como en la web)
    ancho = alto + gap + ancho_palabra * s - x0 + 2
    color = BLANCO if sobre == "oscuro" else INK
    letras = "".join(f'<path d="{d}"/>' for d in trazos)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} 6 {ancho:.1f} 88">'
        f"{atomo('l' + sobre[0])}"
        f'<g transform="translate({alto + gap:.2f} {base:.2f}) scale({s:.5f})">'
        f'<g fill="{color}">{letras}</g></g></svg>'
    )
    return svg, round(ancho), 88


def avatar(lado: int) -> str:
    """Foto de perfil: ink a sangre + átomo. Cabe en el recorte circular de IG."""
    # El punto más lejano del átomo está a ~46 del centro: queda al 72 % del diámetro.
    escala = 0.36 * 100 / 46
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{lado}" height="{lado}">'
        f'<rect width="100" height="100" fill="{INK}"/>'
        f'<g transform="translate(50 50) scale({escala:.4f}) translate(-50 -50)">{atomo("av")}</g></svg>'
    )


def png(svg: str, ancho: int, alto: int, destino: pathlib.Path, transparente=True):
    destino.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        html = pathlib.Path(tmp) / "p.html"
        cuerpo = svg.replace("<svg ", f'<svg style="display:block;width:{ancho}px;height:{alto}px" ', 1)
        html.write_text(f"<html><body style='margin:0;background:transparent'>{cuerpo}</body></html>")
        args = [
            CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            f"--window-size={ancho},{alto}", f"--screenshot={destino}",
        ]
        if transparente:
            args.append("--default-background-color=00000000")
        args.append(html.as_uri())
        try:
            subprocess.run(args, timeout=30, capture_output=True)
        except subprocess.TimeoutExpired:
            pass
    assert destino.exists(), f"Chrome no escribió {destino}"


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    escritos = []

    def svg_file(nombre, contenido):
        (SALIDA / nombre).write_text(contenido)
        escritos.append(nombre)

    # Sobre claro: tile ink, como el ícono del app. Sobre oscuro: átomo suelto.
    svg_file("isotipo-sobre-claro.svg",
             f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
             f'<rect width="100" height="100" rx="22.6" fill="{INK}"/>'
             f'<g transform="translate(50 50) scale(0.82) translate(-50 -50)">{atomo("ic")}</g></svg>')
    svg_file("isotipo-sobre-oscuro.svg",
             f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 92 92">{atomo("io")}</svg>')
    svg_file("isotipo-mono-blanco.svg",
             f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 92 92">{atomo("mb", mono=BLANCO)}</svg>')
    svg_file("isotipo-mono-negro.svg",
             f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 92 92">{atomo("mn", mono=INK)}</svg>')

    for sobre in ("claro", "oscuro"):
        svg, w, h = logotipo(sobre)
        svg_file(f"logotipo-sobre-{sobre}.svg", svg)
        png(svg, 1200, round(1200 * h / w), SALIDA / f"logotipo-sobre-{sobre}-1200.png")
        escritos.append(f"logotipo-sobre-{sobre}-1200.png")

    for lado in (1080, 320):
        png(avatar(lado), lado, lado, SALIDA / f"avatar-{lado}.png", transparente=False)
        escritos.append(f"avatar-{lado}.png")

    tokens = {
        "nombre": "Nucleo",
        "wordmark": "nucleo",
        "instagram": "@nucleo.fit.app",
        "color": {
            "ink": {"hex": INK, "rol": "fondo de la marca, tarjeta ancla del bento, texto sobre claro."},
            "flame": {"hex": FLAME, "rol": "acento plano: el cuadro del CTA, el punto final del titular, íconos chicos. Nunca texto sobre claro ni halo."},
            "lienzo": {"hex": LIENZO, "rol": "fondo de las secciones claras (el bento)."},
            "panel": {"hex": BLANCO, "rol": "tarjeta sobre el lienzo: radio 16, sin borde ni sombra."},
            "subpanel": {"hex": "#EBE8EB", "rol": "sub-tarjeta dentro de un panel blanco."},
            "atomo": {"hex": ["#FF9F1C", "#FF7A3D", "#FFB07A", "#9e2e00", "#fff4ec"], "rol": "solo dentro del átomo. Nunca en texto ni fondos."},
        },
        "contraste": {
            "flame_sobre_lienzo": 2.72, "flame_sobre_blanco": 3.40, "flame_sobre_ink": 5.82,
            "blanco_sobre_flame": 3.40, "negro_60_sobre_lienzo": 5.36,
        },
        "tipografia": {
            "display": {"familia": "Space Grotesk", "pesos": [500, 600], "minusculas": True, "tracking": "-0.04em"},
            "tecnica": {"familia": "JetBrains Mono", "mayusculas": True, "tracking": "0.3em", "uso": "eyebrows, etiquetas, CTA"},
            "texto": {"familia": "Inter", "pesos": [400, 600], "uso": "lectura larga y montos en Q"},
        },
        "atomo": {"rejilla": 100, "orbitas": "ellipse cx50 cy50 rx42 ry16, rotate 0/60/120", "nucleo": "circle r9",
                  "electrones": [[92, 50, 3.6], [29, 13.6, 3.2], [29, 86.4, 3.2]], "rota": False, "glow": False},
        "archivos": sorted(escritos),
    }
    (SALIDA / "marca.json").write_text(json.dumps(tokens, ensure_ascii=False, indent=2) + "\n")
    print("\n".join(sorted(escritos + ["marca.json"])))


if __name__ == "__main__":
    main()
