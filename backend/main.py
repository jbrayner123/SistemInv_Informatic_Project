import os
import secrets
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from pymongo import MongoClient, UpdateOne
from email_sender import alert_new_product, alert_stock_status, alert_sale, alert_password_reset

app = FastAPI(title="SistemInv API")

# ─────────────────────────────────────────────
# CORS — permite todas las origenes (para pruebas en Render)
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# MongoDB Connection
# ─────────────────────────────────────────────
MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb+srv://jbrayner123:lucas300@cluster0.bczisjc.mongodb.net/?appName=Cluster0"
)

if os.environ.get("TESTING") == "True":
    import mongomock
    client = mongomock.MongoClient()
else:
    client = MongoClient(MONGODB_URI)

db = client["sisteminv"]

col_products = db["products"]
col_users = db["users"]
col_movements = db["movements"]
col_sales = db["sales"]
col_settings = db["settings"]



# ─────────────────────────────────────────────
# Datos iniciales (se insertan solo si las colecciones están vacías)
# ─────────────────────────────────────────────
INITIAL_USERS = [
    {"username": "admin", "password": "admin", "rol": "admin", "nombre_completo": "Administrador del Sistema"},
    {"username": "josi", "password": "josi", "rol": "empleado", "nombre_completo": "Josi"},
    {"username": "bahamon", "password": "bahamon", "rol": "empleado", "nombre_completo": "Bahamon"},
    {"username": "roiman", "password": "roiman", "rol": "empleado", "nombre_completo": "Roiman"},
]

INITIAL_PRODUCTS = [
    {"id": "SKU-1002", "nombre": "Desarmador Phillips #4", "categoria": "Manuales", "unidad_medida": "Pieza", "cantidad": 41, "stock_minimo": 5},
    {"id": "SKU-1003", "nombre": "Desarmador Plano 1/4x4", "categoria": "Manuales", "unidad_medida": "Pieza", "cantidad": 40, "stock_minimo": 5},
    {"id": "SKU-1005", "nombre": "Alicate Corte Diagonal", "categoria": "Manuales", "unidad_medida": "Pieza", "cantidad": 21, "stock_minimo": 5},
    {"id": "SKU-1006", "nombre": "Llave Inglesa Ajustable 12 pulg", "categoria": "Manuales", "unidad_medida": "Pieza", "cantidad": 8, "stock_minimo": 5},
    {"id": "SKU-1007", "nombre": "Juego de Llaves Allen", "categoria": "Manuales", "unidad_medida": "Set/Juego", "cantidad": 12, "stock_minimo": 5},
    {"id": "SKU-2001", "nombre": "Taladro Inalámbrico Dewalt 20V Max", "categoria": "Eléctricas", "unidad_medida": "Pieza", "cantidad": 0, "stock_minimo": 5},
    {"id": "SKU-2002", "nombre": "Esmeriladora Makita 4-1/2 pulg", "categoria": "Eléctricas", "unidad_medida": "Pieza", "cantidad": 6, "stock_minimo": 5},
    {"id": "SKU-2003", "nombre": "Sierra Circular Bosch", "categoria": "Eléctricas", "unidad_medida": "Pieza", "cantidad": 2, "stock_minimo": 5},
    {"id": "SKU-2004", "nombre": "Lijadora Orbital Stanley", "categoria": "Eléctricas", "unidad_medida": "Pieza", "cantidad": 5, "stock_minimo": 5},
    {"id": "SKU-3001", "nombre": "Cemento Gris Tolteca 50kg", "categoria": "Construcción", "unidad_medida": "Bolsa", "cantidad": 145, "stock_minimo": 5},
    {"id": "SKU-3002", "nombre": "Cemento Blanco Cruz Azul 25kg", "categoria": "Construcción", "unidad_medida": "Bolsa", "cantidad": 30, "stock_minimo": 5},
    {"id": "SKU-3003", "nombre": "Yeso Supremo 40kg", "categoria": "Construcción", "unidad_medida": "Bolsa", "cantidad": 25, "stock_minimo": 5},
    {"id": "SKU-3004", "nombre": "Cal Hidratada 25kg", "categoria": "Construcción", "unidad_medida": "Bolsa", "cantidad": 60, "stock_minimo": 5},
    {"id": "SKU-3005", "nombre": "Malla Electrosoldada 6x6", "categoria": "Construcción", "unidad_medida": "Rollo", "cantidad": 10, "stock_minimo": 5},
    {"id": "SKU-3006", "nombre": "Varilla Corrugada 1/2 pulg", "categoria": "Construcción", "unidad_medida": "Pieza", "cantidad": 200, "stock_minimo": 5},
    {"id": "SKU-3007", "nombre": "Pegazulejo Niasa", "categoria": "Construcción", "unidad_medida": "Bolsa", "cantidad": 85, "stock_minimo": 5},
    {"id": "SKU-4001", "nombre": "Tubo PVC Hidráulico 1/2 pulg x 6m", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 80, "stock_minimo": 5},
    {"id": "SKU-4002", "nombre": "Codo PVC 90° 1/2 pulg", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 150, "stock_minimo": 5},
    {"id": "SKU-4003", "nombre": "Tee PVC 1/2 pulg", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 120, "stock_minimo": 5},
    {"id": "SKU-4004", "nombre": "Tubo CPVC 3/4 pulg x 3m", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 45, "stock_minimo": 5},
    {"id": "SKU-4005", "nombre": "Pegamento para PVC Oatey", "categoria": "Plomería", "unidad_medida": "Litro", "cantidad": 18, "stock_minimo": 5},
    {"id": "SKU-4006", "nombre": "Válvula de Esfera Bronce 1/2", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 25, "stock_minimo": 5},
    {"id": "SKU-4007", "nombre": "Cinta Teflón 1/2 pulg", "categoria": "Plomería", "unidad_medida": "Rollo", "cantidad": 3, "stock_minimo": 5},
    {"id": "SKU-5001", "nombre": "Cable Thw Calibre 12 AWG Cu", "categoria": "Electricidad", "unidad_medida": "Metro", "cantidad": 200, "stock_minimo": 5},
    {"id": "SKU-5002", "nombre": "Cable Thw Calibre 10 AWG Cu", "categoria": "Electricidad", "unidad_medida": "Metro", "cantidad": 150, "stock_minimo": 5},
    {"id": "SKU-5003", "nombre": "Cinta Aislante Negra 3M", "categoria": "Electricidad", "unidad_medida": "Rollo", "cantidad": 45, "stock_minimo": 5},
    {"id": "SKU-5004", "nombre": "Foco LED 10W Luz Blanca", "categoria": "Electricidad", "unidad_medida": "Pieza", "cantidad": 100, "stock_minimo": 5},
    {"id": "SKU-5005", "nombre": "Interruptor Sencillo Bticino", "categoria": "Electricidad", "unidad_medida": "Pieza", "cantidad": 35, "stock_minimo": 5},
    {"id": "SKU-5006", "nombre": "Contacto Doble Polarizado", "categoria": "Electricidad", "unidad_medida": "Pieza", "cantidad": 40, "stock_minimo": 5},
    {"id": "SKU-5007", "nombre": "Pastilla Termomagnética 20A", "categoria": "Electricidad", "unidad_medida": "Pieza", "cantidad": 12, "stock_minimo": 5},
    {"id": "SKU-6001", "nombre": "Pintura Vinílica Blanca Comex", "categoria": "Pinturas", "unidad_medida": "Galón", "cantidad": 18, "stock_minimo": 5},
    {"id": "SKU-6002", "nombre": "Esmalte Anticorrosivo Negro", "categoria": "Pinturas", "unidad_medida": "Litro", "cantidad": 10, "stock_minimo": 5},
    {"id": "SKU-6003", "nombre": "Brocha Pelo de Camello 2 pulg", "categoria": "Pinturas", "unidad_medida": "Pieza", "cantidad": 25, "stock_minimo": 5},
    {"id": "SKU-6004", "nombre": "Rodillo Felpa Rugosa 9 pulg", "categoria": "Pinturas", "unidad_medida": "Pieza", "cantidad": 15, "stock_minimo": 5},
    {"id": "SKU-6005", "nombre": "Thinner Estándar", "categoria": "Pinturas", "unidad_medida": "Litro", "cantidad": 30, "stock_minimo": 5},
    {"id": "SKU-6006", "nombre": "Impermeabilizante Rojo 5 Años", "categoria": "Pinturas", "unidad_medida": "Galón", "cantidad": 8, "stock_minimo": 5},
    {"id": "SKU-7001", "nombre": "Clavo para Concreto 2 pulg", "categoria": "Tornillería", "unidad_medida": "Caja", "cantidad": 2, "stock_minimo": 5},
    {"id": "SKU-7002", "nombre": "Clavo C/Cabeza 1-1/2 pulg", "categoria": "Tornillería", "unidad_medida": "Kilogramo", "cantidad": 10, "stock_minimo": 5},
    {"id": "SKU-7003", "nombre": "Tornillo Drywall 1-1/4 pulg", "categoria": "Tornillería", "unidad_medida": "Caja", "cantidad": 0, "stock_minimo": 5},
    {"id": "SKU-7004", "nombre": "Tornillo Hexagonal 3/8 x 2", "categoria": "Tornillería", "unidad_medida": "Caja", "cantidad": 4, "stock_minimo": 5},
    {"id": "SKU-7005", "nombre": "Taquete de Plástico 1/4", "categoria": "Tornillería", "unidad_medida": "Paquete", "cantidad": 50, "stock_minimo": 5},
    {"id": "SKU-8001", "nombre": "Casco de Seguridad Amarillo", "categoria": "Seguridad", "unidad_medida": "Pieza", "cantidad": 25, "stock_minimo": 5},
    {"id": "SKU-8002", "nombre": "Guantes de Cuero Carnaza", "categoria": "Seguridad", "unidad_medida": "Par", "cantidad": 5, "stock_minimo": 5},
    {"id": "SKU-8003", "nombre": "Lentes de Seguridad Claros", "categoria": "Seguridad", "unidad_medida": "Pieza", "cantidad": 40, "stock_minimo": 5},
    {"id": "SKU-8004", "nombre": "Chaleco Reflejante Naranja", "categoria": "Seguridad", "unidad_medida": "Pieza", "cantidad": 15, "stock_minimo": 5},
    {"id": "SKU-8005", "nombre": "Botas Industriales con Casquillo T26", "categoria": "Seguridad", "unidad_medida": "Par", "cantidad": 2, "stock_minimo": 5},
    {"id": "SKU-8006", "nombre": "Mascarilla N95 3M", "categoria": "Seguridad", "unidad_medida": "Caja", "cantidad": 8, "stock_minimo": 5},
    {"id": "SKU-1999", "nombre": "Pistola", "categoria": "Seguridad", "unidad_medida": "Pieza", "cantidad": 20, "stock_minimo": 5},
    {"id": "SKU-10001", "nombre": "Martillo de dos cabezas", "categoria": "Plomería", "unidad_medida": "Pieza", "cantidad": 20, "stock_minimo": 5},
]


def seed_db():
    """Inserta datos iniciales solo si la colección está vacía."""
    if col_users.count_documents({}) == 0:
        col_users.insert_many(INITIAL_USERS)
    if col_products.count_documents({}) == 0:
        col_products.insert_many(INITIAL_PRODUCTS)

    col_settings.update_one(
        {"_id": "global"},
        {"$addToSet": {
            "categorias": {"$each": ["Herramientas", "Materiales", "Fijación", "Pinturas", "Otros", "Manuales", "Eléctricas", "Construcción", "Plomería", "Electricidad", "Tornillería", "Seguridad"]},
            "unidades": {"$each": ["Unidad", "Kg", "Metro", "Litro", "Pieza", "Caja", "Galón", "Bolsa", "Paquete", "Rollo", "Par", "Set/Juego"]}
        }}
    )

seed_db()

# ─────────────────────────────────────────────
# Helper para eliminar el campo _id de MongoDB
# ─────────────────────────────────────────────
def clean(doc: dict) -> dict:
    """Elimina el campo _id de MongoDB para que no rompa el esquema de Pydantic."""
    doc.pop("_id", None)
    return doc


# ─────────────────────────────────────────────
# Session Store (in-memory)
# ─────────────────────────────────────────────
active_sessions: dict = {}

# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────
class Product(BaseModel):
    id: str
    nombre: str
    categoria: str
    unidad_medida: str
    cantidad: int = Field(ge=0, description="La cantidad de stock no puede ser negativa")
    stock_minimo: int = Field(default=5, ge=0)
    precio: float = Field(default=10.0, ge=0)


class CartItem(BaseModel):
    id: str
    nombre: str
    qty: int
    precio: float

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    total: float


class ProductUpdate(BaseModel):
    nombre: str
    categoria: str
    unidad_medida: str
    stock_minimo: int = Field(default=5, ge=0)
    precio: float = Field(default=10.0, ge=0)


class UpdateStockRequest(BaseModel):
    cantidad: int = Field(description="Cantidad a sumar o restar (puede ser negativa)")


class ManualAdjustRequest(BaseModel):
    cantidad_nueva: int = Field(ge=0, description="Nueva cantidad absoluta del inventario")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    rol: str
    username: str
    nombre_completo: str


# ─── User Management Models (HU-25) ──────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    rol: str = Field(default="empleado", pattern="^(admin|empleado)$")
    nombre_completo: str


class UserUpdate(BaseModel):
    password: Optional[str] = None
    nombre_completo: Optional[str] = None
    rol: Optional[str] = Field(default=None, pattern="^(admin|empleado)$")


# ─────────────────────────────────────────────
# Auth Dependencies
# ─────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header requerido.")
    session = active_sessions.get(authorization)
    if not session:
        raise HTTPException(status_code=401, detail="Token de sesión inválido.")

    # Validar expiración de 1 hora
    expires_at = session.get("expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        del active_sessions[authorization]
        raise HTTPException(status_code=401, detail="La sesión ha expirado. Por favor, inicie sesión de nuevo.")

    return session


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado. Se requiere rol 'admin' para esta operación."
        )
    return current_user


# ─────────────────────────────────────────────
# Movement Logger
# ─────────────────────────────────────────────
def log_movement(user: dict, action: str, details: str):
    movement = {
        "id": secrets.token_hex(8),
        "usuario": user.get("nombre_completo", user.get("username", "Sistema")),
        "rol": user.get("rol", "Desconocido"),
        "accion": action,
        "detalles": details,
        "fecha": datetime.now(timezone.utc).isoformat()
    }
    col_movements.insert_one(movement)
    # Nota: Se ha eliminado la limpieza automática (count_documents) para optimizar el rendimiento.
    # El historial crece de forma natural y MongoDB lo maneja eficientemente.


# ─────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────
@app.post("/api/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    username = credentials.username.strip().lower()
    
    # 1. Buscar usuario para chequear bloqueos y fallos previos
    user_doc = col_users.find_one({"username": username})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    # 2. Verificar si la cuenta está bloqueada temporalmente
    lockout_until = user_doc.get("lockout_until")
    if lockout_until:
        if datetime.fromisoformat(lockout_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Demasiados intentos. Por seguridad, la cuenta está bloqueada por 1 minuto.")

    # 3. Validar contraseña
    if user_doc.get("password") != credentials.password:
        # Incrementar contador de fallos
        new_fails = user_doc.get("failed_login_attempts", 0) + 1
        update_data = {"failed_login_attempts": new_fails}
        
        if new_fails >= 5:
            # Bloquear por 1 minuto tras 5 intentos
            lockout_time = datetime.now(timezone.utc) + timedelta(minutes=1)
            update_data["lockout_until"] = lockout_time.isoformat()
            update_data["failed_login_attempts"] = 0 # Reiniciamos para el próximo ciclo
            col_users.update_one({"username": username}, {"$set": update_data})
            raise HTTPException(status_code=401, detail="Has fallado 5 veces. Cuenta bloqueada por 1 minuto.")
        
        col_users.update_one({"username": username}, {"$set": update_data})
        raise HTTPException(status_code=401, detail=f"Credenciales inválidas. Intento {new_fails} de 5.")

    # 4. Login exitoso: Limpiar historial de bloqueos y crear sesión
    col_users.update_one({"username": username}, {"$set": {"failed_login_attempts": 0, "lockout_until": None}})
    
    token = secrets.token_hex(32)
    # Sesión dura exactamente 1 hora tal como pidió el usuario
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    session_data = {
        "username": user_doc["username"],
        "rol": user_doc["rol"],
        "nombre_completo": user_doc.get("nombre_completo", user_doc["username"]),
        "expires_at": expires_at
    }
    active_sessions[token] = session_data

    return LoginResponse(
        token=token,
        rol=user_doc["rol"],
        username=user_doc["username"],
        nombre_completo=session_data["nombre_completo"]
    )


@app.post("/api/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization in active_sessions:
        del active_sessions[authorization]
    return {"message": "Sesión cerrada correctamente."}


@app.post("/api/auth/forgot-password")
def forgot_password(req: dict):
    username = req.get("username", "").strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Debe ingresar un usuario.")
    
    user = col_users.find_one({"username": username})
    if not user:
        # Por seguridad no indicamos si existe o no el usuario en un flujo seguro real, pero para esta app sí.
        raise HTTPException(status_code=404, detail="Usuario no encontrado en el sistema.")
    
    token = secrets.token_hex(3).upper() # 6 caracteres
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    col_users.update_one({"username": username}, {"$set": {"reset_token": token, "reset_token_exp": expiry.isoformat()}})
    
    # Enviar email al administrador con el PIN
    alert_password_reset(username, token)
    
    return {"message": "Si el usuario existe, se ha enviado un PIN al administrador del sistema."}


@app.post("/api/auth/reset-password")
def reset_password(req: dict):
    username = req.get("username", "").strip().lower()
    token = req.get("token", "").strip().upper()
    new_password = req.get("new_password", "")
    
    if not username or not token or not new_password:
        raise HTTPException(status_code=400, detail="Datos incompletos.")
        
    user = col_users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=400, detail="PIN incorrecto o expirado.")
        
    if user.get("reset_token") != token:
        raise HTTPException(status_code=400, detail="PIN incorrecto.")
        
    exp = user.get("reset_token_exp")
    if not exp or datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El PIN ha expirado.")
        
    col_users.update_one({"username": username}, {
        "$set": {"password": new_password},
        "$unset": {"reset_token": "", "reset_token_exp": ""}
    })
    
    log_movement({"username": "Sistema"}, "AUTENTICACIÓN", f"Contraseña restablecida exitosamente para {username}")
    return {"message": "Contraseña actualizada. Ya puedes iniciar sesión."}



# ─────────────────────────────────────────────
# Utility Endpoints
# ─────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "SistemInv API en línea (MongoDB)."}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ─────────────────────────────────────────────
# Product Endpoints
# ─────────────────────────────────────────────
@app.get("/products")
def list_products(current_user: dict = Depends(get_current_user)):
    """HU-03: Listado de productos optimizado (saltando validación Pydantic)."""
    return list(col_products.find({}, {"_id": 0}))


@app.get("/api/products/{product_id}", response_model=Product)
def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """HU-07: Consulta individual de producto. Accesible para ambos roles."""
    p = col_products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    return clean(p)


@app.post("/products", response_model=Product, status_code=201)
def create_product(product: Product, background_tasks: BackgroundTasks, current_user: dict = Depends(require_admin)):
    product.id = product.id.strip().upper()
    if col_products.find_one({"id": product.id}):
        raise HTTPException(status_code=400, detail="Ya existe un producto con este ID.")
    col_products.insert_one(product.model_dump())
    log_movement(current_user, "CREACIÓN", f"Creó el producto {product.nombre}")
    
    # Notificación por correo
    background_tasks.add_task(alert_new_product, product.nombre, product.id, product.precio, current_user.get("nombre_completo", current_user["username"]))
    
    return product


@app.put("/products/{product_id}/update_stock", response_model=Product)
def update_product_stock(
    product_id: str,
    request: UpdateStockRequest,
    current_user: dict = Depends(get_current_user)
):
    p = col_products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    new_stock = p["cantidad"] + request.cantidad
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="El stock no puede ser menor a 0.")

    col_products.update_one({"id": product_id}, {"$set": {"cantidad": new_stock}})

    action_type = "ENTRADA" if request.cantidad > 0 else "SALIDA"
    accion_verb = "Añadió" if request.cantidad > 0 else "Retiró"
    log_movement(current_user, action_type, f"{accion_verb} {abs(request.cantidad)} unidades de {p['nombre']}")

    if new_stock == 0 and request.cantidad < 0:
        log_movement(current_user, "ALERTA", f"El producto {p['nombre']} se ha agotado.")
        alert_stock_status(p['nombre'], p['id'], new_stock, is_out=True)
    elif new_stock <= p.get("stock_minimo", 5) and request.cantidad < 0:
        log_movement(current_user, "ALERTA", f"Stock bajo para {p['nombre']}: quedan {new_stock} unidades.")
        alert_stock_status(p['nombre'], p['id'], new_stock, is_out=False)

    updated = col_products.find_one({"id": product_id})
    return clean(updated)


@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: str, request: ProductUpdate, current_user: dict = Depends(require_admin)):
    p = col_products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    cambios = []
    if p["nombre"] != request.nombre:
        cambios.append(f"Cambió el nombre ('{p['nombre']}' → '{request.nombre}')")
    if p["categoria"] != request.categoria:
        cambios.append(f"Cambió la categoría ('{p['categoria']}' → '{request.categoria}')")
    if p["unidad_medida"] != request.unidad_medida:
        cambios.append(f"Cambió la medida ('{p['unidad_medida']}' → '{request.unidad_medida}')")
    if p.get("stock_minimo", 5) != request.stock_minimo:
        cambios.append(f"Cambió el stock mín. ({p.get('stock_minimo', 5)} → {request.stock_minimo})")
    if p.get("precio", 10.0) != request.precio:
        cambios.append(f"Cambió el precio (${p.get('precio', 10.0):,.0f} → ${request.precio:,.0f})")

    col_products.update_one({"id": product_id}, {"$set": {
        "nombre": request.nombre,
        "categoria": request.categoria,
        "unidad_medida": request.unidad_medida,
        "stock_minimo": request.stock_minimo,
        "precio": request.precio
    }})

    if cambios:
        detalle = f"Modificó a {request.nombre}: " + ", ".join(cambios) + "."
        log_movement(current_user, "EDICIÓN", detalle)

    updated = col_products.find_one({"id": product_id})
    return clean(updated)


@app.delete("/products/{product_id}")
def delete_product(product_id: str, current_user: dict = Depends(require_admin)):
    p = col_products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    nombre = p["nombre"]
    col_products.delete_one({"id": product_id})
    log_movement(current_user, "ELIMINACIÓN", f"Eliminó el producto {nombre}")
    return {"message": "Producto eliminado exitosamente.", "id": product_id}


@app.put("/api/products/{product_id}/ajuste", response_model=Product)
def manual_adjust_stock(
    product_id: str,
    request: ManualAdjustRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin)
):
    """HU-11: Ajuste manual absoluto de stock. Solo admin."""
    p = col_products.find_one({"id": product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    old_stock = p["cantidad"]
    new_stock = request.cantidad_nueva

    col_products.update_one({"id": product_id}, {"$set": {"cantidad": new_stock}})

    log_movement(
        current_user,
        "AJUSTE",
        f"Ajuste manual de {p['nombre']}: {old_stock} → {new_stock} unidades"
    )

    # Alertas de stock
    threshold = p.get("stock_minimo", 5)
    if new_stock == 0:
        log_movement(current_user, "ALERTA", f"El producto {p['nombre']} se ha agotado.")
        background_tasks.add_task(alert_stock_status, p['nombre'], p['id'], new_stock, True)
    elif new_stock <= threshold and old_stock > threshold:
        log_movement(current_user, "ALERTA", f"Stock bajo para {p['nombre']}: quedan {new_stock} unidades.")
        background_tasks.add_task(alert_stock_status, p['nombre'], p['id'], new_stock, False)

    updated = col_products.find_one({"id": product_id})
    return clean(updated)


@app.post("/api/pos/checkout")
def checkout(request: CheckoutRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if not request.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")

    # 1. Optimización: Fetch de todos los productos en UNA sola consulta
    # Normalizamos IDs a MAYÚSCULAS antes de la búsqueda
    for item in request.items:
        item.id = item.id.strip().upper()
        
    product_ids = [item.id for item in request.items]
    products_cursor = col_products.find({"id": {"$in": product_ids}})
    db_products = {p["id"]: p for p in products_cursor}

    # 2. Validaciones masivas
    bulk_ops = []
    item_details = []
    
    for item in request.items:
        p = db_products.get(item.id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Producto {item.id} ({item.nombre}) no encontrado.")
        
        if p["cantidad"] < item.qty:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {p['nombre']}. Disponible: {p['cantidad']}.")
        
        # Preparar actualización de stock
        new_stock = p["cantidad"] - item.qty
        bulk_ops.append(
            UpdateOne({"id": item.id}, {"$set": {"cantidad": new_stock}})
        )
        
        # Preparar detalles para el recibo y logs
        item_details.append(f"{item.qty}x {item.nombre} (${item.precio * item.qty:,.0f})")
        
        # Alertas de stock (En segundo plano)
        threshold = p.get("stock_minimo", 5)
        if new_stock == 0:
            background_tasks.add_task(log_movement, current_user, "ALERTA", f"POS: El producto {p['nombre']} se ha agotado.")
            background_tasks.add_task(alert_stock_status, p['nombre'], p['id'], new_stock, True)
        elif new_stock <= threshold:
            background_tasks.add_task(log_movement, current_user, "ALERTA", f"POS: Stock bajo para {p['nombre']}: {new_stock} unidades.")
            background_tasks.add_task(alert_stock_status, p['nombre'], p['id'], new_stock, False)

    # 3. Ejecución por lotes (Bulk Write) - UNA sola ida a la base de datos para actualizar todo
    if bulk_ops:
        import os
        if os.getenv("TESTING") == "True":
            for op in bulk_ops:
                col_products.update_one(op._filter, op._doc)
        else:
            col_products.bulk_write(bulk_ops)

    # 4. Registrar la Venta (Documento único)
    user_name = current_user.get("nombre_completo", current_user.get("username", "Cajero Anonimo"))
    sale_doc = {
        "id_venta": secrets.token_hex(8),
        "vendedor": user_name,
        "username": current_user.get("username", ""),
        "fecha": datetime.now(timezone.utc).isoformat(),
        "total": request.total,
        "items": [item.model_dump() for item in request.items]
    }
    col_sales.insert_one(sale_doc)

    # 5. Logs y Notificación Final (En segundo plano)
    detalles_str = ", ".join(item_details)
    background_tasks.add_task(log_movement, current_user, "VENTA", f"Venta completada: {detalles_str} | Total: ${request.total:,.0f}")
    background_tasks.add_task(alert_sale, user_name, item_details, request.total)

    return {"status": "success", "id_venta": sale_doc["id_venta"], "total": request.total}


@app.get("/api/sales")
def get_sales(current_user: dict = Depends(get_current_user)):
    # Los administradores y empleados pueden ver ventas. Dependiendo de los requisitos de tu negocio, 
    # podrías limitar las ventas a solo las de ese empleado o mostrar todas.
    query = {} 
    sales = list(col_sales.find(query).sort("fecha", -1))
    return clean(sales)



# ─────────────────────────────────────────────
# History Endpoints
# ─────────────────────────────────────────────
@app.get("/api/history")
def get_history(current_user: dict = Depends(get_current_user)):
    u = col_users.find_one({"username": current_user["username"]})
    query = {}
    if u and "last_cleared_history" in u:
        query = {"fecha": {"$gt": u["last_cleared_history"]}}
    movements = [clean(m) for m in col_movements.find(query).sort("fecha", -1)]
    return movements


@app.post("/api/history/clear")
def clear_history(current_user: dict = Depends(get_current_user)):
    result = col_users.update_one(
        {"username": current_user["username"]},
        {"$set": {"last_cleared_history": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Historial limpiado"}


# ─────────────────────────────────────────────
# User Management Endpoints (HU-25)
# ─────────────────────────────────────────────
@app.get("/api/users")
def list_users(current_user: dict = Depends(require_admin)):
    """Lista todos los usuarios (sin contraseñas)."""
    users = []
    for u in col_users.find({}):
        users.append({
            "username": u["username"],
            "rol": u["rol"],
            "nombre_completo": u.get("nombre_completo", u["username"])
        })
    return users


@app.post("/api/users", status_code=201)
def create_user(user: UserCreate, current_user: dict = Depends(require_admin)):
    """Crea un nuevo usuario (nombre en minúsculas)."""
    user.username = user.username.strip().lower()
    if col_users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese nombre.")
    col_users.insert_one(user.model_dump())
    log_movement(current_user, "GESTIÓN", f"Creó el usuario '{user.nombre_completo}' ({user.rol})")
    return {"message": "Usuario creado exitosamente.", "username": user.username}


@app.put("/api/users/{username}")
def update_user(username: str, data: UserUpdate, current_user: dict = Depends(require_admin)):
    """Actualiza datos de un usuario existente."""
    u = col_users.find_one({"username": username})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    update_fields = {}
    cambios = []
    if data.password is not None:
        update_fields["password"] = data.password
        cambios.append("contraseña")
    if data.nombre_completo is not None:
        update_fields["nombre_completo"] = data.nombre_completo
        cambios.append(f"nombre ('{u.get('nombre_completo', '')}' → '{data.nombre_completo}')")
    if data.rol is not None:
        update_fields["rol"] = data.rol
        cambios.append(f"rol ('{u['rol']}' → '{data.rol}')")

    if not update_fields:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar.")

    col_users.update_one({"username": username}, {"$set": update_fields})
    log_movement(current_user, "GESTIÓN", f"Modificó al usuario '{username}': " + ", ".join(cambios))
    return {"message": "Usuario actualizado.", "username": username}


@app.delete("/api/users/{username}")
def delete_user(username: str, current_user: dict = Depends(require_admin)):
    """Elimina un usuario. No permite eliminar administradores."""
    u = col_users.find_one({"username": username})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if u.get("rol") == "admin":
        raise HTTPException(status_code=403, detail="No se puede eliminar una cuenta de administrador.")
    nombre = u.get("nombre_completo", username)
    col_users.delete_one({"username": username})
    log_movement(current_user, "GESTIÓN", f"Eliminó al usuario '{nombre}'")
    return {"message": "Usuario eliminado.", "username": username}


# ─────────────────────────────────────────────
# Movement Analytics Endpoint (HU-25)
# ─────────────────────────────────────────────
@app.get("/api/stats/movements")
def get_movement_stats(current_user: dict = Depends(require_admin)):
    """Devuelve datos agregados de movimientos para gráficas."""
    movements = list(col_movements.find({}))
    sales = list(col_sales.find({}))

    # Acciones por usuario
    by_user = {}
    # Acciones por tipo
    by_type = {}
    # Actividad por día (últimos 30 días)
    by_date = {}
    # Ingresos por usuario
    revenue_by_user = {}

    for m in movements:
        usuario = m.get("usuario", "Desconocido")
        accion = m.get("accion", "OTRO")
        fecha_str = m.get("fecha", "")

        if usuario not in by_user:
            by_user[usuario] = 0
        by_user[usuario] += 1

        if accion not in by_type:
            by_type[accion] = 0
        by_type[accion] += 1

        if fecha_str:
            day = fecha_str[:10]
            if day not in by_date:
                by_date[day] = 0
            by_date[day] += 1
            
    for s in sales:
        vendedor = s.get("vendedor", "Desconocido")
        total = s.get("total", 0.0)
        if vendedor not in revenue_by_user:
            revenue_by_user[vendedor] = 0.0
        revenue_by_user[vendedor] += total

    chart_by_user = [{"name": k, "total": v} for k, v in sorted(by_user.items(), key=lambda x: -x[1])]
    chart_by_type = [{"name": k, "total": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])]
    chart_by_date = [{"date": k, "total": v} for k, v in sorted(by_date.items())[-30:]]
    chart_revenue = [{"name": k, "total": v} for k, v in sorted(revenue_by_user.items(), key=lambda x: -x[1])]

    return {
        "by_user": chart_by_user,
        "by_type": chart_by_type,
        "by_date": chart_by_date,
        "revenue_by_user": chart_revenue,
        "total_movements": len(movements)
    }

@app.post("/api/stats/clear")
def clear_stats(current_user: dict = Depends(require_admin)):
    """Borra todos los movimientos y ventas para reiniciar las estadísticas. Solo admin."""
    # Opcional: Podrías querer guardar un respaldo antes, pero para este requerimiento borramos directo.
    col_movements.delete_many({})
    col_sales.delete_many({})
    log_movement(current_user, "LIMPIEZA", "Se han reiniciado las estadísticas globales (Movimientos y Ventas).")
    return {"message": "Estadísticas reiniciadas correctamente."}


# ─────────────────────────────────────────────
# Settings Endpoints (Categorías y Unidades)
# ─────────────────────────────────────────────

from pydantic import BaseModel

class SettingsUpdate(BaseModel):
    categorias: list[str]
    unidades: list[str]

@app.get("/api/settings")
def get_settings(current_user: dict = Depends(get_current_user)):
    settings_doc = {
        "_id": "global",
        "categorias": ["Herramientas", "Materiales", "Fijación", "Pinturas", "Otros", "Manuales", "Eléctricas", "Construcción", "Plomería", "Electricidad", "Tornillería", "Seguridad"],
        "unidades": ["Unidad", "Kg", "Metro", "Litro", "Pieza", "Caja", "Galón", "Bolsa", "Paquete", "Rollo", "Par", "Set/Juego"]
    }
    
    # We forcefully upsert so the original setup is fully restored/merged with the latest ones without needing scripts.
    col_settings.update_one({"_id": "global"}, {"$setOnInsert": settings_doc}, upsert=True)
    
    settings = col_settings.find_one({"_id": "global"})
    
    # settings is a dict. Remove _id if present and return it.
    if settings and "_id" in settings:
        del settings["_id"]
    return settings

@app.put("/api/settings")
def update_settings(request: SettingsUpdate, current_user: dict = Depends(require_admin)):
    # Normalizamos a formato Título para consistencia visual
    categorias = sorted([c.strip().title() for c in request.categorias if c.strip()])
    unidades = sorted([u.strip().title() for u in request.unidades if u.strip()])
    
    col_settings.update_one(
        {"_id": "global"},
        {"$set": {"categorias": categorias, "unidades": unidades}},
        upsert=True
    )
    log_movement(current_user, "AJUSTE", "Actualizó las configuraciones de categorías/unidades globales.")
    return {"status": "success", "message": "Configuración actualizada correctamente"}
