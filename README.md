# Tropicalización de la Tecnología - UCR

Este repositorio contiene una aplicación hecha con Firebase para el frontend y python para el backend del simulador

## Como ejecutar el proyecto

## Cómo ejecutar el proyecto

### Importante: ejecutar ambos servidores

Este proyecto requiere ejecutar **DOS servidores** al mismo tiempo:

1. Backend (FastAPI) - Puerto 8000  
2. Frontend (Next.js) - Puerto 9002  

Se necesitan dos terminales separadas, una para cada servidor.

> [!NOTE]
> Esto es temporal. Cuando el simulador esté listo, todo se integrará como un único proyecto que se ejecute al mismo tiempo.

---

### Configuración y ejecución del Backend

#### Configuración inicial (primera vez)

1. Ir al directorio `backend`:
````bash
cd backend
````

2. Crear un entorno virtual de Python:
```bash
python3 -m venv venv
```

3. Activar el entorno virtual:
```bash
source venv/bin/activate
```

4. Instalar las dependencias:
```bash
pip install -r requirements.txt
```

#### Ejecutar el servidor Backend

1. Activar el entorno virtual (si no está activado):
```bash
cd backend
source venv/bin/activate
```

En caso de tener problemas con la activación de numpy/pandas, también se puede usar:
```bash
pip install --upgrade --force-reinstall numpy pandas
```

2. Iniciar el servidor FastAPI:
```bash
python -m uvicorn main:app --reload
```

El servidor quedará en: http://127.0.0.1:8000

#### Como probar el Backend
**Opción 1: documentación interactiva de la API**

- Abrir en el navegador: http://127.0.0.1:8000/docs
Incluye Swagger UI para probar endpoints de forma interactiva.

**Opción 2: probar el endpoint raíz**

- Abrir: http://127.0.0.1:8000/
O usar: curl http://127.0.0.1:8000/

**Opción 3: probar endpoints con curl**
```bash
# Probar endpoint raíz
curl http://127.0.0.1:8000/

# Subir un archivo CSV
curl -X POST http://127.0.0.1:8000/api/v1/upload \
  -F "file=@backend/tests/test_power_data.csv"

# Subir múltiples CSV
curl -X POST http://127.0.0.1:8000/api/v1/upload-multiple \
  -F "files=@backend/tests/test_power_data.csv" \
  -F "files=@backend/tests/test_power_profile.csv" \
  -F "files=@backend/tests/test.csv"

# Ejecutar simulación (ajustar payload según necesidad)
curl -X POST http://127.0.0.1:8000/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"your": "data"}'
```

Endpoints disponibles
- ``GET /`` - Endpoint raíz, confirma que la API está activa
- ``POST /api/v1/upload`` - Subir un archivo CSV con perfil de potencia
- ``POST /api/v1/upload-multiple`` - Subir múltiples CSV con diferentes perfiles de potencia (p. ej. PV, viento, demanda)
- ``POST /api/v1/simulate`` - Ejecutar simulación de microred

**Uso de carga múltiple de CSV**

El endpoint **/api/v1/upload-multiple** permite subir varios archivos CSV en una sola solicitud. Esto es útil cuando hay archivos separados para distintos perfiles (por ejemplo, generación solar, generación eólica y demanda).

Formato esperado para cada CSV:

Ejemplo de respuesta:
```
timestamp,power
2023-10-09 00:00:00,100.5
2023-10-09 00:15:00,95.2
...
```


La respuesta incluye:

```
{
  "time": ["2023-10-09 00:00:00", "2023-10-09 00:15:00", "..."],
  "profiles": {
    "test_power_data": [100.5, 95.2, "..."],
    "test_power_profile": [50.3, 48.1, "..."],
    "test": [25.7, 30.2, "..."]
  }
}
```

- ``time``: arreglo de timestamps (tomado del primer archivo)
- ``profiles``: diccionario que mapea cada nombre de archivo (sin .csv) con su arreglo de potencias

**Nota**: Todos los CSV deben tener los mismos timestamps. El sistema usa el primer archivo como referencia temporal.

### Configuración y ejecución del Frontend

**Configuración inicial (primera vez)**
1. Instalar dependencias de Node.js:
```bash
cd frontend
npm install
```

2. Crear archivo de entorno (si hace falta):


Luego configurar las variables de entorno.
```bash
npm run dev
```

Ejecutar el Frontend
El frontend quedará en: http://localhost:9002

Uso del simulador
1. Ir a: http://localhost:9002/upload-profiles
2. Seleccionar o arrastrar múltiples archivos CSV
3. Para cada archivo, indicar qué representa:
   - Demanda energética
   - Generación solar (PV)
   - Generación eólica
   - Generación hidroeléctrica
Otro (con etiqueta personalizada)
4. Hacer clic en Upload files
5. Ver los resultados con todos los perfiles cargados

