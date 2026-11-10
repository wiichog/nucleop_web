import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Usuarios» del menú. */
export const manualesUsuarios: ManualesPorRuta = {
  "/panel/atletas": {
    titulo: "Atletas",
    paraQue:
      "Es el padrón de tu gimnasio: buscas a una persona, ves en qué está (al día, por vencer, debe, se está enfriando) y, al tocarla, se abre su ficha con todo lo que puedes hacer: cambiarle el plan o la cuota, mandarle un recordatorio, congelar o bloquear su membresía, darla de baja y ver sus pagos y su asistencia. Solo ves su relación con TU gimnasio, nunca la que tiene con otros.",
    tareas: [
      {
        titulo: "Encontrar a un atleta",
        pasos: [
          "Escribe en «Buscar atleta o plan…» su nombre o el nombre de su plan.",
          "Toca su fila para abrir su ficha.",
        ],
        nota:
          "Cada fila dice su plan, sus puntos y, a la derecha, cuánto le falta para vencer. Si su membresía no está activa, también dice su estado (por ejemplo «Pausada» o «Vencida»). Las filas en amarillo son las que tienes que atender: debe, está en riesgo o pidió su baja. Si hay muchos atletas, al final aparece «Ver más».",
      },
      {
        titulo: "Ver un grupo: morosos, por vencer, en riesgo…",
        pasos: [
          "Toca una pastilla: «Todos», «Morosos», «Por vencer», «En riesgo», «Congeladas» y, cuando hay alguno, «Bajas» y «Bloqueadas».",
          "El número de cada pastilla dice cuántos hay en ese grupo; en amarillo, los que piden que hagas algo.",
        ],
        nota:
          "Los números son de todo el gimnasio, no de lo que estés buscando. Los coaches no ven «Morosos», «Por vencer» ni «En riesgo»: esos grupos son solo para quien administra el gimnasio.",
      },
      {
        titulo: "Ver morosos o atletas en riesgo por servicio",
        pasos: [
          "Elige la pastilla «Morosos» o «En riesgo».",
          "Si tus atletas tienen planes con distintos servicios, aparece una segunda fila de pastillas con cada servicio y cuántos hay en él.",
          "Toca un servicio para ver solo a esos atletas, o «Todos los servicios» para volver a verlos a todos.",
        ],
        nota:
          "Un atleta cuyo plan incluye dos servicios cuenta en los dos. Quien no tiene plan, o cuyo plan no tiene servicios, aparece en «Sin servicio».",
      },
      {
        titulo: "Cambiar el orden de la lista",
        pasos: [
          "Abre el selector de orden, a la derecha de las pastillas.",
          "Elige «Primero los que deben», «Vencimiento», «Nombre», «Estado», «Plan», «Más antiguos» o «Más puntos».",
        ],
        nota:
          "Sin tocarlo, la lista pone primero a los morosos, luego a los que están por vencer y después al resto. Los coaches ordenan por nombre, estado, plan, antigüedad o puntos.",
      },
      {
        titulo: "Invitar a un atleta",
        pasos: [
          "Presiona «Invitar atleta».",
          "Escribe su «Correo electrónico», «Nombre» y «Apellido». El «Teléfono (opcional)» puedes dejarlo vacío.",
          "Si quieres que entre a prueba unos días, elige «Prueba desde (opcional)» y «Prueba hasta (opcional)».",
          "Presiona «Enviar invitación».",
        ],
        nota:
          "Es la misma invitación que en «Solicitudes»: le llega un correo para elegir su contraseña y entrar al app, y la ves en «Solicitudes» hasta que la acepta. Solo quien administra el gimnasio puede invitar.",
      },
      {
        titulo: "Exportar el padrón",
        pasos: [
          "Elige el grupo y, si quieres, escribe una búsqueda.",
          "Presiona el botón de descarga (la flecha hacia abajo, «Exportar CSV»), junto al buscador.",
        ],
        nota:
          "Se descarga lo que estás viendo, en el orden que elegiste: atleta, estado, plan, cuota, estado de pago, días para vencer y puntos de comunidad.",
      },
      {
        titulo: "Ajustar cuándo alguien cuenta como «en riesgo» o moroso",
        pasos: [
          "Presiona «Riesgo y mora», a la derecha de las pastillas.",
          "En «En riesgo a los … días sin venir» escribe cuántos días sin venir a tu gimnasio marcan a un atleta activo como en riesgo (de 1 a 365).",
          "En «Gracia de pago» escribe cuántos días después del vencimiento el atleta sigue entrenando normal (de 0 a 60).",
          "En «Corte por mora a los» escribe cuántos días de atraso toleras antes de que la membresía pase sola a vencida (de 1 a 365).",
          "Presiona «Guardar».",
        ],
        nota:
          "El corte tiene que ser mayor que la gracia de pago. Con gracia 0, el atleta se bloquea el mismo día que vence. Ojo: el atleta aparece en «Morosos» desde el primer día de atraso, aunque esté en gracia; el corte solo decide cuándo pasa a vencida. Solo lo ve quien administra el gimnasio.",
      },
      {
        titulo: "Abrir la ficha de un atleta",
        pasos: [
          "Toca su fila.",
          "Se abre la «Ficha del atleta»: arriba su estado, plan y vencimiento; si tiene algo pendiente (pidió su baja, está bloqueado o congelado) va primero con su botón; luego los botones «Plan y cuota», «Recordatorio» y «Más»; después sus datos (cumpleaños, contacto de emergencia, nivel, objetivos, miembro desde, puntos y notas internas), su cobro y, en pestañas, «Pagos» y «Asistencia» en este gimnasio.",
        ],
        nota:
          "Los coaches ven la ficha, los datos, los pagos y la asistencia, pero no la administran: no les aparecen «Plan y cuota», «Recordatorio», «Más» ni el cobro.",
      },
      {
        titulo: "Mandarle un recordatorio de pago",
        pasos: [
          "Abre su ficha y presiona «Recordatorio».",
          "Elige por dónde enviarlo: «Notificación push», «Correo» o «Ambos».",
        ],
        nota:
          "El mensaje sale solo según su vencimiento: si ya venció le dice hace cuántos días, y si no, en cuántos días vence.",
      },
      {
        titulo: "Cambiarle el plan o la cuota",
        pasos: [
          "Abre su ficha y presiona «Plan y cuota».",
          "Elige el «Plan».",
          "Si le cobras distinto al precio del plan, escribe su «Cuota personalizada» en quetzales. Déjala vacía para que pague el precio del plan (así se le quita una cuota personalizada que tuviera).",
          "Si quieres, elige una «Oferta».",
          "Lee la línea de abajo (te dice qué va a pasar) y presiona «Guardar plan y cuota».",
        ],
        nota:
          "Si la membresía está activa, cambiar el plan o la cuota NO mueve el vencimiento: aplica desde el próximo cobro. Si todavía no está activa (aprobada sin plan, en prueba, vencida o pausada), sale un aviso amarillo: al guardar queda ACTIVA con un vencimiento nuevo contado desde hoy, y no se registra ningún pago. En una pausada además se pierden los días congelados: si solo querías reanudarla, usa «Reanudar membresía». Una oferta de porcentaje recalcula la cuota y una de meses gratis corre el vencimiento; el mensaje de confirmación te dice la cuota que quedó. El botón no aparece si el atleta es de un plan grupal ni si su membresía está en un estado donde no se le asigna plan: la ficha te dice dónde se gestiona.",
      },
      {
        titulo: "Cambiar cómo se le cobra",
        pasos: [
          "Abre su ficha.",
          "Activa o desactiva «Renovación automática».",
          "Elige el «Cobro preferido»: «Tarjeta», «Efectivo» o «Transferencia».",
        ],
        nota:
          "Se guarda en cuanto lo cambias. Con renovación automática, el cobro del siguiente ciclo se genera 3 días antes de vencer; sin ella, al vencer hay que registrar el pago a mano. Con tarjeta el cobro va por Pagalo y el atleta paga la cuota más el recargo. No aparece en atletas de un plan grupal: a ellos los cobra el titular.",
      },
      {
        titulo: "Congelar una membresía (viaje, lesión, ausencia larga)",
        pasos: [
          "Abre su ficha, presiona «Más» y elige «Congelar membresía».",
          "Escribe el «Motivo (solo lo ve tu equipo)».",
          "Si ya sabes cuándo vuelve, pon «Vuelve el (opcional)». Tiene que ser después de hoy.",
          "Presiona «Congelar membresía».",
        ],
        nota:
          "Solo aparece si la membresía está activa. Mientras está congelada no reserva clases ni se le generan cobros, y al reanudar recupera los días que le quedaban.",
      },
      {
        titulo: "Reanudar una membresía congelada",
        pasos: [
          "Elige la pastilla «Congeladas» y abre la ficha del atleta.",
          "Arriba, en el aviso «Congelada…», presiona «Reanudar membresía» y confirma.",
        ],
        nota:
          "El vencimiento se corre exactamente los días que estuvo congelada: no pierde lo que ya pagó.",
      },
      {
        titulo: "Bloquear el acceso de un atleta",
        pasos: [
          "Abre su ficha, presiona «Más» y elige «Bloquear acceso».",
          "Escribe el «Motivo (queda en el historial, no se edita)».",
          "Presiona «Bloquear acceso».",
        ],
        nota:
          "Bloquear no es dar de baja: el atleta deja de entrar y de reservar y no se le generan cobros, pero conserva sus puntos de comunidad, su antigüedad y su historial. Se le avisa por el app. Solo se bloquea una membresía activa, en prueba, pausada o vencida. Para cerrar la relación usa «Desligar atleta»; para una deuda no hace falta, el corte por mora ocurre solo.",
      },
      {
        titulo: "Levantar un bloqueo",
        pasos: [
          "Elige la pastilla «Bloqueadas» y abre la ficha del atleta.",
          "Arriba, en el aviso «Acceso bloqueado», revisa el motivo y la fecha.",
          "Presiona «Levantar bloqueo» y confirma.",
        ],
        nota:
          "La membresía vuelve al estado que tenía antes del bloqueo, no necesariamente a «Activa»: si estaba vencida, vuelve vencida.",
      },
      {
        titulo: "Dar de baja a un atleta (desligar)",
        pasos: [
          "Abre su ficha, presiona «Más» y elige «Desligar atleta».",
          "Confirma. Se le envía una solicitud de baja que el atleta tiene que confirmar en su app.",
        ],
        nota:
          "Mientras el atleta no confirma, su ficha dice «Esperando que confirme la baja.» con el botón «Cancelar baja propuesta» por si te arrepientes. «Desligar atleta» solo aparece en membresías activas, en prueba, pausadas, vencidas, aprobadas sin plan o de drop-in.",
      },
      {
        titulo: "Responder cuando un atleta pide su baja",
        pasos: [
          "Toca el aviso amarillo «… por confirmar» junto al título, o elige la pastilla «Bajas».",
          "Toca la fila del atleta (dice «Pidió su baja»).",
          "Arriba de su ficha presiona «Confirmar baja» para cerrar la relación, o «Cancelar» para que siga siendo miembro.",
        ],
        nota: "Al confirmar, el atleta deja de ser miembro del gimnasio.",
      },
      {
        titulo: "Restablecer la contraseña de un atleta",
        pasos: [
          "Abre su ficha, presiona «Más» y elige «Restablecer contraseña».",
          "Confirma.",
        ],
        nota: "Se le envía el restablecimiento y se le pedirá cambiarla al entrar.",
      },
      {
        titulo: "Completar los datos de un atleta que diste de alta tú",
        pasos: [
          "Abre su ficha, presiona «Más» y elige «Completar datos».",
          "Llena «Nombre», «Apellido», «Cumpleaños», «Contacto (nombre)», «Contacto (teléfono)» y «Parentesco».",
          "Presiona «Guardar cambios».",
        ],
        nota:
          "Solo aparece mientras el atleta no ha reclamado su cuenta. En cuanto entra al app por primera vez, su perfil pasa a ser suyo: el nombre, el cumpleaños y el contacto de emergencia los edita él desde su app y viajan con él a otros gimnasios.",
      },
    ],
    conceptos: [
      {
        termino: "Fila en amarillo",
        detalle:
          "Algo que atender: debe la cuota, está en riesgo o pidió su baja.",
      },
      {
        termino: "Morosos",
        detalle: "Atletas con la cuota vencida, desde el primer día de atraso.",
      },
      {
        termino: "Por vencer",
        detalle: "Atletas a los que se les vence la cuota pronto.",
      },
      {
        termino: "En riesgo",
        detalle:
          "Atletas activos que llevan más días sin venir a tu gimnasio que lo que pusiste en «Riesgo y mora». Son los que se están enfriando. Si la lista no se pudo cargar, la pastilla no muestra número.",
      },
      {
        termino: "Bajas",
        detalle:
          "Membresías en «Baja pendiente»: alguien pidió la baja y falta la otra parte. La pastilla solo aparece cuando hay alguna.",
      },
      {
        termino: "Congeladas",
        detalle: "Membresías pausadas. En la fila dicen «Pausada».",
      },
      {
        termino: "Bloqueadas",
        detalle: "Membresías con el acceso bloqueado. La pastilla solo aparece cuando hay alguna.",
      },
      {
        termino: "Estado",
        detalle:
          "En qué punto está la relación del atleta con tu gimnasio: «Activa», «En prueba», «Pausada», «Vencida», «Bloqueada», «Baja pendiente», «Aprobada sin plan», «Drop-in», «Exmiembro», entre otros. En la fila solo sale cuando no es «Activa».",
      },
      {
        termino: "Vencimiento (pastilla de la derecha)",
        detalle:
          "Cuántos días le quedan a la cuota: verde con días de sobra, amarillo si faltan 7 días o menos, «Vence hoy», o rojo «Vencido hace … d». Pasa el cursor por encima para ver la fecha exacta.",
      },
      {
        termino: "En gracia hasta …",
        detalle:
          "Ya venció, pero está dentro de la gracia de pago de tu gimnasio: debe, pero todavía entrena normal (reserva, entra, publica y compra).",
      },
      {
        termino: "Nombre del plan grupal (junto al plan)",
        detalle:
          "Ese atleta lo paga un plan familiar o empresarial: su cuota la cubre el titular del grupo. Por eso en su ficha no aparecen «Plan y cuota» ni el cobro; todo eso se maneja en «Planes grupales».",
      },
      {
        termino: "Puntos",
        detalle: "Los puntos de comunidad que el atleta ha ganado en tu gimnasio.",
      },
      {
        termino: "Gracia de pago",
        detalle:
          "Días después del vencimiento en que el atleta sigue entrenando sin bloqueo. Con 0 se bloquea el mismo día que vence.",
      },
      {
        termino: "Corte por mora",
        detalle:
          "Días de atraso que toleras antes de que la membresía pase sola a vencida. Es reversible: al registrar el pago vuelve a activa.",
      },
      {
        termino: "Cuota personalizada",
        detalle:
          "Lo que paga este atleta en lugar del precio del plan. Vacía significa que paga el precio del plan.",
      },
      {
        termino: "Congelar vs. bloquear vs. desligar",
        detalle:
          "Congelar es una pausa acordada (viaje, ausencia) que le devuelve los días al reanudar. Bloquear es una sanción: la relación sigue viva pero sin entrar. Desligar es la baja: cierra la relación cuando el atleta la confirma.",
      },
      {
        termino: "Notas internas",
        detalle: "Notas de tu equipo sobre el atleta. El atleta no las ve.",
      },
      {
        termino: "Pagos y Asistencia",
        detalle:
          "Las dos pestañas al final de la ficha: los pagos del atleta (fecha, método, monto y estado) y sus check-ins (clase, fecha y método). Solo los de tu gimnasio.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «Todavía no hay atletas.»",
        solucion:
          "Aún no tienes atletas. Presiona «Invitar al primero» o ve a «Solicitudes» para aprobar a quien pidió entrar.",
      },
      {
        sintoma: "Sale «Ningún atleta en este grupo.» o «Nadie coincide con la búsqueda.»",
        solucion:
          "No hay nadie en la pastilla elegida o con lo que escribiste. Vuelve a «Todos» o borra la búsqueda.",
      },
      {
        sintoma: "Sale «No se pudo cargar la lista de atletas en riesgo.»",
        solucion:
          "No es que nadie esté en riesgo: la lista no cargó. Presiona el botón para reintentar.",
      },
      {
        sintoma: "Me dice «El umbral debe estar entre 1 y 365 días.», «El corte por mora debe estar entre 1 y 365 días.» o «La gracia de pago debe estar entre 0 y 60 días.»",
        solucion: "Corrige el número para que quede dentro de ese rango y vuelve a presionar «Guardar».",
      },
      {
        sintoma: "No me deja guardar la gracia de pago o el corte por mora.",
        solucion: "El corte tiene que ser mayor que la gracia de pago. Ajusta uno de los dos.",
      },
      {
        sintoma: "Sale «No se pudo leer la configuración del gimnasio; se muestran los valores por defecto.»",
        solucion:
          "Los números que ves en «Riesgo y mora» no son necesariamente los de tu gimnasio. Recarga la página antes de cambiar algo.",
      },
      {
        sintoma: "No veo el botón «Plan y cuota» en la ficha.",
        solucion:
          "La membresía está en un estado en el que no se le puede cambiar el plan, o es de un plan grupal. La ficha te dice qué hacer: si está bloqueada, levanta el bloqueo primero; si tiene baja pendiente, respóndela arriba de la ficha; si es exmiembro o la rechazaste, para que vuelva invítalo con «Invitar atleta» o pídele que solicite entrar desde su app; si es una solicitud o una invitación, atiéndela en «Solicitudes».",
      },
      {
        sintoma: "El selector de plan sale vacío o dice «No se pudieron cargar los planes.»",
        solucion:
          "Si dice ese mensaje, la carga falló: recarga la página. Si solo está vacío, crea tus planes en «Planes y cuotas».",
      },
      {
        sintoma: "En «Más» no está «Congelar membresía» o «Bloquear acceso».",
        solucion:
          "Solo se congela una membresía activa, y solo se bloquea una activa, en prueba, pausada o vencida. Una solicitud o una invitación se rechaza en «Solicitudes».",
      },
      {
        sintoma: "No puedo cambiar el nombre, cumpleaños o contacto de emergencia.",
        solucion:
          "El atleta ya reclamó su cuenta y esos datos son suyos: los edita él desde su app. Pídele que los corrija.",
      },
      {
        sintoma: "Sale «La API no guardó …. Avisa a soporte de Nucleo.»",
        solucion:
          "El cambio no quedó guardado aunque no hubo error visible, y la pantalla volvió al valor anterior. Avísale a soporte de Nucleo.",
      },
    ],
    relacionadas: [
      { label: "Solicitudes", href: "/panel/solicitudes" },
      { label: "Planes y cuotas", href: "/panel/planes" },
      { label: "Membresías", href: "/panel/pagos" },
    ],
  },

  "/panel/solicitudes": {
    titulo: "Solicitudes",
    paraQue:
      "Aquí llega quien pide entrar a tu gimnasio y aquí invitas a atletas nuevos. Tocas una solicitud para aprobarla, ofrecer una prueba, pedir más información o rechazarla, y después le asignas el plan con el que queda como miembro activo.",
    tareas: [
      {
        titulo: "Invitar a un atleta",
        pasos: [
          "Presiona «Invitar atleta».",
          "Escribe su «Correo electrónico», «Nombre» y «Apellido». El «Teléfono (opcional)» puedes dejarlo vacío.",
          "Si quieres que entre a prueba unos días, elige «Prueba desde (opcional)» y «Prueba hasta (opcional)». No se permiten fechas pasadas.",
          "Presiona «Enviar invitación».",
        ],
        nota:
          "Al atleta le llega un correo de Nucleo con un botón para elegir su contraseña y entrar al app. Revisa bien el correo antes de enviar: si lo escribes mal, no le llega nada y tampoco le llegarán los avisos de su membresía. Si pusiste fechas, al aceptar la invitación el atleta queda como temporal (en prueba) entre esas fechas. El botón se habilita cuando llenas correo, nombre y apellido.",
      },
      {
        titulo: "Responder a una solicitud",
        pasos: [
          "Toca la solicitud en la bandeja. Las que esperan tu decisión salen en amarillo, y arriba dice cuántas hay «por decidir».",
          "Revisa lo que mandó: objetivo, nivel, horario preferido, si quiere prueba y su mensaje.",
          "Elige «Aprobar», «Ofrecer prueba», «Pedir información» o «Rechazar».",
          "Escribe la nota si quieres (en «Pedir información», qué necesitas saber; en «Rechazar», el motivo) y presiona el botón para confirmar. «Volver» te regresa a las cuatro opciones.",
        ],
        nota:
          "Aprobar no la deja activa todavía: después tienes que asignarle un plan. «Ofrecer prueba» no aparece en las invitaciones que enviaste tú.",
      },
      {
        titulo: "Asignar el plan y activar al atleta",
        pasos: [
          "En «Falta plan», toca la solicitud aprobada (o de alguien en prueba).",
          "Elige el «Plan».",
          "Si le cobras distinto al precio del plan, escribe su «Cuota personalizada» en quetzales. Vacía, paga el precio del plan.",
          "Si quieres, elige una «Oferta».",
          "Presiona «Asignar plan».",
        ],
        nota:
          "Al asignar el plan, el atleta queda como miembro activo al instante, sin registrar ningún pago, y sale de esta bandeja: desde ahí lo ves en «Atletas». Una oferta de porcentaje recalcula la cuota: el mensaje de confirmación te dice la cuota que quedó.",
      },
      {
        titulo: "Buscar una solicitud",
        pasos: ["Cuando hay más de cinco, escribe el nombre en «Buscar atleta…»."],
        nota: "La bandeja va en orden alfabético.",
      },
    ],
    conceptos: [
      {
        termino: "Bandeja",
        detalle:
          "Solo muestra lo que todavía necesita que hagas algo, en dos grupos: arriba lo que está por decidir (solicitudes, invitaciones y pendientes de aprobación) y abajo, en «Falta plan», las aprobadas sin plan y las que están en prueba. Las ya resueltas (activas, rechazadas, bajas) viven en «Atletas».",
      },
      {
        termino: "Reingreso",
        detalle:
          "El atleta ya fue miembro de tu gimnasio. Se muestran sus puntos de comunidad y desde qué año es de la casa. Al aprobarlo reabre la relación que ya tuvo: conserva sus puntos, su antigüedad y su historial. No empieza de cero ni se le crea una ficha nueva.",
      },
      {
        termino: "Solicitada / Invitado / Pendiente de aprobación",
        detalle:
          "Todavía no decides. Al tocarla ves «Aprobar», «Pedir información» y «Rechazar» (y «Ofrecer prueba» si no es una invitación tuya).",
      },
      {
        termino: "Aprobada sin plan / En prueba",
        detalle: "Ya la aceptaste; falta asignarle un plan para que quede activa.",
      },
      {
        termino: "Nota",
        detalle:
          "Lo que escribes al decidir queda guardado en el historial de la membresía.",
      },
      {
        termino: "Prueba desde / hasta",
        detalle:
          "Las fechas de una invitación: el atleta entra en prueba durante ese tiempo.",
      },
      {
        termino: "Oferta",
        detalle:
          "Una promoción creada en «Planes y cuotas»: un descuento en porcentaje o meses gratis. Solo salen las activas que aplican al plan elegido.",
      },
    ],
    problemas: [
      {
        sintoma: "La bandeja dice «Nada pendiente.»",
        solucion: "No tienes solicitudes por decidir.",
      },
      {
        sintoma: "Sale «No se pudo enviar la invitación. Verifica los datos.» u otro mensaje en rojo en la ventana de invitar.",
        solucion:
          "Lee el mensaje: suele decir qué dato está mal (correo, teléfono o las fechas de prueba). Corrígelo y vuelve a enviar.",
      },
      {
        sintoma: "El selector de plan dice «No se pudieron cargar los planes.»",
        solucion: "La carga falló, no es que no tengas planes. Recarga la página.",
      },
      {
        sintoma: "No tengo planes para elegir al asignar.",
        solucion: "Créalos primero en «Planes y cuotas».",
      },
      {
        sintoma: "Aprobé a alguien y ya no lo encuentro.",
        solucion:
          "Si ya le asignaste plan, salió de la bandeja porque ya es miembro: búscalo en «Atletas». Si solo lo aprobaste, sigue aquí en «Falta plan».",
      },
    ],
    relacionadas: [
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Planes y cuotas", href: "/panel/planes" },
    ],
  },

  "/panel/planes": {
    titulo: "Planes y cuotas",
    paraQue:
      "Aquí armas los planes que cobras (mensual, trimestral, por clases), defines cómo se cobra cada servicio de tu catálogo y creas las promociones que puedes aplicar al asignar un plan. También es donde se activan los servicios nuevos para poder agendarlos. La pantalla tiene tres partes: «Planes», «Servicios y su cobro» y «Ofertas».",
    tareas: [
      {
        titulo: "Crear un plan",
        pasos: [
          "En «Planes» presiona «Nuevo plan». Se abre una ventana.",
          "En «Tipo de plan» deja «Individual» (o elige «Familiar» o «Empresarial» si es un paquete para varias personas: ve la tarea siguiente).",
          "Escribe el «Nombre» (por ejemplo «Mensual CrossFit») y el «Precio (Q)». El precio va solo en números (por ejemplo 350): la «Q» ya aparece sola y el campo no acepta letras.",
          "Ajusta la «Duración (días)» (30 por defecto) y, si el plan tiene un tope, el «Límite de clases». Vacío significa sin límite.",
          "En «Servicios incluidos» elige las disciplinas que trae el plan. El atleta lo ve en el app.",
          "Marca «Acceso a clases especiales» u «Open gym» si el plan los incluye.",
          "Deja marcada «Renovación automática» si el plan se renueva solo (viene marcada); desmárcala si prefieres registrar cada pago a mano.",
          "Ajusta la «Penalización no-show (pts)»: los puntos de comunidad que pierde quien reserva y no llega (−10 por defecto; 0 = sin penalización).",
          "Presiona «Crear plan». El plan aparece como una tarjeta con su precio.",
        ],
        nota:
          "El botón «Crear plan» se habilita cuando hay nombre y precio. Escribe el precio solo con números (por ejemplo 350).",
      },
      {
        titulo: "Crear un plan familiar o empresarial",
        pasos: [
          "Presiona «Nuevo plan» y en «Tipo de plan» elige «Familiar» o «Empresarial».",
          "En «Personas que cubre» escribe cuántas personas entran en el paquete (mínimo 2; viene en 4).",
          "Escribe el «Nombre» (por ejemplo «Familiar x4») y el «Precio del paquete (Q)»: es lo que paga el titular por TODO el grupo, no por persona.",
          "Completa lo demás como en cualquier plan y presiona «Crear plan».",
          "Después ve a «Planes grupales» para armar cada familia o empresa con ese plan.",
        ],
        nota:
          "Su tarjeta lleva la etiqueta «Familiar» o «Empresarial» con sus personas, y el precio dice «el paquete». El tipo se elige solo al crearlo: después ya no cambia. Un plan grupal no aparece al asignar plan a un atleta suelto en «Atletas» o «Solicitudes»: se usa creando el grupo.",
      },
      {
        titulo: "Editar un plan",
        pasos: [
          "En «Planes» toca la tarjeta del plan. Se abre su ventana con todo lo que tiene.",
          "Cambia el «Nombre», el «Precio (Q)», la «Duración (días)», el «Límite de clases» o los «Servicios incluidos». En un plan grupal también puedes cambiar el «Precio del paquete (Q)» y las «Personas que cubre».",
          "Marca o desmarca «Acceso a clases especiales», «Open gym» y «Renovación automática».",
          "Ajusta la «Penalización no-show (pts)» (0 = sin penalización).",
          "Presiona «Guardar».",
        ],
        nota:
          "Cambiar «Renovación automática» en el plan vale para los atletas a los que se lo asignes desde ahora. A los que ya tienen el plan no les cambia: eso se corrige en la ficha de cada atleta, en «Atletas». Las personas que cubre un plan grupal aplican a sus grupos, salvo a los que tienen cupos pactados propios.",
      },
      {
        titulo: "Prender, apagar o eliminar un plan",
        pasos: [
          "Toca la tarjeta del plan.",
          "Para dejar de ofrecerlo, apaga «Activo» y presiona «Guardar». Para volver a ofrecerlo, préndelo y guarda. Un aviso te confirma si quedó activado o desactivado; si no se pudo, te dice por qué.",
          "Para quitarlo del todo presiona «Eliminar» y confirma.",
        ],
        nota:
          "Un plan apagado se ve atenuado y con la etiqueta «Inactivo». Al eliminar un plan, la pantalla te avisa que las membresías con ese plan quedarán sin plan. Si solo quieres dejar de ofrecerlo, apágalo en vez de eliminarlo.",
      },
      {
        titulo: "Activar un servicio nuevo",
        pasos: [
          "Si hay servicios por activar, junto a «Planes» sale en amarillo «1 servicio pendiente» (o cuántos son). Tócalo para bajar a «Servicios y su cobro».",
          "Toca la tarjeta amarilla del servicio, la que dice «Pendiente». Los pendientes salen primero.",
          "En «Cobro» elige «Incluido» (viene con la membresía) o «Pago extra».",
          "Si es pago extra, elige el «Tipo» («Recurrente» o «Pase único»), el «Precio (Q)» y la «Vigencia (días)».",
          "En «Planes que lo incluyen» elige los planes. Si es incluido, asígnalo al menos a un plan.",
          "Presiona «Activar servicio».",
        ],
        nota:
          "Los servicios que creas en la pestaña «Servicios» de «Clases» llegan aquí como pendientes. Hasta que los actives no se pueden agendar ni los ven tus atletas. En los planes que elijas, el atleta verá «tu plan ya lo incluye».",
      },
      {
        titulo: "Cambiar el cobro de un servicio activo",
        pasos: [
          "En «Servicios y su cobro» toca la tarjeta del servicio. Cada tarjeta dice cómo se cobra y en qué planes está.",
          "Cambia el cobro, el precio, la vigencia o los planes que lo incluyen.",
          "Presiona «Guardar cambios».",
        ],
      },
      {
        titulo: "Crear una oferta o promoción",
        pasos: [
          "En «Ofertas» presiona «Nueva oferta».",
          "Escribe el «Nombre de la oferta» (por ejemplo «Promo verano»).",
          "En «Tipo» elige «Descuento %» o «Meses gratis».",
          "Escribe el porcentaje (de 0 a 100) o cuántos meses gratis.",
          "Si solo aplica a un plan, elígelo en «Plan». Vacío, aplica a cualquier plan.",
          "Si tiene vigencia, pon «Válida desde» y «Válida hasta».",
          "Presiona «Crear oferta».",
        ],
        nota:
          "La oferta no se aplica sola: se elige al asignar el plan a un atleta, en «Atletas» o en «Solicitudes». Un descuento en porcentaje recalcula la cuota; los meses gratis corren el vencimiento. Una oferta ya creada no se edita: si cambian las condiciones, crea otra y apaga o elimina la vieja.",
      },
      {
        titulo: "Prender, apagar o eliminar una oferta",
        pasos: [
          "En «Ofertas» toca la tarjeta de la oferta.",
          "Usa el interruptor «Activa» para prenderla o apagarla. Cambia en el momento: un aviso te confirma si quedó activada o desactivada; si no se pudo, te dice por qué y el interruptor queda como estaba.",
          "Para quitarla del todo presiona «Eliminar» y confirma. «Cerrar» cierra la ventana sin cambiar nada.",
        ],
        nota: "Solo las ofertas activas aparecen al asignar un plan.",
      },
    ],
    conceptos: [
      {
        termino: "Plan",
        detalle:
          "Lo que le cobras a un atleta por ser miembro: precio, cada cuántos días se renueva, cuántas clases incluye y qué servicios trae. Su tarjeta dice el precio, los días, las clases y los servicios.",
      },
      {
        termino: "Plan familiar / empresarial",
        detalle:
          "Un paquete para varias personas que paga una sola (el titular) desde su app. Su precio es el del paquete completo («el paquete» en la tarjeta), no por persona. Cada miembro entrena con su propia membresía.",
      },
      {
        termino: "Límite de clases",
        detalle: "Cuántas clases incluye el plan en cada periodo. Vacío significa sin límite («clases sin límite» en la tarjeta).",
      },
      {
        termino: "Penalización no-show",
        detalle:
          "Puntos de comunidad que se le restan al atleta cuando reserva una clase y no llega. Se le avisa.",
      },
      {
        termino: "Renovación manual",
        detalle:
          "Sale en la tarjeta del plan que no se renueva solo. Se fija al crear o editar el plan y lo hereda el atleta al asignárselo; para cada atleta lo puedes corregir en su ficha, en «Atletas».",
      },
      {
        termino: "Pendiente / Activo (servicio)",
        detalle:
          "Pendiente (tarjeta amarilla): todavía no tiene cobro definido, así que no se puede agendar ni lo ven tus atletas. Activo: ya se puede usar. Inactivo (atenuado): lo apagaste en «Clases».",
      },
      {
        termino: "Incluido / Pago extra",
        detalle:
          "Incluido: viene con la membresía de los planes que elijas. Pago extra: el atleta lo paga aparte, con su propio precio y vigencia.",
      },
      {
        termino: "Recurrente / Pase único",
        detalle:
          "Solo para servicios de pago extra. Recurrente se cobra en cada periodo; pase único se paga una sola vez.",
      },
      {
        termino: "Descuento % / Meses gratis",
        detalle:
          "Los dos tipos de oferta. El descuento baja la cuota en ese porcentaje; los meses gratis corren el vencimiento.",
      },
      {
        termino: "Vigencia (oferta)",
        detalle:
          "Desde y hasta cuándo vale la oferta. «Sin fecha» significa que no tiene límite. Si la fecha final ya pasó, la tarjeta dice «Vencida».",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudieron cargar los planes del gimnasio.»",
        solucion:
          "La carga falló: no es que no tengas planes. Presiona reintentar antes de crear uno, para no duplicarlos.",
      },
      {
        sintoma: "Al activar un servicio sale «Revisa el precio (si es pago extra) o asígnalo a un plan (si es incluido).»",
        solucion:
          "Si es de pago extra, ponle un precio. Si es incluido, elige al menos un plan en «Planes que lo incluyen».",
      },
      {
        sintoma: "Dice «Aún no hay servicios. Créalos en Clases → Servicios.»",
        solucion: "Ve a «Clases», pestaña «Servicios», crea el servicio y regresa aquí a activarlo.",
      },
      {
        sintoma: "En «Planes que lo incluyen» dice «Crea un plan primero».",
        solucion: "Todavía no tienes planes. Crea uno con «Nuevo plan».",
      },
      {
        sintoma: "Sale «No se pudo crear el plan.» o «No se pudo crear la oferta.»",
        solucion:
          "Revisa los datos: el precio va solo con números y el porcentaje entre 0 y 100. Si el mensaje dice otra cosa, corrige lo que indica. La ventana sigue abierta con lo que escribiste.",
      },
      {
        sintoma: "Mi oferta no aparece al asignar un plan.",
        solucion:
          "Abre su tarjeta y revisa que esté «Activa», que no diga «Vencida» y que su plan sea el que estás asignando o «Cualquier plan».",
      },
    ],
    relacionadas: [
      { label: "Clases", href: "/panel/clases" },
      { label: "Planes grupales", href: "/panel/planes-grupales" },
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Solicitudes", href: "/panel/solicitudes" },
    ],
  },

  "/panel/planes-grupales": {
    titulo: "Planes grupales",
    paraQue:
      "Aquí armas las familias y los convenios con empresas: una sola persona (el titular) paga el paquete desde su app y cada miembro entrena con su propia membresía, con sus puntos y su historial. También das de alta a los niños que no tienen correo.",
    tareas: [
      {
        titulo: "Crear un grupo",
        pasos: [
          "Primero necesitas un plan familiar o empresarial: si no tienes, la pantalla te lo dice y el botón «Ir a Planes y cuotas» te lleva a crearlo.",
          "Presiona «Nuevo grupo». Se abre una ventana.",
          "Elige «Familiar» o «Empresarial».",
          "Escribe el «Nombre del grupo» (por ejemplo «Familia Pérez») y elige el «Plan».",
          "En «Titular (quien paga desde su app)» elige «Ya es del gimnasio» y búscalo, o «Por su correo» si no entrena aquí (por ejemplo, el contacto de recursos humanos de la empresa).",
          "Si pactaste otro precio o más cupos con ellos, escríbelos en «Precio pactado (Q)» y «Cupos pactados». Vacíos, valen los del plan.",
          "En un grupo empresarial escribe el «NIT de la empresa», la «Razón social» y el «Correo para la factura»: la factura sale a nombre de la empresa.",
          "Presiona «Crear grupo». Se abre su ficha para que agregues a los miembros.",
        ],
        nota:
          "El titular por correo tiene que tener ya una cuenta en Nucleo. El titular no queda como miembro automáticamente: si también entrena, agrégalo como miembro.",
      },
      {
        titulo: "Agregar a un miembro",
        pasos: [
          "Toca la tarjeta del grupo para abrir su ficha.",
          "Junto a «Miembros» presiona «Agregar miembro».",
          "Elige «Ya es del gimnasio» y búscalo, o «Invitar por correo» y escribe su «Correo», «Nombre» y «Apellido».",
          "Presiona «Agregar al grupo». Vuelves a la ficha con la persona ya en la lista.",
        ],
        nota:
          "Desde ese momento su cuota la paga el titular: toma el plan del grupo y ya no se le cobra aparte. Si el grupo ya está pagado, queda activo al instante. Si el grupo ya ocupó sus cupos, el botón se apaga y la ficha dice «Grupo lleno»: sube los «Cupos pactados» en «Editar grupo».",
      },
      {
        titulo: "Dar de alta a un niño sin correo (dependiente)",
        pasos: [
          "Abre la ficha de un grupo familiar.",
          "Junto a «Miembros» presiona «Agregar niño».",
          "Escribe su «Nombre» y «Apellido» y, si quieres, su «Fecha de nacimiento».",
          "Elige su «Tutor»: el titular (viene puesto) o un adulto del grupo.",
          "Presiona «Dar de alta».",
        ],
        nota:
          "El niño no entra al app. Cualquier adulto de la familia le reserva clases y le marca la asistencia desde su propio teléfono, y los avisos del niño le llegan a su tutor. Cuando tenga correo, su tutor le puede dar su propia cuenta desde el app y conserva todo su historial.",
      },
      {
        titulo: "Sacar a alguien del grupo",
        pasos: [
          "En la ficha del grupo, presiona «Quitar» junto al miembro y confirma.",
          "Ve a «Atletas» y asígnale un plan individual antes de su próximo cobro.",
        ],
        nota: "Sigue siendo miembro del gimnasio y conserva los días que el grupo ya pagó, pero queda sin plan.",
      },
      {
        titulo: "Cambiar el precio, los cupos o los datos de factura",
        pasos: [
          "En la ficha del grupo presiona «Editar grupo».",
          "Cambia el «Nombre del grupo», el «Precio pactado (Q)», los «Cupos pactados» o los datos de factura («NIT para la factura», «Nombre en la factura», «Correo para la factura»).",
          "Presiona «Guardar cambios». La flecha de arriba o «Cancelar» te regresan a la ficha sin guardar.",
        ],
        nota:
          "No se pueden dejar menos cupos que miembros. El tipo, el titular y el plan no se cambian: para eso cierra el grupo y crea otro.",
      },
      {
        titulo: "Cerrar un grupo",
        pasos: [
          "En la ficha del grupo presiona «Editar grupo».",
          "Abajo a la izquierda presiona «Cerrar grupo» y confirma.",
          "Para verlo después, activa «Ver cerrados» arriba de los grupos.",
        ],
        nota:
          "Todos siguen siendo miembros con los días ya pagados, pero el titular deja de pagar por ellos: cada uno necesitará un plan individual. Un grupo cerrado se ve atenuado y con la etiqueta «Cerrado».",
      },
    ],
    conceptos: [
      {
        termino: "Tarjeta del grupo",
        detalle:
          "Dice quién paga, el precio del paquete, el plan, cuántas personas lleva de su cupo y hasta cuándo está pagado.",
      },
      {
        termino: "Titular",
        detalle:
          "La persona que paga la cuota de todo el grupo desde su app. Es la única que ve el precio y la cuota pendiente.",
      },
      {
        termino: "Cuota pendiente",
        detalle:
          "El grupo tiene un cobro esperando a que el titular lo pague en su app: su tarjeta sale en amarillo, primero en la lista, y arriba se cuenta cuántos grupos están así. Cuando paga, todos los miembros quedan al día a la vez.",
      },
      {
        termino: "Sin pagar aún",
        detalle: "El grupo todavía no ha pagado su primer ciclo, así que nadie se ha activado por él.",
      },
      {
        termino: "Dependiente",
        detalle: "Un niño sin correo ni app propia. Tiene su propio historial y puntos; lo opera su familia.",
      },
      {
        termino: "Vencido (grupo)",
        detalle:
          "El titular no pagó a tiempo: todos los miembros quedan en mora a la vez. El aviso de pago le llega solo al titular, no a cada miembro.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Nuevo grupo» está apagado.",
        solucion:
          "No tienes ningún plan familiar o empresarial activo. Créalo en «Planes y cuotas» con «Nuevo plan», eligiendo «Familiar» o «Empresarial» en «Tipo de plan».",
      },
      {
        sintoma: "Sale «No encontramos al titular».",
        solucion:
          "Ese correo no tiene cuenta en Nucleo. Invítalo primero en «Solicitudes» y luego crea el grupo eligiéndolo en «Ya es del gimnasio».",
      },
      {
        sintoma: "«Agregar miembro» y «Agregar niño» están apagados.",
        solucion: "El grupo ya ocupó sus cupos. Súbelos en «Editar grupo», en «Cupos pactados».",
      },
      {
        sintoma: "A un miembro no le puedo asignar plan en «Atletas».",
        solucion: "Su plan lo define el grupo. Sácalo del grupo aquí y después asígnale su plan individual.",
      },
    ],
    relacionadas: [
      { label: "Planes y cuotas", href: "/panel/planes" },
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Solicitudes", href: "/panel/solicitudes" },
    ],
  },
};
