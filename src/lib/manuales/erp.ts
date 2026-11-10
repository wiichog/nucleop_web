import type { ManualesPorRuta } from "./tipos";

/** Manuales del ERP del menú «Negocio»: inventario, punto de venta y gastos. */
export const manualesErp: ManualesPorRuta = {
  "/panel/inventario": {
    titulo: "Inventario",
    paraQue:
      "Aquí llevas lo que vendes en recepción y en la tienda del app: tus productos con su stock, los pedidos que tus atletas hacen desde el app, las compras a tus proveedores, los movimientos de bodega y cuánto dinero tienes en producto.",
    tareas: [
      {
        titulo: "Agregar un producto",
        pasos: [
          "En la pestaña «Productos» presiona «Nuevo producto».",
          "Escribe el «Nombre» y elige la «Categoría».",
          "Escribe el «Precio (Q)» y, si lo sabes, el «Costo (Q)». Sin costo el producto queda en Q0 y el margen no te dirá la verdad.",
          "En «Mínimo en bodega» pon cuántas unidades quieres tener como mínimo. Cuando el stock llega a ese número o baja de él, la tarjeta del producto sale en amarillo.",
          "Si la categoría es «Merch / Ropa», agrega las «Tallas» y los «Colores»: escribe cada uno y presiona Enter. El atleta los elige al comprar.",
          "Presiona «Crear producto».",
        ],
        nota:
          "«Crear producto» se queda apagado hasta que pongas nombre y precio. El producto nace con stock 0: el stock entra con «Registrar entrada» en su ficha o recibiendo una compra a proveedor.",
      },
      {
        titulo: "Ver lo que se está acabando",
        pasos: [
          "En «Productos», las tarjetas en amarillo con ⚠ son las que llegaron a su mínimo en bodega. Salen primero.",
          "Junto al título, «N por reabastecer» dice cuántas son. Presiónalo para ver solo esas; presiónalo otra vez para ver todas.",
          "Toca la tarjeta para registrar la entrada, o haz una orden en «Compras».",
        ],
        nota:
          "No cuentan los productos inactivos ni los preparados (licuados): un preparado no tiene stock propio, se descuentan sus insumos.",
      },
      {
        titulo: "Vender un producto en la tienda del app",
        pasos: [
          "Al crear el producto (o con «Editar» en su ficha), activa «Vender en la tienda del app».",
          "Escribe una «Descripción» (material, beneficios, sabor…) y sube la «Foto» (si ya tiene una, el campo dice «Cambiar foto»).",
          "En «Días de entrega» deja 0 si lo tienes listo para llevar, o pon cuántos días tarda en llegar.",
          "Si todavía no ha salido, activa «Próximo lanzamiento (se puede apartar)» y elige la «Fecha de lanzamiento». Tus atletas lo podrán apartar.",
          "Presiona «Crear producto» (o «Guardar» si lo estabas editando).",
        ],
        nota:
          "En la tarjeta del producto ves cómo se anuncia: «En el app», «App · N días» o «Próximamente». Si no tiene ninguna de esas etiquetas, no está a la venta en el app.",
      },
      {
        titulo: "Crear un preparado con receta (licuados, batidos…)",
        pasos: [
          "Primero da de alta los insumos como productos normales (proteína, leche, fruta…).",
          "Al crear el preparado, activa «Es un preparado (receta)».",
          "Elige un insumo en «Agregar insumo…», pon cuántas unidades lleva y presiona «Añadir». Repite con cada insumo.",
          "Si te equivocaste, cambia la cantidad o presiona «Quitar» junto al insumo.",
          "Presiona «Crear producto».",
        ],
        nota:
          "Cuando vendes un preparado, se descuentan del inventario sus insumos, no el preparado. Su costo sale de la receta. Su tarjeta dice «Receta» en lugar del stock, y su ficha muestra lo que lleva.",
      },
      {
        titulo: "Registrar una entrada rápida de mercadería",
        pasos: [
          "En «Productos», toca la tarjeta del producto.",
          "En «Ajustar stock» deja elegido «Entrada».",
          "En «Unidades que llegaron» escribe cuántas llegaron y presiona «Registrar entrada».",
        ],
        nota:
          "Si el campo está vacío o no es un número entero mayor que cero, sale un aviso amarillo y no se registra nada. La entrada rápida suma stock pero no queda ligada a un proveedor: si quieres saber a quién le compraste y a qué costo, usa la pestaña «Compras».",
      },
      {
        titulo: "Sacar un producto del Punto de venta sin borrarlo",
        pasos: [
          "Toca la tarjeta del producto.",
          "Arriba a la derecha, apaga «Activo». Te sale un aviso de que ya no aparece en el Punto de venta.",
          "Para volver a venderlo, enciende otra vez «Activo».",
        ],
        nota:
          "Un producto apagado sigue en tu catálogo con su stock y su historial; solo deja de salir en «Punto de venta» y en la tienda del app. Su tarjeta sale atenuada, al final, con la etiqueta «Inactivo». Si no se pudo cambiar, sale un aviso en rojo y el interruptor se queda como estaba.",
      },
      {
        titulo: "Editar o eliminar un producto",
        pasos: [
          "Busca el producto: puedes escribir en «Buscar producto o categoría…» el nombre o la categoría (por ejemplo «Suplemento»).",
          "Toca su tarjeta y presiona «Editar». Cambia nombre, categoría, precios, mínimo en bodega, tienda del app, foto o receta, y presiona «Guardar».",
          "Para borrarlo, en la ficha del producto presiona «Eliminar» y confirma.",
        ],
        nota:
          "Si al presionar «Guardar» algo no se puede guardar, sale un aviso en rojo que dice por qué y la ventana se queda abierta para que lo corrijas. Si lo único que falló fue la foto, el aviso te lo dice: los demás cambios ya quedaron guardados.",
      },
      {
        titulo: "Agregar fotos extra a un producto",
        pasos: [
          "Toca la tarjeta del producto y presiona «Editar».",
          "Con «Vender en la tienda del app» activado, baja a «Galería».",
          "En «Agregar imágenes» elige una o varias fotos y presiona «Subir».",
          "Para quitar una foto, presiona la ✕ en su esquina.",
        ],
        nota:
          "La galería son fotos adicionales a la portada y se ven en el detalle del producto en el app. Para cambiar la portada usa «Foto» (o «Cambiar foto»). Si una foto no se puede subir o quitar, sale un aviso en rojo; las fotos elegidas se quedan en «Agregar imágenes» para que vuelvas a presionar «Subir».",
      },
      {
        titulo: "Dar de baja producto perdido (merma)",
        pasos: [
          "Toca la tarjeta del producto. (O entra a «Movimientos», presiona «Ajustar stock» y elige el «Producto».)",
          "En «Ajustar stock» elige «Merma».",
          "Escribe la «Cantidad perdida» y el «Motivo» (por ejemplo «se vencieron 3 barras»).",
          "Presiona «Registrar merma».",
        ],
        nota:
          "Úsalo para producto vencido, roto, robado o consumido en casa. Sale del stock y cuenta como pérdida en tu reporte de negocio.",
      },
      {
        titulo: "Cuadrar el sistema con lo que contaste en bodega",
        pasos: [
          "Toca la tarjeta del producto. (O entra a «Movimientos», presiona «Ajustar stock» y elige el «Producto».)",
          "En «Ajustar stock» elige «Conteo». «Unidades contadas» arranca en lo que dice el sistema.",
          "Escribe lo que contaste, no la diferencia. Abajo ves si faltarían o sobrarían unidades.",
          "Si quieres, agrega una «Nota» (por ejemplo «Conteo de fin de mes»).",
          "Presiona «Aplicar conteo». Debajo te dice cuánto faltaba o sobraba y cómo quedó el stock.",
        ],
        nota:
          "El ajuste no es una pérdida: corrige un error de captura y no toca la línea de mermas del reporte. La diferencia final se calcula contra el stock del momento en que lo aplicas, por si hubo una venta mientras contabas. Para contar varios productos seguidos, usa «Ajustar stock» en «Movimientos»: la ventana se queda abierta y solo cambias el «Producto».",
      },
      {
        titulo: "Ver por qué un stock no cuadra",
        pasos: [
          "Toca la tarjeta del producto y presiona «Ver movimientos»: llegas a «Movimientos» con ese producto ya filtrado.",
          "O entra a «Movimientos» y elige el producto en «Todos los productos» y, si quieres, el tipo en «Todos los movimientos».",
          "Revisa las filas: el stock de cada producto es la suma de todas ellas.",
        ],
      },
      {
        titulo: "Dar de alta un proveedor",
        pasos: [
          "Entra a la pestaña «Proveedores» y presiona «Nuevo proveedor».",
          "Escribe el «Nombre». Si quieres, agrega «Contacto», «Teléfono», «Correo», «NIT» y «Notas».",
          "Presiona «Crear proveedor».",
        ],
        nota: "Necesitas al menos un proveedor activo para poder hacer órdenes de compra.",
      },
      {
        titulo: "Editar, dar de baja o reactivar un proveedor",
        pasos: [
          "En «Proveedores», búscalo en «Nombre, contacto o NIT…» y toca su tarjeta.",
          "Cambia los datos y presiona «Guardar».",
          "Para dejar de usarlo presiona «Dar de baja» y confirma.",
          "Para volver a usar uno dado de baja, cambia la lista «Activos» a «Inactivos» o «Todos», toca su tarjeta y presiona «Reactivar».",
        ],
        nota:
          "Dar de baja no borra sus órdenes de compra: solo deja de aparecer al crear órdenes nuevas. Al reactivarlo vuelve a salir en «Compras».",
      },
      {
        titulo: "Hacer una orden de compra a un proveedor",
        pasos: [
          "Entra a la pestaña «Compras» y presiona «Nueva orden».",
          "Elige el «Proveedor». Si quieres, escribe la «Referencia» (número de factura o pedido), la «Fecha de la orden», la «Fecha estimada de llegada» y una «Nota». Si tienes varias sedes, elige la «Sede».",
          "En «Productos» elige el producto, la cantidad («Cant.») y el «Costo (Q)». Si dejas el costo vacío se usa el del catálogo.",
          "Para otro producto presiona «Agregar producto». Abajo ves el «Estimado» de la orden.",
          "Deja activado «Ya está ordenada al proveedor» si ya hiciste el pedido; apagado queda como «Borrador».",
          "Presiona «Crear orden».",
        ],
        nota:
          "Crear la orden no mueve el stock: el stock entra hasta que recibes la mercadería. Una orden creada ya no se puede editar, ni siquiera en «Borrador», ni cambiar de «Borrador» a «Ordenada»: solo la puedes recibir o anular. Si te equivocaste, anúlala y crea otra. Sin proveedores activos, «Nueva orden» está apagado y sale «Primero agrega un proveedor →», que te lleva a «Proveedores».",
      },
      {
        titulo: "Recibir la mercadería de una orden",
        pasos: [
          "En «Compras», las órdenes que esperan mercadería salen en amarillo y primero; junto al título, «N por recibir» dice cuántas son. Toca la orden.",
          "Si llegó todo, presiona «Recibir todo lo pendiente».",
          "Si llegó solo una parte, escribe en la columna «Llegó» cuántas unidades de cada producto y presiona «Recibir lo indicado».",
          "Deja activado «Actualizar el costo del producto con esta compra» para que el costo del catálogo quede al día. Si quieres, escribe una «Nota de la recepción».",
        ],
        nota:
          "Al recibir, el stock entra con el costo real de la compra. Si solo llegó una parte, la orden queda «Recibida parcial» y puedes volver a tocarla para recibir el resto cuando llegue.",
      },
      {
        titulo: "Anular una orden de compra",
        pasos: [
          "En «Compras», toca la orden.",
          "Abajo presiona «Anular».",
          "Escribe el «Motivo de la anulación» si quieres y presiona «Anular orden». Si te arrepentiste, presiona «No anular».",
        ],
        nota:
          "Solo se pueden anular órdenes en «Borrador», «Ordenada» o «Recibida parcial». Lo que ya recibiste se queda en el inventario.",
      },
      {
        titulo: "Saber cuánto dinero tienes en bodega",
        pasos: [
          "Entra a la pestaña «Valuación» y elige la ventana a la derecha (de «Últimos 30 días» a «Último año»).",
          "Arriba ves «A costo», «A precio de venta», «Margen potencial», «Capital dormido» y «Por reordenar». Las dos últimas salen en amarillo cuando hay algo que atender.",
          "Toca «Capital dormido» o «Por reordenar» para ver solo esos productos en «Por producto»; tócala otra vez para ver todos. También puedes usar la lista «Todos los productos».",
        ],
      },
      {
        titulo: "Atender un pedido de la tienda del app",
        pasos: [
          "Entra a la pestaña «Pedidos de la tienda». El número junto al nombre son los pedidos pagados que todavía nadie empezó: en la lista salen en amarillo y primero, y junto a «Pedidos» dice «N nuevos».",
          "La lista muestra lo que está «Por entregar». Para ver lo demás, cambia esa lista a «Todos» o a un estado.",
          "Toca el pedido: ves sus productos, el total, la entrega y la «Bitácora».",
          "Presiona «Preparando» cuando lo empieces a armar.",
          "Si es con envío, presiona «Enviar», escribe la «Guía o rastreo» si la tienes y presiona «Marcar enviado».",
          "Cuando el atleta lo recibe, presiona «Entregado».",
        ],
        nota:
          "Cada paso cambia el estado que ve el atleta en el seguimiento de su pedido. «Enviar» solo sale en pedidos con envío a domicilio; los que se recogen en el gym van directo a «Entregado».",
      },
      {
        titulo: "Cancelar o devolver un pedido de la tienda",
        pasos: [
          "En «Pedidos de la tienda», toca el pedido.",
          "Si todavía no se ha entregado, presiona «Cancelar pedido» y confirma.",
          "Si ya está pagado, presiona «Devolver» y confirma.",
        ],
        nota:
          "Al devolver se registra el reembolso del precio del gym y el stock regresa. El recargo de Nucleo no se reembolsa, y el dinero se le entrega al atleta por fuera.",
      },
      {
        titulo: "Resolver una devolución que pidió un atleta",
        pasos: [
          "En «Pedidos de la tienda», arriba aparece «Devoluciones» con «N por resolver» cuando hay alguna.",
          "Lee el motivo del atleta (va entre comillas). «Ver» abre el pedido completo.",
          "Para aceptarla presiona «Aprobar», escribe una nota si quieres y presiona «Aprobar devolución».",
          "Para no aceptarla presiona «Rechazar», escríbele por qué y presiona «Rechazar devolución».",
        ],
        nota:
          "Al aprobar se registra el reembolso del precio del gym y las unidades regresan al inventario. El recargo de Nucleo no se reembolsa.",
      },
      {
        titulo: "Configurar los envíos a domicilio",
        pasos: [
          "En «Pedidos de la tienda», presiona «Envíos» (a su lado dice si están «Activos» o «Apagados»).",
          "Activa «Ofrecer envío a domicilio».",
          "Escribe el «Costo del envío (Q)», desde qué monto es gratis en «Envío gratis desde (Q)» (vacío = nunca) y los «Días estimados».",
          "Si quieres, agrega una «Nota para el atleta» (por ejemplo «solo enviamos dentro de la ciudad»).",
          "Presiona «Guardar».",
        ],
        nota: "Con los envíos apagados, tus atletas solo pueden recoger en el gym.",
      },
    ],
    conceptos: [
      {
        termino: "Stock",
        detalle:
          "Las unidades que el sistema dice que tienes. Si la tarjeta sale en amarillo con ⚠, el producto llegó a su mínimo en bodega y conviene reabastecer.",
      },
      {
        termino: "Mínimo en bodega (reorden)",
        detalle:
          "La cantidad mínima que quieres tener. Cuando el stock llega a ese número o baja de él, el producto cuenta «por reabastecer» (en «Valuación», «Por reordenar»).",
      },
      {
        termino: "Ficha del producto",
        detalle:
          "Lo que se abre al tocar una tarjeta: su stock, precio, costo y margen, el interruptor «Activo», «Ajustar stock» y los botones «Editar», «Ver movimientos» y «Eliminar».",
      },
      {
        termino: "Margen",
        detalle: "Lo que ganas por unidad: precio de venta menos costo.",
      },
      {
        termino: "En el app / App · N días / Próximamente",
        detalle:
          "Cómo se anuncia el producto en la tienda del app: listo para llevar, con días de espera, o como lanzamiento que se puede apartar.",
      },
      {
        termino: "Preparado (receta)",
        detalle: "Un producto hecho de otros, como un licuado. Al venderlo se descuentan sus insumos.",
      },
      {
        termino: "Entrada · Merma · Conteo",
        detalle:
          "Las tres formas de «Ajustar stock» a mano: lo que llegó, lo que se perdió y lo que contaste en bodega.",
      },
      {
        termino: "Movimientos (kardex)",
        detalle:
          "La lista de todos los movimientos de inventario. El stock de cada producto es la suma de esas filas.",
      },
      {
        termino: "Entrada / compra · Venta · Ajuste por conteo · Merma · Devolución",
        detalle: "Los tipos de movimiento. Las cantidades en negativo son salidas de bodega.",
      },
      {
        termino: "Merma vs. conteo",
        detalle:
          "La merma es producto que se perdió de verdad y cuenta como pérdida. El conteo solo corrige un error de captura y no cuenta como pérdida.",
      },
      {
        termino: "Borrador / Ordenada / Recibida parcial / Recibida / Anulada",
        detalle:
          "Los estados de una orden de compra. Solo «Recibida parcial» y «Recibida» han metido stock. Las tres primeras esperan mercadería y salen en amarillo.",
      },
      {
        termino: "Recibido (orden de compra)",
        detalle: "En una orden «Recibida parcial», cuánto vale en quetzales lo que ya llegó.",
      },
      {
        termino: "A costo",
        detalle: "Cuánto pagaste por todo lo que tienes en bodega hoy.",
      },
      {
        termino: "Margen potencial",
        detalle: "Lo que ganarías si vendieras todo lo que tienes en bodega.",
      },
      {
        termino: "Capital dormido / Dormido",
        detalle:
          "Producto con stock que no se vendió en la ventana que elegiste. Es dinero parado.",
      },
      {
        termino: "Días de stock y Rotación",
        detalle:
          "Días de stock: para cuántos días te alcanza lo que tienes al ritmo actual de ventas. Rotación: las unidades vendidas en la ventana entre el stock actual. En «Días de stock» el guion (—) quiere decir que no hubo ventas en la ventana; en «Rotación», que no hay stock.",
      },
      {
        termino: "Antigüedad",
        detalle: "Hace cuántos días fue la última compra y la última venta del producto.",
      },
      {
        termino: "Pago pendiente / Apartado / Pagado / Preparando / En camino / Entregado / Cancelado / Devuelto",
        detalle:
          "Los estados de un pedido de la tienda. «Apartado» es un producto de próximo lanzamiento que el atleta reservó. «Por entregar» junta Pagado, Apartado, Preparando y En camino.",
      },
      {
        termino: "Nuevo (pedido)",
        detalle: "Un pedido «Pagado» que todavía nadie empezó a preparar. Sale en amarillo.",
      },
      {
        termino: "Devolución (etiqueta naranja)",
        detalle: "El atleta pidió devolver ese pedido y está esperando tu respuesta en «Devoluciones».",
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
        sintoma: "Presioné «Registrar entrada» y me salió un aviso amarillo.",
        solucion:
          "Falta la cantidad: escribe en «Unidades que llegaron» un número entero mayor que cero (sin decimales ni letras) y vuelve a presionar «Registrar entrada».",
      },
      {
        sintoma: "Al registrar una merma me sale un aviso amarillo de stock negativo.",
        solucion:
          "Estás dando de baja más unidades de las que tiene el sistema. Si la diferencia es por un error de captura, presiona «usa el conteo» en el aviso y aplica un conteo en vez de la merma.",
      },
      {
        sintoma: "La ficha de un licuado no tiene «Ajustar stock».",
        solucion:
          "Un preparado no lleva stock propio: se descuentan sus insumos. Ajusta el stock de cada insumo en su propia tarjeta.",
      },
      {
        sintoma: "No encuentro un producto que apagué.",
        solucion: "Los productos inactivos salen al final de la lista, atenuados y con la etiqueta «Inactivo».",
      },
      {
        sintoma: "El botón «Nueva orden» está apagado.",
        solucion:
          "No tienes proveedores activos. Presiona «Primero agrega un proveedor →» y da de alta uno en «Proveedores».",
      },
      {
        sintoma: "Al recibir me dice «Indica cuántas unidades llegaron.»",
        solucion:
          "Presionaste «Recibir lo indicado» sin escribir cantidades en la columna «Llegó». Escríbelas, o usa «Recibir todo lo pendiente».",
      },
      {
        sintoma: "Toco una orden y no salen «Recibir todo lo pendiente» ni «Anular».",
        solucion: "La orden ya está «Recibida» o «Anulada». Ya no admite más mercadería.",
      },
      {
        sintoma: "En «Valuación» sale «Sin inventario todavía».",
        solucion:
          "Todavía no tienes productos con stock. Registra una entrada o recibe una orden de compra.",
      },
      {
        sintoma: "En «Pedidos de la tienda» no veo un pedido que ya entregué.",
        solucion: "La lista arranca en «Por entregar». Cámbiala a «Todos» o a «Entregado».",
      },
      {
        sintoma: "No me sale el botón «Enviar» en un pedido.",
        solucion: "El atleta eligió recoger en el gym. Cuando lo recoja, márcalo como «Entregado».",
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
      "Aquí cobras en recepción: tocas los productos, eliges cómo paga la persona y cobras. Cada venta descuenta del inventario. Abajo están tus ventas; al tocar una ves su detalle y la puedes devolver.",
    tareas: [
      {
        titulo: "Cobrar una venta",
        pasos: [
          "En «Productos», toca cada producto que lleva la persona. Cada toque suma una unidad; el producto queda marcado con cuántas llevas (por ejemplo «×2»).",
          "Si no lo ves, escríbelo en «Buscar producto o SKU» o toca su categoría arriba de los productos («Todos» las muestra todas).",
          "Revisa la «Venta» a la derecha (en el celular, abajo de los productos). Cambia la cantidad con «−» y «+» o escribiendo el número; el bote de basura quita el producto. «Vaciar» quita todo.",
          "Elige cómo paga: «Efectivo», «Tarjeta» o «Transferencia».",
          "Si la compra es de un atleta tuyo, elígelo donde dice «Sin atleta». Si lo dejas así, la venta queda anónima.",
          "Si tienes varias sedes, elige la sede donde dice «Sin sede».",
          "Presiona «Cobrar», que muestra el total (por ejemplo «Cobrar Q56.00»).",
        ],
        nota:
          "Cuando la venta se registra sale el aviso «Venta registrada.», la venta se vacía y aparece de primera en «Ventas». En el celular, mientras llevas productos, abajo sale el botón «Ver venta» con las unidades y el total: te lleva directo a cobrar. Si vendes un preparado (por ejemplo un licuado), se descuentan sus insumos.",
      },
      {
        titulo: "Cobrar con lector de código de barras",
        pasos: [
          "Toca «Buscar producto o SKU».",
          "Escanea el producto. Si el código coincide con un solo producto, queda en la venta y la búsqueda se limpia para el siguiente.",
        ],
      },
      {
        titulo: "Ver una venta o devolverla",
        pasos: [
          "En «Ventas», toca la venta. Se abre con sus productos, el total, el margen, cómo se pagó y el atleta.",
          "Para devolverla, presiona «Devolver venta» y luego «Sí, devolver».",
        ],
        nota:
          "La devolución regresa el stock al inventario y aparece en «Ventas» como una fila nueva marcada «Devolución», con el monto en negativo. La venta original no se borra. Cuando ya devolviste todo lo de una venta, queda marcada «Devuelta» y ya no ofrece «Devolver venta». Al principio se ven las ventas más recientes; «Ver más» muestra las anteriores.",
      },
    ],
    conceptos: [
      {
        termino: "Sin stock (en amarillo)",
        detalle:
          "El producto no tiene existencias en el inventario. Revisa «Inventario» antes de venderlo.",
      },
      {
        termino: "Preparado",
        detalle:
          "Un producto con receta, como un licuado. No lleva stock propio: al venderlo se descuentan sus insumos.",
      },
      {
        termino: "Tarjeta",
        detalle:
          "Un cobro con tu terminal (POS) en recepción. No lleva el cargo por pago con tarjeta en línea.",
      },
      {
        termino: "Venta anónima",
        detalle: "Una venta sin atleta asignado, por ejemplo a un visitante.",
      },
      {
        termino: "Margen",
        detalle: "Lo que ganaste en esa venta: precio de venta menos costo. Lo ves al tocar la venta.",
      },
      {
        termino: "Devolución",
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
        sintoma: "Aparece un mensaje en rojo debajo de «Cobrar».",
        solucion:
          "La venta no se registró. Lee el mensaje (por ejemplo, una cantidad que no se puede vender), corrige la venta y vuelve a presionar «Cobrar».",
      },
      {
        sintoma: "No encuentro un producto.",
        solucion:
          "Toca «Todos» en las categorías y borra lo que escribiste en la búsqueda. Si sigue sin salir, revisa en «Inventario» que exista y que tenga encendido el interruptor «Activo»: solo salen los productos activos.",
      },
      {
        sintoma: "Sale «Aún no tienes productos a la venta.»",
        solucion: "Presiona «Agregar productos» para ir a «Inventario» y dar de alta lo que vendes.",
      },
      {
        sintoma: "El botón «Cobrar» está apagado.",
        solucion: "La venta está vacía. Toca al menos un producto.",
      },
      {
        sintoma: "Me sale «No se pudo registrar la devolución.»",
        solucion:
          "Lee el detalle del mensaje. Si dice «Esta venta ya fue devuelta por completo.», la devolución ya existe: búscala en «Ventas» como fila «Devolución».",
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
      "Aquí registras los costos del gym (renta, servicios, equipo, nómina…) para ver tu utilidad real. Ves los gastos del mes con su total. Un gasto nunca se borra: si te equivocaste, se anula o se corrige y queda el rastro.",
    tareas: [
      {
        titulo: "Registrar un gasto",
        pasos: [
          "Presiona «Nuevo gasto».",
          "Elige la «Categoría».",
          "Escribe el «Monto» en quetzales y una «Descripción».",
          "Revisa la «Fecha»: viene con la de hoy.",
          "Si tienes varias sedes, elige la «Sede».",
          "Si quieres, sube el «Comprobante» (foto o PDF de la factura o recibo). También lo puedes adjuntar después.",
          "Presiona «Registrar».",
        ],
        nota: "El botón «Registrar» se queda apagado hasta que escribas el monto. Al registrarlo sale el aviso «Gasto registrado.» y se cierra la ventana.",
      },
      {
        titulo: "Ver los gastos de otro mes",
        pasos: [
          "Arriba a la derecha está el mes que estás viendo (por ejemplo «Noviembre 2026»). Tócalo y elige otro mes.",
          "Para ver todo junto, elige «Todo el historial».",
        ],
        nota:
          "Debajo de los filtros ves cuántos gastos hay y el total. El total suma lo que estás viendo, pero solo los gastos vigentes: los anulados y los corregidos se ven en la lista y no se suman (te dice cuántos quedaron fuera). Por eso con «Anulados» el total queda en Q0.00.",
      },
      {
        titulo: "Buscar, filtrar y ordenar",
        pasos: [
          "Escribe en «Buscar descripción o categoría».",
          "En «Categoría» elige una para ver solo esos gastos.",
          "Cambia «Vigentes» por «Anulados» o «Todos» para ver los gastos anulados o corregidos.",
          "Cambia «Más recientes» por «Mayor monto» para ver primero los gastos más grandes.",
        ],
      },
      {
        titulo: "Completar los comprobantes que faltan",
        pasos: [
          "Si hay gastos sin factura ni recibo, junto al mes sale en amarillo cuántos son (por ejemplo «3 sin comprobante»).",
          "Tócalo y la lista muestra solo esos. Tócalo otra vez para ver todos.",
          "Toca un gasto, presiona «Adjuntar comprobante», elige el archivo en «Factura o recibo» y presiona «Adjuntar».",
        ],
        nota: "El aviso amarillo desaparece cuando ya no queda ningún gasto vigente sin comprobante. Los gastos con comprobante llevan un clip en la lista.",
      },
      {
        titulo: "Ver el detalle de un gasto",
        pasos: [
          "Toca el gasto en la lista.",
          "Ahí ves categoría, fecha, sede, monto, descripción, «Ver comprobante» y cuándo se registró. Si está anulado o corregido, también el motivo y la fecha.",
        ],
      },
      {
        titulo: "Corregir un gasto mal capturado",
        pasos: [
          "Toca el gasto y presiona «Corregir».",
          "Cambia lo que esté mal: «Categoría», «Monto», «Descripción», «Fecha» o «Sede».",
          "Si quieres, sube otro «Comprobante». Si no subes uno, se conserva el del gasto original.",
          "Presiona «Corregir».",
        ],
        nota:
          "No se edita el gasto original: se anula y se registra uno nuevo con los datos corregidos. Los dos quedan enlazados en el histórico, y el nuevo dice «Corrige a un gasto anterior».",
      },
      {
        titulo: "Cambiar el comprobante de un gasto",
        pasos: [
          "Toca el gasto y presiona «Cambiar comprobante» (o «Adjuntar comprobante» si aún no tiene).",
          "Elige el archivo en «Factura o recibo» y presiona «Adjuntar».",
        ],
      },
      {
        titulo: "Anular un gasto",
        pasos: [
          "Toca el gasto y presiona «Anular».",
          "Escribe el «Motivo» (por ejemplo «se capturó dos veces»).",
          "Presiona «Anular».",
        ],
        nota:
          "El gasto deja de contar en la utilidad, pero no se borra: queda con su motivo y su fecha de anulación. Un gasto anulado o corregido ya no se puede corregir, anular ni cambiarle el comprobante; solo se consulta tocándolo.",
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
          "Un gasto que dejó de contar en la utilidad. Sigue en el histórico con su motivo. Se ve más tenue en la lista.",
      },
      {
        termino: "Corregido",
        detalle:
          "Un gasto que se reemplazó por otro con los datos buenos. El nuevo dice «Corrige a un gasto anterior» debajo de su descripción.",
      },
      {
        termino: "Sin comprobante (en amarillo)",
        detalle: "Gastos vigentes del mes que todavía no tienen factura ni recibo adjunto.",
      },
      {
        termino: "Categorías",
        detalle:
          "«Renta», «Servicios», «Equipo», «Marketing», «Nómina», «Compra de inventario» y «Otro».",
      },
    ],
    problemas: [
      {
        sintoma: "El botón «Anular» de la ventana está apagado.",
        solucion: "Escribe el motivo de la anulación: es obligatorio.",
      },
      {
        sintoma: "Al tocar un gasto no me aparecen «Corregir», «Anular» ni el comprobante.",
        solucion: "Ese gasto ya está anulado o corregido. Solo se puede consultar.",
      },
      {
        sintoma: "No encuentro un gasto.",
        solucion:
          "Revisa el mes de arriba (o elige «Todo el historial»). Si lo anulaste, cambia «Vigentes» por «Anulados» o «Todos».",
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
