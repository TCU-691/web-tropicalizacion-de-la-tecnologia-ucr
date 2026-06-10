# Tropicalización de la Tecnología - UCR

Este repositorio contiene una aplicación hecha con Firebase para el frontend y Python para el backend del simulador.

> [!NOTE]
> El simulador está en desarrollo. Cuando esté listo, backend y frontend se integrarán en un único servidor.

## Índice

- [Inicio rápido](#inicio-rápido)
- [Configuración inicial](#configuración-inicial)
  - [Requisitos](#requisitos)
  - [Instalar dependencias](#instalar-dependencias)
  - [Configurar entorno](#configurar-entorno)
  - [Autenticar Firebase CLI](#autenticar-firebase-cli)
- [Cómo ejecutar](#cómo-ejecutar)
  - [1. Firebase Emulators](#1-firebase-emulators)
  - [2. Backend](#2-backend)
  - [3. Frontend](#3-frontend)
- [Referencia técnica](#referencia-técnica)
  - [API del backend](#api-del-backend)
  - [Variables de entorno](#variables-de-entorno)
  - [Sistema de notificaciones Teams](#sistema-de-notificaciones-teams)
  - [Uso del simulador](#uso-del-simulador)

---

## Inicio rápido

Para colaboradores que ya tienen todo configurado. Se necesitan **tres terminales**.

```bash
# Terminal 1 — Firebase Emulators
firebase emulators:start --import=.firebase/emulator-data --export-on-exit --project demo-tropicalizacion
```

```bash
# Terminal 2 — Backend (FastAPI)
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
```

```bash
# Terminal 3 — Frontend (Next.js)
npm run dev
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:9002 |
| Backend | http://127.0.0.1:8000 |
| Emulator UI | http://localhost:4000 |

---

## Configuración inicial

Pasos para configurar el proyecto por primera vez.

### Requisitos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 20+ | |
| Java JDK | 21 | Requerido por Firestore Emulator |
| Python | 3.x | Para el backend FastAPI |
| Firebase CLI | última | Instalar con `npm install -g firebase-tools` |

En Ubuntu/Debian:

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install -y openjdk-21-jdk
```

### Instalar dependencias

**Frontend (Node.js) — desde la raíz del proyecto:**

```bash
npm install
```

**Backend (Python) — desde el directorio `backend/`:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Si hay problemas con numpy/pandas: `pip install --upgrade --force-reinstall numpy pandas`

### Configurar entorno

Crear un archivo `.env.development` en la raíz del proyecto:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDemo...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-tropicalizacion.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-tropicalizacion
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-tropicalizacion.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123xyz
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Notificaciones Teams (opcional en desarrollo; dejar en blanco para deshabilitar)
TEAMS_WEBHOOK_URL=
CRON_SECRET=anythingyouwant
NEXT_PUBLIC_SITE_URL=http://localhost:9002
SITE_URL=http://localhost:9002
```

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` es obligatorio en desarrollo.
- `TEAMS_WEBHOOK_URL` puede dejarse vacío; `postToTeams` se deshabilita automáticamente si no está definida.
- Reiniciar el servidor Next.js si se cambia `.env.development`.

### Autenticar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

---

## Cómo ejecutar

El proyecto requiere **tres servidores** corriendo en paralelo. Abrir una terminal por servidor, en este orden.

### 1. Firebase Emulators

Iniciar **primero**, antes del backend y el frontend.

```bash
firebase emulators:start --import=.firebase/emulator-data --export-on-exit --project demo-tropicalizacion
```

Los emuladores se levantan en:

| Servicio | Puerto |
|----------|--------|
| Auth | 9099 |
| Firestore | 8080 |
| Storage | 9199 |
| Emulator UI | 4000 (por defecto) |

Los datos persisten entre reinicios en `.firebase/emulator-data/` (no está en control de versiones). Para limpiar todos los datos:

```bash
rm -rf .firebase/emulator-data
firebase emulators:start --project demo-tropicalizacion
```

### 2. Backend

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
```

Servidor disponible en: http://127.0.0.1:8000

### 3. Frontend

```bash
npm run dev
```

Servidor disponible en: http://localhost:9002

---

## Referencia técnica

### API del backend

**Documentación interactiva (Swagger UI):** http://127.0.0.1:8000/docs

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Confirma que la API está activa |
| `POST` | `/api/v1/upload` | Subir un archivo CSV con perfil de potencia |
| `POST` | `/api/v1/upload-multiple` | Subir múltiples CSV con diferentes perfiles |
| `POST` | `/api/v1/simulate` | Ejecutar simulación de microred |

#### Ejemplos con curl

```bash
# Endpoint raíz
curl http://127.0.0.1:8000/

# Subir un CSV
curl -X POST http://127.0.0.1:8000/api/v1/upload \
  -F "file=@backend/tests/test_power_data.csv"

# Subir múltiples CSV
curl -X POST http://127.0.0.1:8000/api/v1/upload-multiple \
  -F "files=@backend/tests/test_power_data.csv" \
  -F "files=@backend/tests/test_power_profile.csv" \
  -F "files=@backend/tests/test.csv"

# Ejecutar simulación
curl -X POST http://127.0.0.1:8000/api/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"your": "data"}'
```

#### Formato CSV esperado

```
timestamp,power
2023-10-09 00:00:00,100.5
2023-10-09 00:15:00,95.2
...
```

Respuesta de `/api/v1/upload-multiple`:

```json
{
  "time": ["2023-10-09 00:00:00", "2023-10-09 00:15:00", "..."],
  "profiles": {
    "test_power_data": [100.5, 95.2, "..."],
    "test_power_profile": [50.3, 48.1, "..."],
    "test": [25.7, 30.2, "..."]
  }
}
```

- `time`: timestamps del primer archivo
- `profiles`: potencias por archivo (clave = nombre del archivo sin `.csv`)
- Todos los CSV deben tener los mismos timestamps.

### Variables de entorno

El proyecto usa dos archivos:

| Archivo | Cuándo aplica |
|---------|--------------|
| `.env.development` | `npm run dev` (emuladores locales) |
| `.env.production` | Build de producción / Firebase App Hosting |

#### Firebase (expuestas al navegador)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key del proyecto Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Firebase Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de Firebase Messaging |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID de Firebase |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | ID de Google Analytics (opcional) |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | `true` para usar emuladores locales |

#### ImageKit (CDN de imágenes)

| Variable | Descripción |
|----------|-------------|
| `IMAGEKIT_PUBLIC_KEY` | Clave pública de ImageKit |
| `IMAGEKIT_PRIVATE_KEY` | Clave privada (**solo servidor, nunca exponer al cliente**) |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | URL base del endpoint de ImageKit |

#### Email

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend (**solo servidor**) |

#### Notificaciones Teams

| Variable | Dónde configurar | Descripción |
|----------|-----------------|-------------|
| `TEAMS_WEBHOOK_URL` | `.env.production` + Firebase App Hosting secrets | URL del Incoming Webhook. Si está vacía, las notificaciones se deshabilitan sin errores. |
| `CRON_SECRET` | `.env.production` + Firebase App Hosting secrets + GitHub Actions secrets | Token que autentica las llamadas del cron a `/api/send-reminders`. Generar con `openssl rand -hex 32`. |
| `NEXT_PUBLIC_SITE_URL` | `.env.production` | URL base del sitio (ej. `https://web-tropicalizacion.web.app`). |
| `SITE_URL` | GitHub Actions secrets | Misma URL que `NEXT_PUBLIC_SITE_URL`, usada por el workflow de GitHub Actions. |

### Sistema de notificaciones Teams

Cuando un profesor publica una gira, proyecto o artículo, se envía una tarjeta Adaptive Card al canal de Teams configurado. Además, un cron diario de GitHub Actions envía recordatorios 7 días antes de cada gira próxima.

#### Configurar el Incoming Webhook

1. Canal de Teams → `···` → **Connectors**
2. Buscar **Incoming Webhook** → **Agregar** → **Configurar**
3. Asignar un nombre (ej. "TCU-691 Actividades") → **Crear** → copiar la URL
4. Guardar la URL como `TEAMS_WEBHOOK_URL` en `.env.production` y en los secretos de Firebase App Hosting

#### Configurar secretos en GitHub Actions

En **Settings → Secrets and variables → Actions** del repositorio:

| Secreto | Valor |
|---------|-------|
| `SITE_URL` | URL de producción (ej. `https://web-tropicalizacion.web.app`) |
| `CRON_SECRET` | Mismo valor que `CRON_SECRET` en `.env.production` |

El workflow (`.github/workflows/send-reminders.yml`) se ejecuta diariamente a las **8:00 AM hora de Costa Rica** (14:00 UTC) y puede activarse manualmente desde la pestaña **Actions** del repositorio.

#### Campo `dateISO` en giras

Las giras tienen dos campos de fecha:

- **`date`** — texto libre para mostrar al usuario (ej. "25 de Octubre, 2024")
- **`dateISO`** — formato `YYYY-MM-DD` (ej. "2024-10-25"), usado exclusivamente por el cron

Las giras sin `dateISO` son ignoradas por el cron. Las nuevas giras requieren ambos campos en el formulario de creación.

#### Probar localmente

```bash
# Notificación de nueva gira
curl -X POST http://localhost:9002/api/notify \
  -H "Content-Type: application/json" \
  -d '{"type":"tour","id":"test","title":"Gira Test","description":"Una gira de prueba","slug":"gira-test","date":"25 Mayo 2026","location":"San José"}'

# Endpoint de recordatorios
curl -X POST http://localhost:9002/api/send-reminders \
  -H "Authorization: Bearer anythingyouwant"
```

### Uso del simulador

1. Ir a: http://localhost:9002/upload-profiles
2. Seleccionar o arrastrar múltiples archivos CSV
3. Para cada archivo, indicar qué representa:
   - Demanda energética
   - Generación solar (PV)
   - Generación eólica
   - Generación hidroeléctrica
   - Otro (con etiqueta personalizada)
4. Hacer clic en **Upload files**
5. Ver los resultados con todos los perfiles cargados
