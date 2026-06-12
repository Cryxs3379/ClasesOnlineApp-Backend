# Clases Online — Backend

Backend REST para plataforma de clases online con Node.js, Express y PostgreSQL.

## Arranque

```bash
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL

npm install
npm run dev   # desarrollo con nodemon
npm start     # producción
```

## Arquitectura

```
Routes → Controllers → Services → Repositories → PostgreSQL
```

## Endpoints principales

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/auth/register` | Público | Registro de profesor o admin |
| POST | `/api/auth/login` | Público | Login (devuelve JWT) |
| GET | `/api/auth/me` | Autenticado | Usuario actual |
| POST | `/api/students` | teacher | Crear alumno |
| GET | `/api/students` | teacher | Listar mis alumnos |
| GET | `/api/students/:id` | teacher | Detalle de alumno |
| PATCH | `/api/students/:id/status` | teacher | Activar/desactivar alumno |
| POST | `/api/teachers/profile` | teacher | Crear/actualizar perfil |
| GET | `/api/teachers` | Público | Listar profesores |
| POST | `/api/classes` | teacher | Crear clase para un alumno |
| GET | `/api/classes/my-classes` | teacher/student/admin | Mis clases |
| GET | `/api/classes/:id` | Autenticado | Detalle de clase |
| PATCH | `/api/classes/:id/status` | teacher | Cambiar estado de clase |
| GET | `/api/health/db` | Público | Comprobar conexión PostgreSQL |

## Pruebas con curl

En Windows PowerShell usa `curl.exe` en lugar de `curl`.

### 1. Registrar profesor

```bash
curl.exe -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ana Profesora\",\"email\":\"ana@email.com\",\"password\":\"123456\",\"role\":\"teacher\"}"
```

Guarda el `token` de la respuesta.

### 2. Login profesor

```bash
curl.exe -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ana@email.com\",\"password\":\"123456\"}"
```

### 3. Crear alumno (requiere token de profesor)

```bash
curl.exe -X POST http://localhost:3001/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" \
  -d "{\"name\":\"Pedro Alumno\",\"email\":\"pedro@email.com\",\"password\":\"123456\"}"
```

Guarda el `id` (UUID) del alumno.

### 4. Listar alumnos del profesor

```bash
curl.exe -X GET http://localhost:3001/api/students \
  -H "Authorization: Bearer TU_TOKEN_PROFESOR"
```

### 5. Crear clase para un alumno

```bash
curl.exe -X POST http://localhost:3001/api/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" \
  -d "{\"student_id\":\"UUID_DEL_ALUMNO\",\"title\":\"Clase de matemáticas\",\"description\":\"Repaso de ecuaciones\",\"start_time\":\"2026-06-20T17:00:00.000Z\",\"end_time\":\"2026-06-20T18:00:00.000Z\"}"
```

### 6. Listar mis clases (profesor o alumno)

```bash
curl.exe -X GET http://localhost:3001/api/classes/my-classes \
  -H "Authorization: Bearer TU_TOKEN"
```

### 7. Login alumno y ver sus clases

```bash
curl.exe -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"pedro@email.com\",\"password\":\"123456\"}"

curl.exe -X GET http://localhost:3001/api/classes/my-classes \
  -H "Authorization: Bearer TU_TOKEN_ALUMNO"
```

### 8. Usuario autenticado

```bash
curl.exe -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN"
```

### 9. Comprobar base de datos

```bash
curl.exe -X GET http://localhost:3001/api/health/db
```

## Reglas de negocio

- Los alumnos **no** se registran solos; los crea el profesor.
- Cada alumno pertenece a un único profesor (`users.teacher_id`).
- Las clases las crea el profesor, no el alumno.
- Al crear un alumno se crea automáticamente una conversación profesor-alumno.
- Cada clase genera un `jitsi_room_name` único.
- Los usuarios inactivos (`is_active = false`) no pueden hacer login.
