import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Negocio (ERP)» del menú: membresías, pagos a coaches y reportes. */
export const manualesNegocio: ManualesPorRuta = {
  "/panel/pagos": {
    titulo: "Membresías",
    paraQue:
      "Aquí ves cuánto dinero entró por tarjeta en el mes y cuánto te deposita Nucleo, quién quedó debiendo la cuota y el historial de todos los cobros. También registras los pagos en efectivo o transferencia y respondes cuando un atleta disputa un cobro ante su banco.",
    tareas: [
      {
        titulo: "Revisar tu estado de cuenta del mes",
        pasos: [
          "Arriba, en «Estado de cuenta», elige el mes en el selector de periodo (puedes ver los últimos 12 meses).",
          "La cifra grande, «Cobrado por tarjeta», es todo lo que se les cobró a tus atletas con tarjeta en ese periodo.",
          "Debajo ves cuántos cobros hubo y, si los hay, cuántas devoluciones y cuántas de ellas fueron por contracargo.",
          "En las cuatro cifras de abajo revisa «Tu ingreso», «Recargo Nucleo», «Reembolsos y contracargos» y «Pendiente de depósito» (o «Depositado» cuando ya se te transfirió).",
          "Pasa el cursor sobre cada una de esas cuatro cifras para leer qué incluye.",
        ],
        nota:
          "Aquí solo entra el dinero que pasó por tarjeta. Los pagos en efectivo o transferencia ya los cobraste tú y no aparecen en el estado de cuenta.",
      },
      {
        titulo: "Saber si ya te depositaron",
        pasos: [
          "En «Estado de cuenta», elige el mes.",
          "Junto al ícono del banco verás una etiqueta: «Sin depósito aún», «Depósito generado» o «Depositado».",
          "Si dice «Depositado», al lado aparece la fecha y, si la hay, la referencia de la transferencia.",
        ],
      },
      {
        titulo: "Registrar un pago en efectivo o transferencia",
        pasos: [
          "En «Registrar pago manual», busca al atleta en «Membresía». Junto al nombre ves en qué estado está su membresía.",
          "En «Método» elige «Efectivo» o «Transferencia».",
          "Si es transferencia, puedes adjuntar el comprobante en «Comprobante» (imagen o PDF).",
          "Escribe el monto en «Monto (Q)».",
          "Presiona «Registrar pago».",
        ],
        nota:
          "Al registrarlo sale el aviso «Pago registrado. La membresía queda al día.». Un pago manual no genera comisión, pero sí activa la membresía.",
      },
      {
        titulo: "Dar seguimiento a los morosos",
        pasos: [
          "Si alguien tiene la cuota vencida, aparece la sección «Morosos» con el número de atletas.",
          "Revisa en la tabla al atleta, su plan, cuándo «Venció» y su «Cuota».",
          "Cuando te pague en efectivo o transferencia, regístralo en «Registrar pago manual».",
        ],
        nota: "Si nadie está atrasado, la sección «Morosos» no aparece.",
      },
      {
        titulo: "Buscar un pago en el historial",
        pasos: [
          "En «Historial de pagos», escribe en el buscador el concepto (por ejemplo «Membresía» o «Drop-in»), el método (por ejemplo «Efectivo») o el estado (por ejemplo «Fallido» o «Contracargo»).",
          "Presiona el título de una columna («Fecha», «Concepto», «Monto», «Método», «Estado» o «Factura (FEL)») para ordenar por ella.",
          "Si un cobro con tarjeta falló, en «Motivo» ves por qué y cuántos intentos hubo.",
        ],
      },
      {
        titulo: "Descargar los pagos para tu contabilidad",
        pasos: [
          "Si solo quieres algunos pagos, escribe primero en el buscador de «Historial de pagos»; el botón cambia a «Exportar CSV (filtrado)».",
          "En «Historial de pagos», presiona «Exportar CSV» (o «Exportar CSV (filtrado)»).",
          "Se descarga el archivo «pagos-nucleo.csv» con fecha, concepto, monto, método, estado, tipo (cobro, reembolso o contracargo) y los datos de la factura: estado, serie, número y referencia.",
        ],
        nota: "El archivo trae exactamente los pagos que ves en la tabla, en el mismo orden. Si el buscador está vacío, trae todos. Los contracargos salen como «Contracargo», no como reembolso.",
      },
      {
        titulo: "Descargar o volver a emitir una factura electrónica",
        pasos: [
          "En «Historial de pagos», busca el pago y mira la columna «Factura (FEL)».",
          "Si la factura ya se emitió, ves su serie y número; presiónalo para abrir el documento.",
          "Si la factura falló, debajo aparece el motivo. Corrige lo que indique y presiona «Reintentar factura».",
          "Si quedó pendiente, presiona «Emitir factura». Si ya estaba emitida pero no tiene documento, presiona «Recuperar documento».",
        ],
        nota:
          "Si sale bien, aparece el aviso «Factura lista» con la serie y el número. Estos botones solo aparecen cuando el pago se puede reintentar.",
      },
      {
        titulo: "Responder un contracargo",
        pasos: [
          "Si algún atleta disputó un cobro ante su banco, aparece la sección «Contracargos». La etiqueta roja dice cuántos están «sin resolver».",
          "Revisa en la tabla cuándo se recibió, el atleta, el concepto, lo «Perdido», el «Motivo del banco» y la fecha de «Responder antes de».",
          "Presiona «Responder» (o «Ampliar evidencia» si ya habías mandado algo).",
          "En la ventana «Responder la disputa», escribe en «Tu descargo» por qué el cobro fue legítimo (por ejemplo, cuántas veces asistió o cuándo contrató el plan).",
          "Si tienes pruebas (fotos de asistencia, contrato firmado, captura de la conversación), pega el enlace en «Enlace a la evidencia (opcional)».",
          "Presiona «Enviar evidencia».",
        ],
        nota:
          "Nucleo presenta tu evidencia ante el proveedor de la pasarela. Solo puedes responder mientras la ventana del banco siga abierta; después la fila dice «ventana cerrada». Esta sección solo la ve el administrador del gimnasio.",
      },
    ],
    conceptos: [
      {
        termino: "Cobrado por tarjeta",
        detalle:
          "Total que se les cobró a tus atletas con tarjeta en el periodo. La pantalla lo describe como «tu cuota + el recargo de Nucleo».",
      },
      {
        termino: "Tu ingreso",
        detalle: "La parte que es tuya: el precio de tus planes, servicios y productos.",
      },
      {
        termino: "Recargo Nucleo",
        detalle:
          "Según la pantalla, es el recargo de plataforma que se suma encima de tu precio y lo paga el atleta. No se te deposita.",
      },
      {
        termino: "Reembolsos y contracargos",
        detalle:
          "Todo lo que salió del periodo: devoluciones que tú diste y disputas que impuso el banco. Se resta de lo que se te deposita. Si hubo contracargos, debajo se dice cuántos y por cuánto.",
      },
      {
        termino: "Pendiente de depósito / Depositado",
        detalle:
          "Lo que Nucleo te transfiere por el periodo: tu ingreso menos reembolsos. Cambia a «Depositado» cuando la transferencia ya se hizo.",
      },
      {
        termino: "Sin depósito aún / Depósito generado / Depositado",
        detalle:
          "Sin depósito aún: el periodo no ha cerrado. Depósito generado: Nucleo ya calculó tu liquidación y la transferencia está en camino. Depositado: ya se te transfirió.",
      },
      {
        termino: "Moroso",
        detalle: "Atleta cuya cuota ya venció y no se ha pagado.",
      },
      {
        termino: "Estado del pago",
        detalle:
          "«Pendiente», «Exitoso», «Fallido» o «Reembolsado». «Contracargo» (en rojo) significa que el banco le devolvió el dinero al atleta: no fue una devolución tuya.",
      },
      {
        termino: "Método",
        detalle: "«Tarjeta», «Efectivo» o «Transferencia».",
      },
      {
        termino: "Concepto",
        detalle:
          "Qué se cobró: «Membresía», «Drop-in», «Clase especial», «Personal trainer», «Tienda», «Venta en recepción» o «Servicio extra».",
      },
      {
        termino: "Factura (FEL)",
        detalle:
          "La factura electrónica del pago. Puede estar «No requiere», «Pendiente», «Emitida» o «Fallida». Si está emitida ves su serie y número, y debajo la referencia («Ref.»).",
      },
      {
        termino: "Contracargo",
        detalle:
          "Un atleta disputó un cobro ante su banco. El banco le devolvió el dinero y se descontó de tu depósito. No es un reembolso tuyo y todavía puedes pelearlo con evidencia.",
      },
      {
        termino: "Estado del contracargo",
        detalle:
          "«Recibido» (todavía no respondes), «Evidencia enviada», «Ganado» o «Perdido». Cuando se resuelve, la fila dice la fecha de resolución.",
      },
      {
        termino: "Perdido (contracargo)",
        detalle:
          "Lo que se descontó por la disputa. Pasa el cursor sobre la cifra para ver cuánto era tu cuota y cuánto el recargo de Nucleo.",
      },
    ],
    problemas: [
      {
        sintoma: "No puedo elegir al atleta en «Membresía».",
        solucion:
          "Si ves el aviso «No se pudo cargar el padrón de atletas: el selector de membresía quedó vacío.», presiona reintentar. Si no hay aviso, revisa que el atleta tenga membresía en tu gimnasio.",
      },
      {
        sintoma: "El botón «Registrar pago» está apagado.",
        solucion: "Tienes que elegir una membresía y escribir el monto.",
      },
      {
        sintoma: "Me sale «No se pudo registrar el pago. Verifica los datos.».",
        solucion:
          "Revisa el monto y la membresía elegida. Si aparece otro mensaje más específico, sigue lo que indica.",
      },
      {
        sintoma: "Un pago con tarjeta aparece como «Fallido».",
        solucion:
          "En la columna «Motivo» ves por qué no pasó y cuántos intentos hubo. El atleta tiene que volver a intentarlo, o puedes registrar su pago manual si te paga en efectivo o transferencia.",
      },
      {
        sintoma: "Me sale «No se pudo emitir la factura. Inténtalo de nuevo.».",
        solucion:
          "Si el mensaje trae un motivo (por ejemplo, un dato del atleta), corrígelo antes de reintentar. Si no, espera un momento y vuelve a presionar el botón.",
      },
      {
        sintoma: "Me sale «No se pudo registrar la evidencia. Puede que la ventana para responder ya venciera.».",
        solucion:
          "Revisa la fecha de «Responder antes de». Si ya pasó, la disputa ya no acepta evidencia.",
      },
      {
        sintoma: "El botón «Enviar evidencia» está apagado.",
        solucion: "Escribe tu descargo o pega un enlace a la evidencia: al menos uno de los dos.",
      },
      {
        sintoma: "Veo «No se pudieron cargar los contracargos: si un atleta disputó un cobro, no lo estás viendo.».",
        solucion:
          "Presiona reintentar. No lo ignores: puede haber una disputa con fecha límite que no estás viendo.",
      },
      {
        sintoma: "No veo en el estado de cuenta un pago en efectivo que registré.",
        solucion:
          "Es normal: el estado de cuenta solo muestra lo cobrado por tarjeta. El pago manual sí aparece en «Historial de pagos».",
      },
    ],
    relacionadas: [
      { label: "Atletas", href: "/panel/atletas" },
      { label: "Planes y cuotas", href: "/panel/planes" },
      { label: "Reportes de negocio", href: "/panel/reportes" },
    ],
  },

  "/panel/coaches-pagos": {
    titulo: "Pagos a coaches",
    paraQue:
      "Aquí defines cómo se le paga a cada coach (por clase o salario fijo), habilitas su servicio de personal trainer con precio y comisión, y generas las liquidaciones de un periodo. Al marcarlas como pagadas quedan registradas como gasto de nómina.",
    tareas: [
      {
        titulo: "Definir cómo se le paga a un coach",
        pasos: [
          "En «Forma de pago por coach», busca al coach.",
          "En «Forma de pago» elige «Por clase» o «Fijo».",
          "Si es «Por clase», escribe su «Tarifa por clase». Si es «Fijo», escribe su «Salario fijo».",
          "Haz clic fuera del campo: el cambio se guarda solo.",
        ],
        nota:
          "Solo se puede escribir en la columna que corresponde a la forma de pago elegida. Coach por clase: se le acumula la tarifa por cada clase que imparte. Coach fijo: solo se le paga extra en las clases marcadas como «pagar extra».",
      },
      {
        titulo: "Habilitar el personal trainer de un coach",
        pasos: [
          "En «Personal trainer», busca al coach.",
          "Activa el interruptor «Ofrece PT».",
          "Escribe el «Precio» de la sesión.",
          "Escribe la «Comisión del trainer» en porcentaje (de 0 a 100).",
          "Haz clic fuera del campo para guardar. Al lado ves cuánto le toca al trainer y en «Se queda el gym» lo que te queda a ti.",
        ],
        nota:
          "Según la pantalla, el cobro completo del personal trainer es ingreso del gym, y la comisión del trainer entra a la liquidación del coach.",
      },
      {
        titulo: "Generar la liquidación de un periodo",
        pasos: [
          "En «Periodo a liquidar», elige la fecha «Desde» y la fecha «Hasta». Por defecto va del primer día del mes a hoy.",
          "Presiona «Generar liquidación». Si falta una fecha o «Desde» es posterior a «Hasta», el botón queda apagado y el campo dice qué corregir.",
          "Si había algo pendiente, aparece el aviso «Liquidación generada» con cuántas liquidaciones salieron y por cuánto en total.",
          "Revísalas en la tabla «Liquidaciones».",
        ],
      },
      {
        titulo: "Marcar una liquidación como pagada",
        pasos: [
          "En la tabla «Liquidaciones», busca la fila con estado «Abierta».",
          "Cuando ya le pagaste al coach, presiona «Marcar pagada».",
        ],
        nota:
          "Al marcarla, pasa a «Pagada» y se registra como gasto de nómina. Ya no se puede volver a marcar.",
      },
    ],
    conceptos: [
      {
        termino: "Por liquidar",
        detalle: "La suma de todas las liquidaciones que siguen «Abierta»: lo que aún les debes a tus coaches.",
      },
      {
        termino: "Liquidaciones abiertas / Pagado acumulado",
        detalle:
          "Cuántas liquidaciones faltan por pagar, y la suma de todas las que ya marcaste como pagadas.",
      },
      {
        termino: "Coaches en nómina / Pago por clase / Salario fijo / Ofrecen personal trainer",
        detalle:
          "Cuántos coaches tienes en total, cuántos cobran por clase, cuántos tienen salario fijo y cuántos tienen activado el personal trainer.",
      },
      {
        termino: "Por clase",
        detalle: "Se le acumula su «Tarifa por clase» por cada clase que imparte.",
      },
      {
        termino: "Fijo",
        detalle:
          "Tiene «Salario fijo». En las liquidaciones solo se le suma algo en las clases marcadas como «pagar extra».",
      },
      {
        termino: "Comisión del trainer / Se queda el gym",
        detalle:
          "La pantalla calcula, sobre el «Precio» del personal trainer, cuánto es la comisión del trainer (el número que sale al lado del porcentaje) y cuánto te queda a ti (precio menos esa comisión).",
      },
      {
        termino: "Liquidación",
        detalle:
          "El pago acumulado de un coach en un periodo. En la tabla ves el nombre del coach, el periodo, el número en «Pagos» y el «Total».",
      },
      {
        termino: "Pagos",
        detalle:
          "Cuántas cosas suma esa liquidación: cada clase impartida, cada clase con «pagar extra» y cada sesión de personal trainer cuentan como una.",
      },
      {
        termino: "Abierta / Pagada",
        detalle:
          "Abierta: generada pero todavía no le has pagado. Pagada: ya la marcaste como pagada y quedó como gasto de nómina.",
      },
    ],
    problemas: [
      {
        sintoma: "Me sale «No hay nada que liquidar en ese periodo».",
        solucion:
          "Revisa que las clases del periodo ya hayan pasado y tengan coach asignado, que el coach «Por clase» tenga una tarifa mayor a Q0, y que las clases de coaches con salario fijo estén marcadas como «pagar extra».",
      },
      {
        sintoma: "Me sale «No se pudo guardar el cambio de nómina del coach».",
        solucion:
          "El cambio no se guardó y el campo regresó solo al último valor guardado. Revisa el número y vuelve a escribirlo; si el aviso dice el motivo, corrígelo antes de intentar otra vez.",
      },
      {
        sintoma: "Me sale «No se pudo generar la liquidación».",
        solucion: "Revisa las fechas «Desde» y «Hasta» e intenta de nuevo.",
      },
      {
        sintoma: "El botón «Generar liquidación» está apagado.",
        solucion:
          "Falta la fecha «Desde» o «Hasta», o «Desde» es posterior a «Hasta». Debajo del campo en rojo dice qué corregir. Un periodo de un solo día sí se puede.",
      },
      {
        sintoma: "No puedo escribir la tarifa o el salario de un coach.",
        solucion:
          "Primero elige su «Forma de pago»: la tarifa solo se edita con «Por clase» y el salario solo con «Fijo». El precio y la comisión de personal trainer se editan solo con «Ofrece PT» activado.",
      },
      {
        sintoma: "La tabla dice «Sin coaches».",
        solucion: "Da de alta a tus coaches en «Coaches» y luego regresa aquí a definir su forma de pago.",
      },
      {
        sintoma: "Veo «No se pudieron cargar las liquidaciones.».",
        solucion:
          "Presiona reintentar antes de generar otra liquidación: puede que el periodo ya esté liquidado y simplemente no se esté mostrando.",
      },
    ],
    relacionadas: [
      { label: "Coaches", href: "/panel/coaches" },
      { label: "Clases", href: "/panel/clases" },
      { label: "Gastos", href: "/panel/gastos" },
    ],
  },

  "/panel/reportes": {
    titulo: "Reportes de negocio",
    paraQue:
      "Aquí ves la rentabilidad de tu gimnasio en el periodo que elijas: de dónde entra el dinero, cuánto cuesta operar y cuánto queda al final.",
    tareas: [
      {
        titulo: "Ver el resultado de un periodo",
        pasos: [
          "En «Periodo», elige la fecha «Desde» y la fecha «Hasta». Por defecto va del primer día del mes a hoy.",
          "Si tienes varias sedes, elige una en «Sede» o déjalo en «Todas».",
          "Arriba ves la «Utilidad neta del periodo», su porcentaje de margen y cómo cambió frente al periodo anterior.",
          "Al lado ves los «Ingresos totales» y el «Margen bruto».",
        ],
        nota:
          "Las flechas ▲ (verde) y ▼ (rojo) comparan contra el periodo anterior. Si no hay con qué comparar, sale una raya.",
      },
      {
        titulo: "Revisar los costos del periodo",
        pasos: [
          "En «Costos del periodo» revisa el «Costo directo (COGS)», las «Pérdidas (mermas)» y los «Gastos operativos».",
          "Para ver en qué se fue el gasto, baja a «Gastos por categoría».",
        ],
      },
      {
        titulo: "Ver de dónde viene tu ingreso",
        pasos: [
          "En «Ingresos por línea de negocio» ves cada línea con su ingreso y qué porcentaje del total representa.",
          "Si hay más de una línea, arriba de la tabla aparece una gráfica para compararlas de un vistazo.",
          "En «Cobros por método» ves cuánto entró por cada forma de pago en las ventas de productos (mostrador y tienda de la app). Las membresías y servicios no se suman ahí.",
        ],
      },
      {
        titulo: "Revisar ventas de productos",
        pasos: [
          "En «Productos más vendidos» ves los productos con más unidades vendidas en el periodo.",
          "En «Retail por categoría» ves, por categoría (ropa, bebidas, suplementos…), las unidades, el ingreso y el margen. Incluye el mostrador y la tienda de la app.",
        ],
      },
      {
        titulo: "Ver cómo va tu comunidad",
        pasos: [
          "En «Comunidad e inventario» revisa tus «Socios activos», las «Altas del período» y las «Compras a inventario (uds.)».",
        ],
      },
    ],
    conceptos: [
      {
        termino: "Utilidad neta del periodo",
        detalle: "Lo que queda al final del periodo. Debajo ves su porcentaje de margen.",
      },
      {
        termino: "Ingresos totales",
        detalle:
          "Todo lo que entró en el periodo. Los porcentajes de «Ingresos por línea de negocio» se calculan sobre esta cifra.",
      },
      {
        termino: "Margen bruto",
        detalle: "Se muestra en quetzales y como porcentaje del ingreso.",
      },
      {
        termino: "Costo directo (COGS)",
        detalle: "Lo que te costó lo que vendiste.",
      },
      {
        termino: "Pérdidas (mermas)",
        detalle: "Producto que se perdió o se dañó en el periodo.",
      },
      {
        termino: "Gastos operativos",
        detalle: "Lo que cuesta operar el gimnasio. El detalle está en «Gastos por categoría».",
      },
      {
        termino: "Margen (retail)",
        detalle: "En «Retail por categoría», el ingreso de la categoría menos su costo.",
      },
      {
        termino: "Sede",
        detalle: "Solo aparece si tu gimnasio tiene sedes. Sin elegir ninguna, el reporte incluye todas.",
      },
    ],
    problemas: [
      {
        sintoma: "Me sale «Sin datos».",
        solucion: "No hay actividad en el periodo que elegiste. Prueba con otras fechas.",
      },
      {
        sintoma: "Me sale «Revisa el periodo» en lugar del reporte.",
        solucion:
          "Falta la fecha «Desde» o «Hasta», o «Desde» es posterior a «Hasta». Corrige la fecha marcada en rojo y el reporte aparece solo.",
      },
      {
        sintoma: "«Productos más vendidos» o «Retail por categoría» salen vacíos.",
        solucion: "Todavía no hay ventas de productos en ese periodo.",
      },
      {
        sintoma: "«Gastos por categoría» sale vacío.",
        solucion: "No hay gastos registrados en ese periodo. Regístralos en «Gastos».",
      },
      {
        sintoma: "No veo el selector «Sede».",
        solucion: "Solo aparece cuando tu gimnasio tiene sedes registradas.",
      },
    ],
    relacionadas: [
      { label: "Membresías", href: "/panel/pagos" },
      { label: "Gastos", href: "/panel/gastos" },
      { label: "Punto de venta", href: "/panel/pos" },
      { label: "Inventario", href: "/panel/inventario" },
    ],
  },
};
