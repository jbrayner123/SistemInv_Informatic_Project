import os
import secrets
from datetime import datetime, timezone
import google.generativeai as genai
from dotenv import load_dotenv
from pymongo import UpdateOne

load_dotenv()

# Configurar clave globalmente
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

class BotService:
    def __init__(self, current_user: dict):
        self.current_user = current_user
        
        # ─── Tools definitions ───
        def buscar_catalogo(query: str) -> list:
            """Busca productos en la base de datos por nombre, usa esta herramienta siempre para responder preguntas sobre stock y existencia."""
            from main import col_products
            cursor = col_products.find(
                {"$or": [
                    {"nombre": {"$regex": query, "$options": "i"}},
                    {"categoria": {"$regex": query, "$options": "i"}}
                ]}, 
                {"_id": 0}
            )
            return list(cursor)

        def consultar_carencias() -> list:
            """Devuelve los productos que están por debajo o iguales de su stock mínimo."""
            from main import col_products
            return list(col_products.find({"$expr": {"$lte": ["$cantidad", "$stock_minimo"]}}, {"_id": 0}))

        def guardar_nuevo_producto(nombre: str, categoria: str, unidad_medida: str, cantidad: int, stock_minimo: int, precio: float) -> str:
            """
            Crea un nuevo producto en la BD.
            Solo llámala después de que el usuario CONFIRMÓ un resumen claro.
            """
            from main import col_products, log_movement
            nuevo_id = f"SKU-{secrets.randbelow(9000)+1000}"
            doc = {
                "id": nuevo_id,
                "nombre": nombre,
                "categoria": categoria,
                "unidad_medida": unidad_medida,
                "cantidad": cantidad,
                "stock_minimo": stock_minimo,
                "precio": float(precio)
            }
            col_products.insert_one(doc)
            log_movement(self.current_user, "CREACIÓN", f"Bot Inteligente creó el producto: {nombre}")
            return f"EXITO: Producto creado con el ID {nuevo_id}"

        def ejecutar_venta_POS(items_venta: str) -> str:
            """
            Ejecuta una venta en la caja descontando el stock.
            items_venta debe ser EXACTAMENTE en este formato: "SKU-1002:2, SKU-6005:1" (IDs separados por coma, y la cantidad separada por dos puntos).
            Solo llámala después de que el usuario TE DIO UN SÍ.
            """
            from main import col_products, log_movement, col_sales
            
            items_list = []
            for par in items_venta.split(','):
                if ':' not in par: continue
                pid, q_str = par.split(':')
                items_list.append({"id": pid.strip(), "qty": int(q_str.strip())})
            
            if not items_list: return "Error: No se recibió ningún producto válido."
            
            
            detalles = []
            item_details_str = []
            total_calc = 0.0
            bulk_ops = []
            
            # Verificaciones
            for item in items_list:
                p = col_products.find_one({"id": item["id"]})
                if not p: return f"Error: Producto no encontrado con ID {item['id']}"
                if p["cantidad"] < item["qty"]: return f"Error: No hay suficiente stock para {p['nombre']}. Solo quedan {p['cantidad']}."
                
                total_calc += p.get("precio", 0) * item["qty"]
                bulk_ops.append(UpdateOne({"id": item["id"]}, {"$inc": {"cantidad": -item["qty"]}}))
                detalles.append(f"{item['qty']}x {p['nombre']}")
                item_details_str.append(f"{item['qty']}x {p['nombre']} (${p.get('precio', 0.0) * item['qty']:,.0f})")
                
                # Completar datos requeridos en el esquema normal de ventas de UI
                item["nombre"] = p["nombre"]
                item["precio"] = p.get("precio", 0.0)
                
                # Gestión de alertas de stock para envíos de correo
                new_stock = p["cantidad"] - item["qty"]
                threshold = p.get("stock_minimo", 5)
                if new_stock == 0:
                    log_movement(self.current_user, "ALERTA", f"POS AI: El producto {p['nombre']} se ha agotado.")
                    import threading; from email_sender import alert_stock_status
                    threading.Thread(target=alert_stock_status, args=(p['nombre'], p['id'], new_stock, True)).start()
                elif new_stock <= threshold:
                    log_movement(self.current_user, "ALERTA", f"POS AI: Stock bajo para {p['nombre']}: {new_stock} unidades.")
                    import threading; from email_sender import alert_stock_status
                    threading.Thread(target=alert_stock_status, args=(p['nombre'], p['id'], new_stock, False)).start()
            
            # Efectuar
            col_products.bulk_write(bulk_ops)
            
            # Asignar estrictamente el nombre real para no separar ingresos por empleado
            vendedor = self.current_user.get("nombre_completo", self.current_user.get("username", "Desconocido"))
            sale_doc = {
                "id_venta": secrets.token_hex(8),
                "vendedor": vendedor,
                "username": self.current_user.get("username", ""),
                "fecha": datetime.now(timezone.utc).isoformat(),
                "total": total_calc,
                "items": items_list,
                "fuente": "Bot AI"
            }
            col_sales.insert_one(sale_doc)
            log_movement(self.current_user, "VENTA", f"Venta Asistente AI: {', '.join(detalles)} | Total: ${total_calc}")
            
            # Despachar correo de alerta de venta
            import threading; from email_sender import alert_sale
            threading.Thread(target=alert_sale, args=(vendedor, item_details_str, total_calc)).start()
            
            return f"EXITO: Venta completada, caja actualizada. ID de venta: {sale_doc['id_venta']} [CMD:CLEAR_CART]"

        def consultar_producto_mas_vendido() -> str:
            """Consulta el historial de ventas para determinar cuál es el producto que más cantidad ha vendido en total."""
            from main import col_sales, col_products
            sales = list(col_sales.find({}, {"items": 1}))
            if not sales: return "Aún no hay ventas registradas en el sistema."
            
            from collections import defaultdict
            ventas_por_producto = defaultdict(int)
            for sale in sales:
                for item in sale.get('items', []):
                    ventas_por_producto[item['id']] += item['qty']
            
            if not ventas_por_producto: return "No hay items en las ventas registradas."
            
            mas_vendido_id = max(ventas_por_producto, key=ventas_por_producto.get)
            cantidad = ventas_por_producto[mas_vendido_id]
            producto = col_products.find_one({"id": mas_vendido_id})
            nombre = producto["nombre"] if producto else f"ID: {mas_vendido_id}"
            
            return f"El producto más vendido históricamente es '{nombre}' con {cantidad} unidades."

        def editar_producto(id_o_nombre: str, nuevo_nombre: str = "", nuevo_precio: float = 0.0) -> str:
            """Permite editar/cambiar el nombre o precio de un producto. Si el usuario pide editar, buscalo y ejecuta esto."""
            from main import col_products, log_movement
            
            producto = col_products.find_one({
                "$or": [{"id": id_o_nombre}, {"nombre": {"$regex": id_o_nombre, "$options": "i"}}]
            })
            if not producto: return f"Error: No encontré ningún producto parecido a '{id_o_nombre}'"
            
            update_data = {}
            if nuevo_nombre: update_data["nombre"] = nuevo_nombre
            if nuevo_precio > 0: update_data["precio"] = nuevo_precio
            
            if not update_data: return "Error: No me proporcionaste un nuevo nombre o precio válido para actualizar."
            
            col_products.update_one({"_id": producto["_id"]}, {"$set": update_data})
            log_movement(self.current_user, "EDICIÓN", f"Bot editó producto {producto['id']}: {update_data}")
            return f"EXITO: El producto fue actualizado. Nuevos datos: {update_data}"

        def consultar_ventas_por_vendedor(nombre_vendedor: str) -> str:
            """Muestra las ventas realizadas por un vendedor o empleado específico (Búsqueda parcial permitida)."""
            from main import col_sales
            ventas = list(col_sales.find({"vendedor": {"$regex": nombre_vendedor, "$options": "i"}}))
            if not ventas: return f"No se encontraron ventas para el vendedor o empleado '{nombre_vendedor}'."
            
            total_generado = sum(v.get('total', 0) for v in ventas)
            resumen = f"El vendedor '{nombre_vendedor}' ha realizado {len(ventas)} ventas, generando un total de ${total_generado}.\n"
            for v in ventas[:5]:  # Muestra los últimos 5 para no saturar
                items_str = ", ".join([f"{i['qty']}x ID:{i['id']}" for i in v.get('items', [])])
                resumen += f"- Venta {v['id_venta']}: {items_str} (Total: ${v['total']})\n"
            return resumen

        def eliminar_producto(id_o_nombre: str) -> str:
            """Elimina un producto del inventario de forma permanente."""
            from main import col_products, log_movement
            producto = col_products.find_one({
                "$or": [{"id": id_o_nombre}, {"nombre": {"$regex": f"^{id_o_nombre}$", "$options": "i"}}]
            })
            if not producto: return f"Error: No encontré el producto '{id_o_nombre}' para eliminar."
            
            col_products.delete_one({"_id": producto["_id"]})
            log_movement(self.current_user, "ELIMINACIÓN", f"Bot eliminó el producto {producto['nombre']} ({producto['id']})")
            return f"EXITO: El producto '{producto['nombre']}' ha sido eliminado permanentemente del sistema."

        def ajustar_inventario(id_o_nombre: str, cantidad_absoluta: int) -> str:
            """Cambia la existencia total de un producto al número exacto proporcionado (Ajuste de stock manual)."""
            from main import col_products, log_movement
            producto = col_products.find_one({
                "$or": [{"id": id_o_nombre}, {"nombre": {"$regex": id_o_nombre, "$options": "i"}}]
            })
            if not producto: return f"Error: No encontré el producto '{id_o_nombre}'."
            
            vieja_cant = producto["cantidad"]
            col_products.update_one({"_id": producto["_id"]}, {"$set": {"cantidad": cantidad_absoluta}})
            log_movement(self.current_user, "AJUSTE", f"Bot ajustó stock de {producto['nombre']}: {vieja_cant} -> {cantidad_absoluta}")
            return f"EXITO: El stock de '{producto['nombre']}' se ha ajustado. Ahora hay {cantidad_absoluta}."

        def obtener_resumen_estadisticas() -> str:
            """Obtiene el resumen financiero y de movimientos generales de la ferretería."""
            from main import get_movement_stats, log_movement
            stats = get_movement_stats(self.current_user)
            total_moves = stats.get('total_movements', 0)
            revenue_list = stats.get('revenue_by_user', [])
            total_rev = sum(r['total'] for r in revenue_list)
            
            return f"Resumen Global:\n- Movimientos totales registrados: {total_moves}\n- Ingresos brutos históricos calculados: ${total_rev}\n- Top vendedores: " + ", ".join([f"{r['name']} (${r['total']})" for r in revenue_list[:3]])

        def enviar_reporte_carencias_correo(incluir_bajos: bool = True, incluir_agotados: bool = True) -> str:
            """
            Genera un reporte de productos y se lo envía al administrador por correo.
            - incluir_bajos: establecer en False si el usuario SOLO pidió los agotados.
            - incluir_agotados: establecer en False si el usuario SOLO pidió los de stock bajo.
            """
            from main import col_products
            low_stock = []
            out_of_stock = []
            
            if incluir_bajos:
                low_stock = list(col_products.find({"$expr": {"$and": [{"$lte": ["$cantidad", "$stock_minimo"]}, {"$gt": ["$cantidad", 0]}]}}, {"_id": 0}))
            if incluir_agotados:
                out_of_stock = list(col_products.find({"cantidad": {"$lte": 0}}, {"_id": 0}))
            
            if not low_stock and not out_of_stock:
                return "De acuerdo a tu petición, no encontré productos en esas condiciones. No envié el correo."
                
            import threading
            from email_sender import alert_inventory_report
            vendedor = self.current_user.get("nombre_completo", "Bot Assistant")
            threading.Thread(target=alert_inventory_report, args=(low_stock, out_of_stock, vendedor)).start()
            
            return f"EXITO: Reporte enviado. (Agotados: {len(out_of_stock)}, Bajos: {len(low_stock)})"

        def preparar_carrito_caja(items_venta: str) -> str:
            """
            Arma el carrito de ventas en la interfaz sin cobrarlo.
            El usuario lo verá directamente en su pantalla del Punto de Venta.
            items_venta debe tener el formato estricto: "SKU-1002=2, SKU-6005=1" (ID = CANTIDAD).
            """
            return f"EXITO: El carrito ha sido inyectado en la Interfaz de UI para revisión manual. [CMD:CART:{items_venta}]"

        # ── Herramientas base (todos los roles) ──
        base_tools = [
            buscar_catalogo, consultar_carencias, ejecutar_venta_POS, 
            consultar_producto_mas_vendido, consultar_ventas_por_vendedor,
            preparar_carrito_caja
        ]
        
        # ── Herramientas exclusivas de administrador ──
        admin_tools = [
            guardar_nuevo_producto, editar_producto, eliminar_producto, 
            ajustar_inventario, obtener_resumen_estadisticas, 
            enviar_reporte_carencias_correo
        ]
        
        is_admin = self.current_user.get('rol', 'empleado') == 'admin'
        self.tools = base_tools + admin_tools if is_admin else base_tools
        
    def create_chat_session(self):
        usuario = self.current_user.get('nombre_completo', 'Usuario')
        rol = self.current_user.get('rol', 'empleado')
        is_admin = rol == 'admin'
        
        # Bloque de permisos dinámico según rol
        if is_admin:
            permisos = """
        6. TIENES CONTROL TOTAL DEL SISTEMA: Además de crear, ahora puedes EDITAR nombres y precios, AJUSTAR existencias (stock) de forma manual absoluta, ELIMINAR productos, y ver el RESUMEN GENERAL financiero del negocio.
        7. Puedes ENVIAR REPORTES por correo al administrador sobre bajas existencias si te lo solicitan.
        8. Puedes CREAR PRODUCTOS nuevos en el sistema."""
        else:
            permisos = """
        6. NO tienes permiso para editar, eliminar, ajustar inventario, crear productos ni enviar reportes. Esas funciones son exclusivas del administrador.
        7. Si el empleado te pide algo de lo anterior, respóndele amablemente: "Lo siento, esta acción requiere permisos de administrador. Por favor, contacta a tu supervisor."""
        
        system_instruction = f"""
        Eres 'SistemBot', el asistente IA corporativo e inteligente integrado en SistemInv (software de inventario ferretero).
        Las personas que conversan contigo son los empleados o administradores. 
        Hablas ahora mismo con: {usuario} (Rol: {rol}).
        
        REGLAS OPERATIVAS OBLIGATORIAS:
        1. Para buscar stock SIEMPRE usa las herramientas. Da respuestas cortas, profesionales y amigables.
        2. Puedes FUNCIONAR COMO CAJERO. Si el usuario te pide vender algo:
           - Busca el producto con su ID y precio.
           - Dile al usuario el total calculado a pagar.
           - Pregúntale EXPRESAMENTE "¿Confirmas efectuar esta venta?".
           - Si aprueba de forma inequivoca, invoca la herramienta ejecutar_venta_POS.
        3. Puedes recomendar cuáles productos comprar analizando existencias bajas.
        4. Puedes consultar el HISTORIAL de ventas, buscar productos más vendidos, o ventas de un empleado en específico.
        5. Puedes consultar qué productos están agotados o con stock bajo.
        {permisos}
        
        INTENCIÓN DEL USUARIO EN CAJA (POS):
        - Cuando un usuario te diga frases como "Un cliente quiere comprar...", "Deseo vender...", "agrega al carrito...", tu objetivo principal NO ES COMPLETAR LA VENTA SILENCIOSAMENTE. Tu objetivo es LLAMAR A LA HERRAMIENTA `preparar_carrito_caja` para ensamblarle la venta visualmente en su pantalla registradora y que él mismo la cobre de forma presencial y manual.
        - Si el usuario menciona "un producto", "una unidad", o simplemente habla en singular (ej. "un pegante"), ASUME inmediatamente que es 1 unidad y lanza la herramienta `preparar_carrito_caja` sin pedir confirmación de cantidad.
        - SOLO procesa la venta definiva de fondo usando `ejecutar_venta_POS` si el usuario te lo ORDENA EN SECO y explícitamente (Ej: "Ejecuta ya la venta de fondo", "Cobra la venta ahora", "Completa la venta definitiva remotamente").
        
        SINCROMIZACIÓN CON LA UI (MUY IMPORTANTE):
        - DEBES AÑADIR EXACTAMENTE AL FINAL DE TU RESPUESTA el texto oculto '[CMD:REFRESH]' SIEMPRE QUE ejecutes con éxito alguna de las siguientes acciones: CREAR PRODUCTO, EDITAR, ELIMINAR, VENDER remotamente usando ejecutar_venta_POS, o AJUSTAR INVENTARIO.
        - Si preparas el carrito, usa siempre `preparar_carrito_caja` y en tu respuesta natural pon '[CMD:CART:SKU-XXX=cantidad,...]'.
        
        IMPORTANTE: Si te piden borrar un producto o hacer un ajuste drástico, SIEMPRE pide confirmación: "¿Estás completamente seguro de que deseas eliminar este producto permanentemente?" u "¿Hago el ajuste de inventario real?". 
        """
        
        # Configurar modelo Gemini
        model = genai.GenerativeModel(
            model_name='gemini-flash-lite-latest',
            tools=self.tools,
            system_instruction=system_instruction
        )
        return model.start_chat(enable_automatic_function_calling=True)
