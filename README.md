SISTEMINV - SISTEMA DE GESTION DE INVENTARIO PARA FERRETERIA

EL PROBLEMA (CONTEXTO)
El cliente cuenta con un modelo de negocio de ferretería en expansión y carece de un sistema centralizado para el control de su inventario. El registro manual o mediante hojas de cálculo produce descuadres en el stock, retrasos para consultar disponibilidad de productos y dificultad operativa al momento de registrar entradas (compras a proveedores) o consultas ágiles en el mostrador. 

Este MVP (Software Mínimo Viable) resuelve el problema central: brindar una plataforma web rápida, unificada y profesional que permite registrar nuevos productos en el catálogo, visualizar el stock en tiempo real y registrar rápidamente la entrada de nuevas unidades al almacén de forma robusta e integrada bajo el concepto "Single Page Application" (SPA) con un diseño corporativo moderno.

--------------------------------------------------

TECNOLOGIAS UTILIZADAS
- Backend: Python, FastAPI, Uvicorn y Pydantic (Simulación de BD persistente en database.json).
- Frontend: React, Vite y CSS (Desarrollo estructurado por componentes modulares).

--------------------------------------------------

INSTALACION Y CONFIGURACION

1. BACKEND (FastAPI - Consola 1)
Requiere tener instalado Python 3 y pip. Funciona en Windows, Mac y Linux.

- Abre tu terminal y ubícate en la carpeta del proyecto:
  cd \ruta\hacia\backend (En Windows)
  cd /ruta/hacia/backend (En Mac/Linux)

- Crea el entorno virtual:
  python -m venv venv

- Activa el entorno virtual según tu sistema operativo:
pip install fastapi "uvicorn[standard]" pydantic
uvicorn main:app --reload
Windows (PowerShell):
    .\venv\Scripts\Activate.ps1
  En Windows (CMD clásico):
    .\venv\Scripts\activate.bat
  En Linux/Mac (Bash o Fish):
    source venv/bin/activate (o activate.fish)

- Instala las dependencias necesarias:
  pip install fastapi "uvicorn[standard]" pydantic

- Ejecuta el servidor del Backend:
  En Windows:
    .\venv\Scripts\uvicorn main:app --reload
  En Linux/Mac:
    ./venv/bin/uvicorn main:app --reload

(El servidor quedará corriendo en http://127.0.0.1:8000 y creará su archivo database.json de forma autónoma).


2. FRONTEND (React + Vite - Consola 2)
Requiere tener instalado Node.js y npm.

- Abre otra pestaña o ventana de terminal y ubícate en la carpeta del frontend:
  cd /ruta/hacia/frontend

- Instala los paquetes y librerias:
  npm install

- Ejecuta el entorno visual:
  npm run dev

(El servidor Vite quedará corriendo velozmente y podrás administrar el inventario abriendo tu navegador web en: http://localhost:5173).
