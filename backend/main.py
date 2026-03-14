import json
import os
import hashlib
import secrets
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

app = FastAPI(title="SistemInv API")

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Persistence Helpers
# ─────────────────────────────────────────────
DB_FILE = "database.json"
USERS_FILE = "users.json"


def init_db():
    """Ensure database.json exists and is valid JSON."""
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def read_db() -> List[dict]:
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error al leer la base de datos: {str(e)}")


def write_db(data: List[dict]):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir en la base de datos: {str(e)}")


def read_users() -> List[dict]:
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error al leer usuarios: {str(e)}")


def hash_password(plain: str) -> str:
    """Kept for backward compatibility if needed. MVP uses plain text on users.json."""
    return plain


init_db()

# ─────────────────────────────────────────────
# Session Store (in-memory)
# ─────────────────────────────────────────────
# Estructura: { token: { "username": str, "rol": str, "nombre_completo": str } }
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
    """
    Valida el token enviado en el header 'Authorization'.
    Retorna el diccionario de sesión del usuario si es válido.
    Lanza HTTP 401 si el token es inválido o ha expirado.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header requerido.")
    session = active_sessions.get(authorization)
    if not session:
        raise HTTPException(status_code=401, detail="Token de sesión inválido o expirado.")
    return session


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependencia que exige rol 'admin'. Lanza HTTP 403 si el rol es 'empleado'.
    """
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado. Se requiere rol 'admin' para esta operación."
        )
    return current_user


# ─────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────
@app.post("/api/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """
    HU-22: Autentica al usuario y retorna un token de sesión UUID junto con su rol.
    """
    users = read_users()
    hashed = credentials.password

    user = next(
        (u for u in users if u["username"] == credentials.username and u.get("password") == hashed),
        None
    )

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
    """
    HU-22: Invalida el token de sesión, cerrando la sesión del usuario.
    """
    if authorization and authorization in active_sessions:
        del active_sessions[authorization]
    return {"message": "Sesión cerrada correctamente."}


# ─────────────────────────────────────────────
# Utility Endpoints
# ─────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "SistemInv API en línea. Frontend: http://localhost:5173"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ─────────────────────────────────────────────
# Product Endpoints — RBAC aplicado
# ─────────────────────────────────────────────
@app.get("/products", response_model=List[Product])
def list_products(current_user: dict = Depends(get_current_user)):
    """
    HU-12: Lista todos los productos. Requiere sesión activa (admin o empleado).
    """
    data = read_db()
    updated = False
    for p in data:
        if "stock_minimo" not in p:
            p["stock_minimo"] = 5
            updated = True
    if updated:
        write_db(data)
    return data


@app.post("/products", response_model=Product, status_code=201)
def create_product(product: Product, _: dict = Depends(require_admin)):
    """
    HU-04: Registra un nuevo producto. Requiere rol admin.
    """
    data = read_db()
    if any(p["id"] == product.id for p in data):
        raise HTTPException(status_code=400, detail="Ya existe un producto con este ID.")
    data.append(product.model_dump())
    write_db(data)
    return product


@app.put("/products/{product_id}/update_stock", response_model=Product)
def update_product_stock(
    product_id: str,
    request: UpdateStockRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza el stock. Requiere sesión activa (admin o empleado).
    """
    data = read_db()
    for p in data:
        if p["id"] == product_id:
            new_stock = p["cantidad"] + request.cantidad
            if new_stock < 0:
                raise HTTPException(status_code=400, detail="El stock no puede ser menor a 0.")
            p["cantidad"] = new_stock
            write_db(data)
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado.")


@app.put("/products/{product_id}", response_model=Product)
def update_product(product_id: str, request: ProductUpdate, _: dict = Depends(require_admin)):
    """
    HU-05: Modifica atributos del producto. Requiere rol admin.
    """
    data = read_db()
    for p in data:
        if p["id"] == product_id:
            p["nombre"] = request.nombre
            p["categoria"] = request.categoria
            p["unidad_medida"] = request.unidad_medida
            p["stock_minimo"] = request.stock_minimo
            write_db(data)
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado.")


@app.delete("/products/{product_id}")
def delete_product(product_id: str, _: dict = Depends(require_admin)):
    """
    HU-06: Elimina un producto. Requiere rol admin.
    """
    data = read_db()
    for p in data:
        if p["id"] == product_id:
            data.remove(p)
            write_db(data)
            return {"message": "Producto eliminado exitosamente.", "id": product_id}
    raise HTTPException(status_code=404, detail="Producto no encontrado.")
