import type { ManualesPorRuta } from "./tipos";

/**
 * Manuales del grupo «Plataforma» del menú. Sólo los ve el superadmin: están
 * escritos para el equipo de Nucleo, no para el dueño del gimnasio.
 */
export const manualesPlataforma: ManualesPorRuta = {
  "/panel/plataforma/gyms": {
    titulo: "Gimnasios de la red",
    paraQue:
      "Aquí das de alta un gimnasio nuevo, ajustas su contrato con Nucleo (plan, cuota mensual y recargo en tarjeta), lo suspendes o reactivas y manejas quién entra a su panel. En la pestaña «Estado de cuenta» ves cuánto entró por tarjeta en el mes, cuánto le toca a cada gym y registras los depósitos.",
    tareas: [
      {
        titulo: "Dar de alta un gimnasio nuevo",
        pasos: [
          "En la pestaña «Gimnasios», ve a la tarjeta «Nuevo gimnasio».",
          "En «Datos del gimnasio» escribe el «Nombre» y, si los tienes, la «Ubicación» y la «Dirección».",
          "En «Contrato con Nucleo» elige el «Plan SaaS», la «Cuota mensual (Q)» que el gym le paga a Nucleo y el «Recargo en tarjeta» (0.0300 = 3 %).",
          "En «Primer plan vendible» revisa el «Nombre del plan» y el «Precio del plan (Q)» que el atleta le paga al gym. Vienen llenos con «Membresía mensual» a Q650.00.",
          "En «Administrador del gimnasio» escribe el «Correo», «Nombre», «Apellido» y «Teléfono» del dueño.",
          "Deja marcado «Visible en el directorio público» si los atletas deben encontrarlo en el app.",
          "Presiona «Dar de alta».",
        ],
        nota:
          "El alta crea de una vez el gimnasio, su suscripción con Nucleo, el plan vendible y el acceso del dueño. Al terminar sale el aviso «… ya puede operar» y dice si el dueño recibió el correo de bienvenida (cuenta nueva) o si ya tenía cuenta en Nucleo: en ese caso se le suma el rol a esa misma cuenta, nunca se duplica. El botón sólo se enciende cuando hay nombre.",
      },
      {
        titulo: "Cambiar el contrato de un gimnasio",
        pasos: [
          "En la tabla «Gimnasios conectados» presiona «Editar» en la fila del gym.",
          "Arriba de la tabla se abre «Editar contrato». Ajusta «SaaS plan», «Recargo en tarjeta», «Fee fijo» o la casilla «Público».",
          "Para la suscripción, cambia «Suscripción mensual», «Estado suscripción» (Activa, Pausada o Cancelada) y «Próximo cobro».",
          "Presiona «Guardar», o «Cancelar» para cerrar sin cambios.",
        ],
        nota:
          "El estado de la suscripción y la fecha del próximo cobro necesitan un monto en «Suscripción mensual». Si lo dejas vacío y cambiaste alguno de los dos, o si el gym ya tenía suscripción, no se guarda nada y sale un aviso en rojo que te pide escribir el monto. «Guardar» se apaga si «Recargo en tarjeta» queda vacío.",
      },
      {
        titulo: "Suspender o reactivar un gimnasio",
        pasos: [
          "En la tabla «Gimnasios conectados» presiona «Suspender» (o «Reactivar» si ya está suspendido).",
          "Confirma en la ventana que aparece.",
        ],
        nota:
          "Al suspenderlo, sus atletas y su panel dejan de operar hasta que lo reactives. La fila suspendida se ve atenuada y con la etiqueta «Suspendido».",
      },
      {
        titulo: "Ver o invitar a los administradores de un gym",
        pasos: [
          "En la fila del gym presiona «Administradores».",
          "En «Con acceso al panel» ves quién puede entrar y si ya puso su contraseña.",
          "Para sumar a alguien, llena «Correo» (obligatorio), «Teléfono», «Nombre» y «Apellido» en «Invitar administrador».",
          "Presiona «Invitar».",
        ],
        nota:
          "La persona recibe un correo para poner su contraseña. Si ese correo ya es de un usuario de Nucleo, se le suma el rol a su misma cuenta. Desde aquí no se le quita el acceso a nadie: la ventana sólo lista e invita.",
      },
      {
        titulo: "Entrar al panel de un gimnasio para dar soporte",
        pasos: [
          "En la fila del gym presiona «Entrar al panel».",
          "Te lleva al Dashboard de ese gimnasio, sin pedirle su contraseña al dueño.",
        ],
        nota:
          "Si ese gym ya es el que tienes seleccionado, el botón dice «Ir al panel». A partir de ahí todo el panel trabaja sobre ese gimnasio hasta que cambies de gym.",
      },
      {
        titulo: "Revisar el estado de cuenta del mes",
        pasos: [
          "Entra a la pestaña «Estado de cuenta».",
          "Elige el mes en «Periodo».",
          "Arriba ves la «Ganancia de Nucleo» y, debajo, «Movimiento del periodo» con lo cobrado, el ingreso de los gyms, los reembolsos y lo que falta por depositar.",
          "En «Por gimnasio» ves el desglose de cada gym que cobró con tarjeta ese mes.",
        ],
        nota:
          "Sólo cuenta el dinero cobrado con tarjeta por la pasarela. Los pagos en efectivo o transferencia ya los cobró el gym y no generan recargo.",
      },
      {
        titulo: "Generar el depósito de un gimnasio",
        pasos: [
          "En la pestaña «Estado de cuenta», elige el mes en «Periodo».",
          "En la tabla «Por gimnasio» presiona «Generar depósito» en la fila del gym.",
          "Si ya existía uno pendiente y entraron más cobros, presiona «Recalcular».",
        ],
        nota:
          "Al generarlo, el desglose queda congelado con ese corte. Un depósito ya marcado como «Depositado» no se puede recalcular.",
      },
      {
        titulo: "Marcar un depósito como hecho",
        pasos: [
          "Haz la transferencia al gimnasio desde el banco.",
          "Presiona «Marcar depositado» en «Por gimnasio» o en «Depósitos del periodo».",
          "Escribe la «Referencia bancaria» (número de transferencia o boleta) y, si quieres, «Notas».",
          "Presiona «Confirmar depósito».",
        ],
        nota:
          "La referencia bancaria es obligatoria: sin ella no queda rastro de que el dinero salió. El botón no se enciende hasta que la escribes.",
      },
    ],
    conceptos: [
      {
        termino: "Gimnasios en la red / Operando / Suspendidos / En el directorio",
        detalle:
          "Los contadores de arriba: cuántos gyms hay en total, cuántos están activos, cuántos suspendidos y cuántos se ven en el directorio del app.",
      },
      {
        termino: "Plan SaaS",
        detalle: "El nivel de contrato del gym con Nucleo: Starter, Growth, Pro o Enterprise.",
      },
      {
        termino: "Cuota mensual / Suscripción",
        detalle:
          "Lo que el gimnasio le paga a Nucleo cada mes. En la tabla se ve con su estado entre paréntesis: Activa, Pausada o Cancelada.",
      },
      {
        termino: "Recargo en tarjeta",
        detalle:
          "El porcentaje de Nucleo que se suma encima del precio en cada cobro con tarjeta. Se escribe en decimales: 0.0300 es 3 %. En la tabla se ve como porcentaje. Es la misma tasa para membresías, drop-ins, servicios extra, tienda y personal trainer. No aplica a efectivo ni transferencia.",
      },
      {
        termino: "Fee fijo",
        detalle: "Un monto fijo adicional del contrato. Si no tiene, la tabla muestra «—».",
      },
      {
        termino: "Activo / Suspendido / Privado",
        detalle:
          "Activo: el gym opera. Suspendido: ni su panel ni sus atletas operan. Privado: no aparece en el directorio público del app.",
      },
      {
        termino: "Sin reclamar",
        detalle:
          "El administrador fue invitado pero todavía no ha puesto su contraseña, así que aún no entra al panel.",
      },
      {
        termino: "Ganancia de Nucleo",
        detalle:
          "Lo que de verdad le queda a Nucleo: el recargo cobrado, menos los reembolsos y menos la comisión que se queda la pasarela. No es lo mismo que el recargo.",
      },
      {
        termino: "Recargo que pagaron los atletas / Se quedó la pasarela",
        detalle:
          "El desglose de la ganancia: cuánto recargo se cobró y cuánto se llevó la pasarela de comisión.",
      },
      {
        termino: "Cobrado por pasarela / Ingreso de los gyms / Reembolsos / Por depositar",
        detalle:
          "Todo lo que entró con tarjeta, la parte que le toca a los gimnasios, lo devuelto y lo que Nucleo todavía tiene que depositarles (custodia puente: el dinero cae en la cuenta de Nucleo y se deposita al gym).",
      },
      {
        termino: "Ganó Nucleo",
        detalle:
          "Columna de «Por gimnasio»: la ganancia real de ese gym, y debajo, en pequeño, de cuánto recargo salió.",
      },
      {
        termino: "Sin generar / Pendiente / Depositado",
        detalle:
          "Estado del depósito del mes: todavía no se genera, ya se generó pero no se ha transferido, o ya se transfirió y tiene referencia bancaria.",
      },
      {
        termino: "Recargo cobrado",
        detalle:
          "Columna de «Depósitos del periodo»: el recargo que se le cobró al atleta, congelado al generar el depósito. No es lo que ganó Nucleo.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Dar de alta» está apagado.",
        solucion: "Falta el «Nombre» del gimnasio.",
      },
      {
        sintoma: "El aviso dice que no se creó ningún administrador.",
        solucion:
          "Se dio de alta sin correo del dueño. Presiona «Administradores» en la fila del gym e invítalo desde ahí.",
      },
      {
        sintoma: "Al presionar «Guardar» sale un aviso en rojo sobre «Suscripción mensual».",
        solucion:
          "Escribe el monto en «Suscripción mensual» y vuelve a presionar «Guardar»: sin monto no se puede guardar ni el estado de la suscripción ni el próximo cobro.",
      },
      {
        sintoma: "El dueño dice que no puede entrar al panel.",
        solucion:
          "Abre «Administradores». Si sale «Sin reclamar», todavía no puso su contraseña con el correo que le llegó. Si sale «Inactivo», invítalo otra vez con su mismo correo. Revisa también que el gym no esté «Suspendido».",
      },
      {
        sintoma: "«El gimnasio está suspendido; reactívalo antes de dar accesos.»",
        solucion:
          "No se puede invitar administradores a un gym suspendido. Presiona «Reactivar» en su fila y vuelve a invitar.",
      },
      {
        sintoma: "«Recalcular» está apagado.",
        solucion: "Ese depósito ya está «Depositado» y su corte quedó cerrado.",
      },
      {
        sintoma: "«Ningún gimnasio movió dinero por la pasarela en este periodo.»",
        solucion:
          "Nadie cobró con tarjeta ese mes. Revisa que el «Periodo» sea el correcto.",
      },
    ],
    relacionadas: [
      { label: "Contracargos", href: "/panel/plataforma/contracargos" },
      { label: "Dashboard", href: "/panel" },
    ],
  },

  "/panel/plataforma/apelaciones": {
    titulo: "Apelaciones escaladas",
    paraQue:
      "Un gimnasio sacó del feed una publicación o un comentario de un atleta, el atleta apeló, el gym mantuvo su decisión y el caso pasó a Nucleo. Aquí lo resuelves. Es la última instancia: lo que decidas queda en firme.",
    tareas: [
      {
        titulo: "Revisar un caso",
        pasos: [
          "Abre la pantalla: cada tarjeta es una apelación esperando a Nucleo.",
          "Arriba ves si es «Publicación» o «Comentario», su estado, el atleta, el gimnasio y la fecha.",
          "En «Contenido sancionado» lees lo que se quitó y el «Motivo del gimnasio».",
          "En «Lo que dice el atleta» lees su defensa.",
        ],
        nota:
          "Si el contenido era sólo foto o video, verás «(sin texto: era una foto o un video)»: desde esta pantalla no se ve la imagen.",
      },
      {
        titulo: "Darle la razón al atleta",
        pasos: [
          "En la tarjeta presiona «Aceptar y republicar».",
          "Si quieres, escribe una línea en «Nota para el atleta (opcional)».",
          "Presiona «Confirmar».",
        ],
        nota: "El contenido vuelve al feed y se le avisa al atleta.",
      },
      {
        titulo: "Mantener la decisión del gimnasio",
        pasos: [
          "En la tarjeta presiona «Mantener la decisión».",
          "Si quieres, escribe una línea en «Nota para el atleta (opcional)».",
          "Presiona «Confirmar».",
        ],
        nota:
          "El contenido sigue fuera del feed. Se le avisa al atleta y ya no hay otra revisión.",
      },
    ],
    conceptos: [
      {
        termino: "Apelación escalada",
        detalle:
          "Una que el gimnasio ya revisó y mantuvo. Aquí sólo llegan esas: las que el gym todavía está resolviendo no aparecen.",
      },
      {
        termino: "Motivo del gimnasio",
        detalle:
          "Por qué el gym sacó el contenido. Si no lo dejó, dice «sin motivo registrado».",
      },
      {
        termino: "Nota para el atleta",
        detalle: "Opcional, hasta 255 caracteres. Es la explicación que recibe el atleta.",
      },
      {
        termino: "Resolución registrada",
        detalle: "La nota que quedó guardada cuando se resolvió el caso.",
      },
    ],
    problemas: [
      {
        sintoma: "«No hay apelaciones esperando a Nucleo.»",
        solucion: "No hay casos pendientes. Las que resuelves salen de la lista.",
      },
      {
        sintoma: "«No se pudo resolver.»",
        solucion:
          "Recarga la pantalla: puede que otra persona del equipo ya lo haya resuelto. Si sigue en la lista, inténtalo de nuevo.",
      },
      {
        sintoma: "«Sin acceso».",
        solucion: "Esta bandeja es sólo del equipo de Nucleo: tu cuenta necesita ser superadmin.",
      },
    ],
    relacionadas: [{ label: "Gimnasios", href: "/panel/plataforma/gyms" }],
  },

  "/panel/plataforma/contracargos": {
    titulo: "Contracargos de la red",
    paraQue:
      "Aquí ves las disputas de tarjeta de todos los gimnasios: un atleta le dijo a su banco que no reconoce un cobro. Como el dinero de las tarjetas cae primero en la cuenta de Nucleo, el banco se lo retira a Nucleo; la cuota del gimnasio se le descuenta de su próximo depósito y Nucleo pierde su recargo. Si el banco nos da la razón, los dos lo recuperan. Esta pantalla sirve para seguir los casos y registrar el fallo.",
    tareas: [
      {
        titulo: "Ver los casos abiertos",
        pasos: [
          "Arriba revisa «En disputa», «Casos sin resolver» y «Pérdida firme». Cuentan todos los casos de la red, sin importar qué filtro elijas abajo.",
          "En «Expedientes» filtra por «Todos», «Recibidos», «Con evidencia», «Ganados» o «Perdidos».",
          "En cada caso ves el gimnasio, el atleta, el motivo del banco, la referencia del caso, cuánto era de cuota del gym y cuánto de recargo, y la fecha límite para responder.",
        ],
        nota:
          "La evidencia la manda el gimnasio desde su propia pantalla de pagos. Cuando la envía, aparece aquí bajo «Evidencia del gimnasio», con su descargo y su enlace.",
      },
      {
        titulo: "Registrar que el banco nos dio la razón",
        pasos: [
          "En el caso presiona «El banco nos dio la razón».",
          "Si quieres, escribe en «Nota de la resolución (opcional)» qué dijo el banco y con qué evidencia se cerró.",
          "Presiona «Confirmar».",
        ],
        nota:
          "Se registra un pago de compensación (el movimiento original nunca se edita) y la membresía del atleta recupera su ciclo, siempre que nadie la haya movido mientras tanto.",
      },
      {
        titulo: "Registrar que se perdió la disputa",
        pasos: [
          "En el caso presiona «Disputa perdida».",
          "Si quieres, escribe una nota de la resolución.",
          "Presiona «Confirmar».",
        ],
        nota:
          "La pérdida queda firme. La cuota que ya se descontó del depósito del gimnasio no se le devuelve y Nucleo no recupera su recargo.",
      },
    ],
    conceptos: [
      {
        termino: "Recibido",
        detalle: "El banco avisó de la disputa y todavía no hay evidencia del gimnasio.",
      },
      {
        termino: "Evidencia enviada",
        detalle: "El gimnasio ya mandó su descargo; falta que el banco falle.",
      },
      {
        termino: "Ganado / Perdido",
        detalle:
          "El fallo del banco. Ganado: el dinero vuelve. Perdido: la pérdida queda firme. Los dos ya no se pueden cambiar.",
      },
      {
        termino: "En disputa",
        detalle:
          "Suma de los casos «Recibido» y «Evidencia enviada»: dinero que el banco ya retiró y que todavía se puede recuperar.",
      },
      {
        termino: "Pérdida firme",
        detalle:
          "Suma de las disputas perdidas. No vuelven: es el costo real del fraude y del servicio no reconocido.",
      },
      {
        termino: "Cuota del gym + recargo de Nucleo",
        detalle:
          "Cómo se reparte el monto disputado: la parte que era del gimnasio y la parte del recargo de Nucleo. La cifra en rojo de la derecha es el total.",
      },
      {
        termino: "Responde antes del…",
        detalle: "La fecha límite que dio el banco para mandar evidencia.",
      },
    ],
    problemas: [
      {
        sintoma: "«No se pudo resolver la disputa. ¿Ya estaba resuelta?»",
        solucion:
          "Probablemente alguien del equipo ya la cerró. Recarga la pantalla y revisa en «Ganados» o «Perdidos».",
      },
      {
        sintoma: "Las cifras de arriba cambian al filtrar.",
        solucion:
          "Los contadores suman sólo lo que muestra el filtro elegido. Para ver los totales de toda la red, deja el filtro en «Todos».",
      },
      {
        sintoma: "El caso no trae evidencia y la fecha límite se acerca.",
        solucion:
          "La evidencia la sube el gimnasio desde su pantalla de pagos. Contacta al gym para que la mande antes de la fecha.",
      },
    ],
    relacionadas: [
      { label: "Gimnasios", href: "/panel/plataforma/gyms" },
      { label: "Membresías", href: "/panel/pagos" },
    ],
  },

  "/panel/plataforma/reportes": {
    titulo: "Reportes del app",
    paraQue:
      "Aquí llegan las fallas que reporta la gente desde el app (botón flotante o al sacudir el teléfono) y desde el panel (ícono de bug). Sirve para leerlas, clasificarlas y copiar el prompt para arreglarlas en Claude Code. No es la bandeja de soporte de cada gimnasio: esa es «Reportes / tickets».",
    tareas: [
      {
        titulo: "Encontrar un reporte",
        pasos: [
          "Elige el estado arriba: «Abiertos», «Nuevos», «Triaged», «En PR», «Resueltos», «Cerrados», «Descartados» o «Todos». Abre en «Abiertos».",
          "Filtra por origen: «Todas», «App iOS», «App Android» o «Admin web».",
          "Para buscar, escribe en «Buscar en descripción, correo, pantalla…» y presiona Enter o sal del campo.",
        ],
        nota: "El número junto a «Bandeja» es cuántos reportes hay con esos filtros.",
      },
      {
        titulo: "Copiar el prompt de fix",
        pasos: [
          "En la bandeja, presiona el ícono de copiar al final de la fila (no hace falta abrir el reporte).",
          "O abre el reporte y presiona «Copiar prompt de fix».",
          "Pégalo en Claude Code.",
        ],
      },
      {
        titulo: "Leer un reporte completo",
        pasos: [
          "Presiona la fila en la bandeja. A la derecha se abre «Detalle».",
          "Lee la descripción y, si trae captura, presiónala para verla en grande.",
          "En «Contexto capturado» ves pantalla, versión, sistema, dispositivo, gimnasio, idioma y navegador.",
          "Si trae «Stack trace», ahí está el detalle técnico del error.",
          "Para cerrar el detalle, presiona la X junto a «Copiar prompt de fix».",
        ],
      },
      {
        titulo: "Clasificar un reporte",
        pasos: [
          "Abre el reporte.",
          "En «Triage» cambia «Estado», «Tipo» o «Severidad». Cada cambio se guarda solo al elegirlo.",
          "Para dejar contexto, escribe en «Notas del operador» y presiona «Guardar notas».",
        ],
        nota:
          "Si cambias el estado a uno que no entra en el filtro que tienes puesto (por ejemplo, lo pasas a «Resuelto» estando en «Abiertos»), el reporte sale de la bandeja pero el detalle se queda abierto y avisa «Este reporte ya no entra en el filtro de la bandeja.». Puedes seguir clasificándolo.",
      },
    ],
    conceptos: [
      {
        termino: "Estado",
        detalle:
          "Nuevo, Triaged (ya revisado), En PR (el arreglo está en camino), Resuelto, Cerrado o Descartado.",
      },
      {
        termino: "Abiertos",
        detalle: "El filtro con el que abre la pantalla: los que siguen pendientes de resolver.",
      },
      {
        termino: "Tipo",
        detalle:
          "Error (bug), Sugerencia / mejora, Soporte, Ruido o Duplicado.",
      },
      {
        termino: "Severidad",
        detalle: "Baja, Media, Alta o Crítica.",
      },
      {
        termino: "Origen",
        detalle: "Desde dónde se mandó (app iOS, app Android o panel web) y con qué versión.",
      },
      {
        termino: "Prompt de fix",
        detalle:
          "Un texto ya armado con el reporte y su contexto, listo para pegar en Claude Code y pedir el arreglo.",
      },
      {
        termino: "Notas del operador",
        detalle: "Notas internas del equipo: commit del arreglo, hipótesis, por qué se descartó.",
      },
    ],
    problemas: [
      {
        sintoma: "«Este reporte no trae el prompt; ábrelo para copiarlo desde la ficha.»",
        solucion: "Presiona la fila y usa «Copiar prompt de fix» en el detalle.",
      },
      {
        sintoma: "«El navegador bloqueó el portapapeles. Abre el reporte y copia desde la ficha.»",
        solucion:
          "Abre el reporte y vuelve a intentarlo desde «Copiar prompt de fix». Si sigue, revisa los permisos de portapapeles del navegador.",
      },
      {
        sintoma: "«Sin reportes».",
        solucion:
          "No hay nada con esos filtros. Prueba con «Todos» y «Todas», o borra la búsqueda.",
      },
      {
        sintoma: "El reporte que estaba viendo ya no está en la bandeja.",
        solucion:
          "Le cambiaste el estado y ya no entra en el filtro. El detalle sigue abierto; para volver a verlo en la lista, elige el filtro de su estado nuevo o «Todos».",
      },
      {
        sintoma: "«Guardar notas» está apagado.",
        solucion: "No has cambiado nada en «Notas del operador».",
      },
    ],
    relacionadas: [{ label: "Reportes / tickets", href: "/panel/tickets" }],
  },
};
