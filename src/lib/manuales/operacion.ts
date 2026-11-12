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
          "Entra a la pestaña «Servicios» y presiona «Nuevo servicio».",
          "Escribe el nombre y elige un color.",
          "Ajusta «Minutos», «Cupo» y «Puntos». Los minutos y el cupo se usan como punto de partida al ponerlo en el horario.",
          "Si quieres, agrega una descripción, «Cómo funciona» y una foto. Es lo que verán tus atletas en el app.",
          "Activa «Lleva workout» si las clases de este servicio llevan workout del día y tablero de scores.",
          "Presiona «Crear servicio».",
        ],
        nota:
          "El servicio nace «Pendiente» y su tarjeta sale en amarillo. Para poder agendarlo y que lo vean tus atletas, presiona «Asígnalo a un plan →» en la tarjeta (te lleva a «Planes y cuotas»), defínele su cobro (incluido o pago extra), asígnalo a un plan y actívalo.",
      },
      {
        titulo: "Armar el horario semanal",
        pasos: [
          "Entra a la pestaña «Horario semanal». Ves la semana como en la pared del box: las horas hacia abajo y los días hacia el lado. Cada clase dice quién la da y cuántos caben.",
          "Presiona «Agregar clase», o toca un espacio vacío (+) de la cuadrícula: así el día y la hora ya vienen puestos.",
          "Elige el servicio, el coach si ya lo sabes, la hora, los minutos y el cupo.",
          "Marca los días en que se repite (puedes marcar varios a la vez).",
          "Elige desde qué fecha aplica. Pon una fecha «Hasta» o deja activado «Sin fecha de fin» para que se repita siempre.",
          "Presiona «Agregar» (o «Agregar 5 clases» si marcaste cinco días).",
        ],
        nota:
          "Arriba de la cuadrícula ves cuántas clases das por semana y cuántas no tienen coach. Las clases sin coach salen en amarillo. Las clases de las próximas semanas se generan solas a partir del horario. Si cambiaste varias clases y el calendario no cuadra, presiona «Regenerar calendario»: quita las clases sobrantes que no tienen reservas y vuelve a generar las próximas semanas.",
      },
      {
        titulo: "Ver solo un servicio (filtrar las tablas)",
        pasos: [
          "En «Horario semanal», «Clases» o «Solicitudes», abre la lista «Todos los servicios» que está arriba a la derecha.",
          "Elige el servicio (por ejemplo CrossFit). Solo ves lo de ese servicio.",
          "Para volver a ver todo, presiona la ✕ de la lista.",
        ],
        nota:
          "El servicio que eliges se queda al cambiar de pestaña: si filtras CrossFit en el horario, en «Clases» y «Solicitudes» también ves solo CrossFit. En «Servicios» la lista sale solo cuando tienes más de seis.",
      },
      {
        titulo: "Cambiar, copiar o quitar una clase del horario",
        pasos: [
          "En la pestaña «Horario semanal», toca la clase en la cuadrícula.",
          "Cambia el coach, la hora, los minutos o el cupo y presiona «Guardar».",
          "Para darla también otros días, presiona «Copiar a otros días»: se abre «Agregar al horario» con todo igual; marca los días y presiona «Agregar».",
          "Para sacarla del horario, presiona «Quitar del horario».",
        ],
        nota:
          "Esto cambia el horario de todas las semanas. Para cambiar una sola clase (por ejemplo, el coach de este lunes), hazlo en la pestaña «Clases».",
      },
      {
        titulo: "Asignar un coach a una clase",
        pasos: [
          "Entra a la pestaña «Clases» y elige el día en la tira de días de arriba. Las clases sin coach salen en amarillo.",
          "Toca la clase y presiona «Asignar coach» (o «Cambiar coach»).",
          "Elige al coach en «Coach asignado» y presiona «Guardar».",
        ],
        nota:
          "Si prefieres preguntarle antes, elige al coach y presiona «Ofrecerle la clase (decide él)». Puedes dejarle un recado. La clase sigue sin coach hasta que acepte, y la ves en la pestaña «Solicitudes» bajo «Ofreciste».",
      },
      {
        titulo: "Responder cuando un coach pide una clase",
        pasos: [
          "Entra a la pestaña «Solicitudes». El número junto al nombre indica cuántas hay pendientes.",
          "En «Te piden» ves quién la pide, qué clase es y cuántos inscritos tiene.",
          "Presiona «Asignar» para dársela. Para no dársela presiona «Rechazar», escribe el motivo si quieres y presiona «Rechazar solicitud».",
        ],
        nota:
          "Al asignarla, las demás solicitudes de esa misma clase se rechazan solas y cada coach recibe el aviso. El motivo del rechazo es opcional, pero el coach lo ve.",
      },
      {
        titulo: "Registrar quién llegó a una clase",
        pasos: [
          "Entra a la pestaña «Clases», elige el día y toca la clase.",
          "Muestra el QR de la clase: cada atleta lo escanea con su app para registrar su asistencia.",
          "Si alguien no puede escanear, búscalo en «Buscar a quien llegó» por nombre o por los últimos dígitos de su teléfono y presiona «Marcar presente».",
          "Abajo, en «Presentes», ves quién ya llegó.",
        ],
        nota:
          "El registro abre 30 minutos antes de que empiece la clase y cierra una hora después de que termina. Fuera de esa ventana solo se ve lo que ya quedó registrado.",
      },
      {
        titulo: "Cancelar o eliminar una clase",
        pasos: [
          "Entra a la pestaña «Clases», elige el día y toca la clase.",
          "Presiona «Cancelar clase» para cancelarla avisando a los atletas que habían reservado, o «Eliminar» para borrarla del calendario.",
        ],
        nota:
          "Una clase que ya empezó ya no se puede cancelar, eliminar ni cambiar de coach: solo se consulta su asistencia.",
      },
      {
        titulo: "Publicar el workout del día",
        pasos: [
          "Entra a la pestaña «Workout». Arriba eliges el programa (CrossFit, Pilates…) y ves su semana. Los días que faltan por programar salen en amarillo.",
          "Presiona «Programar» en el día, o el botón «Programar» de arriba (abre el primer día que falta).",
          "Revisa la «Fecha» y el «Programa». «General (todo el gimnasio)» aplica a todas las clases de ese día.",
          "Arma los bloques: pega la rutina en «Pega el workout (opcional)» y presiona «Armar bloques desde el texto», o agrégalos uno por uno con «Agregar bloque».",
          "Deja activado «Publicar ya» para que tus atletas lo vean de una vez, o desactívalo para guardarlo como borrador.",
          "Presiona «Publicar workout» (o «Guardar borrador»). Aparece en su día de la semana.",
        ],
        nota:
          "No hay título, tipo de score ni descripción del workout: cada bloque lleva su título, su texto y su score, y el workout se nombra solo con su día. Hay un solo workout por programa y fecha, y lo comparten todas las clases de ese día: si ese día ya tiene uno, la ventana te lo dice y te ofrece «Editar». Tus coaches también pueden subirlo desde el app, salvo a quien le apagues «Sube el workout» en Coaches.",
      },
      {
        titulo: "Armar el workout por bloques (Fuerza A, Fuerza B, Metcon)",
        pasos: [
          "En la ventana del workout, en «Bloques», presiona «Agregar bloque» por cada parte. Necesitas al menos un bloque para crear el workout.",
          "En cada bloque escribe el «Título» y el «Texto», y elige el «Tipo de bloque» y su «Score». Cada bloque con score tiene su propio board, así tus atletas anotan la Fuerza A y la Fuerza B por separado.",
          "Si el bloque es de carga, revisa la «Unidad» (viene en «lb»; cámbiala a «kg» si programas en kilos; se puede cambiar aunque el WOD ya tenga scores: al guardar se convierten, 100 kg pasan a 220.5 lb) y elige el «Levantamiento base» (por ejemplo «Back squat»; es obligatorio: con él los atletas ven sus porcentajes y su PR se actualiza solo), y en «Reps por serie del peso que se anota» pon a cuántas repeticiones corresponde el peso: «5 x 3 subiendo hasta pesado» es 3; un 1RM es 1. Si se trabaja al porcentaje («5 x 5 al 70 %»), déjalo vacío: ese peso no cuenta como PR.",
          "Activa «Board principal del día» en el bloque que más importa: es el que se muestra primero. Ordena los bloques con las flechas ↑ y ↓.",
          "Si un bloque es un workout de referencia (Fran, Murph…), márcalo como «Benchmark»: cuando un atleta mejora su marca se publica un PR en el feed.",
          "Presiona «Publicar workout» (o «Guardar borrador»).",
        ],
        nota:
          "Con el levantamiento elegido, lo que anota cada atleta cuenta para su RM estimado y su tabla de porcentajes en el app. Un bloque que ya tiene scores no se puede quitar ni cambiar de tipo de score.",
      },
      {
        titulo: "Pegar la rutina completa y armar los bloques solos",
        pasos: [
          "Copia la rutina del día tal como la tienes escrita (con «Warmup», «Weightlifting (Power Clean)», «Fuerza:», «Custom Metcon (Tiempo)», «Workout:»…) y pégala en «Pega el workout (opcional)».",
          "Presiona «Armar bloques desde el texto». Sale un bloque por cada encabezado, con su texto y su «Score»: la fuerza por carga con su «Levantamiento base», el metcon por tiempo, y el calentamiento sin score.",
          "Revisa cada bloque: el título, el «Score», la «Unidad» y el «Levantamiento base» (obligatorio en los de carga). Corrige lo que haga falta.",
          "Presiona «Publicar workout» (o «Guardar» si lo estás editando).",
        ],
        nota:
          "El texto pasa a los bloques; en la caja queda solo lo que va antes del primer encabezado, y eso no se guarda. Si no te convence, presiona «Deshacer» antes de guardar. Cada encabezado tiene que ir en su propia línea. Un workout cuyos bloques ya tienen scores no se puede rearmar: edita esos bloques a mano.",
      },
      {
        titulo: "Cambiar un workout ya creado o partirlo en bloques",
        pasos: [
          "En la semana, presiona «Editar» en el día del workout.",
          "Cambia los bloques y presiona «Guardar».",
          "Si es un workout de antes de los bloques, su texto aparece en «Texto del workout»: presiona «Armar bloques desde el texto» para pasarlo a bloques.",
        ],
        nota:
          "Si un workout de un solo score ya tiene scores y lo partes en bloques, esos scores quedan en el bloque principal.",
      },
      {
        titulo: "Ver la programación de la semana y semanas anteriores",
        pasos: [
          "En la pestaña «Workout» ves la semana del programa elegido arriba, de lunes a domingo, con cada workout completo bloque por bloque.",
          "Usa las flechas ‹ y › para moverte de semana, y «Esta semana» para volver a la actual.",
          "En un día sin workout, presiona «Programar»: se abre la ventana con esa fecha.",
        ],
        nota:
          "Cada día dice si su workout está «Publicado», en «Borrador» o «Programado» (se publica solo el día que toca). El día de hoy va marcado con «Hoy».",
      },
      {
        titulo: "Publicar, despublicar o borrar un workout",
        pasos: [
          "En la pestaña «Workout», busca el día del workout en la semana.",
          "Usa «Publicar» para mostrarlo en el app. «Despublicar» (a la derecha, junto a «Eliminar») lo oculta y te pide confirmar; «Editar» nunca lo oculta.",
        ],
      },
      {
        titulo: "Ver el tablero de scores o cargar uno a mano",
        pasos: [
          "En la pestaña «Workout», presiona «Board» en el día del workout (sale cuando algún bloque tiene score).",
          "Para cargar un score, elige al atleta, escribe su score (por ejemplo 3:21 o 120) y la modalidad (Rx+, Rx o Scaled), y presiona «Registrar».",
          "Si el bloque es de carga, puedes anotar también «Rondas» y «Reps»: con cuántas rondas y repeticiones movió ese peso. En el board se ve junto al score («105 5×2»); el ranking sigue siendo por peso.",
          "Con «Board por clase» puedes ver solo los resultados de una hora del día.",
          "Si el workout tiene bloques, elige arriba el bloque cuyo board quieres ver; el score que registres va a ese bloque.",
        ],
      },
      {
        titulo: "Permitir o no reservar clases futuras",
        pasos: [
          "Entra a la pestaña «Clases».",
          "Arriba a la derecha, activa o desactiva «Reservar días futuros».",
        ],
        nota: "Si lo desactivas, tus atletas solo podrán reservar las clases del día.",
      },
      {
        titulo: "Crear un pase para visitantes (drop-in)",
        pasos: [
          "Entra a la pestaña «Drop-ins / Pases» y presiona «Nuevo pase».",
          "Elige el tipo (una clase, un día, una semana, open gym, clase especial o prueba gratuita).",
          "Si quieres, ponle un nombre (por ejemplo «Pase de día») y escribe el precio en quetzales.",
          "Presiona «Crear pase».",
        ],
        nota:
          "El visitante compra el pase desde el app de Nucleo. Para cambiar el precio o apagarlo, toca su tarjeta: cambia lo que necesites o desactiva «Activo», y presiona «Guardar».",
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
        termino: "Activo / Inactivo (servicio)",
        detalle: "Prende o apaga un servicio sin borrarlo: toca su tarjeta y usa «Activo». Los inactivos salen atenuados al final.",
      },
      {
        termino: "Horario semanal",
        detalle:
          "La plantilla que se repite cada semana. A partir de ella se generan las clases de las próximas semanas.",
      },
      {
        termino: "Tira de días",
        detalle:
          "La semana arriba de la lista de clases, con cuántas clases tiene cada día. Las flechas cambian de semana; hacia atrás llega a los últimos 60 días.",
      },
      {
        termino: "Sin coach / Sin workout",
        detalle:
          "Clases del día elegido a las que les falta coach (salen en amarillo), o de hoy que llevan workout y aún no tienen uno publicado. El número aparece junto al título «Clases».",
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
          "El entrenamiento que toca en una fecha para un programa, armado por bloques. Los atletas solo ven los publicados; los borradores no.",
      },
      {
        termino: "Programa",
        detalle:
          "El servicio al que pertenece un workout (CrossFit, Pilates…). «General» significa que aplica a todo el gimnasio.",
      },
      {
        termino: "Score",
        detalle:
          "Cómo se mide un bloque: por tiempo (gana el menor), AMRAP, rounds + reps, carga, EMOM o puntos (gana el mayor). Un bloque sin score (el calentamiento) no tiene board.",
      },
      {
        termino: "Rx+ / Rx / Scaled",
        detalle:
          "La modalidad en que el atleta hizo el workout (Rx+ es más pesado o más difícil que lo programado). A igual score, el tablero ordena Rx+, luego Rx, Scaled y al final Foundations (la de los resultados viejos).",
      },
      {
        termino: "Benchmark",
        detalle:
          "Un bloque de referencia (Fran, Murph…). Cuando un atleta mejora su marca en él, se publica un PR en el feed.",
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
          "Solo hay uno por programa y fecha. Al elegir esa fecha y ese programa, el formulario te ofrece «Editar»; también lo encuentras en su día, en la semana de abajo.",
      },
      {
        sintoma: "Un coach me dice que no puede subir el workout.",
        solucion:
          "En Coaches, revisa que tenga activado «Sube el workout». Apagado, el coach solo puede ver la programación.",
      },
      {
        sintoma: "Mis atletas no ven el workout.",
        solucion:
          "Revisa en su día, en la semana de abajo, que diga «Publicado»; si dice «Borrador», presiona «Publicar».",
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
