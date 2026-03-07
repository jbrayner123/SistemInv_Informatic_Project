import json
import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Hardware Store Inventory API")

# --------- CORS Configuration ---------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- Database Setup ---------
DB_FILE = "database.json"

def init_db():
    """Ensure the database.json file exists and is valid JSON."""
    if not os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)
        except IOError as e:
            print(f"Error al inicializar la base de datos: {e}")

init_db()

def read_db() -> List[dict]:
    """Read the database file safely."""
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error al leer la base de datos: {str(e)}")

def write_db(data: List[dict]):
    """Write to the database file safely."""
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir en la base de datos: {str(e)}")

# --------- Pydantic Models ---------
class Product(BaseModel):
    id: str
    nombre: str
    categoria: str
    unidad_medida: str
    cantidad: int = Field(ge=0, description="La cantidad de stock no puede ser negativa")

class AddStockRequest(BaseModel):
    cantidad: int = Field(gt=0, description="La cantidad a sumar debe ser positiva")

# --------- Endpoints ---------

from fastapi.responses import Response

@app.get("/")
def read_root():
    return {"message": "La API de Sisteminv está en línea. Accede al frontend en http://localhost:5173"}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/products", response_model=List[Product])
def list_products():
    """HU-12: List all products in the inventory."""
    return read_db()

@app.post("/products", response_model=Product, status_code=201)
def create_product(product: Product):
    """HU-04: Register a new product."""
    data = read_db()
    
    # Check if ID already exists to prevent duplicates
    if any(p["id"] == product.id for p in data):
        raise HTTPException(status_code=400, detail="Ya existe un producto con este ID.")
    
    data.append(product.model_dump())
    write_db(data)
    
    return product

@app.put("/products/{product_id}/add_stock", response_model=Product)
def add_product_stock(product_id: str, request: AddStockRequest):
    """HU-09: Register product entry (Add stock to existing product)."""
    data = read_db()
    
    for p in data:
        if p["id"] == product_id:
            p["cantidad"] += request.cantidad
            write_db(data)
            return p
            
    raise HTTPException(status_code=404, detail="Producto no encontrado.")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "os": "Linux CachyOS"}
