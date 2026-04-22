import os
from pymongo import MongoClient

# Database Connection
MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb+srv://jbrayner123:lucas300@cluster0.bczisjc.mongodb.net/?appName=Cluster0"
)

client = MongoClient(MONGODB_URI)
db = client["sisteminv"]
col_products = db["products"]

def get_realistic_price(name, category):
    name = name.lower()
    
    # Categoría: Eléctricas (Precios altos)
    if category == "Eléctricas":
        if "taladro" in name: return 380000
        if "esmeriladora" in name: return 245000
        if "sierra" in name: return 420000
        if "lijadora" in name: return 185000
        return 250000
    
    # Categoría: Construcción
    if category == "Construcción":
        if "cemento" in name: return 32000
        if "yeso" in name: return 28000
        if "cal" in name: return 18000
        if "malla" in name: return 145000
        if "varilla" in name: return 22000
        if "pegazulejo" in name: return 35000
        return 40000
    
    # Categoría: Pinturas
    if category == "Pinturas":
        if "vinílica" in name or "impermeabilizante" in name: return 165000
        if "esmalte" in name: return 45000
        if "thinner" in name: return 12000
        if "brocha" in name: return 8500
        if "rodillo" in name: return 18000
        return 25000
    
    # Categoría: Seguridad
    if category == "Seguridad":
        if "botas" in name: return 125000
        if "casco" in name: return 35000
        if "guantes" in name: return 18000
        if "lentes" in name: return 12000
        if "chaleco" in name: return 22000
        if "mascarilla" in name: return 45000
        return 30000
    
    # Categoría: Manuales
    if category == "Manuales":
        if "desarmador" in name: return 12000
        if "alicate" in name: return 25000
        if "llave" in name: return 38000
        if "juego" in name: return 65000
        return 15000
        
    # Categoría: Plomería
    if category == "Plomería":
        if "tubo" in name: return 25000
        if "codo" in name or "tee" in name: return 3500
        if "pegamento" in name: return 18000
        if "válvula" in name: return 42000
        if "cinta" in name: return 2500
        return 10000
        
    # Categoría: Electricidad
    if category == "Electricidad":
        if "cable" in name: return 4500 # Por metro
        if "cinta" in name: return 6500
        if "foco" in name: return 12000
        if "interruptor" in name or "contacto" in name: return 15000
        if "pastilla" in name: return 28000
        return 10000
        
    # Categoría: Tornillería
    if category == "Tornillería":
        if "clavo" in name: return 12000 # Por kilo o caja
        if "tornillo" in name: return 25000
        if "taquete" in name: return 8000
        return 5000
        
    return 10000

def update_all_prices():
    products = list(col_products.find({}))
    print(f"Encontrados {len(products)} productos para actualizar.")
    
    updates = 0
    for p in products:
        new_price = get_realistic_price(p["nombre"], p.get("categoria", "Otros"))
        col_products.update_one({"_id": p["_id"]}, {"$set": {"precio": new_price}})
        updates += 1
        
    print(f"¡Éxito! Se actualizaron {updates} productos con precios realistas.")

if __name__ == "__main__":
    update_all_prices()
