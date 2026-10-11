import type { ManualesPorRuta } from "./tipos";

/** Manuales del ERP del menú «Negocio»: inventario, punto de venta y gastos. */
export const manualesErp: ManualesPorRuta = {
  "/panel/inventario": {
    titulo: "Inventario",
    paraQue:
      "Aquí llevas todo lo que vendes en recepción y en la tienda del app: el catálogo con su stock, las mermas y los conteos de bodega, las compras a tus proveedores, cuánto dinero tienes parado en producto y los pedidos que tus atletas hacen desde el app.",
    tareas: [
      {
        titulo: "Agregar un producto al catálogo",
        pasos: [
          "Entra a la pestaña «Productos».",
          "En «Nuevo producto» escribe el «Nombre» y elige la «Categoría».",
          "Escribe el «Precio venta (Q)» y, si lo sabes, el «Costo (Q)». Sin costo el producto queda en Q0 y el margen no te dirá la verdad.",
          "En «Reorden» pon la cantidad mínima que quieres tener en bodega. Cuando el stock baje de ahí, el producto se marca para reabastecer.",
          "Si la categoría es «Merch / Ropa», agrega las «Tallas» y los «Colores»: escribe cada uno y presiona Enter. El atleta los elige al comprar.",
          "Presiona «Agregar producto».",
        ],
        nota:
          "El botón «Agregar producto» se queda apagado hasta que pongas nombre y precio de venta. El producto nace con stock 0: el stock entra con «Entrada» o recibiendo una compra a proveedor.",
      },
      {
        titulo: "Vender un producto en la tienda del app",
        pasos: [
          "Al crear el producto (o en «Editar»), activa «Vender en la tienda de la app».",
          "Escribe una «Descripción» (material, beneficios, sabor…) y sube la «Foto del producto».",
          "En «Días de entrega» deja 0 si lo tienes disponible de inmediato, o pon cuántos días tarda en llegar.",
          "Si todavía no ha salido, activa «Próximo lanzamiento (se puede apartar)» y elige la «Fecha de lanzamiento». Tus atletas lo podrán apartar.",
          "Presiona «Agregar producto» (o «Guardar» si lo estabas editando).",
        ],
        nota:
          "En la columna «Tienda (app)» ves cómo se anuncia: «Disponible», «Entrega en N días» o «Próximamente». Un guion (—) quiere decir que no está a la venta en el app.",
      },
      {
        titulo: "Crear un preparado con receta (licuados, batidos…)",
        pasos: [
          "Primero da de alta los insumos como productos normales (proteína, leche, fruta…).",
          "Al crear el preparado, activa «Es un preparado (receta)».",
          "Elige un insumo en «Agregar insumo…», pon cuántas unidades lleva y presiona «Añadir». Repite con cada insumo.",
          "Si te equivocaste, cambia la cantidad o presiona «Quitar» junto al insumo.",
          "Presiona «Agregar producto».",
        ],
        nota:
          "Cuando vendes un preparado, se descuentan del inventario sus insumos, no el preparado. Su costo sale de la receta.",
      },
      {
        titulo: "Registrar una entrada rápida de mercadería",
        pasos: [
          "En la pestaña «Productos», busca el producto en «Catálogo · stock actual».",
          "En la columna «Reabastecer» escribe cuántas unidades llegaron.",
          "Presiona «Entrada». Si el campo está vacío o no es un número entero mayor que cero, sale un aviso amarillo y no se registra nada.",
        ],
        nota:
          "La entrada rápida suma stock pero no queda ligada a un proveedor. Si quieres saber a quién le compraste y a qué costo, usa la pestaña «Compras a proveedor».",
      },
      {
        titulo: "Sacar un producto del Punto de venta sin borrarlo",
        pasos: [
          "En «Catálogo · stock actual», busca el producto.",
          "Apaga el interruptor de la columna «Activo». Te sale un aviso de que ya no aparece en el Punto de venta.",
          "Para volver a venderlo, enciende otra vez el interruptor «Activo».",
        ],
        nota:
          "Un producto apagado sigue en tu catálogo con su stock y su historial; solo deja de salir en «Punto de venta». Si no se pudo cambiar, sale un aviso en rojo y el interruptor se queda como estaba.",
      },
      {
        titulo: "Editar o eliminar un producto",
        pasos: [
          "En «Catálogo · stock actual», busca el producto (puedes escribir en «Buscar producto o categoría…»).",
          "Presiona «Editar» para cambiar nombre, categoría, precios, nivel de reorden, tienda del app, foto o receta, y luego «Guardar».",
          "Para borrarlo presiona «Eliminar» y confirma.",
        ],
        nota:
          "En el teléfono, los botones de cada fila están dentro del menú de tres puntos (⋮). Si al presionar «Guardar» algo no se puede guardar, sale un aviso en rojo que dice por qué y la ventana se queda abierta para que lo corrijas. Si lo único que falló fue la foto, el aviso te lo dice: los demás cambios ya quedaron guardados.",
      },
      {
        titulo: "Agregar fotos extra a un producto",
        pasos: [
          "Presiona «Editar» en el producto.",
          "Baja a «Galería de imágenes».",
          "En «Agregar imágenes» elige una o varias fotos y presiona «Subir».",
          "Para quitar una foto, presiona la ✕ en su esquina.",
        ],
        nota:
          "La galería son fotos adicionales a la portada y se ven en el detalle del producto en el app. Para cambiar la portada usa «Foto del producto». Si una foto no se puede subir o quitar, sale un aviso en rojo; las fotos elegidas se quedan en «Agregar imágenes» para que vuelvas a presionar «Subir».",
      },
      {
        titulo: "Dar de baja producto perdido (merma)",
        pasos: [
          "Entra a la pestaña «Kardex, mermas y ajustes».",
          "En «Registrar merma» elige el «Producto».",
          "Escribe la «Cantidad perdida» y el «Motivo» (por ejemplo «se vencieron 3 barras»).",
          "Presiona «Registrar merma».",
        ],
        nota:
          "Úsalo para producto vencido, roto, robado o consumido en casa. Sale del stock y cuenta como pérdida en tu reporte de negocio.",
      },
      {
        titulo: "Cuadrar el sistema con lo que contaste en bodega",
        pasos: [
          "Entra a la pestaña «Kardex, mermas y ajustes».",
          "En «Ajuste por conteo físico» elige el «Producto». Abajo verás lo que dice el sistema.",
          "En «Unidades contadas» escribe lo que contaste, no la diferencia.",
          "Si quieres, agrega una «Nota» (por ejemplo «Conteo de fin de mes»).",
          "Presiona «Aplicar conteo».",
        ],
        nota:
          "El ajuste no es una pérdida: corrige un error de captura y no toca la línea de mermas del reporte. La diferencia final se calcula contra el stock del momento en que lo aplicas, por si hubo una venta mientras contabas.",
      },
      {
        titulo: "Ver por qué un stock no cuadra",
        pasos: [
          "Entra a la pestaña «Kardex, mermas y ajustes».",
          "En «Kardex · todos los movimientos» filtra por producto y, si quieres, por tipo de movimiento.",
          "Revisa las filas: el stock de cada producto es la suma de todas ellas.",
        ],
      },
      {
        titulo: "Dar de alta un proveedor",
        pasos: [
          "Entra a la pestaña «Proveedores».",
          "En «Nuevo proveedor» escribe el «Nombre». Si quieres, agrega «Contacto», «Teléfono», «Correo», «NIT» y «Notas».",
          "Presiona «Agregar proveedor».",
        ],
        nota:
          "Necesitas al menos un proveedor activo para poder hacer órdenes de compra.",
      },
      {
        titulo: "Editar o dar de baja un proveedor",
        pasos: [
          "En la pestaña «Proveedores», búscalo por nombre, contacto o NIT.",
          "Presiona «Editar», cambia los datos y presiona «Guardar».",
          "Para dejar de usarlo presiona «Dar de baja» y confirma.",
        ],
        nota:
          "Dar de baja no borra sus órdenes de compra: solo deja de aparecer al crear órdenes nuevas. Para verlo otra vez, cambia el filtro «Estado» a «Inactivos» o «Todos».",
      },
      {
        titulo: "Hacer una orden de compra a un proveedor",
        pasos: [
          "Entra a la pestaña «Compras a proveedor» y presiona «Nueva orden».",
          "Elige el «Proveedor». Si quieres, escribe la «Referencia» (número de factura o pedido), la «Fecha de la orden», la «Fecha estimada de llegada» y una «Nota». Si tienes varias sedes, elige la «Sede».",
          "En «Productos» elige el producto, la cantidad («Cant.») y el «Costo (Q)». Si dejas el costo vacío se usa el del catálogo.",
          "Para otro producto presiona «Agregar producto». Abajo ves el «Estimado» de la orden.",
          "Deja activado «Ya está ordenada al proveedor» si ya hiciste el pedido; apagado queda como «Borrador».",
          "Presiona «Crear orden».",
        ],
        nota:
          "Crear la orden no mueve el stock. El stock entra hasta que recibes la mercadería. Una orden creada ya no se puede editar, ni siquiera en «Borrador», ni cambiar de «Borrador» a «Ordenada»: solo la puedes «Recibir» o «Anular». Si te equivocaste, anúlala y crea otra.",
      },
      {
        titulo: "Recibir la mercadería de una orden",
        pasos: [
          "En «Historial de órdenes», presiona «Recibir» en la fila de la orden.",
          "Si llegó todo, presiona «Recibir todo lo pendiente».",
          "Si llegó solo una parte, escribe en la columna «Llegó» cuántas unidades de cada producto y presiona «Recibir lo indicado».",
          "Deja activado «Actualizar el costo del producto con esta compra» para que el costo del catálogo quede al día. Si quieres, escribe una «Nota de la recepción».",
        ],
        nota:
          "Al recibir, el stock entra con el costo real de la compra. Si solo llegó una parte, la orden queda «Recibida parcial» y puedes volver a «Recibir» cuando llegue el resto.",
      },
      {
        titulo: "Anular una orden de compra",
        pasos: [
          "En «Historial de órdenes», presiona «Anular» en la fila de la orden.",
          "Escribe el motivo y acepta.",
        ],
        nota:
          "Solo se pueden anular órdenes en «Borrador», «Ordenada» o «Recibida parcial». Lo que ya recibiste se queda en el inventario.",
      },
      {
        titulo: "Saber cuánto dinero tienes parado en bodega",
        pasos: [
          "Entra a la pestaña «Valuación».",
          "Elige la «Ventana de análisis» (de «Últimos 30 días» a «Último año»).",
          "Arriba ves el «Valor del inventario a costo». Debajo, cuánto vale a precio de venta, el margen potencial, el capital dormido y cuántos productos hay que reordenar.",
          "En «Detalle por producto» filtra por «Solo capital dormido» o «Solo por reordenar» para ver qué atender primero.",
        ],
      },
      {
        titulo: "Atender un pedido de la tienda del app",
        pasos: [
          "Entra a la pestaña «Pedidos de la tienda». El número junto al nombre indica cuántos pedidos tienes pendientes.",
          "Presiona «Ver» para revisar productos, totales, dirección de envío y la «Bitácora» del pedido.",
          "Presiona «Preparando» cuando lo empieces a armar.",
          "Si es con envío, presiona «Enviar», escribe la «Guía o rastreo» si la tienes y presiona «Marcar enviado».",
          "Cuando el atleta lo recibe, presiona «Entregado».",
        ],
        nota:
          "Cada paso cambia el estado que ve el atleta en el seguimiento de su pedido. El botón «Enviar» solo sale en pedidos con envío a domicilio; los que se recogen en el gym van directo a «Entregado».",
      },
      {
        titulo: "Cancelar o devolver un pedido de la tienda",
        pasos: [
          "Busca el pedido en «Pedidos de la tienda».",
          "Para un pedido que todavía no se ha entregado, presiona «Cancelar».",
          "Para un pedido ya pagado, presiona «Devolver» y confirma.",
        ],
        nota:
          "Al devolver se registra el reembolso del precio del gym y el stock regresa. El recargo de Nucleo no se reembolsa, y el dinero se le entrega al atleta por fuera.",
      },
      {
        titulo: "Resolver una devolución que pidió un atleta",
        pasos: [
          "En la pestaña «Pedidos de la tienda», arriba aparece «Devoluciones por resolver» cuando hay alguna.",
          "Lee el «Motivo» que escribió el atleta.",
          "Presiona «Aprobar» y, si quieres, déjale una nota; o presiona «Rechazar» y explícale por qué.",
        ],
        nota:
          "Al aprobar se registra el reembolso del precio del gym y las unidades regresan al inventario. El recargo de Nucleo no se reembolsa.",
      },
      {
        titulo: "Configurar los envíos a domicilio",
        pasos: [
          "En la pestaña «Pedidos de la tienda», en la tarjeta «Envíos», presiona «Configurar».",
          "Activa «Ofrecer envío a domicilio».",
          "Escribe el «Costo del envío (Q)», desde qué monto es gratis en «Envío gratis desde (Q)» (vacío = nunca) y los «Días estimados».",
          "Si quieres, agrega una «Nota para el atleta» (por ejemplo «solo enviamos dentro de la ciudad»).",
          "Presiona «Guardar».",
        ],
        nota:
          "Con los envíos desactivados, tus atletas solo pueden recoger en el gym.",
      },
    ],
    conceptos: [
      {
        termino: "Stock",
        detalle:
          "Las unidades que el sistema dice que tienes. Si sale en rojo con ⚠, bajó del nivel de reorden y conviene reabastecer.",
      },
      {
        termino: "Reorden / Nivel de reorden",
        detalle:
          "La cantidad mínima que quieres en bodega. Por debajo de ella el producto se marca «Reordenar».",
      },
      {
        termino: "Margen",
        detalle: "Lo que ganas por unidad: precio de venta menos costo.",
      },
      {
        termino: "Disponible / Entrega en N días / Próximamente",
        detalle:
          "Cómo se anuncia el producto en la tienda del app: listo para llevar, con días de espera, o como lanzamiento que se puede apartar.",
      },
      {
        termino: "Preparado (receta)",
        detalle:
          "Un producto hecho de otros, como un licuado. Al venderlo se descuentan sus insumos.",
      },
      {
        termino: "Kardex",
        detalle:
          "La lista de todos los movimientos de inventario. El stock de cada producto es la suma de esas filas.",
      },
      {
        termino: "Entrada / compra · Venta · Ajuste por conteo · Merma · Devolución",
        detalle:
          "Los tipos de movimiento del kardex. Las cantidades en negativo son salidas de bodega.",
      },
      {
        termino: "Merma vs. ajuste por conteo",
        detalle:
          "La merma es producto que se perdió de verdad y cuenta como pérdida. El ajuste solo corrige un error de captura y no cuenta como pérdida.",
      },
      {
        termino: "Borrador / Ordenada / Recibida parcial / Recibida / Anulada",
        detalle:
          "Los estados de una orden de compra. Solo «Recibida parcial» y «Recibida» han metido stock.",
      },
      {
        termino: "Recibido (orden de compra)",
        detalle: "Cuánto vale, en quetzales, lo que ya llegó de esa orden.",
      },
      {
        termino: "Valor del inventario a costo",
        detalle: "Cuánto pagaste por todo lo que tienes en bodega hoy.",
      },
      {
        termino: "Margen potencial",
        detalle: "Lo que ganarías si vendieras todo lo que tienes en bodega.",
      },
      {
        termino: "Capital dormido / Dormido",
        detalle:
          "Producto con stock que no se vendió en la ventana de análisis que elegiste. Es dinero parado.",
      },
      {
        termino: "Días de stock y Rotación",
        detalle:
          "Días de stock: para cuántos días te alcanza lo que tienes al ritmo actual de ventas. Rotación: las unidades vendidas en la ventana entre el stock actual. En «Días de stock» el guion (—) quiere decir que no hubo ventas en la ventana; en «Rotación», que no hay stock.",
      },
      {
        termino: "Antigüedad",
        detalle:
          "Hace cuántos días fue la última compra y la última venta del producto.",
      },
      {
        termino: "Pago pendiente / Apartado / Pagado / Preparando / En camino / Entregado / Cancelado / Devuelto",
        detalle:
          "Los estados de un pedido de la tienda. «Apartado» es un producto de próximo lanzamiento que el atleta reservó.",
      },
      {
        termino: "Devolución (etiqueta naranja)",
        detalle:
          "El atleta pidió devolver ese pedido y está esperando tu respuesta en «Devoluciones por resolver».",
      },
      {
        termino: "Total del gym",
        detalle:
          "Lo que le toca al gym por el pedido. Si el atleta pagó más, la diferencia es el recargo de Nucleo, que no es ingreso del gym.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudo cargar el catálogo de productos.»",
        solucion:
          "Presiona el botón para reintentar. No vuelvas a crear los productos: siguen ahí, solo no se pudieron mostrar.",
      },
      {
        sintoma: "Presioné «Entrada» y me salió un aviso amarillo.",
        solucion:
          "El aviso dice que falta la cantidad: escribe en «Reabastecer» un número entero mayor que cero (sin decimales ni letras) y vuelve a presionar «Entrada».",
      },
      {
        sintoma: "Al registrar una merma me sale un aviso amarillo de stock negativo.",
        solucion:
          "Estás dando de baja más unidades de las que tiene el sistema. Si la diferencia es por un error de captura, usa «Ajuste por conteo físico» en vez de la merma.",
      },
      {
        sintoma: "El botón «Nueva orden» está apagado.",
        solucion:
          "No tienes proveedores activos. Da de alta uno en la pestaña «Proveedores».",
      },
      {
        sintoma: "Al recibir me dice «Indica cuántas unidades llegaron.»",
        solucion:
          "Presionaste «Recibir lo indicado» sin escribir cantidades en la columna «Llegó». Escríbelas, o usa «Recibir todo lo pendiente».",
      },
      {
        sintoma: "La orden ya no tiene botón «Recibir», solo «Ver».",
        solucion:
          "La orden ya está «Recibida» o «Anulada». Ya no admite más mercadería.",
      },
      {
        sintoma: "En «Valuación» sale «Sin inventario».",
        solucion:
          "Todavía no tienes productos con stock. Registra una entrada o recibe una orden de compra.",
      },
      {
        sintoma: "No me sale el botón «Enviar» en un pedido.",
        solucion:
          "El atleta eligió recoger en el gym. Cuando lo recoja, márcalo como «Entregado».",
      },
    ],
    relacionadas: [
      { label: "Punto de venta", href: "/panel/pos" },
      { label: "Gastos", href: "/panel/gastos" },
      { label: "Reportes de negocio", href: "/panel/reportes" },
    ],
  },

  "/panel/pos": {
    titulo: "Punto de venta",
    paraQue:
      "Aquí cobras en recepción: armas el carrito, eliges cómo paga la persona y registras la venta. Cada venta descuenta del inventario. Abajo ves las ventas recientes y puedes devolverlas.",
    tareas: [
      {
        titulo: "Cobrar una venta",
        pasos: [
          "En «Nueva venta» elige el «Producto». La lista muestra su precio y cuánto stock queda.",
          "Pon la «Cantidad» y presiona «Añadir». Repite con cada producto.",
          "Revisa el «Carrito» y el «Total a cobrar». Si te equivocaste en una línea, presiona «Quitar».",
          "Si la compra es de un atleta tuyo, elígelo en «Atleta (opcional)». Si lo dejas vacío, la venta queda anónima.",
          "Si tienes varias sedes, elige la «Sede».",
          "Elige el «Método»: «Efectivo», «Tarjeta» o «Transferencia».",
          "Presiona «Registrar venta».",
        ],
        nota:
          "Cuando la venta se registra, sale el aviso «Venta registrada.», el carrito se vacía y la venta aparece en «Ventas recientes». Si vendes un preparado (por ejemplo un licuado), se descuentan sus insumos.",
      },
      {
        titulo: "Devolver una venta",
        pasos: [
          "En «Ventas recientes», busca la venta.",
          "Presiona «Devolver» y confirma.",
        ],
        nota:
          "La devolución regresa el stock al inventario y aparece en la lista como una fila nueva marcada «Devolución ·», con el monto en negativo. La venta original no se borra. Cuando ya devolviste todo lo de una venta, en su lugar dice «Devuelta» y ya no aparece «Devolver».",
      },
    ],
    conceptos: [
      {
        termino: "Total a cobrar",
        detalle:
          "La suma del carrito a precio de venta. Debajo dice cuántas líneas y unidades lleva.",
      },
      {
        termino: "Venta anónima",
        detalle: "Una venta sin atleta asignado, por ejemplo a un visitante.",
      },
      {
        termino: "Margen (ventas recientes)",
        detalle: "Lo que ganaste en esa venta: precio de venta menos costo.",
      },
      {
        termino: "Devolución ·",
        detalle:
          "Una fila que deshace una venta anterior. Su total va en negativo y en naranja.",
      },
    ],
    problemas: [
      {
        sintoma: "Sale «No se pudo cargar el catálogo de productos: no se puede cobrar hasta que vuelva.»",
        solucion:
          "Presiona el botón para reintentar. Mientras no cargue el catálogo no se puede registrar ninguna venta.",
      },
      {
        sintoma: "Aparece un mensaje en rojo debajo de «Registrar venta».",
        solucion:
          "La venta no se registró. Lee el mensaje (por ejemplo, una cantidad que no se puede vender), corrige el carrito y vuelve a presionar «Registrar venta».",
      },
      {
        sintoma: "No encuentro un producto en la lista.",
        solucion:
          "Revisa en «Inventario» que exista y que tenga encendido el interruptor «Activo». Solo aparecen los productos activos del catálogo.",
      },
      {
        sintoma: "El botón «Registrar venta» está apagado.",
        solucion: "El carrito está vacío. Añade al menos un producto.",
      },
      {
        sintoma: "Me sale «No se pudo registrar la devolución.»",
        solucion:
          "Lee el detalle del mensaje. Si dice «Esta venta ya fue devuelta por completo.», la devolución ya existe: búscala en la lista como fila «Devolución ·».",
      },
    ],
    relacionadas: [
      { label: "Inventario", href: "/panel/inventario" },
      { label: "Reportes de negocio", href: "/panel/reportes" },
    ],
  },

  "/panel/gastos": {
    titulo: "Gastos",
    paraQue:
      "Aquí registras los costos del gym (renta, servicios, equipo, nómina…) para ver tu utilidad real. Un gasto nunca se borra: si te equivocaste, se anula o se corrige y queda el rastro.",
    tareas: [
      {
        titulo: "Registrar un gasto",
        pasos: [
          "En «Registrar gasto» elige la «Categoría».",
          "Escribe el «Monto (Q)» y una «Descripción».",
          "Revisa la «Fecha»: viene con la de hoy.",
          "Si quieres, sube el «Comprobante (factura o recibo)» como foto o PDF. También lo puedes adjuntar después.",
          "Si tienes varias sedes, elige la «Sede».",
          "Presiona «Registrar».",
        ],
        nota: "El botón «Registrar» se queda apagado hasta que escribas el monto.",
      },
      {
        titulo: "Buscar y filtrar gastos",
        pasos: [
          "Escribe en «Buscar» parte de la descripción o la categoría.",
          "En «Estado» elige «Vigentes», «Anulados» o «Todos».",
          "En «Categoría» elige una para ver solo esos gastos.",
        ],
        nota:
          "La cifra de arriba, «Suma de los gastos listados», suma lo que estás viendo con los filtros aplicados, pero solo los gastos vigentes: los anulados y los corregidos se ven en la lista y no se suman. Por eso con «Anulados» la suma queda en Q0.00.",
      },
      {
        titulo: "Ver el detalle de un gasto",
        pasos: [
          "En «Movimientos», presiona «Ver» en la fila del gasto.",
          "Ahí ves categoría, fecha, monto, descripción, el comprobante y el «Rastro»: cuándo se registró y si se anuló o corrigió.",
        ],
      },
      {
        titulo: "Adjuntar un comprobante a un gasto ya registrado",
        pasos: [
          "En «Movimientos», presiona «Comprobante» en la fila del gasto.",
          "Elige el archivo en «Factura o recibo» (foto o PDF).",
          "Presiona «Adjuntar».",
        ],
      },
      {
        titulo: "Corregir un gasto mal capturado",
        pasos: [
          "En «Movimientos», presiona «Corregir» en la fila del gasto.",
          "Cambia lo que esté mal: «Categoría», «Monto (Q)», «Descripción», «Fecha» o «Sede».",
          "Si quieres, sube otro «Comprobante». Si no subes uno, se conserva el del gasto original.",
          "Presiona «Corregir».",
        ],
        nota:
          "No se edita el gasto original: se anula y se registra uno nuevo con los datos corregidos. Los dos quedan enlazados en el histórico.",
      },
      {
        titulo: "Anular un gasto",
        pasos: [
          "En «Movimientos», presiona «Anular» en la fila del gasto.",
          "Escribe el «Motivo» (por ejemplo «se capturó dos veces»).",
          "Presiona «Anular».",
        ],
        nota:
          "El gasto deja de contar en la utilidad, pero no se borra: queda con su motivo y su fecha de anulación. Un gasto anulado o corregido ya no se puede corregir, anular ni cambiarle el comprobante; solo se consulta con «Ver».",
      },
    ],
    conceptos: [
      {
        termino: "Vigente",
        detalle: "Un gasto que cuenta en tu utilidad.",
      },
      {
        termino: "Anulado",
        detalle:
          "Un gasto que dejó de contar en la utilidad. Sigue en el histórico con su motivo. Se ve más tenue en la tabla.",
      },
      {
        termino: "Corregido",
        detalle:
          "Un gasto que se reemplazó por otro con los datos buenos. El nuevo dice «Corrige a un gasto anterior» debajo de su descripción.",
      },
      {
        termino: "Categorías",
        detalle:
          "«Renta», «Servicios», «Equipo», «Marketing», «Nómina», «Compra de inventario» y «Otro».",
      },
      {
        termino: "Rastro",
        detalle:
          "En el detalle del gasto: cuándo se registró y si nació de una corrección o fue corregido después.",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Anular» de la ventana está apagado.",
        solucion: "Escribe el motivo de la anulación: es obligatorio.",
      },
      {
        sintoma: "No me aparecen «Corregir», «Comprobante» ni «Anular» en un gasto.",
        solucion:
          "Ese gasto ya está anulado o corregido. Solo se puede consultar con «Ver».",
      },
      {
        sintoma: "No encuentro un gasto que anulé.",
        solucion: "Cambia el filtro «Estado» a «Anulados» o «Todos».",
      },
      {
        sintoma: "Sale «No se pudo registrar el gasto.» u otro mensaje en rojo.",
        solucion:
          "Lee el detalle del mensaje, corrige el dato que señala (por ejemplo el monto o la fecha) y vuelve a presionar «Registrar».",
      },
    ],
    relacionadas: [
      { label: "Reportes de negocio", href: "/panel/reportes" },
      { label: "Pagos a coaches", href: "/panel/coaches-pagos" },
      { label: "Inventario", href: "/panel/inventario" },
    ],
  },
};
