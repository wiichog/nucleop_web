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
        "En «Movimientos registrados» verás la lista, del movimiento más reciente al más antiguo.",
        "Cada fila dice la «Fecha», «Quién» lo hizo y «Qué hizo».",
      ],
      nota:
        "La columna «Quién» muestra el rol de la persona (por ejemplo «Admin de gym» o «Coach»), no su nombre. Si el movimiento lo hizo un atleta o el sistema solo, dice «Sistema/atleta».",
    },
    {
      titulo: "Descargar la bitácora completa",
      pasos: [
        "Presiona «Exportar CSV», arriba a la derecha.",
        "Se descarga el archivo «auditoria-nucleo.csv», que puedes abrir en Excel.",
      ],
      nota:
        "El archivo trae la fecha, el rol, la descripción y un detalle técnico de cada movimiento. La exportación misma también queda anotada en la bitácora.",
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
        "El rol con el que se hizo el movimiento: «Admin de gym», «Coach», «Personal trainer», «Admin de club» o «Superadmin». «Sistema/atleta» significa que no lo hizo nadie de tu equipo.",
    },
    {
      termino: "Qué hizo",
      detalle: "La descripción del movimiento en palabras.",
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
      "Es la portada del panel: lo que tienes pendiente por resolver, cuánto ingresó en el periodo que elijas y cómo está tu comunidad hoy. Revísalo antes de abrir el box.",
    tareas: [
      {
        titulo: "Resolver lo que está pendiente",
        pasos: [
          "Arriba verás «Pendientes por resolver» con el total y una pastilla por cada tipo de pendiente (por ejemplo «Solicitudes por revisar» o «Coaches por aprobar»).",
          "Presiona una pastilla: te lleva directo a la pantalla donde se resuelve.",
          "Cuando ya no queda nada, aparece «Todo al día · No hay pendientes por aprobar.»",
        ],
        nota:
          "Solo salen las pastillas que tienen algo. Las mismas cuentas aparecen en la campana de arriba y en los números del menú lateral.",
      },
      {
        titulo: "Ver los números de un periodo",
        pasos: [
          "En «Periodo» elige la fecha «Desde» y la fecha «Hasta».",
          "Al cambiarlas se actualizan solos los ingresos, pagos, nuevos atletas, check-ins y los números de «Entrenamiento en el periodo».",
        ],
        nota: "Al entrar, el periodo va del primer día del mes a hoy.",
      },
    ],
    conceptos: [
      {
        termino: "Ingresos del periodo",
        detalle:
          "Todo lo cobrado con éxito en las fechas elegidas, en quetzales. Debajo se separa en «Tarjeta» (cobrado en línea) y «Manual» (efectivo, transferencia o terminal física).",
      },
      {
        termino: "Pagos / nuevos atletas / check-ins",
        detalle:
          "Cuántos pagos se cobraron, cuántas membresías empezaron y cuántas asistencias se registraron en el periodo.",
      },
      {
        termino: "Clases más demandadas",
        detalle:
          "Las 5 clases con más reservas en las fechas elegidas, agrupadas por servicio y hora (por ejemplo «CrossFit 6:00»). Solo cuenta las clases de esas fechas y no cuenta las reservas canceladas. Si no hay ninguna sale «Sin reservas registradas en el periodo.»",
      },
      {
        termino: "Entrenamiento en el periodo",
        detalle:
          "«WODs publicados», «Resultados de WOD» (scores que subieron tus atletas), «Nuevos PRs» validados en tu gimnasio y «Servicios activos».",
      },
      {
        termino: "Atletas activos",
        detalle:
          "Membresías vigentes en este gimnasio hoy. No depende del periodo que elijas.",
      },
      {
        termino: "Morosos",
        detalle: "Membresías con el pago vencido, hoy. No cuenta a quienes ya se dieron de baja ni las solicitudes rechazadas, así que coincide con el número de pendientes. No depende del periodo.",
      },
      {
        termino: "Por vencer",
        detalle: "Membresías cuyo pago está por vencer, hoy. Igual que «Morosos», no cuenta bajas ni rechazadas. No depende del periodo.",
      },
      {
        termino: "Servicios",
        detalle: "Cuántas disciplinas tienes activas en tu catálogo.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudo cargar la información. Intenta de nuevo.»",
        solucion: "Presiona «Reintentar».",
      },
      {
        sintoma: "Los ingresos no cuadran con lo que esperaba.",
        solucion:
          "Revisa las fechas de «Desde» y «Hasta»: solo cuentan los pagos cobrados con éxito dentro de ese rango. El detalle de cada pago está en «Membresías».",
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
          "En «Invitar coach» escribe su «Correo». «Nombre» y «Apellido» son opcionales.",
          "Presiona «Invitar».",
          "Verás «Invitación enviada. El coach debe reclamar su cuenta y aceptar.»",
        ],
        nota:
          "Nucleo le crea su cuenta; el coach la reclama y acepta para quedar activo. Mientras tanto aparece en «Solicitudes de coaches» como «Invitación enviada», con el texto «Esperando que el coach acepte».",
      },
      {
        titulo: "Aceptar o rechazar a un coach que pidió unirse",
        pasos: [
          "Ve a «Solicitudes de coaches». Los que pidieron entrar dicen «Solicitó unirse».",
          "Presiona «Aprobar» para sumarlo a tu equipo, o «Rechazar».",
        ],
        nota:
          "Al aprobar sale el aviso de que ya es coach de tu gimnasio. Las invitaciones que tú mandaste no se aprueban aquí: las decide el coach.",
      },
      {
        titulo: "Permitir o quitar que un coach suba el workout",
        pasos: [
          "En «Coaches del gimnasio» busca al coach (puedes usar «Buscar coach…»).",
          "Prende o apaga el interruptor de la columna «Sube el workout».",
        ],
        nota:
          "Prendido, el coach puede crear, editar y publicar el workout del día. Apagado, solo lo ve.",
      },
      {
        titulo: "Ver el perfil de un coach",
        pasos: [
          "En «Coaches del gimnasio», toca la fila del coach.",
          "Se abre «Perfil del coach» con su estado, su «Forma de pago» y su salario fijo o «Tarifa por clase».",
        ],
        nota:
          "Aquí solo se consulta. La tarifa se cambia en «Pagos a coaches».",
      },
    ],
    conceptos: [
      {
        termino: "Coaches activos / En el equipo",
        detalle:
          "«Coaches activos» son los que están marcados como activos en tu equipo; «En el equipo» cuenta a todos, activos e inactivos.",
      },
      {
        termino: "Pago por clase / Salario fijo",
        detalle:
          "Cómo se le paga a cada coach: un monto por cada clase que da, o un salario fijo. En la tabla aparece como «Por clase» o «Salario fijo».",
      },
      {
        termino: "Solicitudes",
        detalle:
          "Cuántas personas pidieron unirse o tienen invitación pendiente.",
      },
      {
        termino: "Solicitó unirse / Invitación enviada",
        detalle:
          "«Solicitó unirse»: el coach pidió entrar y te toca decidir. «Invitación enviada»: tú lo invitaste y le toca a él aceptar.",
      },
      {
        termino: "Calificación",
        detalle:
          "El promedio de estrellas que le dan tus atletas, con el número de calificaciones entre paréntesis. «—» si todavía no tiene.",
      },
      {
        termino: "Activo / Inactivo",
        detalle: "Si el coach sigue en tu equipo o ya no.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudo invitar (¿correo ya activo como coach?).»",
        solucion:
          "Revisa que el correo esté bien escrito y que esa persona no sea ya coach de tu gimnasio (búscala en «Coaches del gimnasio»).",
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
          "En «Bandeja» toca el reporte. A la derecha se abre la «Conversación».",
          "Lee lo que escribió el atleta y, si mandó foto, tócala para verla en grande.",
          "Escribe en «Escribe una respuesta…» y presiona «Responder».",
        ],
        nota:
          "El atleta recibe un aviso de que respondiste. Si el reporte estaba «Abierto», al responder pasa solo a «En progreso».",
      },
      {
        titulo: "Cambiar el estado o cerrar un reporte",
        pasos: [
          "Abre el reporte.",
          "Arriba a la derecha elige «Abierto», «En progreso» o «Resuelto».",
          "Si eliges «Resuelto», confirma el aviso: se le notifica al atleta.",
        ],
        nota:
          "Para reabrir uno que ya estaba resuelto también te pide confirmar. Si el atleta contesta en un reporte resuelto, se reabre solo y vuelve a «En progreso».",
      },
      {
        titulo: "Filtrar la bandeja",
        pasos: [
          "Usa las pastillas «Todos», «Abiertos», «En progreso» o «Resueltos».",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Abierto",
        detalle: "Nadie del gimnasio lo ha contestado todavía.",
      },
      {
        termino: "En progreso",
        detalle: "Ya lo estás atendiendo, o el atleta lo reabrió.",
      },
      {
        termino: "Resuelto",
        detalle: "Cerrado. El atleta recibió el aviso de que quedó resuelto.",
      },
      {
        termino: "Categoría",
        detalle:
          "Aparece debajo del asunto: «Cobros/pagos», «Instalaciones», «Clases/horarios», «Personal», «Seguridad» u «Otro». La elige el atleta.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «Sin tickets».",
        solucion:
          "No hay reportes con ese filtro. Prueba con «Todos». Los reportes los crean tus atletas desde su app.",
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
      "Aquí cambias lo que tus atletas y la red de Nucleo ven de tu gimnasio: nombre, logo, descripción y ubicación. Arriba ves cómo queda antes de guardar.",
    tareas: [
      {
        titulo: "Cambiar el nombre, el logo o la descripción",
        pasos: [
          "En «Nombre, logo y descripción» escribe el «Nombre del gimnasio» (es obligatorio).",
          "En «Logo (URL)» pega el enlace directo a la imagen, empezando con https://. Cuadrada se ve mejor.",
          "En «Descripción» cuenta en dos líneas qué se entrena y para quién.",
          "Revisa la «Vista previa del atleta», arriba: cambia mientras escribes.",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "El logo no se sube desde aquí: tiene que estar ya publicado en internet y tú pegas su enlace.",
      },
      {
        titulo: "Poner tu ubicación",
        pasos: [
          "En «Dónde estás» escribe la «Zona o ciudad» (por ejemplo «Zona 15, Guatemala»): es lo que sale bajo el nombre.",
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
          "Prende o apaga «Aparecer en el directorio público de Nucleo».",
          "Presiona «Guardar ficha».",
        ],
        nota:
          "Prendido, cualquier atleta de la red puede encontrarte y pedir entrar. Apagado, solo te encuentran quienes ya son de la casa o tienen tu invitación.",
      },
      {
        titulo: "Deshacer lo que escribiste",
        pasos: [
          "Presiona «Descartar cambios»: la ficha vuelve a como estaba guardada.",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Vista previa del atleta",
        detalle:
          "Así se ve la tarjeta de tu gimnasio en el app. Si no hay ubicación dice «Sin ubicación»; si no hay descripción, te sugiere escribir una.",
      },
      {
        termino: "Directorio público",
        detalle:
          "El buscador de gimnasios de la red de Nucleo donde los atletas encuentran boxes nuevos.",
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
