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
| POST | `/api/documents` | teacher/admin | Subir documento |
| GET | `/api/documents` | teacher/student/admin | Listar documentos accesibles |
| GET | `/api/documents/class/:classId` | teacher/student/admin | Documentos de una clase |
| GET | `/api/documents/:id/download` | teacher/student/admin | Descargar documento |
| DELETE | `/api/documents/:id` | teacher/admin | Eliminar documento |
| GET | `/api/conversations` | teacher/student/admin | Listar conversaciones |
| GET | `/api/conversations/:id/messages` | teacher/student/admin | Historial de mensajes |
| POST | `/api/conversations/:id/messages` | teacher/student | Enviar mensaje |
| PATCH | `/api/conversations/:id/read` | teacher/student/admin | Marcar como leída |

## Socket.IO — Mensajería en tiempo real

El servidor HTTP también expone Socket.IO en el mismo puerto (`PORT`).

### Conexión desde el frontend

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'TU_JWT',
  },
});
```

### Eventos cliente → servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `conversation:join` | `{ conversationId }` | Unirse a sala de conversación (con permisos) |
| `conversation:leave` | `{ conversationId }` | Salir de sala de conversación |
| `message:send` | `{ conversationId, content }` | Enviar mensaje en tiempo real |
| `conversation:read` | `{ conversationId }` | Marcar mensajes como leídos |

### Eventos servidor → cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `message:new` | `{ message }` | Nuevo mensaje en la conversación |
| `conversation:updated` | `{ conversation }` | Conversación actualizada (último mensaje, no leídos) |
| `message:error` | `{ message }` | Error de validación o permisos |

### Ejemplo frontend

```js
socket.on('message:new', ({ message }) => {
  console.log('Nuevo mensaje:', message);
});

socket.on('conversation:updated', ({ conversation }) => {
  console.log('Conversación actualizada:', conversation);
});

socket.emit('message:send', {
  conversationId: 'UUID_CONVERSACION',
  content: 'Hola',
});
```

Al conectar, el servidor une automáticamente al usuario a:

- `user:{userId}`
- `conversation:{conversationId}` de sus conversaciones

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

### 10. Subir documento (profesor)

```bash
curl.exe -X POST http://localhost:3001/api/documents ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" ^
  -F "title=Material clase 1" ^
  -F "description=PDF de vocabulario" ^
  -F "student_id=UUID_DEL_ALUMNO" ^
  -F "file=@C:\ruta\archivo.pdf"
```

También puedes asignar por clase con `class_id=UUID_DE_LA_CLASE` en lugar de `student_id`, o enviar ambos.

### 11. Listar documentos

```bash
curl.exe -X GET http://localhost:3001/api/documents ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 12. Listar documentos de una clase

```bash
curl.exe -X GET http://localhost:3001/api/documents/class/UUID_DE_LA_CLASE ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 13. Descargar documento

```bash
curl.exe -L -X GET http://localhost:3001/api/documents/UUID_DOCUMENTO/download ^
  -H "Authorization: Bearer TU_TOKEN" ^
  -o documento.pdf
```

### 14. Eliminar documento (profesor o admin)

```bash
curl.exe -X DELETE http://localhost:3001/api/documents/UUID_DOCUMENTO ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR"
```

### 15. Listar conversaciones

```bash
curl.exe -X GET http://localhost:3001/api/conversations ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 16. Ver mensajes de una conversación

```bash
curl.exe -X GET http://localhost:3001/api/conversations/UUID_CONVERSACION/messages ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 17. Enviar mensaje (REST)

```bash
curl.exe -X POST http://localhost:3001/api/conversations/UUID_CONVERSACION/messages ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer TU_TOKEN" ^
  -d "{\"content\":\"Hola, ¿cómo estás?\"}"
```

### 18. Marcar conversación como leída

```bash
curl.exe -X PATCH http://localhost:3001/api/conversations/UUID_CONVERSACION/read ^
  -H "Authorization: Bearer TU_TOKEN"
```

## Reglas de negocio

- Los alumnos **no** se registran solos; los crea el profesor.
- Cada alumno pertenece a un único profesor (`users.teacher_id`).
- Las clases las crea el profesor, no el alumno.
- Al crear un alumno se crea automáticamente una conversación profesor-alumno.
- Cada clase genera un `jitsi_room_name` único.
- Los usuarios inactivos (`is_active = false`) no pueden hacer login.
- Los documentos se guardan en `uploads/documents` dentro del backend.
- La descarga siempre pasa por `/api/documents/:id/download` con comprobación de permisos.
- Los alumnos no pueden subir ni borrar documentos.
- La mensajería usa REST para historial y Socket.IO para tiempo real.
- Los administradores pueden leer conversaciones y mensajes, pero no enviar mensajes.
