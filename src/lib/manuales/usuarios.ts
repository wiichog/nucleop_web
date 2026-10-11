import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Usuarios» del menú. */
export const manualesUsuarios: ManualesPorRuta = {
  "/panel/atletas": {
    titulo: "Atletas del gimnasio",
    paraQue:
      "Es el padrón de tu gimnasio: quién está al día, quién debe, a quién se le vence la cuota y quién está dejando de venir. Desde la ficha de cada atleta le cambias el plan o la cuota, ajustas cómo se le cobra, congelas o bloqueas su membresía y le mandas recordatorios. Solo ves su relación con TU gimnasio, nunca la que tiene con otros.",
    tareas: [
      {
        titulo: "Buscar a un atleta o ver un grupo",
        pasos: [
          "Usa las pastillas de arriba para ver un grupo: «Todos», «Morosos», «Por vencer», «En riesgo», «Bajas», «Congeladas» o «Bloqueadas».",
          "Escribe en «Buscar atleta o plan…» para encontrar a alguien por su nombre o por el nombre de su plan.",
          "Toca el título de una columna («Atleta», «Estado», «Plan», «Miembro desde», «Vencimiento», «Puntos») para ordenar la tabla.",
        ],
        nota:
          "Sin ordenar, la tabla pone primero a los morosos, luego a los que están por vencer y después al resto. Los coaches no ven «Morosos», «Por vencer» ni «En riesgo»: esos grupos y sus cifras son solo para quien administra el gimnasio.",
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
        titulo: "Exportar el padrón",
        pasos: [
          "Elige el grupo y, si quieres, escribe una búsqueda.",
          "Presiona «Exportar CSV».",
        ],
        nota:
          "Se descarga lo que estás viendo en la tabla (con el grupo y la búsqueda aplicados): atleta, estado, plan, cuota, estado de pago, días para vencer y puntos de comunidad.",
      },
      {
        titulo: "Ajustar cuándo alguien cuenta como «en riesgo» o moroso",
        pasos: [
          "Presiona el botón que empieza con «Riesgo … d · gracia … d · corte … d», junto al buscador.",
          "En «Umbral de riesgo del gimnasio» escribe cuántos días sin venir a tu gimnasio marcan a un atleta activo como «en riesgo» (de 1 a 365) y presiona «Guardar».",
          "En «Gracia de pago» escribe cuántos días después del vencimiento el atleta sigue entrenando normal (de 0 a 60) y presiona «Guardar».",
          "En «Corte automático por mora» escribe cuántos días de atraso toleras antes de que la membresía pase sola a vencida (de 1 a 365) y presiona «Guardar».",
        ],
        nota:
          "Cada número se guarda con su propio botón «Guardar». El corte tiene que ser mayor que la gracia de pago. Con gracia 0, el atleta se bloquea el mismo día que vence. Ojo: el atleta aparece en «Morosos» desde el primer día de atraso, aunque esté en gracia; el corte solo decide cuándo pasa a vencida. Este botón solo lo ve quien administra el gimnasio.",
      },
      {
        titulo: "Abrir la ficha de un atleta",
        pasos: [
          "En la fila del atleta presiona «Ver detalle» (en el celular, toca los tres puntos y elige «Ver detalle»).",
          "Se abre la «Ficha del atleta» con su plan, vencimiento, cumpleaños, contacto de emergencia, nivel y objetivos, notas internas, sus pagos y su asistencia en este gimnasio.",
        ],
        nota:
          "Los coaches ven la ficha y los pagos, pero no la administran: no les aparecen «Recordatorio», «Restablecer contraseña», «Plan y cuota», «Cobro y renovación», «Congelamiento», «Acceso al gimnasio» ni «Completar datos del atleta». En la tabla tampoco ven «Desligar» ni «Confirmar baja».",
      },
      {
        titulo: "Mandarle un recordatorio de pago",
        pasos: [
          "En la fila del atleta (o dentro de su ficha) presiona «Recordatorio».",
          "Elige por dónde enviarlo: «Notificación push», «Correo» o «Ambos».",
        ],
        nota:
          "El mensaje sale solo según su vencimiento: si ya venció le dice hace cuántos días, y si no, en cuántos días vence. Solo quien administra el gimnasio puede enviarlo.",
      },
      {
        titulo: "Restablecer la contraseña de un atleta",
        pasos: [
          "Abre su ficha con «Ver detalle».",
          "Presiona «Restablecer contraseña» y confirma.",
        ],
        nota: "Se le envía el restablecimiento y se le pedirá cambiarla al entrar.",
      },
      {
        titulo: "Cambiarle el plan o la cuota",
        pasos: [
          "Abre su ficha con «Ver detalle» y baja a «Plan y cuota».",
          "Elige el «Plan».",
          "Si le cobras distinto al precio del plan, escribe su «Cuota personalizada» en quetzales. Déjala vacía para que pague el precio del plan (así se le quita una cuota personalizada que tuviera).",
          "Si quieres, elige una «Oferta (opcional)».",
          "Lee el aviso que está junto al botón y presiona «Guardar plan y cuota».",
        ],
        nota:
          "Si la membresía está activa, cambiar el plan o la cuota NO mueve el vencimiento: aplica desde el próximo cobro. Si todavía no está activa (aprobada sin plan, en prueba, vencida o pausada), al guardar queda ACTIVA con un vencimiento nuevo contado desde hoy, y no se registra ningún pago. En una pausada además se pierde el congelamiento: si solo querías reanudarla, usa «Reanudar membresía». Una oferta de porcentaje recalcula la cuota y una de meses gratis corre el vencimiento; el mensaje de confirmación te dice la cuota que quedó.",
      },
      {
        titulo: "Cambiar cómo se le cobra",
        pasos: [
          "Abre su ficha con «Ver detalle» y baja a «Cobro y renovación».",
          "Activa o desactiva «Renovación automática».",
          "Elige el «Método de cobro preferido»: «Tarjeta», «Efectivo» o «Transferencia».",
        ],
        nota:
          "Se guarda en cuanto lo cambias. Con renovación automática, el cobro del siguiente ciclo se genera 3 días antes de vencer; sin ella, al vencer hay que registrar el pago a mano. Con tarjeta el cobro va por Pagalo y el atleta paga la cuota más el recargo.",
      },
      {
        titulo: "Congelar una membresía (viaje, lesión, ausencia larga)",
        pasos: [
          "Abre su ficha con «Ver detalle» y baja a «Congelamiento».",
          "Presiona «Congelar membresía».",
          "Escribe el «Motivo (nota interna)»: solo lo ve tu equipo, no el atleta.",
          "Si ya sabes cuándo vuelve, pon el «Retorno previsto (opcional)». Tiene que ser después de hoy.",
          "Presiona «Congelar membresía» para confirmar.",
        ],
        nota:
          "Solo se puede congelar una membresía activa. Mientras está congelada no reserva clases ni se le generan cobros.",
      },
      {
        titulo: "Reanudar una membresía congelada",
        pasos: [
          "Abre su ficha con «Ver detalle» y baja a «Congelamiento».",
          "Presiona «Reanudar membresía» y confirma.",
        ],
        nota:
          "El vencimiento se corre exactamente los días que estuvo congelada: no pierde lo que ya pagó.",
      },
      {
        titulo: "Bloquear el acceso de un atleta",
        pasos: [
          "Abre su ficha con «Ver detalle» y baja a «Acceso al gimnasio».",
          "Presiona «Bloquear acceso».",
          "Escribe el «Motivo». Queda en el historial de la membresía y ya no se puede editar.",
          "Presiona «Bloquear acceso» para confirmar.",
        ],
        nota:
          "Bloquear no es dar de baja: el atleta deja de entrar y de reservar y no se le generan cobros, pero conserva sus puntos de comunidad, su antigüedad y su historial. Se le avisa por el app. Solo se bloquea una membresía activa, en prueba, pausada o vencida. Para cerrar la relación usa «Desligar»; para una deuda no hace falta, el corte por mora ocurre solo.",
      },
      {
        titulo: "Levantar un bloqueo",
        pasos: [
          "Elige la pastilla «Bloqueadas» y abre la ficha del atleta.",
          "En «Acceso al gimnasio» revisa el motivo y la fecha del bloqueo.",
          "Presiona «Levantar bloqueo» y confirma.",
        ],
        nota:
          "La membresía vuelve al estado que tenía antes del bloqueo, no necesariamente a «Activa»: si estaba vencida, vuelve vencida.",
      },
      {
        titulo: "Dar de baja a un atleta (desligar)",
        pasos: [
          "En la fila del atleta presiona «Desligar» (en el celular, tres puntos y «Desligar atleta»).",
          "Confirma. Se le envía una solicitud de baja que el atleta tiene que confirmar en su app.",
        ],
        nota:
          "Mientras el atleta no confirma, la membresía queda en «Baja pendiente» y en la fila aparece «Cancelar baja propuesta» por si te arrepientes. «Desligar» solo aparece en membresías activas, en prueba, pausadas, vencidas, aprobadas sin plan o de drop-in.",
      },
      {
        titulo: "Responder cuando un atleta pide su baja",
        pasos: [
          "Elige la pastilla «Bajas».",
          "En la fila del atleta presiona «Confirmar baja» para cerrar la relación, o «Cancelar» para que siga siendo miembro.",
        ],
        nota: "Al confirmar, el atleta deja de ser miembro del gimnasio.",
      },
      {
        titulo: "Completar los datos de un atleta que diste de alta tú",
        pasos: [
          "Abre su ficha con «Ver detalle».",
          "Abre «Completar datos del atleta».",
          "Llena «Nombre», «Apellido», «Cumpleaños», «Contacto (nombre)», «Contacto (teléfono)» y «Parentesco».",
          "Presiona «Guardar cambios».",
        ],
        nota:
          "Solo aparece mientras el atleta no ha reclamado su cuenta. En cuanto entra al app por primera vez, su perfil pasa a ser suyo y ya solo él puede cambiar esos datos: si hay uno mal, pídele que lo corrija desde su app.",
      },
    ],
    conceptos: [
      {
        termino: "Atletas activos",
        detalle:
          "La cifra grande del encabezado. Debajo dice cuántas relaciones hay en total en el padrón. Las cifras de arriba son de todo el gimnasio, no del grupo que tengas elegido.",
      },
      {
        termino: "Morosos / Por vencer / En riesgo / Congeladas / Bloqueadas (tarjetas)",
        detalle:
          "Cuántos atletas hay en cada situación. «Bloqueadas» solo aparece si hay alguna. Si la lista de riesgo no se pudo cargar, «En riesgo» muestra un guion en vez de un número.",
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
          "Atletas activos que llevan más días sin venir a tu gimnasio que el umbral que definiste. Son los que se están enfriando.",
      },
      {
        termino: "Bajas",
        detalle: "Membresías en «Baja pendiente»: alguien pidió la baja y falta la otra parte.",
      },
      {
        termino: "Congeladas",
        detalle:
          "Membresías pausadas. En la columna «Estado» aparecen como «Pausada».",
      },
      {
        termino: "Estado",
        detalle:
          "En qué punto está la relación del atleta con tu gimnasio: «Activa», «En prueba», «Pausada», «Vencida», «Bloqueada», «Baja pendiente», «Aprobada sin plan», «Drop-in», «Exmiembro», entre otros.",
      },
      {
        termino: "Vencimiento",
        detalle:
          "Cuántos días le quedan a la cuota: verde con días de sobra, amarillo si faltan 7 días o menos, «Vence hoy», o rojo «Vencido hace … d». Pasa el cursor por encima para ver la fecha exacta.",
      },
      {
        termino: "En gracia hasta …",
        detalle:
          "Ya venció, pero está dentro de la gracia de pago de tu gimnasio: debe, pero todavía entrena normal (reserva, entra, publica y compra).",
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
        termino: "Corte automático por mora",
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
        termino: "Pagos y asistencia en este gimnasio",
        detalle:
          "Al final de la ficha: los pagos del atleta (fecha, método, monto y estado) y sus check-ins (clase, fecha y método). Solo los de tu gimnasio.",
      },
    ],
    problemas: [
      {
        sintoma: "La tabla dice «Aprueba solicitudes o invita atletas al gym.»",
        solucion:
          "Todavía no tienes atletas. Ve a «Solicitudes» para aprobar a quien pidió entrar o para invitar atletas.",
      },
      {
        sintoma: "Sale «Ningún atleta en este segmento.»",
        solucion:
          "No hay nadie en el grupo elegido (o con la búsqueda que escribiste). Vuelve a «Todos» o borra la búsqueda.",
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
          "Los números que ves no son necesariamente los de tu gimnasio. Recarga la página antes de cambiar algo.",
      },
      {
        sintoma: "En «Plan y cuota» dice que no se le asigna plan desde aquí.",
        solucion:
          "La membresía está en un estado en el que no se le puede cambiar el plan. Si está bloqueada, levanta el bloqueo primero. Si tiene baja pendiente, respóndela en la pastilla «Bajas». Si es exmiembro o la rechazaste, para que vuelva invítalo desde «Solicitudes» con «Invitar atleta» o pídele que solicite entrar desde su app. Si es una solicitud o una invitación, atiéndela en «Solicitudes».",
      },
      {
        sintoma: "El selector de plan sale vacío o dice «No se pudieron cargar los planes.»",
        solucion:
          "Si dice ese mensaje, la carga falló: recarga la página. Si solo está vacío, crea tus planes en «Planes y cuotas».",
      },
      {
        sintoma: "No veo el botón «Congelar membresía».",
        solucion:
          "Solo se congela una membresía activa. La ficha te dice en qué estado está.",
      },
      {
        sintoma: "No veo el botón «Bloquear acceso».",
        solucion:
          "Solo se bloquea una membresía activa, en prueba, pausada o vencida. Una solicitud o una invitación se rechaza en «Solicitudes».",
      },
      {
        sintoma: "No puedo cambiar el nombre, cumpleaños o contacto de emergencia.",
        solucion:
          "El atleta ya reclamó su cuenta y esos datos son suyos: los edita él desde su app y viajan con él a otros gimnasios. Pídele que los corrija.",
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
    titulo: "Solicitudes e invitaciones",
    paraQue:
      "Aquí llega quien pide entrar a tu gimnasio y aquí invitas a atletas nuevos. Apruebas, ofreces una prueba, pides más información o rechazas, y le asignas el plan con el que queda como miembro activo.",
    tareas: [
      {
        titulo: "Invitar a un atleta",
        pasos: [
          "En «Invitar atleta» escribe su «Correo electrónico», «Nombre» y «Apellido». El «Teléfono (opcional)» puedes dejarlo vacío.",
          "Si quieres que entre a prueba por unos días, elige las fechas «Desde» y «Hasta». No se permiten fechas pasadas.",
          "Presiona «Enviar invitación».",
        ],
        nota:
          "Si pusiste fechas, al aceptar la invitación el atleta queda como temporal (en prueba) entre esas fechas. El botón se habilita cuando llenas correo, nombre y apellido.",
      },
      {
        titulo: "Responder a una solicitud",
        pasos: [
          "Busca la solicitud en «Bandeja de solicitudes». El número junto al título dice cuántas hay.",
          "Si quieres, escribe un «Comentario para el atleta (opcional)».",
          "Presiona «Aprobar», «Ofrecer prueba», «Pedir información» o «Rechazar».",
        ],
        nota:
          "Aprobar no la deja activa todavía: después tienes que asignarle un plan. «Ofrecer prueba» no aparece en las invitaciones que enviaste tú.",
      },
      {
        titulo: "Asignar el plan y activar al atleta",
        pasos: [
          "En la fila de una solicitud aprobada (o de alguien en prueba), elige el plan en «Selecciona plan».",
          "Si le cobras distinto al precio del plan, escribe su «Cuota personalizada» en quetzales. Vacía, paga el precio del plan.",
          "Si quieres, elige una oferta en «Sin oferta».",
          "Presiona «Asignar plan».",
        ],
        nota:
          "Al asignar el plan, el atleta queda como miembro activo al instante, sin registrar ningún pago, y sale de esta bandeja: desde ahí lo ves en «Atletas». Una oferta de porcentaje recalcula la cuota: el mensaje de confirmación te dice la cuota que quedó.",
      },
      {
        titulo: "Buscar una solicitud",
        pasos: [
          "Escribe el nombre en «Buscar atleta…».",
          "Toca «Atleta» o «Estado» en la tabla para ordenar.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Bandeja de solicitudes",
        detalle:
          "Solo muestra lo que todavía necesita que hagas algo: solicitudes, invitaciones, pendientes de aprobación, aprobadas sin plan y en prueba. Las ya resueltas (activas, rechazadas, bajas) viven en «Atletas».",
      },
      {
        termino: "Reingreso",
        detalle:
          "El atleta ya fue miembro de tu gimnasio. Se muestran sus puntos de comunidad y desde qué año es de la casa. Al aprobarlo conserva sus puntos, su antigüedad y su historial: no empieza de cero.",
      },
      {
        termino: "Solicitada / Invitado / Pendiente de aprobación",
        detalle:
          "Todavía no decides. Aquí ves los botones «Aprobar», «Pedir información» y «Rechazar» (y «Ofrecer prueba» si no es una invitación tuya).",
      },
      {
        termino: "Aprobada sin plan / En prueba",
        detalle: "Ya la aceptaste; falta asignarle un plan para que quede activa.",
      },
      {
        termino: "Objetivo",
        detalle: "Lo que el atleta dijo que busca al pedir entrar.",
      },
      {
        termino: "Periodo temporal",
        detalle:
          "Las fechas «Desde» y «Hasta» de una invitación: el atleta entra en prueba durante ese tiempo.",
      },
      {
        termino: "Oferta",
        detalle:
          "Una promoción creada en «Planes y cuotas»: un descuento en porcentaje o meses gratis. Solo salen las activas que aplican al plan elegido.",
      },
    ],
    problemas: [
      {
        sintoma: "La bandeja dice «Las nuevas solicitudes de unión aparecerán aquí.»",
        solucion: "No tienes solicitudes pendientes.",
      },
      {
        sintoma: "Sale «No se pudo enviar la invitación. Verifica los datos.» u otro mensaje en rojo bajo el formulario.",
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
          "Si ya le asignaste plan, salió de la bandeja porque ya es miembro: búscalo en «Atletas». Si solo lo aprobaste, sigue aquí como «Aprobada sin plan».",
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
      "Aquí armas los planes que cobras (mensual, trimestral, por clases), defines cómo se cobra cada servicio de tu catálogo y creas las promociones que puedes aplicar al asignar un plan. También es donde se activan los servicios nuevos para poder agendarlos.",
    tareas: [
      {
        titulo: "Crear un plan",
        pasos: [
          "En «Crear plan» escribe el «Nombre» (por ejemplo «Mensual CrossFit») y el «Precio (Q)». El precio va solo en números (por ejemplo 350): la «Q» ya aparece sola y el campo no acepta letras.",
          "Ajusta la «Duración (días)» (30 por defecto) y, si el plan tiene un tope, el «Límite de clases». Vacío significa sin límite.",
          "En «Servicios incluidos» elige las disciplinas que trae el plan. El atleta lo ve en el app.",
          "Marca «Acceso a clases especiales» u «Open gym» si el plan los incluye.",
          "Deja marcada «Renovación automática» si el plan se renueva solo (viene marcada); desmárcala si prefieres registrar cada pago a mano.",
          "Ajusta la «Penalización no-show (pts)»: los puntos de comunidad que pierde quien reserva y no llega (−10 por defecto; 0 = sin penalización).",
          "Presiona «Crear plan».",
        ],
        nota:
          "El botón se habilita cuando hay nombre y precio. Escribe el precio solo con números (por ejemplo 350).",
      },
      {
        titulo: "Activar un servicio nuevo",
        pasos: [
          "En «Servicios y su cobro» busca el servicio marcado «Pendiente». Los pendientes salen primero.",
          "En «Cobro» elige «Incluido en la membresía» o «Requiere pago extra».",
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
          "En «Servicios y su cobro» busca el servicio marcado «Activo».",
          "Cambia el cobro, el precio, la vigencia o los planes que lo incluyen.",
          "Presiona «Guardar cambios».",
        ],
      },
      {
        titulo: "Crear una oferta o promoción",
        pasos: [
          "En «Crear oferta / promoción» escribe el «Nombre de la oferta» (por ejemplo «Promo verano»).",
          "Elige el «Tipo»: «Descuento %» o «Meses gratis».",
          "Escribe el porcentaje (de 0 a 100) o cuántos meses gratis.",
          "Si solo aplica a un plan, elígelo en «Plan (opcional)». Vacío, aplica a cualquier plan.",
          "Si tiene vigencia, pon «Válida desde» y «Válida hasta».",
          "Presiona «Crear oferta».",
        ],
        nota:
          "La oferta no se aplica sola: se elige al asignar el plan a un atleta, en «Atletas» o en «Solicitudes». Un descuento en porcentaje recalcula la cuota; los meses gratis corren el vencimiento.",
      },
      {
        titulo: "Prender, apagar o eliminar una oferta",
        pasos: [
          "En la tabla «Ofertas» usa el interruptor «Activa» para prenderla o apagarla. Un aviso te confirma si quedó activada o desactivada; si no se pudo, el aviso te dice por qué y el interruptor queda como estaba.",
          "Para quitarla del todo presiona «Eliminar» y confirma.",
        ],
        nota: "Solo las ofertas activas aparecen al asignar un plan.",
      },
      {
        titulo: "Editar un plan",
        pasos: [
          "En la tabla «Planes» presiona «Editar» en la fila del plan.",
          "Cambia el «Nombre», el «Precio (Q)», la «Duración (días)», el «Límite de clases (vacío = sin límite)» o los «Servicios incluidos».",
          "Marca o desmarca «Acceso a clases especiales», «Open gym» y «Renovación automática».",
          "Ajusta la «Penalización no-show (pts)» (0 = sin penalización).",
          "Presiona «Guardar».",
        ],
        nota:
          "Cambiar «Renovación automática» en el plan vale para los atletas a los que se lo asignes desde ahora. A los que ya tienen el plan no les cambia: eso se corrige en la ficha de cada atleta, en «Atletas».",
      },
      {
        titulo: "Prender, apagar o eliminar un plan",
        pasos: [
          "En la tabla «Planes» usa el interruptor «Activo» para prenderlo o apagarlo. Un aviso te confirma si quedó activado o desactivado; si no se pudo, el aviso te dice por qué y el interruptor queda como estaba.",
          "Para quitarlo presiona «Eliminar» y confirma.",
        ],
        nota:
          "Al eliminar un plan, la pantalla te avisa que las membresías con ese plan quedarán sin plan. Si solo quieres dejar de ofrecerlo, apágalo en vez de eliminarlo.",
      },
    ],
    conceptos: [
      {
        termino: "Plan",
        detalle:
          "Lo que le cobras a un atleta por ser miembro: precio, cada cuántos días se renueva, cuántas clases incluye y qué servicios trae.",
      },
      {
        termino: "Límite de clases",
        detalle: "Cuántas clases incluye el plan en cada periodo. Vacío significa sin límite.",
      },
      {
        termino: "Penalización no-show",
        detalle:
          "Puntos de comunidad que se le restan al atleta cuando reserva una clase y no llega. Se le avisa.",
      },
      {
        termino: "Pendiente / Activo (servicio)",
        detalle:
          "Pendiente: todavía no tiene cobro definido, así que no se puede agendar ni lo ven tus atletas. Activo: ya se puede usar.",
      },
      {
        termino: "Incluido en la membresía / Requiere pago extra",
        detalle:
          "Incluido: viene con los planes que elijas. Pago extra: el atleta lo paga aparte, con su propio precio y vigencia.",
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
        detalle: "Desde y hasta cuándo vale la oferta. «—» significa sin fecha.",
      },
      {
        termino: "Renovación auto.",
        detalle:
          "Si el plan se renueva solo por defecto. Se fija al crear o editar el plan y lo hereda el atleta al asignárselo; para cada atleta lo puedes corregir en su ficha, en «Atletas».",
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
        solucion: "Todavía no tienes planes. Crea uno arriba en «Crear plan».",
      },
      {
        sintoma: "Sale «No se pudo crear el plan.» o «No se pudo crear la oferta.»",
        solucion:
          "Revisa los datos: el precio va solo con números y el porcentaje entre 0 y 100. Si el mensaje dice otra cosa, corrige lo que indica.",
      },
      {
        sintoma: "Mi oferta no aparece al asignar un plan.",
        solucion:
          "Revisa que esté «Activa» y que su «Plan» sea el que estás asignando o «Cualquiera».",
      },
    ],
    relacionadas: [
      { label: "Clases", href: "/panel/clases" },
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Solicitudes", href: "/panel/solicitudes" },
    ],
  },
};
