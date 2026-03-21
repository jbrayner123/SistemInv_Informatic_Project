import os
import secrets
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from pymongo import MongoClient

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

client = MongoClient(MONGODB_URI)
db = client["sisteminv"]

col_products = db["products"]
col_users = db["users"]
col_movements = db["movements"]

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


class ProductUpdate(BaseModel):
    nombre: str
    categoria: str
    unidad_medida: str
    stock_minimo: int = Field(default=5, ge=0)


class UpdateStockRequest(BaseModel):
    cantidad: int = Field(description="Cantidad a sumar o restar (puede ser negativa)")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    rol: str
    username: str
    nombre_completo: str


# ─────────────────────────────────────────────
# Auth Dependencies
# ─────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header requerido.")
    session = active_sessions.get(authorization)
    if not session:
        raise HTTPException(status_code=401, detail="Token de sesión inválido o expirado.")
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
    # Mantener solo los últimos 500 movimientos
    total = col_movements.count_documents({})
    if total > 500:
        oldest_ids = [
            doc["_id"]
            for doc in col_movements.find({}, {"_id": 1}).sort("fecha", 1).limit(total - 500)
        ]
        col_movements.delete_many({"_id": {"$in": oldest_ids}})


# ─────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────
@app.post("/api/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    user = col_users.find_one({
        "username": credentials.username,
        "password": credentials.password
    })

    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    token = secrets.token_hex(32)
    session_data = {
        "username": user["username"],
        "rol": user["rol"],
        "nombre_completo": user.get("nombre_completo", user["username"])
    }
    active_sessions[token] = session_data

    return LoginResponse(
        token=token,
        rol=user["rol"],
        username=user["username"],
        nombre_completo=session_data["nombre_completo"]
    )


@app.post("/api/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization in active_sessions:
        del active_sessions[authorization]
    return {"message": "Sesión cerrada correctamente."}


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
@app.get("/products", response_model=List[Product])
def list_products(current_user: dict = Depends(get_current_user)):
    products = [clean(p) for p in col_products.find({})]
    return products


@app.post("/products", response_model=Product, status_code=201)
def create_product(product: Product, current_user: dict = Depends(require_admin)):
    if col_products.find_one({"id": product.id}):
        raise HTTPException(status_code=400, detail="Ya existe un producto con este ID.")
    col_products.insert_one(product.model_dump())
    log_movement(current_user, "CREACIÓN", f"Creó el producto {product.nombre}")
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
    elif new_stock <= p.get("stock_minimo", 5) and request.cantidad < 0:
        log_movement(current_user, "ALERTA", f"Stock bajo para {p['nombre']}: quedan {new_stock} unidades (Mín: {p.get('stock_minimo', 5)}).")

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

    col_products.update_one({"id": product_id}, {"$set": {
        "nombre": request.nombre,
        "categoria": request.categoria,
        "unidad_medida": request.unidad_medida,
        "stock_minimo": request.stock_minimo
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
