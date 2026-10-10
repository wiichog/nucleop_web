import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Operación» del menú. */
export const manualesOperacion: ManualesPorRuta = {
  "/panel/clases": {
    titulo: "Clases y workouts",
    paraQue:
      "Aquí se arma todo lo que pasa en el box: qué disciplinas ofreces, a qué hora se dan, quién las da, quién llegó y qué workout toca cada día. También defines los pases para visitantes.",
    tareas: [
      {
        titulo: "Crear un servicio (CrossFit, Pilates, Open Gym…)",
        pasos: [
          "Entra a la pestaña «Servicios».",
          "En «Nuevo servicio» escribe el nombre y elige un color.",
          "Ajusta los minutos y el cupo por defecto. Se usan como punto de partida al ponerlo en el horario.",
          "Si quieres, agrega «Puntos al completar», una descripción, «Cómo funciona» y una foto. Es lo que verán tus atletas en el app.",
          "Activa «Requiere workout» si las clases de este servicio llevan workout del día y tablero de scores.",
          "Presiona «Crear servicio».",
        ],
        nota:
          "El servicio nace «Pendiente». Para poder agendarlo y que lo vean tus atletas, ve a «Planes y cuotas», defínele su cobro (incluido o pago extra), asígnalo a un plan y actívalo.",
      },
      {
        titulo: "Armar el horario semanal",
        pasos: [
          "Entra a la pestaña «Horario semanal».",
          "En «Agregar al horario» elige el servicio, la hora, los minutos, el cupo y, si ya lo sabes, el coach.",
          "Marca los días de la semana en que se repite (puedes marcar varios a la vez).",
          "Elige desde qué fecha aplica. Pon una fecha «Hasta» o deja activado «Sin fecha de fin» para que se repita siempre.",
          "Presiona «Agregar».",
        ],
        nota:
          "Las clases de las próximas semanas se generan solas a partir del horario. Si cambiaste varias franjas y el calendario no cuadra, presiona «Regenerar calendario»: quita las clases sobrantes que no tienen reservas y vuelve a generar las próximas semanas.",
      },
      {
        titulo: "Cambiar o quitar una franja del horario",
        pasos: [
          "En la pestaña «Horario semanal», busca la franja en la tabla «Horario actual».",
          "Usa «Editar» para cambiar hora, minutos, cupo o coach, o «Quitar del horario» para sacarla.",
        ],
      },
      {
        titulo: "Asignar un coach a una clase",
        pasos: [
          "Entra a la pestaña «Clases» y elige «Hoy» o «Próximas».",
          "En la fila de la clase presiona «Coach».",
          "Elige al coach en «Coach asignado» y presiona «Guardar».",
        ],
        nota:
          "Si prefieres preguntarle antes, elige al coach y presiona «Ofrecerle la clase (decide él)». Puedes dejarle un recado. La clase sigue sin coach hasta que acepte, y la ves en la pestaña «Solicitudes» bajo «Clases que ofreciste».",
      },
      {
        titulo: "Responder cuando un coach pide una clase",
        pasos: [
          "Entra a la pestaña «Solicitudes». El número junto al nombre indica cuántas hay pendientes.",
          "Revisa quién la pide, qué clase es y cuántos inscritos tiene.",
          "Presiona «Asignar la clase» para dársela, o escribe un motivo y presiona «Rechazar».",
        ],
        nota:
          "Al asignarla, las demás solicitudes de esa misma clase se rechazan solas y cada coach recibe el aviso. El motivo del rechazo es opcional, pero el coach lo ve.",
      },
      {
        titulo: "Registrar quién llegó a una clase",
        pasos: [
          "Entra a la pestaña «Clases» y presiona «Asistencia» en la fila de la clase.",
          "Muestra el QR de la clase: cada atleta lo escanea con su app para registrar su asistencia.",
          "Si alguien no puede escanear, búscalo en «Buscar a quien llegó» por nombre o por los últimos dígitos de su teléfono y presiona «Marcar presente».",
        ],
        nota:
          "El registro abre 30 minutos antes de que empiece la clase y cierra una hora después de que termina. Fuera de esa ventana solo se ve lo que ya quedó registrado.",
      },
      {
        titulo: "Cancelar o eliminar una clase",
        pasos: [
          "Entra a la pestaña «Clases» y busca la clase en «Hoy» o «Próximas».",
          "Presiona «Cancelar» para cancelarla avisando a los atletas que habían reservado, o «Eliminar» para borrarla del calendario.",
        ],
        nota:
          "Una clase que ya empezó, o que está en «Pasado», ya no se puede cancelar, eliminar ni cambiar de coach: solo se consulta su asistencia.",
      },
      {
        titulo: "Publicar el workout del día",
        pasos: [
          "Entra a la pestaña «Workout».",
          "Elige la fecha y el servicio (track). Si lo dejas en «General», aplica a todo el gimnasio.",
          "Escribe el título (por ejemplo «Fran»), elige el tipo de score y describe el workout.",
          "Deja activado «Publicar al crear» para que tus atletas lo vean de una vez, o desactívalo para guardarlo como borrador.",
          "Marca «Benchmark» si es un workout de referencia: cuando un atleta mejora su marca se publica un PR en el feed.",
          "Presiona «Crear workout».",
        ],
        nota:
          "Hay un solo workout por servicio y fecha, y lo comparten todas las clases de ese día. Para cambiarlo, edita el que ya existe en vez de crear otro. Tus coaches también pueden subirlo desde el app, salvo a quien le apagues «Sube el workout» en Coaches.",
      },
      {
        titulo: "Publicar, despublicar o borrar un workout",
        pasos: [
          "En la pestaña «Workout», busca el workout en la tabla «Publicadas y borradores».",
          "Usa «Publicar» o «Despublicar» para mostrarlo u ocultarlo en el app, «Benchmark» para marcarlo como referencia, o «Eliminar» para borrarlo.",
        ],
      },
      {
        titulo: "Ver el tablero de scores o cargar uno a mano",
        pasos: [
          "En la pestaña «Workout», presiona «Board» en la fila del workout.",
          "Para cargar un score, elige al atleta, escribe su score (por ejemplo 3:21 o 120) y la modalidad (RX, Scaled o Foundations), y presiona «Registrar».",
          "Con «Board por clase» puedes ver solo los resultados de una hora del día.",
        ],
      },
      {
        titulo: "Permitir o no reservar clases futuras",
        pasos: [
          "Entra a la pestaña «Clases».",
          "En «Reservas de clases» activa o desactiva «Permitir que los atletas reserven clases futuras».",
        ],
        nota: "Si lo desactivas, tus atletas solo podrán reservar las clases del día.",
      },
      {
        titulo: "Crear un pase para visitantes (drop-in)",
        pasos: [
          "Entra a la pestaña «Drop-ins / Pases».",
          "En «Nuevo pase» elige el tipo (una clase, un día, una semana, open gym, clase especial o prueba gratuita).",
          "Si quieres, ponle un nombre (por ejemplo «Pase de día») y escribe el precio en quetzales.",
          "Presiona «Agregar».",
        ],
        nota:
          "El visitante compra el pase desde el app de Nucleo. En «Pases publicados» puedes activarlo o desactivarlo cuando quieras.",
      },
    ],
    conceptos: [
      {
        termino: "Servicio",
        detalle:
          "Una disciplina que ofreces (CrossFit, Pilates, Open Gym). Se define una vez y se reutiliza en el horario.",
      },
      {
        termino: "Pendiente / Activo (servicio)",
        detalle:
          "Pendiente: todavía no tiene cobro ni plan, así que no se puede agendar ni lo ven tus atletas. Se activa en «Planes y cuotas».",
      },
      {
        termino: "Estado (interruptor del servicio)",
        detalle: "Prende o apaga un servicio sin borrarlo.",
      },
      {
        termino: "Horario semanal",
        detalle:
          "La plantilla que se repite cada semana. A partir de ella se generan las clases de las próximas semanas.",
      },
      {
        termino: "Pasado / Hoy / Próximas",
        detalle:
          "Filtros del calendario de clases. «Pasado» muestra los últimos 60 días, del más reciente al más antiguo.",
      },
      {
        termino: "Hoy sin coach / Hoy sin workout",
        detalle:
          "Clases de hoy a las que les falta coach, o que requieren workout y aún no tienen uno publicado. Si hay alguna, sale el aviso «Atención para hoy».",
      },
      {
        termino: "Solicitud de clase",
        detalle:
          "Un coach tuyo pidió dar una clase futura que no tiene coach. No queda asignada hasta que tú la apruebes.",
      },
      {
        termino: "Clase ofrecida",
        detalle:
          "Se la propusiste a un coach desde el calendario. Sigue sin asignar hasta que el coach acepte; te avisamos cuando conteste.",
      },
      {
        termino: "Workout del día",
        detalle:
          "El entrenamiento que toca en una fecha para un servicio. Solo los atletas ven los publicados; los borradores no.",
      },
      {
        termino: "Track",
        detalle:
          "El servicio al que pertenece un workout. «General» significa que aplica a todo el gimnasio.",
      },
      {
        termino: "Tipo de score",
        detalle:
          "Cómo se mide el workout: por tiempo (gana el menor), AMRAP, rounds + reps, carga, EMOM o puntos (gana el mayor).",
      },
      {
        termino: "RX / Scaled / Foundations",
        detalle:
          "La modalidad en que el atleta hizo el workout. El tablero ordena primero RX, luego Scaled y luego Foundations.",
      },
      {
        termino: "Benchmark",
        detalle:
          "Un workout de referencia. Cuando un atleta mejora su marca en él, se publica un PR en el feed.",
      },
      {
        termino: "Visitante con drop-in",
        detalle: "Alguien que entró con un pase temporal, sin ser socio del gimnasio.",
      },
      {
        termino: "Tiempo límite de asignación",
        detalle:
          "Cuántos minutos antes del inicio debe tener coach la clase. Se ajusta al asignar el coach.",
      },
      {
        termino: "Pagar esta clase como extra",
        detalle:
          "Solo aparece con coaches de salario fijo: les suma un monto aparte por dar esa clase.",
      },
    ],
    problemas: [
      {
        sintoma: "No puedo elegir mi servicio al armar el horario.",
        solucion:
          "El servicio sigue «Pendiente». Ve a «Planes y cuotas», defínele su cobro, asígnalo a un plan y actívalo.",
      },
      {
        sintoma: "Agregué una franja y no veo las clases en el calendario.",
        solucion:
          "Revisa que la fecha «Desde» ya haya llegado y presiona «Regenerar calendario» en la pestaña «Horario semanal».",
      },
      {
        sintoma: "Me salió un error a la mitad al agregar varios días.",
        solucion:
          "Los días que sí se crearon se quitan solos de la selección. Revisa el mensaje, corrige y presiona «Agregar» otra vez: no se duplican.",
      },
      {
        sintoma: "El botón «Marcar presente» está apagado.",
        solucion:
          "Debajo del nombre se explica por qué. Si dice «Requiere pase», la persona no es socia y necesita comprar un pase drop-in desde el app.",
      },
      {
        sintoma: "No puedo registrar asistencia.",
        solucion:
          "El registro abre 30 minutos antes de la clase y cierra una hora después de que termina.",
      },
      {
        sintoma: "Me dice que ya existe un workout para ese día.",
        solucion:
          "Solo hay uno por servicio y fecha. Búscalo en «Publicadas y borradores» y edítalo.",
      },
      {
        sintoma: "Un coach me dice que no puede subir el workout.",
        solucion:
          "En Coaches, revisa que tenga activado «Sube el workout». Apagado, el coach solo puede ver la programación.",
      },
      {
        sintoma: "Mis atletas no ven el workout.",
        solucion:
          "Revisa en la tabla que su estado diga «Publicado»; si dice «Borrador», presiona «Publicar».",
      },
      {
        sintoma: "Ya no me aparecen «Coach», «Cancelar» ni «Eliminar» en una clase.",
        solucion:
          "La clase ya empezó. A partir de ese momento solo se consulta su asistencia.",
      },
    ],
    relacionadas: [
      { label: "Planes y cuotas", href: "/panel/planes" },
      { label: "Coaches", href: "/panel/coaches" },
      { label: "Pagos a coaches", href: "/panel/coaches-pagos" },
    ],
  },
};
