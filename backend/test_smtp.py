import sys
import os

# Agregamos dir actual a sys.path para importar email_sender
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from email_sender import alert_new_product

print("Ejecutando prueba SMTP...")
alert_new_product("Martillo de Prueba", "SKU-9999", 50.0, "jbrayner")
print("Prueba finalizada.")
