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
    
    col_users.insert_one({
        "username": "admin", 
        "password": "adminpassword", 
        "rol": "admin", 
        "nombre_completo": "Test Admin"
    })
    
    col_settings.insert_one({
        "_id": "global",
        "categorias": ["General", "Electrónica"],
        "unidades": ["Unidad", "Kg"]
    })
    yield


# ─── Helpers ──────────────────────────────────────────────────────────────────

def login_admin():
    resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    return resp.json()["token"]


# ─── Tests básicos ────────────────────────────────────────────────────────────

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "SistemInv API" in response.json()["message"]

def test_helper_endpoints():
    assert client.get("/favicon.ico").status_code == 204
    assert client.get("/api/health").status_code == 200


# ─── Auth ─────────────────────────────────────────────────────────────────────

def test_login_success():
    resp = client.post("/api/login", json={"username": "admin", "password": "adminpassword"})
    assert resp.status_code == 200
    assert "token" in resp.json()

def test_login_bad_password():
    resp = client.post("/api/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401

def test_login_user_not_found():
    resp = client.post("/api/login", json={"username": "fantasma", "password": "x"})
    assert resp.status_code == 401

def test_login_lockout():
    """5 intentos fallidos bloquean la cuenta (cubre líneas 269-284)."""
    col_users.insert_one({
        "username": "locked", "password": "real", "rol": "empleado",
        "nombre_completo": "Locked", "failed_login_attempts": 0
    })
    for _ in range(5):
        client.post("/api/login", json={"username": "locked", "password": "bad"})
    # Ahora la cuenta está bloqueada
    resp = client.post("/api/login", json={"username": "locked", "password": "real"})
    assert resp.status_code == 403

def test_session_expired():
    """Token cuya sesión ya expiró (cubre líneas 222-223)."""
    from main import active_sessions
    active_sessions["expired_tok"] = {
        "username": "admin", "rol": "admin", "nombre_completo": "Admin",
        "expires_at": "2020-01-01T00:00:00+00:00"
    }
    resp = client.get("/products", headers={"Authorization": "expired_tok"})
    assert resp.status_code == 401

def test_no_auth_header():
    assert client.get("/products").status_code == 401

def test_bad_token():
    assert client.get("/products", headers={"Authorization": "INVALID"}).status_code == 401

def test_logout():
    """Cubre líneas 314-316."""
    token = login_admin()
    resp = client.post("/api/logout", headers={"Authorization": token})
    assert resp.status_code == 200
    # Token ya no sirve
    assert client.get("/products", headers={"Authorization": token}).status_code == 401


# ─── Forgot / Reset Password ─────────────────────────────────────────────────

def test_forgot_password_empty():
    assert client.post("/api/auth/forgot-password", json={"username": ""}).status_code == 400

def test_forgot_password_not_found():
    assert client.post("/api/auth/forgot-password", json={"username": "fantasma"}).status_code == 404

def test_forgot_and_reset_password():
    """Flujo completo de recuperación de contraseña (cubre líneas 321-367)."""
    col_users.insert_one({"username": "resetme", "password": "old", "rol": "empleado", "nombre_completo": "R"})
    
    fp = client.post("/api/auth/forgot-password", json={"username": "resetme"})
    assert fp.status_code == 200
    
    user = col_users.find_one({"username": "resetme"})
    pin = user["reset_token"]

    # Datos incompletos
    assert client.post("/api/auth/reset-password", json={}).status_code == 400
    # Usuario inexistente
    assert client.post("/api/auth/reset-password", json={"username": "noexiste", "token": "X", "new_password": "x"}).status_code == 400
    # PIN incorrecto
    assert client.post("/api/auth/reset-password", json={"username": "resetme", "token": "WRONG", "new_password": "x"}).status_code == 400
    # PIN expirado
    col_users.update_one({"username": "resetme"}, {"$set": {"reset_token_exp": "2020-01-01T00:00:00+00:00"}})
    assert client.post("/api/auth/reset-password", json={"username": "resetme", "token": pin, "new_password": "x"}).status_code == 400
    # Restaurar expiración y hacer reset exitoso
    col_users.update_one({"username": "resetme"}, {"$set": {"reset_token_exp": "2099-01-01T00:00:00+00:00"}})
    resp = client.post("/api/auth/reset-password", json={"username": "resetme", "token": pin, "new_password": "nueva"})
    assert resp.status_code == 200


# ─── Products CRUD ────────────────────────────────────────────────────────────

def test_create_product():
    token = login_admin()
    h = {"Authorization": token}
    prod = {"id": "SKU-1", "nombre": "P1", "categoria": "General", "unidad_medida": "Unidad", "cantidad": 10, "precio": 50}
    assert client.post("/products", json=prod, headers=h).status_code == 201
    # Duplicado
    assert client.post("/products", json=prod, headers=h).status_code == 400

def test_get_product_individual():
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-X", "nombre": "X", "categoria": "C", "unidad_medida": "U", "cantidad": 5, "precio": 10, "stock_minimo": 2})
    resp = client.get("/api/products/SKU-X", headers=h)
    assert resp.status_code == 200
    assert client.get("/api/products/NOPE", headers=h).status_code == 404

def test_update_product():
    """Cubre cambios de nombre, categoría, unidad, stock_minimo, precio (líneas 456-483)."""
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-UP", "nombre": "Old", "categoria": "A", "unidad_medida": "B", "cantidad": 10, "stock_minimo": 5, "precio": 10})
    resp = client.put("/products/SKU-UP", json={
        "nombre": "New", "categoria": "X", "unidad_medida": "Y", "stock_minimo": 99, "precio": 999
    }, headers=h)
    assert resp.status_code == 200
    # 404
    assert client.put("/products/NOPE", json={"nombre": "A", "categoria": "B", "unidad_medida": "C"}, headers=h).status_code == 404

def test_delete_product():
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-DEL", "nombre": "Del", "categoria": "C", "unidad_medida": "U", "cantidad": 1, "stock_minimo": 1, "precio": 1})
    assert client.delete("/products/SKU-DEL", headers=h).status_code == 200
    assert client.delete("/products/NOPE", headers=h).status_code == 404


# ─── Update Stock ─────────────────────────────────────────────────────────────

def test_update_stock_full():
    """Cubre add, error below zero, stock bajo y agotado (líneas 427-449)."""
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-ST", "nombre": "Stock", "categoria": "C", "unidad_medida": "U", "cantidad": 20, "stock_minimo": 3, "precio": 5})
    
    # Añadir
    client.put("/products/SKU-ST/update_stock", json={"cantidad": 5}, headers=h)
    p = col_products.find_one({"id": "SKU-ST"})
    assert p["cantidad"] == 25
    
    # Error: restar más de lo que hay
    assert client.put("/products/SKU-ST/update_stock", json={"cantidad": -100}, headers=h).status_code == 400
    
    # Restar hasta debajo de stock_minimo (alerta stock bajo)
    client.put("/products/SKU-ST/update_stock", json={"cantidad": -23}, headers=h)
    
    # Agotar completamente (alerta agotado)
    client.put("/products/SKU-ST/update_stock", json={"cantidad": -2}, headers=h)
    
    # 404
    assert client.put("/products/NOPE/update_stock", json={"cantidad": 1}, headers=h).status_code == 404


# ─── Manual Adjust ────────────────────────────────────────────────────────────

def test_manual_adjust():
    """Cubre ajuste manual con alertas de stock bajo y agotado (líneas 505-530)."""
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-ADJ", "nombre": "Adj", "categoria": "C", "unidad_medida": "U", "cantidad": 10, "stock_minimo": 8, "precio": 1})
    
    # Ajuste abajo del umbral → alerta stock bajo
    resp = client.put("/api/products/SKU-ADJ/ajuste", json={"cantidad_nueva": 5}, headers=h)
    assert resp.status_code == 200
    
    # Ajuste a cero → alerta agotado
    resp = client.put("/api/products/SKU-ADJ/ajuste", json={"cantidad_nueva": 0}, headers=h)
    assert resp.status_code == 200
    
    # 404
    assert client.put("/api/products/NOPE/ajuste", json={"cantidad_nueva": 0}, headers=h).status_code == 404


# ─── POS Checkout cases ──────────────────────────────────────────────────────

def test_pos_checkout_success():
    token = login_admin()
    h = {"Authorization": token}
    col_products.insert_one({"id": "SKU-POS", "nombre": "Pos", "categoria": "C", "unidad_medida": "U", "cantidad": 50, "stock_minimo": 5, "precio": 10})
    resp = client.post("/api/pos/checkout", json={
        "items": [{"id": "SKU-POS", "nombre": "Pos", "qty": 2, "precio": 10}], "total": 20
    }, headers=h)
    assert resp.status_code == 200
    assert col_products.find_one({"id": "SKU-POS"})["cantidad"] == 48

def test_pos_checkout_empty_cart():
    token = login_admin()
    assert client.post("/api/pos/checkout", json={"items": [], "total": 0}, headers={"Authorization": token}).status_code == 400

def test_pos_checkout_product_not_found():
    token = login_admin()
    resp = client.post("/api/pos/checkout", json={
        "items": [{"id": "FAKE", "nombre": "F", "qty": 1, "precio": 1}], "total": 1
    }, headers={"Authorization": token})
    assert resp.status_code == 404

def test_pos_checkout_insufficient_stock():
    token = login_admin()
    col_products.insert_one({"id": "SKU-FEW", "nombre": "Few", "categoria": "C", "unidad_medida": "U", "cantidad": 1, "stock_minimo": 5, "precio": 1})
    resp = client.post("/api/pos/checkout", json={
        "items": [{"id": "SKU-FEW", "nombre": "Few", "qty": 99, "precio": 1}], "total": 99
    }, headers={"Authorization": token})
    assert resp.status_code == 400

def test_pos_checkout_stock_alerts():
    """Cubre alertas de stock bajo y agotado en POS (líneas 571-575)."""
    token = login_admin()
    h = {"Authorization": token}
    # Stock bajo
    col_products.insert_one({"id": "SKU-ALT", "nombre": "Alt", "categoria": "C", "unidad_medida": "U", "cantidad": 3, "stock_minimo": 5, "precio": 10})
    client.post("/api/pos/checkout", json={"items": [{"id": "SKU-ALT", "nombre": "Alt", "qty": 1, "precio": 10}], "total": 10}, headers=h)
    # Agotado
    col_products.insert_one({"id": "SKU-OUT", "nombre": "Out", "categoria": "C", "unidad_medida": "U", "cantidad": 1, "stock_minimo": 5, "precio": 10})
    client.post("/api/pos/checkout", json={"items": [{"id": "SKU-OUT", "nombre": "Out", "qty": 1, "precio": 10}], "total": 10}, headers=h)


# ─── Sales ────────────────────────────────────────────────────────────────────

def test_sales_listing():
    token = login_admin()
    resp = client.get("/api/sales", headers={"Authorization": token})
    assert resp.status_code == 200


# ─── History ──────────────────────────────────────────────────────────────────

def test_history_get_and_clear():
    """Cubre líneas 621-637."""
    token = login_admin()
    h = {"Authorization": token}
    assert client.get("/api/history", headers=h).status_code == 200
    assert client.post("/api/history/clear", headers=h).status_code == 200
    # Después de clear, debe filtrar por last_cleared_history
    assert client.get("/api/history", headers=h).status_code == 200


# ─── Users CRUD ───────────────────────────────────────────────────────────────

def test_user_crud():
    token = login_admin()
    h = {"Authorization": token}
    
    # Crear
    assert client.post("/api/users", json={"username": "emp1", "password": "p", "rol": "empleado", "nombre_completo": "E1"}, headers=h).status_code == 201
    # Duplicado
    assert client.post("/api/users", json={"username": "emp1", "password": "p", "rol": "empleado", "nombre_completo": "E1"}, headers=h).status_code == 400
    # Listar
    assert len(client.get("/api/users", headers=h).json()) >= 2
    # Modificar
    assert client.put("/api/users/emp1", json={"nombre_completo": "Nuevo", "rol": "empleado", "password": "new"}, headers=h).status_code == 200
    # Eliminar
    assert client.delete("/api/users/emp1", headers=h).status_code == 200

def test_user_errors():
    token = login_admin()
    h = {"Authorization": token}
    # No se puede borrar admin
    assert client.delete("/api/users/admin", headers=h).status_code == 403
    # No existe
    assert client.put("/api/users/FANTASMA", json={"rol": "empleado"}, headers=h).status_code == 404
    assert client.delete("/api/users/FANTASMA", headers=h).status_code == 404
    # Empleado no puede acceder a endpoints admin
    col_users.insert_one({"username": "emp3", "password": "p", "rol": "empleado", "nombre_completo": "E3"})
    emp_tok = client.post("/api/login", json={"username": "emp3", "password": "p"}).json()["token"]
    assert client.delete("/api/users/emp3", headers={"Authorization": emp_tok}).status_code == 403


# ─── Stats ────────────────────────────────────────────────────────────────────

def test_stats_with_revenue():
    """Cubre líneas 746-750 (revenue_by_user)."""
    token = login_admin()
    h = {"Authorization": token}
    # Crear una venta para que haya datos de revenue
    col_products.insert_one({"id": "SKU-REV", "nombre": "Rev", "categoria": "C", "unidad_medida": "U", "cantidad": 100, "stock_minimo": 1, "precio": 50})
    client.post("/api/pos/checkout", json={"items": [{"id": "SKU-REV", "nombre": "Rev", "qty": 2, "precio": 50}], "total": 100}, headers=h)
    
    stats = client.get("/api/stats/movements", headers=h)
    assert stats.status_code == 200
    data = stats.json()
    assert "revenue_by_user" in data
    assert len(data["revenue_by_user"]) > 0

    client.post("/api/stats/clear", headers=h)


# ─── Settings ─────────────────────────────────────────────────────────────────

def test_settings_get():
    token = login_admin()
    resp = client.get("/api/settings", headers={"Authorization": token})
    assert resp.status_code == 200
    assert "categorias" in resp.json()

def test_settings_update():
    """Cubre normalización título (líneas 806-815)."""
    token = login_admin()
    h = {"Authorization": token}
    client.put("/api/settings", json={"categorias": ["nueva cat", "otra"], "unidades": ["metro", "kilo"]}, headers=h)
    s = client.get("/api/settings", headers=h).json()
    assert "Nueva Cat" in s["categorias"]
