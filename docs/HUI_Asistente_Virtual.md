# Historias de Usuario de Interfaz (HUI) — Módulo de Asistente Virtual con IA

> **Proyecto:** SistemInv — Sistema de Inventario Inteligente  
> **Módulo:** Asistente Virtual (SistemBot AI)  
> **Motor de IA:** Google Gemini (gemini-flash-lite-latest)  
> **Fecha de redacción:** 02/05/2026

---

## HUI-35: Interfaz flotante global para el chat

**Como** usuario del sistema,  
**Quiero** tener acceso a un botón flotante visible en todas las vistas de la aplicación que abra una ventana de chat con el asistente virtual,  
**Para** poder interactuar con la IA sin perder el contexto de la pantalla en la que estoy trabajando.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El botón flotante se muestra en la esquina inferior derecha de la pantalla en todas las vistas (Inventario, POS, Dashboard, Configuración). | El icono del bot es visible permanentemente. |
| 2 | Al hacer clic en el botón flotante, se despliega una ventana de chat con animación suave. | La ventana aparece sin saltos ni parpadeos. |
| 3 | Al hacer clic nuevamente (o en el botón de cerrar), la ventana se oculta. | El chat se cierra y el botón vuelve a su estado original. |
| 4 | Existe un botón para expandir/maximizar la ventana del chat a un tamaño mayor. | El chat crece ocupando más espacio en pantalla y un segundo clic lo reduce. |
| 5 | Existe un botón para borrar el historial del chat con un cuadro de confirmación estilizado (no el nativo del navegador). | Se muestra el ConfirmModal corporativo con las opciones "Sí, borrar" y "Cancelar", ambas funcionales. |
| 6 | La ventana del chat respeta la paleta de colores verde/turquesa del sistema. | Encabezado, burbujas del bot y acentos siguen el tema visual del sistema (variables CSS del proyecto). |

---

## HUI-36: Creación interactiva de productos vía asistente

**Como** administrador o empleado,  
**Quiero** poder decirle al asistente que registre un producto nuevo describiendo sus datos en lenguaje natural,  
**Para** agilizar el alta de productos sin tener que navegar hasta el formulario manual.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede escribir mensajes como "Crea un producto llamado Martillo, categoría herramientas, unidad: unidad, cantidad 50, precio 18000". | El bot interpreta los campos y ejecuta la creación. |
| 2 | Si falta algún campo obligatorio (nombre, categoría, unidad de medida, cantidad), el bot lo solicita amablemente antes de guardar. | El bot responde pidiendo el dato faltante sin proceder hasta tenerlo. |
| 3 | El SKU se genera automáticamente por el backend. | El bot confirma la creación mostrando el SKU asignado. |
| 4 | Tras la creación exitosa, la tabla de inventario se actualiza automáticamente sin necesidad de recargar la página. | La tabla refleja el nuevo producto en tiempo real. |
| 5 | Se envía una notificación por correo electrónico al administrador informando del nuevo producto creado. | El correo incluye el nombre, SKU y precio del producto. |

---

## HUI-37: Asistente de Caja Virtual (POS)

**Como** cajero o empleado,  
**Quiero** poder dictarle al asistente virtual los productos que un cliente desea comprar para que los prepare en mi pantalla de caja registradora,  
**Para** agilizar el proceso de ventas sin buscar manualmente cada producto en el catálogo.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | Si el usuario escribe frases como "un cliente quiere comprar 3 pegantes" o "ponme 2 Mangueras en la caja", el bot prepara el carrito visualmente en el POS. | Los productos se agregan al Ticket Actual de la caja registradora automáticamente. |
| 2 | Si el usuario dice el producto en singular (ej: "un pegante"), el bot asume 1 unidad sin pedir confirmación de cantidad. | El producto se agrega con cantidad 1 directamente. |
| 3 | Si el usuario está en otra vista (ej: Inventario), el sistema navega automáticamente a la vista de Caja (POS) al preparar el carrito. | La interfaz cambia a la pestaña POS y muestra los ítems en el ticket. |
| 4 | El bot **no** cobra la venta automáticamente; solo prepara el carrito para revisión manual del cajero. | El empleado debe presionar "Completar Venta" manualmente para finalizar la transacción. |
| 5 | Solo si el usuario ordena explícitamente completar la venta remotamente (ej: "cobra la venta ahora"), el bot la procesa de fondo. | La venta se registra, el stock se descuenta, se envía correo de recibo y el carrito visual se limpia. |
| 6 | Tras una venta remota exitosa ejecutada por el bot, el carrito del POS se vacía automáticamente. | El Ticket Actual queda limpio sin ítems residuales. |

---

## HUI-38: Alertas y recomendaciones dinámicas sobre productos

**Como** administrador,  
**Quiero** que el asistente me informe proactivamente sobre productos con existencias críticas y que pueda ajustar los topes mínimos de stock,  
**Para** tomar decisiones de reabastecimiento oportunas y evitar rupturas de inventario.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede preguntar "¿Qué productos están agotados?" y el bot devuelve la lista. | Se muestra una lista con los productos cuya cantidad es 0. |
| 2 | El usuario puede preguntar "¿Cuáles tienen stock bajo?" y el bot devuelve solo los que están por debajo del mínimo pero no agotados. | Se listan productos con `cantidad <= stock_mínimo` y `cantidad > 0`. |
| 3 | El bot puede ajustar el stock de un producto de forma absoluta si el usuario lo indica (ej: "Pon el stock de SKU-1002 en 50 unidades"). | Se actualiza la cantidad del producto y la tabla se refresca. |
| 4 | Antes de ejecutar ajustes drásticos de inventario, el bot pide confirmación explícita al usuario. | El bot pregunta "¿Estás seguro?" antes de proceder. |
| 5 | Al hacer ventas vía el asistente, si un producto alcanza stock 0 o cae bajo el mínimo, se dispara una alerta de stock por correo. | El correo llega al administrador con el detalle del producto crítico. |

---

## HUI-39: Consultas rápidas de inventario

**Como** usuario del sistema,  
**Quiero** poder hacerle preguntas naturales al asistente sobre el estado del inventario,  
**Para** obtener información rápida sin tener que navegar por tablas o aplicar filtros manuales.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede preguntar "¿Cuántas unidades hay de Pegante?" | El bot responde con el nombre, SKU, cantidad y precio del producto. |
| 2 | El usuario puede buscar por nombre parcial (ej: "busca productos con la palabra martillo"). | El bot devuelve todos los productos que coincidan. |
| 3 | El usuario puede preguntar "¿Cuál es el producto más vendido?" | El bot analiza el historial de ventas y responde con el producto con más unidades vendidas. |
| 4 | Las respuestas del bot se renderizan con formato enriquecido (negritas, listas con viñetas). | El texto se muestra con estilos HTML, no con marcas crudas de Markdown. |

---

## HUI-40: Historial de chat persistente e independiente por usuario

**Como** usuario del sistema,  
**Quiero** que mi conversación con el asistente se mantenga guardada incluso si cierro el chat o la pestaña del navegador, y que sea independiente de otros usuarios,  
**Para** poder retomar el contexto de mis consultas previas sin perder información.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | Al cerrar y volver a abrir la ventana del chat, los mensajes anteriores siguen visibles. | Los mensajes se cargan desde `localStorage`. |
| 2 | Cada usuario ve únicamente su propio historial de chat. | El almacenamiento se segmenta por `username` (`sistemBotMessages_{username}`). |
| 3 | Al iniciar sesión con otro usuario, el historial mostrado corresponde exclusivamente a ese usuario. | No se mezclan conversaciones entre cuentas. |
| 4 | Al borrar el historial, se eliminan los mensajes locales y se reinicia la sesión con la IA en el backend. | El chat queda con el mensaje de bienvenida y el cerebro de la IA se reinicia. |

---

## HUI-41: Edición y eliminación de productos vía asistente

**Como** administrador,  
**Quiero** poder pedirle al asistente que edite el nombre o precio de un producto, o que lo elimine del catálogo,  
**Para** gestionar el inventario de forma conversacional sin usar formularios.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede escribir "Cambia el nombre de SKU-1002 a Pegante Industrial" y el bot ejecuta la edición. | El nombre del producto se actualiza en la base de datos. |
| 2 | El usuario puede escribir "Cambia el precio de SKU-1002 a 25000". | El precio se actualiza correctamente. |
| 3 | Tras una edición exitosa, la tabla de inventario se actualiza en tiempo real sin recargar la página. | El cambio se refleja inmediatamente en el grid del frontend. |
| 4 | Para eliminar un producto, el bot solicita confirmación explícita antes de proceder. | El bot pregunta: "¿Estás completamente seguro de que deseas eliminar este producto permanentemente?" |
| 5 | Tras la eliminación confirmada, el producto desaparece de la tabla del inventario automáticamente. | La tabla se refresca en tiempo real. |

---

## HUI-42: Reportes de inventario por correo electrónico

**Como** administrador,  
**Quiero** poder pedirle al asistente que envíe un reporte detallado de productos con existencias críticas al correo del administrador,  
**Para** tener un registro formal por email de las carencias del inventario y compartirlo con otros responsables.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede escribir "Manda el reporte de stock agotado al administrador". | El bot envía un correo que incluye **solo** los productos agotados. |
| 2 | El usuario puede escribir "Envía la lista de productos con stock bajo". | El bot envía un correo que incluye **solo** los productos con stock bajo (por debajo del mínimo pero no agotados). |
| 3 | El usuario puede pedir ambos reportes simultáneamente (ej: "Mándame el reporte completo de carencias"). | El correo incluye ambas categorías: agotados (en rojo) y stock bajo (en naranja). |
| 4 | Si no hay productos en condición crítica, el bot informa que todo está saludable y no envía correo. | El bot responde indicando que no hay carencias. |
| 5 | El correo tiene formato HTML profesional con tabla estilizada, códigos de colores por severidad y nombre del solicitante. | El email es legible, corporativo y distingue visualmente los productos agotados vs. los de stock bajo. |

---

## HUI-43: Sincronización en tiempo real entre asistente y la interfaz

**Como** usuario del sistema,  
**Quiero** que cuando el asistente realice cambios en el inventario (crear, editar, eliminar, vender o ajustar), la interfaz gráfica se actualice automáticamente sin necesidad de recargar la página,  
**Para** ver reflejados los cambios inmediatamente y no trabajar con datos desactualizados.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | Tras crear un producto vía el bot, la tabla de inventario muestra el nuevo producto automáticamente. | El grid se refresca sin F5 ni cambio de filtros. |
| 2 | Tras editar un producto vía el bot, los datos actualizados se reflejan en la tabla sin intervención manual. | El nombre/precio cambiado aparece inmediatamente. |
| 3 | Tras eliminar un producto vía el bot, el producto desaparece de la tabla sin intervención manual. | La fila se elimina del grid automáticamente. |
| 4 | Tras ejecutar una venta remota vía el bot, los stocks se actualizan en la tabla automáticamente. | Las cantidades reflejan la resta correcta al instante. |
| 5 | El usuario no percibe ningún comando técnico en el chat (como `[CMD:REFRESH]`); solo ve la respuesta natural del bot. | Los comandos de sincronización son invisibles para el usuario. |

---

## HUI-44: Consulta de ventas e ingresos por empleado

**Como** administrador,  
**Quiero** poder preguntarle al asistente cuántas ventas ha realizado un empleado específico y el detalle de sus transacciones,  
**Para** evaluar el rendimiento individual de mi equipo sin revisar reportes manuales.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede escribir "¿Qué ha vendido Bahamon?" y recibir un listado. | El bot muestra las ventas filtradas por el nombre del vendedor, incluyendo ID de venta, productos e importes. |
| 2 | El usuario puede consultar "¿Y el resto de mis empleados?" | El bot muestra un resumen de ventas agrupado por todos los vendedores registrados. |
| 3 | Las ventas realizadas tanto por la caja manual (POS) como por el asistente virtual se unifican bajo el mismo nombre de vendedor. | No se crean vendedores duplicados como "Bahamon" y "Bahamon (Vía Asistente)". |

---

## HUI-45: Resumen estadístico y financiero del negocio

**Como** administrador,  
**Quiero** poder pedirle al asistente un resumen general de las estadísticas financieras y operativas del negocio,  
**Para** tener una vista ejecutiva rápida sin navegar al Dashboard.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | El usuario puede escribir "Dame el resumen financiero" o "¿Cómo van las estadísticas?" | El bot responde con: total de movimientos registrados, ingresos brutos históricos y top vendedores. |
| 2 | Los datos presentados son consistentes con los que muestra el Dashboard gráfico del sistema. | Las cifras coinciden con los registros de la base de datos. |

---

## HUI-46: Notificaciones por correo en ventas vía asistente

**Como** administrador,  
**Quiero** que cuando el asistente virtual ejecute una venta de fondo, se envíe un recibo por correo electrónico al administrador,  
**Para** tener el mismo control y trazabilidad que existe con las ventas realizadas desde la caja manual.

### Criterios de Aceptación

| # | Criterio | Resultado Esperado |
|---|----------|--------------------|
| 1 | Tras una venta completada por el bot, se envía un correo con el detalle de artículos y total recaudado. | El correo tiene el mismo formato de recibo que las ventas del POS manual. |
| 2 | El correo identifica al vendedor con su nombre real (sin sufijos como "Vía Asistente"). | El nombre en el correo coincide exactamente con el `nombre_completo` del usuario logueado. |
| 3 | Si algún producto queda agotado o en stock bajo tras la venta, se dispara un correo adicional de alerta de stock. | Se recibe una notificación independiente con la alerta del producto crítico. |
