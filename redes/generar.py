# -*- coding: utf-8 -*-
"""Captura las 12 piezas de piezas.html (Nucleo) a 1080x1350 en finales/.

    python3 generar.py            # las 12
    python3 generar.py 6 7        # solo esas (con todas sus láminas)

Chrome con --headless=new escribe la captura y a veces NO sale: timeout y se
comprueba que el archivo exista. --virtual-time-budget deja cargar las fuentes
de Google y las fotos antes de capturar.
"""
import pathlib
import subprocess
import sys

AQUI = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
NOMBRES = {
    1: "deja-de-perder-alumnos", 2: "alumnos-en-riesgo", 3: "cobro-solo", 4: "horario",
    5: "asistencia-qr", 6: "wod", 7: "rachas", 8: "pagos",
    9: "drop-in", 10: "coaches", 11: "historial", 12: "presentacion",
}
# Carruseles: la lámina 1 es la pieza de la grilla; las demás salen con ?l=2..
# a finales/NN-nombre-L.png.
LAMINAS = {}


def capturar(n: int, lamina: int = 1) -> pathlib.Path:
    sufijo = f"-{lamina}" if lamina > 1 else ""
    destino = AQUI / "finales" / f"{n:02d}-{NOMBRES[n]}{sufijo}.png"
    destino.unlink(missing_ok=True)
    url = (AQUI / "piezas.html").as_uri() + f"?n={n}&l={lamina}"
    try:
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--window-size=1080,1350", "--virtual-time-budget=6000",
             f"--screenshot={destino}", url],
            timeout=60, capture_output=True,
        )
    except subprocess.TimeoutExpired:
        pass
    assert destino.exists(), f"Chrome no escribió {destino}"
    return destino


if __name__ == "__main__":
    (AQUI / "finales").mkdir(exist_ok=True)
    piezas = [int(a) for a in sys.argv[1:]] or list(NOMBRES)
    for n in piezas:
        for lamina in range(1, LAMINAS.get(n, 1) + 1):
            print(capturar(n, lamina).name)
