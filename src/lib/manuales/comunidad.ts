import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Comunidad» del menú. */
export const manualesComunidad: ManualesPorRuta = {
  "/panel/comunidad": {
    titulo: "Feed y atleta del mes",
    paraQue:
      "Aquí le hablas a tu comunidad y la cuidas. La pantalla abre en «Moderar»: lo que tus atletas subieron o reportaron y espera tu decisión. En las otras pestañas publicas anuncios, eliges al atleta del mes de cada clase y ves el feed tal como lo ven tus atletas.",
    tareas: [
      {
        titulo: "Ver lo que espera tu decisión",
        pasos: [
          "Entra a la pestaña «Moderar». El número junto a su nombre dice cuántas cosas esperan.",
          "En «Por moderar» aparece todo lo pendiente, dividido en «Publicaciones», «Comentarios reportados» y «Apelaciones». Cada grupo dice cuántas tiene en amarillo.",
          "Si no hay nada, dice «Nada pendiente.».",
        ],
        nota:
          "Un grupo vacío no se muestra. Si un grupo no pudo cargar, sale el mensaje de error con «Reintentar»: en ese caso no asumas que no hay nada pendiente.",
      },
      {
        titulo: "Aprobar o rechazar una publicación de un atleta o coach",
        pasos: [
          "En «Moderar», busca el grupo «Publicaciones».",
          "Revisa el texto, las fotos o videos, y las etiquetas («Reportado ×…», «IA: …»).",
          "Presiona «Aprobar» para que salga al feed, o «Rechazar…» para no publicarla.",
          "Si rechazas, en la ventana «Rechazar publicación» elige el «Motivo», escribe si quieres una «Nota para el autor (opcional)» y presiona «Rechazar».",
        ],
        nota:
          "El motivo es obligatorio: es lo que le llega al autor, y con eso puede pedirte que revises de nuevo la publicación (una apelación).",
      },
      {
        titulo: "Revisar un comentario reportado",
        pasos: [
          "En «Moderar», busca el grupo «Comentarios reportados».",
          "Lee el comentario: mientras está en esta lista ya está oculto del feed.",
          "Presiona «Restaurar» para que vuelva a verse, o «Eliminar…» para borrarlo.",
          "Si eliminas, en la ventana «Eliminar comentario» elige el «Motivo», agrega si quieres una nota y presiona «Eliminar».",
        ],
        nota:
          "Eliminar un comentario lo borra para siempre: no se puede recuperar y el autor ya no puede apelar (si tenía una apelación pendiente, se descarta). Mientras sigue en esta lista está oculto, y el autor sí puede pedirte que lo revises. Si dudas, presiona «Cancelar» en la ventana y déjalo oculto.",
      },
      {
        titulo: "Responder una apelación",
        pasos: [
          "En «Moderar», busca el grupo «Apelaciones».",
          "Revisa el «Contenido sancionado», el motivo que se le dio y «Lo que dice el atleta».",
          "Presiona «Aceptar y republicar» si le das la razón, o «Mantener la decisión» si no.",
          "En la ventana que se abre, escribe si quieres una «Nota para el atleta (opcional)» y confirma con el botón del mismo nombre.",
        ],
        nota:
          "Solo llegan apelaciones de publicaciones rechazadas y de comentarios ocultos; un comentario que eliminaste ya no existe y no se puede apelar. Aceptar no solo cierra el caso: la publicación vuelve al feed y se le quita la sanción, o el comentario oculto vuelve a verse y se borran los reportes que lo bajaron. Al atleta se le avisa en los dos casos. Si mantienes la decisión, el atleta puede pedirle una última revisión a Nucleo; en ese caso la apelación queda atenuada con «El atleta pidió una última revisión a Nucleo» y ya no la resuelves tú.",
      },
      {
        titulo: "Revisar la señal de moderación",
        pasos: [
          "En «Moderar», baja a «Señal de moderación».",
          "Cada tarjeta dice cuántos bloqueos y reportes tiene ese atleta y la fecha de la última señal.",
          "Decide si conviene hablar con esa persona. La señal no aplica ninguna sanción por sí sola.",
        ],
        nota:
          "Nunca se muestra quién bloqueó ni quién reportó, y no hay forma de averiguarlo desde el panel: revelarlo expondría a quien se protegió, que además comparte clase con esa persona. Solo cuenta lo que pasó en tu gimnasio en los últimos 90 días. Si dice «Nadie llega al umbral.», tu comunidad está tranquila.",
      },
      {
        titulo: "Publicar un anuncio en el feed",
        pasos: [
          "Entra a la pestaña «Anuncios» y presiona «Nuevo anuncio».",
          "Escribe el «Título» y el «Mensaje».",
          "En «Segmento» deja «Todo el gym» o elige «Solo …» una clase para que solo lo vean los atletas de esa clase.",
          "Si quieres, agrega una «Foto (opcional)» o un «Video (opcional)». La foto se muestra en vista previa antes de publicar.",
          "Presiona «Publicar anuncio».",
        ],
        nota:
          "El botón se enciende cuando el anuncio tiene título y mensaje. Al publicarse, la ventana se cierra y te sale un aviso confirmando a quién le llegó. Si falla, lo que escribiste se queda en la ventana.",
      },
      {
        titulo: "Corregir un anuncio ya publicado",
        pasos: [
          "En «Anuncios», toca el anuncio en la lista.",
          "En la ventana «Corregir anuncio» cambia el «Título», el «Mensaje» o el «Segmento».",
          "Si hace falta, usa «Reemplazar foto» o «Reemplazar video» para subir otro archivo.",
          "Presiona «Guardar cambios».",
        ],
        nota:
          "Corregir no vuelve a notificar a nadie: tus atletas ven el texto nuevo en el feed, pero no reciben otro aviso en el teléfono. En la lista queda la marca «Corregido el …».",
      },
      {
        titulo: "Quitar un anuncio del feed",
        pasos: [
          "En «Anuncios», toca el anuncio.",
          "En la ventana, presiona «Quitar del feed».",
          "Confirma en la ventana que te pregunta si quieres quitarlo.",
        ],
        nota:
          "El anuncio deja de verse en el app, pero el aviso que ya les llegó al teléfono no se puede deshacer.",
      },
      {
        titulo: "Elegir al atleta del mes de una clase",
        pasos: [
          "Entra a la pestaña «Atleta del mes». Hay una tarjeta para «Todo el gym» y una por cada clase; las que dicen «Sin elegir» salen en amarillo.",
          "Toca la tarjeta de la clase.",
          "En «Atleta», busca y elige al atleta.",
          "Presiona «Publicar» para confirmarlo.",
        ],
        nota:
          "Elegir en la lista no publica nada: solo se publica cuando presionas «Publicar». Al publicarse, el anuncio sale al feed con una imagen enmarcada con la foto del atleta, y esa imagen aparece en la tarjeta.",
      },
      {
        titulo: "Quitar al atleta del mes de una clase",
        pasos: [
          "En «Atleta del mes», toca la tarjeta de la clase.",
          "Presiona «Quitar».",
        ],
      },
      {
        titulo: "Consultar los atletas del mes anteriores",
        pasos: [
          "En la pestaña «Atleta del mes», baja a «Histórico».",
          "Cada tarjeta dice el atleta, el mes y la clase. Toca la imagen para verla en grande.",
        ],
      },
      {
        titulo: "Ver lo que hay en el feed",
        pasos: [
          "Entra a la pestaña «Feed».",
          "Cada publicación muestra su tipo, quién la hizo, la fecha, las reacciones y cuántos comentarios tiene.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Moderar (el número de la pestaña)",
        detalle:
          "La suma de publicaciones por aprobar, comentarios reportados y apelaciones. Es lo único de esta pantalla que espera una decisión tuya.",
      },
      {
        termino: "Sin elegir",
        detalle:
          "La clase no tiene atleta del mes publicado. La tarjeta sale en amarillo y arriba se cuentan las que faltan.",
      },
      {
        termino: "Segmento",
        detalle:
          "A quién va un anuncio: «Todo el gym» o «Solo» una clase. Las clases de la lista son los servicios activos de tu gimnasio, aunque todavía no tengan clases en el calendario.",
      },
      {
        termino: "Atleta (lista del atleta del mes)",
        detalle:
          "Solo salen los atletas con membresía activa o en prueba.",
      },
      {
        termino: "Atleta / Coach",
        detalle: "Quién subió la publicación que espera aprobación.",
      },
      {
        termino: "Reportado ×N",
        detalle: "Cuántas personas reportaron esa publicación o comentario.",
      },
      {
        termino: "IA: …",
        detalle:
          "La moderación automática marcó la foto o el video con esa etiqueta. Es una pista para revisar, la decisión es tuya.",
      },
      {
        termino: "Oculto del feed",
        detalle: "El comentario reportado está fuera del feed mientras lo revisas.",
      },
      {
        termino: "Motivo",
        detalle:
          "Por qué rechazas o eliminas algo: spam o publicidad, lenguaje ofensivo, acoso, contenido sexual, violencia, información falsa, algo que no tiene que ver con el gimnasio u otro motivo. El autor lo recibe.",
      },
      {
        termino: "Apelación",
        detalle:
          "Un atleta que no está de acuerdo con una decisión tuya y te pide revisarla. Puede quedar pendiente, aceptada, rechazada o escalada a Nucleo.",
      },
      {
        termino: "Bloqueos / Reportes (señal de moderación)",
        detalle:
          "Cuántas personas bloquearon o reportaron a ese atleta. Un atleta aparece al llegar a un mínimo de cualquiera de los dos, y los bloqueos solo se muestran desde ese mínimo (en un box pequeño un solo bloqueo delataría a quien lo hizo), por eso puedes ver un atleta con reportes y cero bloqueos.",
      },
      {
        termino: "Tipos del feed",
        detalle:
          "PR, Badge, Puntos, Atleta del mes, Reto, Anuncio y Post (lo que suben tus atletas).",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Publicar anuncio» o «Guardar cambios» está apagado.",
        solucion: "Le falta el título o el mensaje. Llena los dos.",
      },
      {
        sintoma: "Me salió «No se pudo publicar el anuncio. Intenta de nuevo.»",
        solucion:
          "El anuncio no se publicó y lo que escribiste sigue en la ventana. Revisa el mensaje del aviso (por ejemplo, un archivo muy pesado), corrige y vuelve a presionar «Publicar anuncio».",
      },
      {
        sintoma: "Me salió «No se pudo publicar el atleta del mes».",
        solucion: "Revisa que el atleta siga activo en el gimnasio e intenta de nuevo.",
      },
      {
        sintoma: "Elegí al atleta del mes pero no aparece en el feed.",
        solucion:
          "Elegirlo en la lista no lo publica. Presiona «Publicar» en la misma ventana.",
      },
      {
        sintoma: "El botón «Publicar» del atleta del mes está apagado.",
        solucion:
          "No has elegido a nadie, o elegiste al mismo atleta que ya está publicado.",
      },
      {
        sintoma: "El botón «Rechazar» o «Eliminar» de la ventana está apagado.",
        solucion: "Falta elegir el «Motivo». Es obligatorio.",
      },
      {
        sintoma: "La lista para elegir al atleta del mes sale vacía o con error.",
        solucion:
          "Si dice «No se pudo cargar el padrón o los destacados publicados.», presiona «Reintentar». Si carga pero falta alguien, revisa que su membresía esté activa o en prueba.",
      },
      {
        sintoma: "Un grupo de «Moderar» dice que no se pudo cargar.",
        solucion:
          "Presiona «Reintentar»: mientras no cargue, puede haber publicaciones, comentarios o apelaciones esperando tu respuesta.",
      },
      {
        sintoma: "Soy coach y no veo la pestaña «Anuncios» ni puedo elegir al atleta del mes.",
        solucion:
          "Elegir al atleta del mes y publicar o corregir anuncios le toca al administrador del gimnasio. Como coach entras a esta pantalla para moderar, ver el feed y consultar el «Histórico» de atletas del mes.",
      },
    ],
    relacionadas: [
      { label: "Clases", href: "/panel/clases" },
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Clubes", href: "/panel/clubes" },
    ],
  },

  "/panel/clubes": {
    titulo: "Clubes del gimnasio",
    paraQue:
      "Aquí creas los clubes de tu box (running, cycling, rowing…) y apruebas o rechazas los que proponen tus atletas. Los que esperan tu decisión salen primero, en amarillo. En cuanto apruebas un club, quien lo propuso lo administra.",
    tareas: [
      {
        titulo: "Crear un club",
        pasos: [
          "Presiona «Nuevo club».",
          "Escribe el «Nombre del club» (por ejemplo «Runners 1821»).",
          "Escribe el «Tipo» (running, cycling, rowing…).",
          "Presiona «Crear club».",
        ],
        nota: "Los clubes que creas tú nacen aprobados.",
      },
      {
        titulo: "Aprobar un club que propuso un atleta",
        pasos: [
          "Los clubes por aprobar salen primero, en amarillo, y arriba se cuentan («… por aprobar»).",
          "En la tarjeta del club, presiona «Aprobar».",
        ],
        nota: "Al aprobarlo, su creador ya puede administrarlo.",
      },
      {
        titulo: "Rechazar un club",
        pasos: [
          "En la tarjeta amarilla del club, presiona «Rechazar».",
          "Escribe el «Motivo» (por ejemplo, que ya existe un club de running).",
          "Presiona «Rechazar club».",
        ],
        nota:
          "El atleta que lo propuso ve este motivo en su app. Si lo dejas vacío, le llega un mensaje genérico.",
      },
      {
        titulo: "Consultar todos los clubes",
        pasos: [
          "Cada tarjeta dice el nombre, el estado, el tipo y cuántos miembros tiene. Los rechazados salen atenuados, al final.",
          "Cuando hay más de seis clubes, elige «Nombre» o «Miembros» arriba para ordenarlos.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Miembros",
        detalle:
          "Cuántos atletas están en ese club. Un atleta que está en dos clubes cuenta en los dos.",
      },
      {
        termino: "Pendiente / Aprobado / Rechazado",
        detalle:
          "El estado del club. «Pendiente» espera tu decisión (tarjeta amarilla); «Aprobado» ya lo ven tus atletas; «Rechazado» no se publicó.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Crear club» está apagado.",
        solucion: "Llena el «Nombre del club» y el «Tipo»: los dos son obligatorios.",
      },
      {
        sintoma: "No veo ningún club en amarillo.",
        solucion: "No hay ninguno esperando tu decisión.",
      },
      {
        sintoma: "Me salió «No se pudo registrar la decisión sobre el club.»",
        solucion: "La decisión no quedó guardada. Intenta de nuevo.",
      },
    ],
    relacionadas: [
      { label: "Contenido de clubes", href: "/panel/contenido-clubes" },
      { label: "Feed y atleta del mes", href: "/panel/comunidad" },
    ],
  },

  "/panel/contenido-clubes": {
    titulo: "Contenido de los clubes",
    paraQue:
      "Aquí lees lo que se publica dentro de los clubes de tu gimnasio y retiras lo que no debería estar. Lo que denuncian los miembros va de primero, en amarillo.",
    tareas: [
      {
        titulo: "Revisar lo que denunciaron los miembros",
        pasos: [
          "La pantalla abre en «Denunciado». Arriba se cuenta lo que está «por revisar».",
          "Lee cada publicación: el texto, la foto si tiene, el club, el autor y la fecha.",
          "Si no debería estar, presiona «Retirar…». Si está bien, déjala: sigue publicada.",
        ],
        nota:
          "Denunciar no retira nada: sube el contador y te avisa. Retirar siempre es decisión tuya.",
      },
      {
        titulo: "Retirar una publicación de un club",
        pasos: [
          "Presiona «Retirar…» en la publicación.",
          "En la ventana «Retirar de …» elige el «Motivo».",
          "Si quieres, escribe una «Nota para el autor (opcional)».",
          "Presiona «Retirar».",
        ],
        nota:
          "Los miembros del club dejan de verla, pero el texto no se borra: queda registrado con su motivo, que es también lo que se le avisa al autor.",
      },
      {
        titulo: "Devolver algo que retiraste",
        pasos: [
          "Elige «Retirado» para ver lo que ya retiraste con su motivo.",
          "Presiona «Restaurar» en la publicación.",
        ],
        nota: "Los miembros del club vuelven a verla.",
      },
      {
        titulo: "Ver todo lo publicado en tus clubes",
        pasos: [
          "Elige «Todo». Se muestra de lo más reciente a lo más viejo.",
          "Arriba a la derecha, cambia «Todos los clubes» por un club para ver solo ese, y «Todos los tipos» por anuncios, actividades, retos o publicaciones de miembros.",
        ],
      },
      {
        titulo: "Revisar denuncias en clubes sin gimnasio (solo soporte de Nucleo)",
        pasos: [
          "Baja a «Clubes sin gimnasio (Nucleo)».",
          "Usa «Retirar…» o «Restaurar» igual que en la cola de tu gimnasio.",
        ],
        nota:
          "Esta sección solo la ve el equipo de Nucleo: son clubes que no pertenecen a ningún gimnasio y nadie más los puede moderar.",
      },
    ],
    conceptos: [
      {
        termino: "Por revisar",
        detalle:
          "Lo denunciado que sigue publicado: es lo que espera tu decisión y sale en amarillo. Lo denunciado que ya retiraste sigue en «Denunciado», pero no cuenta.",
      },
      {
        termino: "Denunciado / Todo / Retirado",
        detalle:
          "Las tres listas. «Denunciado»: lo que algún miembro marcó como indebido. «Todo»: todo lo publicado. «Retirado»: lo que ya no ven los miembros, conservado con su motivo y que se puede restaurar.",
      },
      {
        termino: "Moderación al instante",
        detalle:
          "Dentro de un club lo publicado sale de una vez, sin esperar aprobación: sus avisos son perecederos y un club puede no tener gimnasio que los apruebe. Las imágenes pasan por la moderación automática; el texto no lo revisa ningún sistema, por eso la denuncia de un miembro es la única alarma sobre lo que se escribe.",
      },
      {
        termino: "Anuncio / Actividad / Reto / Publicación de un miembro",
        detalle: "El tipo de contenido que se publicó en el club.",
      },
      {
        termino: "Denunciado ×N",
        detalle: "Cuántos miembros del club lo denunciaron.",
      },
      {
        termino: "IA: …",
        detalle: "La moderación automática marcó la imagen con esa etiqueta.",
      },
      {
        termino: "Autor sin registrar",
        detalle: "La publicación no tiene un correo de autor asociado.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Retirar» de la ventana está apagado.",
        solucion: "Falta elegir el «Motivo». Es obligatorio.",
      },
      {
        sintoma:
          "Dice «No se pudo cargar el contenido de los clubes. Puede haber denuncias esperando.»",
        solucion:
          "Presiona «Reintentar». Mientras no cargue, no asumas que no hay nada por revisar.",
      },
      {
        sintoma: "Me salió «No se pudo retirar el contenido.» o «No se pudo restaurar el contenido.»",
        solucion: "La decisión no quedó aplicada. Intenta de nuevo.",
      },
      {
        sintoma: "No encuentro una publicación que sé que existe.",
        solucion:
          "Revisa los filtros de arriba a la derecha: déjalos en «Todos los clubes» y «Todos los tipos».",
      },
    ],
    relacionadas: [
      { label: "Clubes", href: "/panel/clubes" },
      { label: "Feed y atleta del mes", href: "/panel/comunidad" },
    ],
  },
};
