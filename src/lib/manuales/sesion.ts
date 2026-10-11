import type { ManualesPorRuta } from "./tipos";

/** Manuales de «Mi club» (admin de un club) y de «Mi perfil» (la cuenta de quien entra). */
export const manualesSesion: ManualesPorRuta = {
  "/panel/club": {
    titulo: "Administrar club",
    paraQue:
      "Esta pantalla es para quien administra un club (de running, cycling, rowing…), no para el gimnasio. Desde aquí creas las actividades y los retos del club, revisas los avances que suben tus miembros, publicas anuncios y mantienes al día la ficha que ven los atletas en el app.",
    tareas: [
      {
        titulo: "Crear una actividad del club",
        pasos: [
          "Entra a la pestaña «Actividades».",
          "En «Nueva actividad» escribe el «Nombre».",
          "Elige la «Fecha y hora» y, si quieres, escribe la «Ubicación».",
          "Presiona «Crear actividad».",
        ],
        nota:
          "Si no eliges fecha y hora, la actividad queda con la fecha y hora del momento en que la creas. Por ahora las actividades del club son gratuitas para los miembros: no se les puede poner precio.",
      },
      {
        titulo: "Ver quién confirmó una actividad y marcar su asistencia",
        pasos: [
          "En la pestaña «Actividades», busca la actividad en la lista «Actividades».",
          "Presiona «Ver RSVPs» para ver quién dijo que va.",
          "Junto a cada persona que aparece como «Va a asistir», presiona «Confirmar asistencia» cuando de verdad llegó.",
          "Presiona «Ocultar RSVPs» para cerrar la lista.",
        ],
        nota: "Solo puedes tener abierta la lista de una actividad a la vez.",
      },
      {
        titulo: "Crear un reto del club",
        pasos: [
          "Entra a la pestaña «Retos».",
          "Escribe el «Nombre del reto».",
          "En «Medida» elige «Kilómetros» (cada atleta sube lo que corrió o rodó; los avances pequeños se suman solos y los grandes, o el que completa la meta, esperan tu revisión) o «Asistencias a actividades» (cada asistencia que confirmas en una actividad del club suma 1).",
          "En «Meta (km)» o «Meta (asistencias)» escribe a cuánto hay que llegar (viene en 50).",
          "En «Puntos al completarlo» escribe cuántos puntos gana quien cumpla la meta (viene en 30).",
          "Si quieres, elige cuándo «Termina (opcional)».",
          "Presiona «Crear reto».",
        ],
        nota:
          "El reto empieza en el momento en que lo creas. Si no eliges fecha de fin, dura 30 días.",
      },
      {
        titulo: "Aprobar o rechazar los avances de tus miembros",
        pasos: [
          "Entra a la pestaña «Retos». Arriba, «Revisiones pendientes» dice cuántos avances esperan tu decisión.",
          "Revisa cada avance: el nombre del atleta, cuánto suma (+), de dónde viene y a qué reto pertenece.",
          "Presiona «Aprobar» para sumárselo, o «Rechazar» si no procede.",
          "Al rechazar, escribe por qué en la ventana que aparece y acepta. Si cancelas la ventana, no se rechaza.",
        ],
        nota:
          "El motivo del rechazo lo ve el atleta en su app: explícale qué pasó para que no deje el reto.",
      },
      {
        titulo: "Ver el ranking de un reto",
        pasos: [
          "En la pestaña «Retos», busca el reto en la lista.",
          "Presiona «Ver ranking» para ver la posición, el nombre, el avance y el estado de cada participante.",
          "Presiona «Ocultar ranking» para cerrarlo.",
        ],
        nota:
          "«Revisiones pendientes» siempre muestra los avances de todos los retos, aunque tengas un ranking abierto. Cada avance dice a qué reto pertenece.",
      },
      {
        titulo: "Publicar un anuncio para el club",
        pasos: [
          "Entra a la pestaña «Anuncios».",
          "En «Nuevo anuncio» escribe el «Título» (por ejemplo «Rodada del domingo») y el «Mensaje».",
          "Si quieres, sube una imagen en «Foto (opcional)».",
          "Presiona «Publicar anuncio».",
        ],
        nota:
          "El anuncio se publica en el feed del club y les llega como notificación a tus miembros. El botón se habilita cuando el título y el mensaje tienen texto.",
      },
      {
        titulo: "Borrar un anuncio",
        pasos: [
          "En la pestaña «Anuncios», busca el anuncio en «Publicados».",
          "Presiona «Borrar» y confirma en la ventana que aparece.",
        ],
        nota: "Al borrarlo desaparece del feed de tus miembros.",
      },
      {
        titulo: "Editar la ficha del club",
        pasos: [
          "Entra a la pestaña «Perfil del club».",
          "Cambia el «Nombre», el «Tipo» (running, cycling, rowing…) o la «Descripción».",
          "Para cambiar la foto, sube una nueva en «Foto del club». Reemplaza la actual; en formato cuadrado se ve mejor.",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "Es lo que ven los atletas al encontrar tu club en el app. Si el club es público y su estado lo decide el gimnasio, eso no se cambia desde aquí.",
      },
      {
        titulo: "Cambiar de club",
        pasos: [
          "Si administras más de un club, abre el selector del encabezado (arriba).",
          "En «Club activo» elige el club que quieres administrar.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Actividades publicadas / RSVPs acumulados",
        detalle:
          "Cuántas actividades tiene el club y cuántas confirmaciones suman entre todas.",
      },
      {
        termino: "RSVP",
        detalle: "La confirmación de un miembro de que va a ir a una actividad.",
      },
      {
        termino: "Va a asistir / Asistió / Canceló (en los RSVPs)",
        detalle:
          "«Va a asistir»: dijo que va. «Asistió»: ya le confirmaste la asistencia. «Canceló»: ya no va. Solo a quien está en «Va a asistir» se le puede confirmar.",
      },
      {
        termino: "Revisiones pendientes",
        detalle: "Avances que tus miembros subieron a un reto y que todavía no apruebas ni rechazas.",
      },
      {
        termino: "Autodeclarado / Asistencia validada (origen del avance)",
        detalle:
          "«Autodeclarado»: el atleta lo declaró por su cuenta. «Asistencia validada»: viene de una asistencia confirmada a una actividad del club.",
      },
      {
        termino: "Meta",
        detalle:
          "A cuánto hay que llegar en el reto. En la lista se ve junto a la medida («Kilómetros» o «Asistencias a actividades») y a cuántos participantes tiene.",
      },
      {
        termino: "En curso / En revisión / Completado (en el ranking)",
        detalle:
          "«En curso»: el atleta sigue en el reto. «En revisión»: tiene un avance esperando tu revisión. «Completado»: ya cumplió la meta.",
      },
      {
        termino: "Ficha del club",
        detalle: "El nombre, tipo, descripción y foto que ven los atletas al buscar tu club en el app.",
      },
    ],
    problemas: [
      {
        sintoma: "Me sale «Sin club asignado».",
        solucion:
          "Tu usuario todavía no es admin de ningún club. Pide que te asignen el rol de admin de club para poder administrarlo.",
      },
      {
        sintoma: "No se pudieron cargar las actividades, los retos, los anuncios o la ficha.",
        solucion: "Presiona el botón para reintentar que aparece junto al mensaje. Si sigue, recarga la página.",
      },
      {
        sintoma: "«No se pudo crear la actividad», «No se pudo crear el reto» o «No se pudo publicar el anuncio».",
        solucion:
          "Revisa que los campos obligatorios estén llenos y que la meta del reto sea un número, corrige lo que indique el mensaje y vuelve a intentarlo.",
      },
      {
        sintoma: "«No se pudo revisar el avance».",
        solucion:
          "Lee el mensaje que aparece y recarga la página para ver la lista al día antes de volver a intentarlo.",
      },
      {
        sintoma: "El botón «Guardar ficha» está apagado.",
        solucion: "El club necesita un nombre. Escríbelo en «Nombre».",
      },
      {
        sintoma: "No veo «Confirmar asistencia» junto a una persona.",
        solucion:
          "Solo aparece para quien está en «Va a asistir». Si dice «Asistió» ya está confirmada; si dice «Canceló», canceló su asistencia.",
      },
    ],
    relacionadas: [{ label: "Mi perfil", href: "/panel/perfil" }],
  },

  "/panel/perfil": {
    titulo: "Mi perfil",
    paraQue:
      "Aquí ves con qué correo entras al panel, qué rol te da acceso y en qué gimnasio estás trabajando. También cambias (o creas) tu contraseña y cierras sesión.",
    tareas: [
      {
        titulo: "Revisar los datos de tu cuenta",
        pasos: [
          "En la tarjeta «Cuenta» revisa tu «Correo», tu «Rol» y el «Gimnasio actual».",
          "Si trabajas en varios gimnasios, el gimnasio actual se cambia desde el selector del encabezado (arriba).",
        ],
      },
      {
        titulo: "Cambiar tu contraseña",
        pasos: [
          "En la tarjeta «Cambiar contraseña» escribe tu «Contraseña actual».",
          "Escribe la «Nueva contraseña», de al menos 8 caracteres.",
          "Presiona «Actualizar contraseña».",
        ],
        nota:
          "Si el gimnasio te restableció la contraseña, no te pedimos la actual: solo escribe la nueva y presiona «Actualizar contraseña».",
      },
      {
        titulo: "Crear una contraseña si entras con Google, Facebook o Apple",
        pasos: [
          "Si tu cuenta todavía no tiene contraseña, la tarjeta dice «Crear contraseña» y no te pide la actual.",
          "Escribe la «Nueva contraseña», de al menos 8 caracteres.",
          "Presiona «Crear contraseña».",
        ],
        nota: "Con eso puedes entrar también con tu correo y contraseña.",
      },
      {
        titulo: "Cerrar sesión",
        pasos: ["En la tarjeta «Cuenta» presiona «Cerrar sesión»."],
      },
    ],
    conceptos: [
      {
        termino: "Rol",
        detalle:
          "Lo que te da acceso al panel: «Admin de gym», «Coach», «Personal trainer», «Admin de club» o «Superadmin». Si tienes varios, salen todos.",
      },
      {
        termino: "Gimnasio actual",
        detalle: "El gimnasio cuyos datos estás viendo en el panel en este momento.",
      },
    ],
    problemas: [
      {
        sintoma: "«La nueva contraseña debe tener al menos 8 caracteres.»",
        solucion: "Escribe una contraseña más larga.",
      },
      {
        sintoma: "Me rechaza la contraseña al guardar.",
        solucion:
          "Lee el mensaje en rojo: dice si lo que está mal es la contraseña actual o la nueva (por ejemplo, demasiado común, solo números o parecida a tu correo). Corrígela y vuelve a intentarlo.",
      },
      {
        sintoma: "El botón «Actualizar contraseña» está apagado.",
        solucion: "Llena la contraseña actual y la nueva. Las dos son necesarias.",
      },
    ],
  },
};
