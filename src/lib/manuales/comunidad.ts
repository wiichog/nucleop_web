import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Comunidad» del menú. */
export const manualesComunidad: ManualesPorRuta = {
  "/panel/comunidad": {
    titulo: "Feed y atleta del mes",
    paraQue:
      "Aquí le hablas a tu comunidad: publicas anuncios en el feed, destacas al atleta del mes de cada clase y decides qué se queda en el feed cuando un atleta sube algo o reporta un comentario.",
    tareas: [
      {
        titulo: "Publicar un anuncio en el feed",
        pasos: [
          "Ve a la tarjeta «Publicar anuncio en el feed».",
          "Escribe el «Título» y el «Mensaje».",
          "En «Segmento» deja «Todo el gym» o elige «Solo …» una clase para que solo lo vean los atletas de esa clase.",
          "Si quieres, agrega una «Foto (opcional)» o un «Video (opcional)». La foto se muestra en vista previa antes de publicar.",
          "Presiona «Publicar anuncio».",
        ],
        nota:
          "El botón se enciende cuando el anuncio tiene título y mensaje. Al publicarse, el formulario se limpia y te sale un aviso confirmando a quién le llegó.",
      },
      {
        titulo: "Corregir un anuncio ya publicado",
        pasos: [
          "Baja a «Anuncios publicados» y busca el anuncio en la tabla.",
          "Presiona «Editar».",
          "En la ventana «Corregir anuncio» cambia el «Título», el «Mensaje» o el «Segmento».",
          "Si hace falta, usa «Reemplazar foto» o «Reemplazar video» para subir otro archivo.",
          "Presiona «Guardar cambios».",
        ],
        nota:
          "Corregir no vuelve a notificar a nadie: tus atletas ven el texto nuevo en el feed, pero no reciben otro aviso en el teléfono. En la tabla queda la marca «Corregido el …».",
      },
      {
        titulo: "Quitar un anuncio del feed",
        pasos: [
          "En «Anuncios publicados», presiona «Quitar» en la fila del anuncio.",
          "Confirma en la ventana que te pregunta si quieres quitarlo del feed.",
        ],
        nota:
          "El anuncio deja de verse en el app, pero el aviso que ya les llegó al teléfono no se puede deshacer.",
      },
      {
        titulo: "Elegir al atleta del mes de una clase",
        pasos: [
          "Ve a la tarjeta «Atleta del mes por clase». Hay una fila para «Todo el gym» y una por cada clase.",
          "En la fila que quieras, busca y elige al atleta en la lista.",
          "Presiona «Publicar» para confirmarlo.",
        ],
        nota:
          "Elegir en la lista no publica nada: solo se publica cuando presionas «Publicar». Al publicarse, el anuncio sale al feed con una imagen enmarcada con la foto del atleta, y esa imagen aparece junto a la lista.",
      },
      {
        titulo: "Quitar al atleta del mes de una clase",
        pasos: [
          "En «Atleta del mes por clase», borra al atleta de la lista de esa fila.",
          "Presiona «Quitar».",
        ],
      },
      {
        titulo: "Consultar los atletas del mes anteriores",
        pasos: [
          "Baja a «Histórico de atletas del mes».",
          "Revisa el mes, la clase, el atleta y la imagen del anuncio. Haz clic en la imagen para verla en grande.",
        ],
      },
      {
        titulo: "Aprobar o rechazar una publicación de un atleta o coach",
        pasos: [
          "Baja a «Pendientes de moderación» y elige «Publicaciones».",
          "Revisa el texto, las fotos o videos, y las etiquetas («Reportado ×…», «IA: …»).",
          "Presiona «Aprobar» para que salga al feed, o «Rechazar…» para no publicarla.",
          "Si rechazas, en la ventana «Rechazar publicación» elige el «Motivo», escribe si quieres una «Nota para el autor (opcional)» y presiona «Rechazar».",
        ],
        nota:
          "El motivo es obligatorio: es lo que le llega al autor, y con eso puede pedirte que lo revises de nuevo.",
      },
      {
        titulo: "Revisar un comentario reportado",
        pasos: [
          "En «Pendientes de moderación», elige «Comentarios».",
          "Lee el comentario: mientras está en esta lista ya está oculto del feed.",
          "Presiona «Restaurar» para que vuelva a verse, o «Eliminar…» para borrarlo.",
          "Si eliminas, en la ventana «Eliminar comentario» elige el «Motivo», agrega si quieres una nota y presiona «Eliminar».",
        ],
        nota:
          "Eliminar un comentario lo borra para siempre: no se puede recuperar.",
      },
      {
        titulo: "Responder una apelación",
        pasos: [
          "En «Pendientes de moderación», elige «Apelaciones».",
          "Revisa el «Contenido sancionado», el motivo que se le dio y «Lo que dice el atleta».",
          "Presiona «Aceptar y republicar» si le das la razón, o «Mantener la decisión» si no.",
          "En la ventana que se abre, escribe si quieres una «Nota para el atleta (opcional)» y confirma con el botón del mismo nombre.",
        ],
        nota:
          "Aceptar no solo cierra el caso: la publicación o el comentario vuelven al feed. Si mantienes la decisión, el atleta puede pedirle una última revisión a Nucleo; en ese caso la apelación queda como «El atleta pidió una última revisión a Nucleo» y ya no la resuelves tú.",
      },
      {
        titulo: "Revisar la señal de moderación",
        pasos: [
          "Baja a «Señal de moderación».",
          "Revisa qué atletas tienen varios bloqueos o reportes y cuándo fue la «Última señal».",
          "Decide si conviene hablar con esa persona. La tabla no aplica ninguna sanción por sí sola.",
        ],
        nota:
          "Nunca se muestra quién bloqueó ni quién reportó, y no hay forma de averiguarlo desde el panel. Solo cuenta lo que pasó en tu gimnasio en los últimos 90 días.",
      },
      {
        titulo: "Ver lo que hay en el feed",
        pasos: [
          "Baja a la tarjeta «Feed».",
          "Cada publicación muestra su tipo, quién la hizo, la fecha, las reacciones y cuántos comentarios tiene.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Destacados vigentes",
        detalle: "Cuántos atletas del mes están publicados ahora mismo.",
      },
      {
        termino: "Actividad en el feed",
        detalle: "Cuántas publicaciones ven hoy tus atletas en el feed.",
      },
      {
        termino: "Atletas activos",
        detalle:
          "Los atletas con membresía activa o en prueba. Solo ellos aparecen en la lista para elegir al atleta del mes.",
      },
      {
        termino: "Segmento",
        detalle:
          "A quién va un anuncio: «Todo el gym» o «Solo» una clase. Las clases de la lista son las que tiene tu calendario.",
      },
      {
        termino: "Pendientes de moderación",
        detalle:
          "La suma de publicaciones por aprobar, comentarios reportados y apelaciones. Es lo único de esta pantalla que espera una decisión tuya.",
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
          "Cuántas personas bloquearon o reportaron a ese atleta. Un atleta aparece al llegar a un mínimo de cualquiera de los dos, y los bloqueos solo se muestran desde ese mínimo, por eso puedes ver una fila con reportes y cero bloqueos.",
      },
      {
        termino: "Tipos del feed",
        detalle:
          "PR, Badge, Puntos, Atleta del mes, Reto, Anuncio y Post (lo que suben tus atletas).",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Publicar anuncio» está apagado.",
        solucion: "Le falta el título o el mensaje. Llena los dos.",
      },
      {
        sintoma: "Me salió «No se pudo publicar el anuncio. Intenta de nuevo.»",
        solucion:
          "El anuncio no se publicó y lo que escribiste sigue en el formulario. Revisa el mensaje del aviso (por ejemplo, un archivo muy pesado), corrige y vuelve a presionar «Publicar anuncio».",
      },
      {
        sintoma: "Me salió «No se pudo publicar el atleta del mes».",
        solucion:
          "Revisa que el atleta siga activo en el gimnasio e intenta de nuevo.",
      },
      {
        sintoma: "Elegí al atleta del mes pero no aparece en el feed.",
        solucion:
          "Elegirlo en la lista no lo publica. Presiona «Publicar» en esa misma fila.",
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
        sintoma: "Una bandeja de moderación dice que no se pudo cargar.",
        solucion:
          "Presiona «Reintentar»: mientras no cargue, puede haber publicaciones, comentarios o apelaciones esperando tu respuesta.",
      },
      {
        sintoma: "Soy coach y no veo «Anuncios publicados».",
        solucion:
          "Publicar y corregir anuncios le toca al administrador del gimnasio. Como coach entras a esta pantalla para moderar.",
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
      "Aquí creas los clubes de tu box (running, cycling, rowing…) y apruebas o rechazas los que proponen tus atletas. En cuanto apruebas un club, quien lo propuso lo administra.",
    tareas: [
      {
        titulo: "Crear un club",
        pasos: [
          "En «Crear club» escribe el «Nombre del club» (por ejemplo «Runners 1821»).",
          "Escribe el «Tipo» (running, cycling, rowing…).",
          "Presiona «Crear club».",
        ],
        nota: "Los clubes que creas tú nacen aprobados.",
      },
      {
        titulo: "Aprobar un club que propuso un atleta",
        pasos: [
          "Cuando hay solicitudes, aparece la tarjeta «Solicitudes pendientes».",
          "Busca el club y presiona «Aprobar».",
        ],
        nota: "Al aprobarlo, su creador ya puede administrarlo.",
      },
      {
        titulo: "Rechazar un club",
        pasos: [
          "En «Solicitudes pendientes», presiona «Rechazar» en la fila del club.",
          "Escribe el «Motivo del rechazo» (por ejemplo, que ya existe un club de running).",
          "Presiona «Rechazar club».",
        ],
        nota:
          "El atleta que lo propuso ve este motivo en su app. Si lo dejas vacío, le llega un mensaje genérico.",
      },
      {
        titulo: "Consultar todos los clubes",
        pasos: [
          "Baja a «Todos los clubes».",
          "Ordena la tabla haciendo clic en «Club», «Tipo», «Estado» o «Miembros».",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Clubes registrados",
        detalle: "Todos los clubes del gimnasio, en cualquier estado.",
      },
      {
        termino: "Aprobados",
        detalle: "Los clubes que ya ven tus atletas.",
      },
      {
        termino: "Miembros en clubes",
        detalle:
          "La suma de miembros de todos los clubes. Un atleta que está en dos clubes cuenta dos veces.",
      },
      {
        termino: "Pendiente / Aprobado / Rechazado",
        detalle:
          "El estado del club. «Pendiente» espera tu decisión; «Aprobado» ya está visible; «Rechazado» no se publicó.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Crear club» está apagado.",
        solucion: "Llena el «Nombre del club» y el «Tipo»: los dos son obligatorios.",
      },
      {
        sintoma: "No veo la tarjeta «Solicitudes pendientes».",
        solucion: "Solo aparece cuando hay algún club esperando tu decisión.",
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
      "Aquí lees lo que se publica dentro de los clubes de tu gimnasio y retiras lo que no debería estar. Lo que denuncian los miembros va de primero.",
    tareas: [
      {
        titulo: "Revisar lo que denunciaron los miembros",
        pasos: [
          "En la tarjeta «Denuncias por revisar», deja elegido «Denunciado».",
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
          "En la ventana «Retirar del club» elige el «Motivo».",
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
          "Usa «Club» para ver un solo club y «Tipo de contenido» para ver solo anuncios, actividades, retos o publicaciones de miembros.",
        ],
      },
      {
        titulo: "Revisar denuncias en clubes sin gimnasio (solo soporte de Nucleo)",
        pasos: [
          "Baja a «Denuncias en clubes sin gimnasio (Nucleo)».",
          "Usa «Retirar…» o «Restaurar» igual que en la cola de tu gimnasio.",
        ],
        nota:
          "Esta sección solo la ve el equipo de Nucleo: son clubes que no pertenecen a ningún gimnasio y nadie más los puede moderar.",
      },
    ],
    conceptos: [
      {
        termino: "Denunciado por miembros",
        detalle: "Lo que algún miembro de un club marcó como indebido.",
      },
      {
        termino: "Publicado ahora",
        detalle: "Lo que hoy ven los miembros de tus clubes.",
      },
      {
        termino: "Retirado",
        detalle:
          "Ya no lo ven los miembros del club, pero se conserva con su motivo. Se puede restaurar.",
      },
      {
        termino: "Moderación al instante",
        detalle:
          "Dentro de un club lo publicado sale de una vez, sin esperar aprobación. Las imágenes pasan por la moderación automática; el texto no lo revisa ningún sistema, por eso la denuncia de un miembro es la única alarma sobre lo que se escribe.",
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
          "Revisa los filtros «Club» y «Tipo de contenido»: déjalos en «Todos los clubes» y «Todos los tipos».",
      },
    ],
    relacionadas: [
      { label: "Clubes", href: "/panel/clubes" },
      { label: "Feed y atleta del mes", href: "/panel/comunidad" },
    ],
  },
};
