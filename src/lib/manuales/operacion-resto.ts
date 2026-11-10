import type { Manual, ManualesPorRuta } from "./tipos";

/**
 * Bitácora de actividad. Vive en dos rutas (`/panel/actividad`, la del menú, y
 * `/panel/auditoria`, la antigua) que pintan la misma pantalla: un solo objeto
 * para que no se desincronicen.
 */
const manualBitacora: Manual = {
  titulo: "Bitácora de actividad",
  paraQue:
    "Es el registro de lo que pasó dentro de tu gimnasio y cuándo: cobros, altas y bajas de atletas, cambios en el catálogo y exportaciones. Sirve para aclarar dudas como quién registró un pago o cuándo se dio de baja a alguien.",
  tareas: [
    {
      titulo: "Revisar qué pasó en el gimnasio",
      pasos: [
        "Entra a «Bitácora de actividad» en el menú.",
        "En «Movimientos» verás la lista, del más reciente al más antiguo. Junto al título está cuántos hay.",
        "Cada fila dice la «Fecha», «Quién» lo hizo y «Qué hizo».",
        "Si la lista es larga, al final presiona «Ver más» para seguir bajando.",
      ],
      nota:
        "La columna «Quién» muestra el nombre de la persona y, debajo, su rol (por ejemplo «Admin de gym» o «Coach»). Si alguien de tu equipo no tiene nombre registrado, verás su correo. Si el movimiento lo hizo el sistema solo, dice «Sistema/atleta».",
    },
    {
      titulo: "Buscar un movimiento o lo que hizo una persona",
      pasos: [
        "Escribe en «Buscar persona o movimiento…», arriba a la derecha. Por ejemplo, el nombre de alguien de tu equipo o «pago».",
        "La lista se queda solo con lo que coincide, y junto a «Movimientos» ves cuántos de cuántos.",
        "Para volver a ver todo, borra lo que escribiste.",
      ],
    },
    {
      titulo: "Ver el detalle de un movimiento",
      pasos: [
        "Toca la fila del movimiento.",
        "Se abre una ventana con la fecha y hora exactas y quién lo hizo.",
        "Si el movimiento cambió algo, debajo aparecen «Antes» y «Después» con lo que había y lo que quedó.",
      ],
    },
    {
      titulo: "Descargar la bitácora completa",
      pasos: [
        "Presiona «Exportar CSV», arriba a la derecha.",
        "Se descarga el archivo «auditoria-nucleo.csv», que puedes abrir en Excel.",
      ],
      nota:
        "El archivo trae todos los movimientos, aunque hayas buscado algo: la fecha, quién lo hizo, su rol, la descripción y un detalle técnico de cada uno. La exportación misma también queda anotada en la bitácora.",
    },
  ],
  conceptos: [
    {
      termino: "Movimiento",
      detalle:
        "Cada cosa que se anotó: un cobro manual, un reembolso, un cambio de estado de una membresía, una venta, un producto o gasto nuevo, una exportación, etc.",
    },
    {
      termino: "Quién",
      detalle:
        "La persona que hizo el movimiento y el rol con el que lo hizo: «Admin de gym», «Coach», «Personal trainer», «Admin de club» o «Superadmin». «Sistema/atleta» significa que no lo hizo nadie de tu equipo.",
    },
    {
      termino: "Qué hizo",
      detalle: "La descripción del movimiento en palabras.",
    },
    {
      termino: "Antes / Después",
      detalle:
        "En el detalle de un movimiento, cómo estaba la información antes del cambio y cómo quedó. No todos los movimientos lo traen.",
    },
  ],
  problemas: [
    {
      sintoma: "Sale «No se pudo cargar la bitácora del gimnasio.»",
      solucion:
        "Presiona «Reintentar». No significa que no haya actividad: la lista no llegó.",
    },
    {
      sintoma: "Sale «Sin actividad registrada.»",
      solucion: "Todavía no se ha anotado ningún movimiento en este gimnasio.",
    },
    {
      sintoma: "Sale «Nada coincide con …»",
      solucion: "Lo que escribiste en la búsqueda no aparece en ningún movimiento. Prueba con menos letras o bórralo.",
    },
    {
      sintoma: "Al exportar sale «No se pudo exportar la bitácora.»",
      solucion:
        "Vuelve a presionar «Exportar CSV». Si sigue fallando, revisa que entraste como administrador del gimnasio: solo el administrador puede ver y exportar la bitácora.",
    },
  ],
  relacionadas: [
    { label: "Membresías", href: "/panel/pagos" },
    { label: "Atletas", href: "/panel/atletas" },
  ],
};

/** Manuales del resto del grupo «Operación» del menú (fuera de Clases). */
export const manualesOperacionResto: ManualesPorRuta = {
  "/panel": {
    titulo: "Dashboard",
    paraQue:
      "Es la portada del panel y responde «¿qué tengo que atender hoy?». Arriba lo que espera tu decisión, luego cómo está tu comunidad hoy y, al final, los números del periodo que elijas. Todo lo que ves se toca y te lleva a la pantalla donde se trabaja.",
    tareas: [
      {
        titulo: "Resolver lo que está pendiente",
        pasos: [
          "Arriba, en «Por atender», el número amarillo junto al título es el total de pendientes.",
          "Cada pendiente sale en una tarjeta amarilla con su número (por ejemplo «Solicitudes por revisar» o «Coaches por aprobar»).",
          "Toca la tarjeta: te lleva directo a la pantalla, y a la pestaña, donde se resuelve.",
          "Cuando ya no queda nada, aparece «Todo al día».",
        ],
        nota:
          "Solo salen las tarjetas que tienen algo. Las mismas cuentas aparecen en la campana de arriba y en los números del menú lateral.",
      },
      {
        titulo: "Ver cómo está tu comunidad hoy",
        pasos: [
          "En «Hoy» ves «Atletas activos», «Clases de hoy sin coach», «Por vencer», «En riesgo» y «Servicios activos».",
          "Toca cualquiera para ir a la lista de esos atletas o clases. «Clases de hoy sin coach» sale en amarillo cuando hay alguna.",
        ],
        nota: "Estos números son de hoy: no cambian con el periodo que elijas abajo.",
      },
      {
        titulo: "Ver los números de un periodo",
        pasos: [
          "En «Periodo», toca las fechas de la derecha.",
          "En el calendario toca el primer día y luego el último. Los números se actualizan al elegir el segundo día.",
          "Toca una cifra para ir a su pantalla (por ejemplo «Ingresos» te lleva a «Membresías»).",
          "Para más detalle presiona «Reportes →».",
        ],
        nota: "Al entrar, el periodo va del primer día del mes a hoy.",
      },
    ],
    conceptos: [
      {
        termino: "Por atender",
        detalle:
          "Lo que espera una decisión tuya: solicitudes de atletas, coaches que piden entrar o una clase, posts y comentarios por moderar, apelaciones, clases sin workout en las próximas 48 horas, reportes abiertos, pedidos por entregar, clubes por aprobar, contenido de clubes denunciado, bajas por confirmar y atletas morosos.",
      },
      {
        termino: "Clases de hoy sin coach",
        detalle: "Clases de hoy que todavía no empiezan y no tienen coach asignado.",
      },
      {
        termino: "Por vencer / En riesgo",
        detalle:
          "«Por vencer»: membresías cuyo pago está por vencer. «En riesgo»: atletas activos que dejaron de venir. No cuentan bajas ni solicitudes rechazadas.",
      },
      {
        termino: "Ingresos / Tarjeta / Manual",
        detalle:
          "Todo lo cobrado con éxito en las fechas elegidas, en quetzales, separado en «Tarjeta» (cobrado en línea) y «Manual» (efectivo, transferencia o terminal física).",
      },
      {
        termino: "Pagos / Nuevos atletas / Check-ins",
        detalle:
          "Cuántos pagos se cobraron, cuántas membresías empezaron y cuántas asistencias se registraron en el periodo.",
      },
      {
        termino: "Workouts publicados / Scores subidos / PRs nuevos",
        detalle:
          "Cuántos workouts publicaste, cuántos scores anotaron tus atletas y cuántos PRs nuevos se validaron en tu gimnasio en el periodo.",
      },
      {
        termino: "Clases más demandadas",
        detalle:
          "Hasta 5 clases, las de más reservas en las fechas elegidas, agrupadas por servicio y hora (por ejemplo «CrossFit 6:00»), con una barra para comparar. No cuenta las reservas canceladas. Si no hay ninguna sale «Sin reservas en el periodo.»",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudieron cargar tus pendientes.»",
        solucion: "Presiona «Reintentar». No significa que no tengas pendientes: la lista no llegó.",
      },
      {
        sintoma: "Sale «No se pudo cargar la información. Intenta de nuevo.»",
        solucion: "Presiona «Reintentar».",
      },
      {
        sintoma: "Cambié una fecha y los números no se movieron.",
        solucion: "Elige también el último día del periodo: los números se actualizan cuando las dos fechas están puestas.",
      },
      {
        sintoma: "Los ingresos no cuadran con lo que esperaba.",
        solucion:
          "Revisa las fechas del periodo: solo cuentan los pagos cobrados con éxito dentro de ese rango. El detalle de cada pago está en «Membresías».",
      },
    ],
    relacionadas: [
      { label: "Clases", href: "/panel/clases" },
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Membresías", href: "/panel/pagos" },
      { label: "Reportes de negocio", href: "/panel/reportes" },
    ],
  },

  "/panel/coaches": {
    titulo: "Coaches",
    paraQue:
      "Aquí armas tu equipo de coaches: los invitas, decides quién entra cuando alguien pide unirse y decides quién puede subir el workout del día. La tarifa y lo que se le paga a cada coach se manejan en «Pagos a coaches».",
    tareas: [
      {
        titulo: "Invitar a un coach",
        pasos: [
          "Presiona «Invitar coach», arriba a la derecha.",
          "Escribe su «Correo». «Nombre» y «Apellido» son opcionales.",
          "Presiona «Invitar».",
          "Verás «Invitación enviada. El coach debe reclamar su cuenta y aceptar.»",
        ],
        nota:
          "Nucleo le crea su cuenta; el coach la reclama y acepta para quedar activo. Mientras tanto aparece abajo, en «Invitados», con el texto «Esperando que acepte».",
      },
      {
        titulo: "Cancelar una invitación que no han contestado",
        pasos: [
          "Baja hasta «Invitados» y busca al coach.",
          "Presiona «Cancelar invitación» y confirma.",
        ],
        nota:
          "Sale el aviso «Invitación a … cancelada.» y la fila desaparece. El coach ya no podrá aceptarla; si cambias de idea, invítalo de nuevo.",
      },
      {
        titulo: "Aceptar o rechazar a un coach que pidió unirse",
        pasos: [
          "Los que pidieron entrar salen arriba, en amarillo, con «Solicitó unirse». Junto a «Tu equipo» ves cuántos hay «por aprobar».",
          "Presiona «Aprobar» para sumarlo a tu equipo, o «Rechazar».",
        ],
        nota:
          "Mientras se guarda, solo espera el botón que tocaste en esa fila; las demás no se bloquean. Al aprobar sale el aviso de que ya es coach de tu gimnasio. Las invitaciones que tú mandaste no se aprueban aquí: las decide el coach (tú solo puedes cancelarlas).",
      },
      {
        titulo: "Ver el perfil de un coach",
        pasos: [
          "En «Tu equipo», toca la tarjeta del coach. Si tienes muchos, búscalo en «Buscar coach…».",
          "Se abre «Perfil del coach» con su estado, su calificación, su «Forma de pago» y su salario fijo o «Tarifa por clase».",
        ],
        nota: "Para cambiar la tarifa presiona «Cambiar tarifa →»: te lleva a «Pagos a coaches».",
      },
      {
        titulo: "Permitir o quitar que un coach suba el workout",
        pasos: [
          "Toca la tarjeta del coach para abrir su perfil.",
          "Prende o apaga «Sube el workout».",
        ],
        nota:
          "Prendido, el coach puede crear, editar y publicar el workout del día, y su tarjeta lo dice. Apagado, solo lo ve. Mientras se guarda, el interruptor espera.",
      },
      {
        titulo: "Dar de baja a un coach",
        pasos: [
          "Toca la tarjeta del coach para abrir su perfil.",
          "Presiona «Dar de baja» y confirma.",
        ],
        nota:
          "Sus clases que aún no pasan se quedan sin coach (te aparecen como clases sin coach para que las cubras) y deja de aparecer en tu equipo. No se borra nada: sus clases ya dadas y lo que se le debe siguen en «Pagos a coaches». Para que vuelva, invítalo de nuevo.",
      },
    ],
    conceptos: [
      {
        termino: "Tu equipo",
        detalle:
          "Tus coaches en tarjetas, los activos primero. Cada tarjeta dice si se le paga «Por clase» o «Salario fijo», su calificación si tiene, y si «Sube el workout».",
      },
      {
        termino: "Solicitó unirse / Invitados",
        detalle:
          "«Solicitó unirse»: el coach pidió entrar y te toca decidir (sale en amarillo). «Invitados»: tú lo invitaste y le toca a él aceptar.",
      },
      {
        termino: "Calificación",
        detalle:
          "El promedio de estrellas que le dan tus atletas, con el número de calificaciones entre paréntesis.",
      },
      {
        termino: "Activo / Inactivo",
        detalle:
          "«Inactivo» es un coach que sigue en tu equipo pero no acumula pago por sus clases; su tarjeta se ve atenuada. Un coach que das de baja ya no aparece.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudo invitar (¿correo ya activo como coach?).»",
        solucion:
          "Revisa que el correo esté bien escrito y que esa persona no sea ya coach de tu gimnasio (búscala en «Tu equipo»).",
      },
      {
        sintoma: "Sale «No se pudieron cargar las solicitudes de coaches.»",
        solucion:
          "Presiona «Reintentar». No significa que no haya solicitudes: la lista no llegó.",
      },
      {
        sintoma: "Sale «La API no guardó el permiso. Avisa a soporte de Nucleo.»",
        solucion:
          "El cambio de «Sube el workout» no quedó guardado. Avisa a soporte de Nucleo.",
      },
      {
        sintoma: "Sale «No se pudo cambiar el permiso.» o «No se pudo resolver la solicitud del coach.»",
        solucion: "Vuelve a intentarlo; si sigue, recarga la página.",
      },
    ],
    relacionadas: [
      { label: "Pagos a coaches", href: "/panel/coaches-pagos" },
      { label: "Clases", href: "/panel/clases" },
    ],
  },

  "/panel/tickets": {
    titulo: "Reportes / tickets",
    paraQue:
      "Aquí llegan los reportes que tus atletas mandan desde su app (cobros, instalaciones, clases, personal, seguridad u otro). Contestas, les das seguimiento y los cierras cuando quedan resueltos.",
    tareas: [
      {
        titulo: "Leer y contestar un reporte",
        pasos: [
          "En «Bandeja» toca el reporte. Los abiertos salen primero y en amarillo.",
          "Se abre una ventana con la conversación. Si el atleta mandó foto, tócala para verla en grande.",
          "Escribe en «Escribe una respuesta…» y presiona «Responder».",
        ],
        nota:
          "El atleta recibe un aviso de que respondiste. Si el reporte estaba «Abierto», al responder pasa solo a «En progreso».",
      },
      {
        titulo: "Cambiar el estado o cerrar un reporte",
        pasos: [
          "Toca el reporte para abrirlo.",
          "Arriba elige «Abierto», «En progreso» o «Resuelto».",
          "Si eliges «Resuelto», confirma el aviso: se le notifica al atleta.",
        ],
        nota:
          "Para reabrir uno que ya estaba resuelto también te pide confirmar. Si el atleta contesta en un reporte resuelto, se reabre solo y vuelve a «En progreso».",
      },
      {
        titulo: "Filtrar la bandeja",
        pasos: [
          "Arriba a la derecha elige «Todos», «Abiertos», «En progreso» o «Resueltos».",
        ],
        nota: "Junto a «Bandeja», el número amarillo dice cuántos reportes siguen por atender (abiertos o en progreso).",
      },
    ],
    conceptos: [
      {
        termino: "Abierto",
        detalle: "Nadie del gimnasio lo ha contestado todavía. Sale en amarillo.",
      },
      {
        termino: "En progreso",
        detalle: "Ya lo estás atendiendo, o el atleta lo reabrió.",
      },
      {
        termino: "Resuelto",
        detalle: "Cerrado. El atleta recibió el aviso de que quedó resuelto. Se ve atenuado al final de la bandeja.",
      },
      {
        termino: "Cada fila",
        detalle:
          "El asunto y, debajo, el atleta, la categoría («Cobros/pagos», «Instalaciones», «Clases/horarios», «Personal», «Seguridad» u «Otro»), la fecha y 💬 con cuántos mensajes lleva la conversación.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «Ningún reporte con este filtro.»",
        solucion: "Elige «Todos» arriba a la derecha.",
      },
      {
        sintoma: "Sale «Sin reportes.»",
        solucion: "Todavía no te ha llegado ninguno. Los reportes los crean tus atletas desde su app.",
      },
      {
        sintoma: "Sale «No se pudo responder.» o «No se pudo cambiar el estado.»",
        solucion:
          "Vuelve a intentarlo. Solo el administrador del gimnasio puede contestar y cambiar el estado de los reportes.",
      },
      {
        sintoma: "Sale «No se pudo cargar la información. Intenta de nuevo.»",
        solucion: "Presiona «Reintentar».",
      },
    ],
    relacionadas: [
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Bitácora de actividad", href: "/panel/actividad" },
    ],
  },

  "/panel/actividad": manualBitacora,
  "/panel/auditoria": manualBitacora,

  "/panel/gimnasio": {
    titulo: "Ficha del gimnasio",
    paraQue:
      "Aquí ves y cambias lo que tus atletas y la red de Nucleo ven de tu gimnasio: nombre, logo, descripción y ubicación.",
    tareas: [
      {
        titulo: "Ver cómo te ven tus atletas",
        pasos: [
          "En «Tu ficha» ves tu gimnasio tal como sale en el app: logo, nombre, zona y descripción.",
          "Debajo están la «Dirección», las «Coordenadas» y si apareces en el «Directorio público».",
          "Si algo falta, junto a «Tu ficha» sale en amarillo, por ejemplo «Falta logo, coordenadas».",
        ],
      },
      {
        titulo: "Cambiar el nombre, el logo o la descripción",
        pasos: [
          "Presiona «Editar ficha».",
          "Escribe el «Nombre del gimnasio» (es obligatorio).",
          "En «Logo (URL)» pega el enlace directo a la imagen, empezando con https://. Cuadrada se ve mejor.",
          "En «Descripción» cuenta en dos líneas qué se entrena y para quién.",
          "Arriba de la ventana, la vista previa cambia mientras escribes.",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "El logo no se sube desde aquí: tiene que estar ya publicado en internet y tú pegas su enlace.",
      },
      {
        titulo: "Poner tu ubicación",
        pasos: [
          "Presiona «Editar ficha».",
          "Escribe la «Zona o ciudad» (por ejemplo «Zona 15, Guatemala»): es lo que sale bajo el nombre.",
          "Escribe la «Dirección» exacta, para quien ya va en camino.",
          "Si quieres aparecer ordenado por cercanía, escribe la «Latitud» y la «Longitud» (por ejemplo 14.599512 y -90.518944).",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "Las coordenadas son opcionales, pero sin ellas no apareces ordenado por cercanía cuando un atleta busca gimnasios en el app. Si borras una, se borra la que estaba guardada.",
      },
      {
        titulo: "Salir o entrar al directorio público",
        pasos: [
          "Presiona «Editar ficha».",
          "Prende o apaga «Aparecer en el directorio público de Nucleo».",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "Prendido, cualquier atleta de la red puede encontrarte y pedir entrar. Apagado, solo te encuentran quienes ya son de la casa o tienen tu invitación.",
      },
      {
        titulo: "Deshacer lo que escribiste",
        pasos: [
          "Presiona «Cancelar» (o cierra la ventana): la ficha se queda como estaba guardada.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Vista previa",
        detalle:
          "Así se ve la tarjeta de tu gimnasio en el app. Si no hay ubicación dice «Sin ubicación»; si no hay descripción, te sugiere escribir una.",
      },
      {
        termino: "Directorio público",
        detalle:
          "El buscador de gimnasios de la red de Nucleo donde los atletas encuentran boxes nuevos. En la ficha dice «Apareces» u «Oculto».",
      },
      {
        termino: "Falta …",
        detalle:
          "Lo que le falta a tu ficha para verse completa: «logo», «descripción», «ubicación» (zona o dirección) o «coordenadas».",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «El gimnasio necesita un nombre: es lo primero que ve el atleta.»",
        solucion: "Escribe el «Nombre del gimnasio» y vuelve a guardar.",
      },
      {
        sintoma:
          "Sale «Las coordenadas no son válidas (latitud −90 a 90, longitud −180 a 180).»",
        solucion:
          "Escribe solo números con punto decimal, sin letras ni grados (por ejemplo 14.599512). La latitud va de −90 a 90 y la longitud de −180 a 180. Si no las tienes, déjalas vacías.",
      },
      {
        sintoma: "Sale «No se pudo guardar la ficha del gimnasio.» u otro mensaje sobre el logo.",
        solucion:
          "Lo más común es un «Logo (URL)» que no es un enlace completo. Debe empezar con https://.",
      },
      {
        sintoma: "Sale «La API no guardó la ficha. Avisa a soporte de Nucleo.»",
        solucion: "El cambio no quedó guardado. Avisa a soporte de Nucleo.",
      },
      {
        sintoma: "No encuentro dónde cambiar la comisión o el plan de Nucleo.",
        solucion:
          "No se cambian desde el panel del gimnasio: son parte de tu contrato con Nucleo.",
      },
    ],
    relacionadas: [
      { label: "Clases", href: "/panel/clases" },
      { label: "Atletas", href: "/panel/atletas" },
    ],
  },
};
