import type { ManualesPorRuta } from "./tipos";

/** Manuales del grupo «Negocio (ERP)» del menú: membresías, pagos a coaches y reportes. */
export const manualesNegocio: ManualesPorRuta = {
  "/panel/pagos": {
    titulo: "Membresías",
    paraQue:
      "Aquí ves quién te debe la cuota y registras los pagos en efectivo o transferencia. También tienes el historial de todos los cobros con su factura, tu estado de cuenta con Nucleo (lo cobrado por tarjeta y lo que te depositan) y, si un atleta disputó un cobro ante su banco, los contracargos.",
    tareas: [
      {
        titulo: "Ver quién te debe",
        pasos: [
          "Entra a la pestaña «Por cobrar» (es la que se abre primero). En la pestaña ves en amarillo cuántos atletas deben.",
          "Junto al título, la etiqueta amarilla dice cuántas cuotas están vencidas y cuánto suman.",
          "Cada atleta sale con su plan, la fecha en que venció y su cuota. El más atrasado va primero.",
          "Si son muchos, usa «Buscar…» para encontrar a uno por nombre o plan.",
        ],
        nota: "Si nadie está atrasado, dice «Nadie debe. Todas las cuotas están al día.».",
      },
      {
        titulo: "Registrar un pago en efectivo o transferencia",
        pasos: [
          "En «Por cobrar», toca al atleta que te pagó: se abre la ventana «Registrar pago» con el atleta y su cuota ya puestos. Si no está en la lista (porque no debe), presiona el botón «Registrar pago» y búscalo en «Atleta».",
          "En «Método» elige «Efectivo» o «Transferencia».",
          "Si es transferencia, puedes adjuntar el comprobante en «Comprobante» (imagen o PDF).",
          "Revisa el «Monto» y corrígelo si te pagó otra cantidad.",
          "Presiona «Registrar pago».",
        ],
        nota:
          "Sale el aviso «Pago registrado. La membresía queda al día.» y el atleta deja de aparecer en «Por cobrar». Un pago manual no genera comisión, pero sí activa la membresía y genera su factura.",
      },
      {
        titulo: "Ver el detalle de un pago",
        pasos: [
          "Entra a la pestaña «Pagos».",
          "Toca la fila del pago: se abre su ventana con la fecha y hora, el monto, el método, el estado y la factura.",
          "Si fue con tarjeta, ves también «Cobrado con recargo» (lo que pagó el atleta) y el recargo de Nucleo.",
          "Si fue transferencia con comprobante, presiona «Ver comprobante». Si el cobro con tarjeta falló, en «Motivo» ves por qué y cuántos intentos hubo.",
        ],
      },
      {
        titulo: "Buscar un pago",
        pasos: [
          "En la pestaña «Pagos», escribe en el buscador el nombre del atleta, el concepto (por ejemplo «Membresía» o «Drop-in»), el método (por ejemplo «Efectivo») o el estado (por ejemplo «Fallido» o «Contracargo»).",
          "Presiona el título de una columna («Fecha», «Atleta», «Concepto», «Monto», «Método», «Estado» o «Factura») para ordenar por ella.",
        ],
      },
      {
        titulo: "Emitir, reintentar o descargar una factura electrónica",
        pasos: [
          "En la pestaña «Pagos», si hay facturas que falta emitir, junto al título aparece en amarillo «N facturas por emitir». Presiónalo para ver solo esos pagos (presiónalo otra vez para ver todos).",
          "En la columna «Factura» ves la serie y el número si ya se emitió; si falta, sale en amarillo («Pendiente» o «Sin documento») o en rojo («Fallida»).",
          "Toca el pago para abrir su ventana. En «Factura (FEL)», si ya se emitió, presiona la serie y el número para abrir el documento.",
          "Si la factura falló, debajo aparece el motivo. Corrige lo que indique y presiona «Reintentar factura».",
          "Si quedó pendiente, presiona «Emitir factura». Si ya estaba emitida pero no tiene documento, presiona «Recuperar documento».",
        ],
        nota:
          "Si sale bien, aparece el aviso «Factura lista» con la serie y el número. Estos botones solo aparecen cuando el pago se puede reintentar.",
      },
      {
        titulo: "Descargar los pagos para tu contabilidad",
        pasos: [
          "En la pestaña «Pagos», si solo quieres algunos, escribe primero en el buscador o activa «N facturas por emitir»; el botón cambia a «Exportar CSV (filtrado)».",
          "Presiona «Exportar CSV» (o «Exportar CSV (filtrado)»).",
          "Se descarga el archivo «pagos-nucleo.csv» con fecha, concepto, monto, método, estado, tipo (cobro, reembolso o contracargo) y los datos de la factura: estado, serie, número y referencia.",
        ],
        nota:
          "El archivo trae exactamente los pagos que ves en la tabla, en el mismo orden. Sin filtros, trae todos. Los contracargos salen como «Contracargo», no como reembolso.",
      },
      {
        titulo: "Revisar tu estado de cuenta del mes",
        pasos: [
          "Entra a la pestaña «Estado de cuenta» y elige el mes en el selector (puedes ver los últimos 12 meses).",
          "Lee los renglones de arriba abajo: «Cobrado por tarjeta», «Recargo Nucleo», «Tu ingreso», «Reembolsos y contracargos» y, al final, «Pendiente de depósito» (o «Depositado» cuando ya se te transfirió).",
          "Debajo ves cuántos cobros hubo y, si los hay, cuántas devoluciones y cuántas de ellas fueron por contracargo.",
        ],
        nota:
          "Aquí solo entra el dinero que pasó por tarjeta. Los pagos en efectivo o transferencia ya los cobraste tú y no aparecen en el estado de cuenta.",
      },
      {
        titulo: "Saber si ya te depositaron",
        pasos: [
          "En la pestaña «Estado de cuenta», elige el mes.",
          "Junto al título verás una etiqueta: «Sin depósito aún», «Depósito generado» o «Depositado».",
          "Si dice «Depositado», debajo aparece la fecha y, si la hay, la referencia de la transferencia.",
        ],
      },
      {
        titulo: "Responder un contracargo",
        pasos: [
          "Si algún atleta disputó un cobro ante su banco, aparece la pestaña «Contracargos» con un número: cuántos siguen sin resolver.",
          "Cada caso dice el atleta, el concepto, lo perdido y la fecha límite («Responder antes del…»). Los que esperan tu respuesta salen en amarillo.",
          "Toca el caso: se abre su ventana con la fecha en que se recibió, lo «Perdido» (tu cuota más el recargo), el «Motivo del banco» y su estado.",
          "Escribe en «Tu descargo» por qué el cobro fue legítimo (por ejemplo, cuántas veces asistió o cuándo contrató el plan).",
          "Si tienes pruebas (fotos de asistencia, contrato firmado, captura de la conversación), pega el enlace en «Enlace a la evidencia (opcional)».",
          "Presiona «Enviar evidencia» (o «Ampliar evidencia» si ya habías mandado algo).",
        ],
        nota:
          "Nucleo presenta tu evidencia ante el proveedor de la pasarela. Solo puedes responder mientras la ventana del banco siga abierta; después el caso dice «Ventana cerrada». Esta pestaña solo la ve el administrador del gimnasio.",
      },
    ],
    conceptos: [
      {
        termino: "Por cobrar / vencidos",
        detalle:
          "Atletas cuya cuota ya venció y no se ha pagado (morosos). La cifra de la etiqueta amarilla es la suma de sus cuotas.",
      },
      {
        termino: "Cobrado por tarjeta",
        detalle: "Total que se les cobró a tus atletas con tarjeta en el periodo: tu cuota más el recargo de Nucleo.",
      },
      {
        termino: "Recargo Nucleo",
        detalle:
          "El recargo de plataforma que se suma encima de tu precio y lo paga el atleta. No se te deposita ni se te descuenta.",
      },
      {
        termino: "Tu ingreso",
        detalle: "La parte que es tuya: el precio de tus planes, servicios y productos.",
      },
      {
        termino: "Reembolsos y contracargos",
        detalle:
          "Todo lo que salió del periodo: devoluciones que tú diste y disputas que impuso el banco. Se resta de lo que se te deposita. Si hubo contracargos, debajo se dice cuántos y por cuánto (ya están incluidos, no se suman aparte).",
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
          "La factura electrónica del pago. Puede estar «No requiere», «Pendiente», «Emitida» o «Fallida». Si está emitida ves su serie y número, y en la ventana del pago la referencia («Ref.»).",
      },
      {
        termino: "Contracargo",
        detalle:
          "Un atleta disputó un cobro ante su banco. El banco le devolvió el dinero y se descontó de tu depósito. No es un reembolso tuyo y todavía puedes pelearlo con evidencia.",
      },
      {
        termino: "Estado del contracargo",
        detalle:
          "«Recibido» (todavía no respondes), «Evidencia enviada», «Ganado» o «Perdido». Cuando se resuelve, el caso dice la fecha de resolución.",
      },
    ],
    problemas: [
      {
        sintoma: "No encuentro al atleta en «Atleta».",
        solucion:
          "Si en «Por cobrar» ves el aviso «No se pudo cargar el padrón de atletas…», presiona reintentar. Si no hay aviso, revisa que el atleta tenga membresía en tu gimnasio.",
      },
      {
        sintoma: "El botón «Registrar pago» de la ventana está apagado.",
        solucion: "Tienes que elegir al atleta y escribir un monto mayor a Q0.",
      },
      {
        sintoma: "Me sale «No se pudo registrar el pago. Verifica los datos.».",
        solucion:
          "Revisa el monto y el atleta elegido. Si aparece otro mensaje más específico, sigue lo que indica. La ventana se queda abierta con lo que escribiste.",
      },
      {
        sintoma: "Un pago con tarjeta aparece como «Fallido».",
        solucion:
          "Tócalo: en «Motivo» ves por qué no pasó y cuántos intentos hubo. El atleta tiene que volver a intentarlo, o puedes registrar su pago si te paga en efectivo o transferencia.",
      },
      {
        sintoma: "Me sale «No se pudo emitir la factura. Inténtalo de nuevo.».",
        solucion:
          "Si el mensaje trae un motivo (por ejemplo, un dato del atleta), corrígelo antes de reintentar. Si no, espera un momento y vuelve a presionar el botón.",
      },
      {
        sintoma: "Me sale «No se pudo registrar la evidencia. Puede que la ventana para responder ya venciera.».",
        solucion: "Revisa la fecha de «Responder antes de». Si ya pasó, la disputa ya no acepta evidencia.",
      },
      {
        sintoma: "El botón «Enviar evidencia» está apagado.",
        solucion: "Escribe tu descargo o pega un enlace a la evidencia: al menos uno de los dos.",
      },
      {
        sintoma:
          "Veo «No se pudieron cargar los contracargos: si un atleta disputó un cobro, no lo estás viendo.».",
        solucion:
          "Presiona reintentar. No lo ignores: puede haber una disputa con fecha límite que no estás viendo.",
      },
      {
        sintoma: "No veo la pestaña «Contracargos».",
        solucion: "Solo aparece cuando algún atleta ha disputado un cobro, y solo para el administrador del gimnasio.",
      },
      {
        sintoma: "No veo en el estado de cuenta un pago en efectivo que registré.",
        solucion:
          "Es normal: el estado de cuenta solo muestra lo cobrado por tarjeta. El pago manual sí aparece en la pestaña «Pagos».",
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
      "Aquí ves qué le debes a cada coach, generas las liquidaciones de un periodo y las marcas como pagadas (quedan registradas como gasto de nómina). También defines cómo se le paga a cada coach y su servicio de personal trainer.",
    tareas: [
      {
        titulo: "Ver qué le debes a cada coach",
        pasos: [
          "Arriba, en «Por pagar», ves en amarillo cada liquidación que todavía no has pagado: el coach, el periodo, cuántos pagos suma y el total.",
          "Junto al título, la etiqueta amarilla dice cuántas son y cuánto suman en total.",
        ],
        nota: "Si no debes nada, dice «Nada por pagar.».",
      },
      {
        titulo: "Generar la liquidación de un periodo",
        pasos: [
          "En «Por pagar», presiona «Generar liquidación».",
          "En la ventana, elige la fecha «Desde» y la fecha «Hasta». Por defecto va del primer día del mes a hoy.",
          "Presiona «Generar liquidación». Si falta una fecha o «Desde» es posterior a «Hasta», el botón queda apagado y el campo dice qué corregir.",
          "Si había algo pendiente, aparece el aviso «Liquidación generada» con cuántas liquidaciones salieron y por cuánto, y aparecen en «Por pagar».",
        ],
      },
      {
        titulo: "Marcar una liquidación como pagada",
        pasos: [
          "Cuando ya le pagaste al coach, toca su liquidación en «Por pagar» (o su fila en «Liquidaciones»).",
          "En la ventana revisa el periodo, los pagos y el total.",
          "Presiona «Marcar pagada».",
        ],
        nota:
          "Pasa a «Pagada», sale de «Por pagar» y se registra como gasto de nómina. Ya no se puede volver a marcar.",
      },
      {
        titulo: "Definir cómo se le paga a un coach",
        pasos: [
          "En «Coaches», toca al coach. Su tarjeta dice cómo se le paga hoy (por ejemplo «Por clase · Q75.00»).",
          "En «Forma de pago» elige «Por clase» o «Fijo».",
          "Si es «Por clase», escribe su «Tarifa por clase». Si es «Fijo», escribe su «Salario fijo».",
          "Presiona «Guardar».",
        ],
        nota:
          "Coach por clase: se le acumula la tarifa por cada clase que imparte. Coach fijo: solo se le paga extra en las clases marcadas como «pagar extra». Una clase cuenta como impartida solo si no se canceló y al menos un atleta tiene asistencia: si nadie llegó, no se paga. Un coach «Por clase» sin tarifa sale en amarillo («Por clase · sin tarifa»): así no genera nada al liquidar.",
      },
      {
        titulo: "Habilitar el personal trainer de un coach",
        pasos: [
          "En «Coaches», toca al coach.",
          "Activa «Ofrece personal trainer».",
          "Escribe el «Precio de la sesión» y la «Comisión del trainer» en porcentaje (de 0 a 100).",
          "Debajo ves cuánto le toca al trainer y cuánto le queda al gym por sesión.",
          "Presiona «Guardar».",
        ],
        nota:
          "El cobro completo del personal trainer es ingreso del gym, y la comisión del trainer entra a la liquidación del coach. La tarjeta del coach dice «PT» con su precio y su comisión.",
      },
    ],
    conceptos: [
      {
        termino: "Por pagar",
        detalle: "Las liquidaciones que siguen «Abierta»: lo que aún les debes a tus coaches.",
      },
      {
        termino: "Por clase",
        detalle:
          "Se le acumula su «Tarifa por clase» por cada clase que imparte. Solo cuenta la clase que no se canceló y en la que al menos un atleta tiene asistencia.",
      },
      {
        termino: "Fijo",
        detalle: "Tiene «Salario fijo». En las liquidaciones solo se le suma algo en las clases marcadas como «pagar extra».",
      },
      {
        termino: "Trainer / Gym (personal trainer)",
        detalle:
          "Sobre el precio de la sesión, cuánto es la comisión del trainer y cuánto te queda a ti (precio menos esa comisión).",
      },
      {
        termino: "Liquidación",
        detalle:
          "El pago acumulado de un coach en un periodo. En la tabla «Liquidaciones» ves el coach, el periodo, el número en «Pagos», el «Total» y el estado. Junto al título, «Pagado» es la suma de todas las que ya marcaste como pagadas.",
      },
      {
        termino: "Pagos",
        detalle:
          "Cuántas cosas suma esa liquidación: cada clase impartida, cada clase con «pagar extra» y cada sesión de personal trainer cuentan como una. Las clases sin ninguna asistencia o canceladas no entran.",
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
          "Revisa que las clases del periodo ya hayan pasado, tengan coach y al menos un check-in; que el coach «Por clase» tenga una tarifa mayor a Q0; y que las clases de coaches con salario fijo estén marcadas como «pagar extra».",
      },
      {
        sintoma: "Me sale «No se pudo guardar el cambio de nómina del coach».",
        solucion:
          "El cambio no se guardó: la tarjeta del coach sigue mostrando lo que estaba. La ventana se queda abierta con lo que escribiste; revisa el número y presiona «Guardar» otra vez. Si el aviso dice el motivo, corrígelo antes.",
      },
      {
        sintoma: "Me sale «No se pudo generar la liquidación».",
        solucion: "Revisa las fechas «Desde» y «Hasta» e intenta de nuevo.",
      },
      {
        sintoma: "El botón «Generar liquidación» de la ventana está apagado.",
        solucion:
          "Falta la fecha «Desde» o «Hasta», o «Desde» es posterior a «Hasta». Debajo del campo en rojo dice qué corregir. Un periodo de un solo día sí se puede.",
      },
      {
        sintoma: "No veo «Precio de la sesión» ni «Comisión del trainer».",
        solucion: "Solo aparecen con «Ofrece personal trainer» activado.",
      },
      {
        sintoma: "«Coaches» dice «Sin coaches».",
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
      "Aquí ves la rentabilidad de tu gimnasio en las fechas que elijas: cuánto entró y de dónde, cuánto costó operar y cuánto quedó al final.",
    tareas: [
      {
        titulo: "Ver el resultado de un periodo",
        pasos: [
          "En «Resultado», elige la fecha «Desde» y la fecha «Hasta». Por defecto va del primer día del mes a hoy.",
          "Si tienes varias sedes, elige una en el selector de sede o déjalo en «Todas las sedes».",
          "Lee de arriba abajo: «Ingresos» (con el detalle por línea y su porcentaje), «Costo de lo vendido», «Margen bruto», «Mermas», «Gastos operativos» (con el detalle por categoría) y, al final, «Utilidad neta».",
        ],
        nota:
          "Los costos salen en negativo porque se restan. Las flechas ▲ (verde) y ▼ (rojo) junto a «Ingresos» y «Utilidad neta» comparan contra el periodo anterior del mismo largo. Si no hay con qué comparar, sale una raya.",
      },
      {
        titulo: "Revisar ventas de productos y socios",
        pasos: [
          "Baja a «Socios y productos».",
          "Arriba ves tus socios activos, las altas del periodo y las unidades compradas a inventario.",
          "En «Más vendidos» ves los productos con más unidades vendidas.",
          "En «Retail por categoría» ves, por categoría (ropa, bebidas, suplementos…), las unidades, el ingreso y el margen. Incluye el mostrador y la tienda de la app.",
          "En «Ventas por método» ves cuánto entró por cada forma de pago en las ventas de productos.",
        ],
        nota:
          "«Ventas por método» solo suma las ventas de productos (mostrador y tienda de la app); las membresías y servicios no entran ahí.",
      },
    ],
    conceptos: [
      {
        termino: "Ingresos",
        detalle:
          "Todo lo que entró en el periodo: membresías, servicios (personal trainer, clases y pases), retail de mostrador y tienda de la app. Los porcentajes de cada línea se calculan sobre esta cifra.",
      },
      {
        termino: "Costo de lo vendido",
        detalle: "Lo que te costaron los productos que vendiste.",
      },
      {
        termino: "Margen bruto",
        detalle: "Ingresos menos el costo de lo vendido. Al lado ves qué porcentaje del ingreso es.",
      },
      {
        termino: "Mermas",
        detalle: "Producto que se perdió o se dañó en el periodo.",
      },
      {
        termino: "Gastos operativos",
        detalle:
          "Lo que cuesta operar el gimnasio (renta, nómina, servicios…), sin las compras de inventario. Debajo va el detalle por categoría, que suma exactamente este renglón.",
      },
      {
        termino: "Utilidad neta",
        detalle:
          "Lo que queda al final: margen bruto menos mermas y gastos operativos. Al lado ves su porcentaje de margen sobre los ingresos y cómo cambió frente al periodo anterior.",
      },
      {
        termino: "Margen (retail)",
        detalle: "En «Retail por categoría», el ingreso de la categoría menos su costo.",
      },
      {
        termino: "Sede",
        detalle: "El selector solo aparece si tu gimnasio tiene sedes. Sin elegir ninguna, el reporte incluye todas.",
      },
    ],
    problemas: [
      {
        sintoma: "Me sale «Sin actividad en esas fechas.».",
        solucion: "No hay actividad en el periodo que elegiste. Prueba con otras fechas.",
      },
      {
        sintoma: "En lugar del reporte me sale «Elige la fecha «Desde» y la fecha «Hasta».» u otro aviso de fechas.",
        solucion:
          "Falta la fecha «Desde» o «Hasta», o «Desde» es posterior a «Hasta». Corrige la fecha marcada en rojo y el reporte aparece solo.",
      },
      {
        sintoma: "«Más vendidos», «Retail por categoría» o «Ventas por método» salen vacíos.",
        solucion: "Todavía no hay ventas de productos en esas fechas.",
      },
      {
        sintoma: "No aparece el detalle debajo de «Gastos operativos».",
        solucion: "No hay gastos registrados en esas fechas. Regístralos en «Gastos».",
      },
      {
        sintoma: "No veo el selector de sede.",
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
