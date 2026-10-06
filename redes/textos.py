# -*- coding: utf-8 -*-
"""Los textos de las 12 publicaciones viven SOLO aquí.

    python3 textos.py

Escribe textos.txt (en orden de publicación, 12 → 1) y el bloque PIEZAS de
grilla-inicial.html. Antes estaban escritos dos veces y se desincronizaban.

Reglas (manual §07): de tú, nada de prueba social inventada, nada de precios,
nada que no esté en producción (Android, FEL). Cada afirmación sale del código:
- riesgo: memberships/tasks.py:detectar_atletas_en_riesgo (días por gym, default 10)
- check-in: QR de la clase escaneado al cierre (ventana fin+60 min)
- pago manual: activa la membresía igual (billing/services.py)
- coaches: per_class / fijo + extra, liquidación al cierre del mes
"""
import json
import pathlib
import re

AQUI = pathlib.Path(__file__).resolve().parent
H = "#gimnasioguatemala #crossfitguatemala #fitnessgt"
DEMO = "Agenda tu demo por WhatsApp: +502 3948 5323"

PIEZAS = [
    (1, "01-deja-de-perder-alumnos", "Deja de perder alumnos.",
     "Nucleo es el software para gimnasios y boxes que te avisa quién está dejando de venir, antes de que se vaya.\n\n"
     "Cobros, clases, coaches y retención en un solo lugar.\n\n🔗 Enlace en el perfil\n\n" + H + " #softwaregimnasio"),
    (2, "02-alumnos-en-riesgo", "3 alumnos en riesgo.",
     "Cuando un alumno pasa varios días sin entrenar, aparece en tu panel. Tú decides cuántos días cuentan.\n\n"
     "Y Nucleo le escribe solo: «Te extrañamos, reserva tu próxima clase».\n\n" + H + " #retencion"),
    (3, "03-cobro-solo", "El cobro llega solo.",
     "El atleta guarda su tarjeta en el app y la mensualidad se cobra sola cada mes. "
     "Quién está al día y quién no, lo ves en el panel, no a fin de mes.\n\n" + DEMO + "\n\n" + H),
    (4, "04-horario", "Tu horario, lleno y en orden.",
     "Armas tu horario semanal una vez y las clases se generan solas. "
     "Tus atletas reservan desde el app y, si la clase se llena, entran a la lista de espera.\n\n" + H + " #boxguatemala"),
    (5, "05-asistencia-qr", "La asistencia se pasa sola.",
     "Al terminar la clase, cada atleta escanea el QR de la clase con el app y su asistencia queda registrada.\n\n"
     "Sin cuaderno ni lista en papel.\n\n" + H),
    (6, "06-wod", "Cada score, en su pizarra.",
     "Publicas el WOD del día y cada atleta sube su score desde el app. "
     "La pizarra se ordena sola: RX, Scaled y Foundations.\n\n" + H + " #wod"),
    (7, "07-rachas", "Rachas que nadie quiere romper.",
     "Cada clase suma puntos y alarga la racha del atleta. Insignias, marcas personales y el atleta del mes: "
     "razones para no faltar.\n\n" + H + " #comunidadfitness"),
    (8, "08-pagos", "Tarjeta, efectivo o transferencia.",
     "No todos pagan con tarjeta. Los pagos en efectivo y por transferencia se registran en el panel "
     "y activan la membresía igual.\n\n" + H + " #boxguatemala"),
    (9, "09-drop-in", "El drop-in paga antes de entrar.",
     "El atleta que viene de visita compra su drop-in en el app y llega con su QR. Tú solo lo recibes.\n\n" + H + " #dropin"),
    (10, "10-coaches", "La paga del coach, ya cuadrada.",
     "Asignas coach a cada clase y, si una se queda sin coach, se les ofrece a los demás. "
     "A fin de mes la liquidación sale sola: por clase o fijo más extra.\n\n" + H + " #coach"),
    (11, "11-historial", "Llega con su historial.",
     "En Nucleo el atleta es uno solo: su perfil y sus marcas personales viajan con él. "
     "Lo que pasa en tu box (pagos y asistencia) es solo de tu box.\n\n" + H),
    (12, "12-presentacion", "El software de tu box.",
     "Nucleo es software para gimnasios y boxes, hecho en Guatemala 🇬🇹\n\n"
     "Para ti: cobros, clases, coaches, inventario y retención en un panel.\n"
     "Para tus atletas: un app para reservar, hacer check-in, ver el WOD y seguir su progreso.\n\n"
     + DEMO + "\n\n" + H + " #softwaregimnasio"),
]


def main():
    bloques = []
    for paso, (n, f, t, c) in enumerate(reversed(PIEZAS), start=1):
        bloques.append(f"== Publicación {paso} · pieza {n} · finales/{f}.png ==\n{t}\n\n{c}\n")
    (AQUI / "textos.txt").write_text("\n".join(bloques))

    datos = [{"n": n, "f": f, "t": t, "c": c} for n, f, t, c in PIEZAS]
    js = "const PIEZAS = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";"
    grilla = AQUI / "grilla-inicial.html"
    html = grilla.read_text()
    html, cambios = re.subn(r"// PIEZAS:inicio\n.*?// PIEZAS:fin", lambda _: f"// PIEZAS:inicio\n{js}\n// PIEZAS:fin", html, flags=re.S)
    assert cambios == 1, "grilla-inicial.html no tiene el bloque // PIEZAS:inicio … // PIEZAS:fin"
    grilla.write_text(html)
    print("textos.txt y grilla-inicial.html al día")


if __name__ == "__main__":
    main()
