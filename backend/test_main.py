import os
import pytest
from fastapi.testclient import TestClient

# Configuramos la variable TESTING antes de importar main
# para que se active mongomock en lugar del servidor real Mongo Atlas.
os.environ["TESTING"] = "True"

from main import app, col_users, col_products, col_settings, col_sales

client = TestClient(app)

@pytest.fixture(autouse=True)
def wipe_db():
    """Limpia la base de datos mockeada antes de cada prueba y crea un admin base"""
    col_users.delete_many({})
    col_products.delete_many({})
    col_settings.delete_many({})
    col_sales.delete_many({})
    
    # Crear un administrador de pruebas manual
    col_users.insert_one({
        "username": "admin", 
        "password": "adminpassword", 
        "rol": "admin", 
        "nombre_completo": "Test Admin"
    })
    
    # Insertar settings base
    col_settings.insert_one({
        "_id": "global",
        "categorias": ["General", "Electrónica"],
        "unidades": ["Unidad", "Kg"]
    })
    yield

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "SistemInv API" in response.json()["message"]

def test_login_success():
    response = client.post(
        "/api/login",
        json={"username": "admin", "password": "adminpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert "token" in data

def test_login_invalid_credentials():
    response = client.post(
        "/api/login",
        json={"username": "admin", "password": "wrongpassword"}
    )
    # Debe fallar por contraseña incorrecta
    assert response.status_code == 401

def test_get_products_unauthorized():
    response = client.get("/products")
    assert response.status_code == 401

def test_create_and_get_product():
    # 1. Hacer login para obtener token admin
    login_resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    token = login_resp.json()["token"]
    
    headers = {"Authorization": token}
    
    # 2. Crear producto
    new_product = {
        "id": "SKU-TEST-1",
        "nombre": "Producto Prueba",
        "categoria": "General",
        "unidad_medida": "Unidad",
        "cantidad": 10,
        "stock_minimo": 2,
        "precio": 99.99
    }
    create_resp = client.post("/products", json=new_product, headers=headers)
    assert create_resp.status_code == 201
    
    # 3. Obtener productos y verificar que exista
    get_resp = client.get("/products", headers=headers)
    assert get_resp.status_code == 200
    products = get_resp.json()
    assert len(products) > 0
    assert products[0]["id"] == "SKU-TEST-1"
    assert products[0]["precio"] == 99.99

def test_pos_checkout():
    # Login as admin
    login_resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    token = login_resp.json()["token"]
    headers = {"Authorization": token}
    
    # Insertar producto manual en mock db
    col_products.insert_one({
        "id": "SKU-ITEM",
        "nombre": "Item",
        "cantidad": 50,
        "precio": 10.0,
        "stock_minimo": 5
    })
    
    # Checkout
    checkout_data = {
        "items": [
            {"id": "SKU-ITEM", "nombre": "Item", "qty": 2, "precio": 10.0}
        ],
        "total": 20.0
    }
    
    checkout_resp = client.post("/api/pos/checkout", json=checkout_data, headers=headers)
    assert checkout_resp.status_code == 200
    
    # Verificar que el stock bajó a 48
    prod = col_products.find_one({"id": "SKU-ITEM"})
    assert prod["cantidad"] == 48

def test_get_settings():
    login_resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    token = login_resp.json()["token"]
    headers = {"Authorization": token}
    
    resp = client.get("/api/settings", headers=headers)
    assert resp.status_code == 200
    assert "categorias" in resp.json()
    assert "Electrónica" in resp.json()["categorias"]

def test_extra_endpoints():
    login_resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    token = login_resp.json()["token"]
    headers = {"Authorization": token}

    # 1. Ajuste Manual de stock
    col_products.insert_one({
        "id": "SKU-TEST-2",
        "nombre": "Producto Prueba 2",
        "categoria": "General",
        "unidad_medida": "Unidad",
        "cantidad": 10,
        "stock_minimo": 2,
        "precio": 99.99
    })
    adj_resp = client.put("/api/products/SKU-TEST-2/ajuste", json={"cantidad_nueva": 15}, headers=headers)
    assert adj_resp.status_code == 200
    assert adj_resp.json()["cantidad"] == 15

    # 2. Update Producto
    upd_resp = client.put("/products/SKU-TEST-2", json={
        "nombre": "Nuevo Nombre",
        "categoria": "General",
        "unidad_medida": "Unidad",
        "stock_minimo": 5,
        "precio": 100.0
    }, headers=headers)
    assert upd_resp.status_code == 200
    assert col_products.find_one({"id": "SKU-TEST-2"})["nombre"] == "Nuevo Nombre"

    # 3. Delete Producto
    del_resp = client.delete("/products/SKU-TEST-2", headers=headers)
    assert del_resp.status_code == 200
    assert col_products.find_one({"id": "SKU-TEST-2"}) is None

    # 4. User CRUD
    # Crear usuario
    usr_resp = client.post("/api/users", json={
        "username": "empleado1",
        "password": "emp",
        "rol": "empleado",
        "nombre_completo": "Empleado Test"
    }, headers=headers)
    assert usr_resp.status_code == 201

    # Listar Usuarios
    usr_list = client.get("/api/users", headers=headers)
    assert len(usr_list.json()) >= 2

    # Modificar Usuario
    usr_put = client.put("/api/users/empleado1", json={
        "nombre_completo": "Juan Perez",
        "rol": "empleado",
        "password": "none"
    }, headers=headers)
    assert usr_put.status_code == 200

    # Eliminar Usuario
    usr_del = client.delete("/api/users/empleado1", headers=headers)
    assert usr_del.status_code == 200

    # 5. Stats
    client.post("/api/stats/clear", headers=headers)
    stats_resp = client.get("/api/stats/movements", headers=headers)
    assert stats_resp.status_code == 200
    assert "by_user" in stats_resp.json()

