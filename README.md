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
| GET | `/api/notifications` | teacher/student/admin | Listar notificaciones |
| GET | `/api/notifications/unread-count` | teacher/student/admin | Contador de no leídas |
| PATCH | `/api/notifications/:id/read` | teacher/student/admin | Marcar notificación como leída |
| PATCH | `/api/notifications/read-all` | teacher/student/admin | Marcar todas como leídas |
| DELETE | `/api/notifications/:id` | teacher/student/admin | Eliminar notificación |
| POST | `/api/assignments` | teacher/admin | Crear tarea |
| GET | `/api/assignments` | teacher/student/admin | Listar tareas |
| GET | `/api/assignments/:id` | teacher/student/admin | Detalle de tarea |
| PATCH | `/api/assignments/:id` | teacher/admin | Actualizar tarea |
| POST | `/api/assignments/:id/submit` | student | Entregar tarea |
| PATCH | `/api/assignments/:id/review` | teacher/admin | Revisar tarea |
| DELETE | `/api/assignments/:id` | teacher/admin | Eliminar tarea |
| GET | `/api/assignments/:id/submission-file` | teacher/student/admin | Descargar entrega del alumno |
| GET | `/api/assignments/:id/attachment-file` | teacher/student/admin | Descargar material adjunto del profesor |

## Migración SQL — tabla `assignments`

Si tu tabla viene del esquema antiguo (`student_response`, sin archivos de entrega), ejecuta en PostgreSQL:

```sql
-- Renombrar columna antigua si existe
ALTER TABLE assignments
  RENAME COLUMN student_response TO submission_text;

-- Permitir crear tarea solo con class_id (el alumno se resuelve desde la clase)
ALTER TABLE assignments
  ALTER COLUMN student_id DROP NOT NULL;

-- Ampliar título si hace falta
ALTER TABLE assignments
  ALTER COLUMN title TYPE VARCHAR(255);

-- Columnas nuevas para entregas y revisión
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS submission_file_path TEXT,
  ADD COLUMN IF NOT EXISTS submission_original_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Archivo adjunto del profesor (material de la tarea)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachment_file_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_original_filename VARCHAR(255);

-- Asegurar estados válidos
ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_status_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_status_check
  CHECK (status IN ('pending', 'submitted', 'reviewed', 'cancelled'));
```

Si la tabla no existe aún, créala completa:

```sql
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'reviewed', 'cancelled')),
    submission_text TEXT,
    submission_file_path TEXT,
    submission_original_filename VARCHAR(255),
    attachment_file_path TEXT,
    attachment_original_filename VARCHAR(255),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    teacher_feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (student_id IS NOT NULL OR class_id IS NOT NULL)
);
```

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
| `notification:new` | `{ notification }` | Nueva notificación para el usuario |
| `notifications:updated` | `{ unread_count }` | Contador actualizado de no leídas |

### Eventos de notificaciones (servidor → cliente)

```js
socket.on('notification:new', ({ notification }) => {
  console.log('Nueva notificación:', notification);
});

socket.on('notifications:updated', ({ unread_count }) => {
  console.log('No leídas:', unread_count);
});
```

Ejemplo de payload `notification:new`:

```json
{
  "notification": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Nuevo mensaje",
    "message": "Nuevo mensaje de Ana Profesora",
    "type": "message",
    "related_entity_type": "conversation",
    "related_entity_id": "uuid",
    "is_read": false,
    "created_at": "2026-06-11T..."
  }
}
```

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

### 19. Listar notificaciones

```bash
curl.exe -X GET http://localhost:3001/api/notifications ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 20. Contador de notificaciones no leídas

```bash
curl.exe -X GET http://localhost:3001/api/notifications/unread-count ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 21. Marcar notificación como leída

```bash
curl.exe -X PATCH http://localhost:3001/api/notifications/UUID_NOTIFICACION/read ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 22. Marcar todas las notificaciones como leídas

```bash
curl.exe -X PATCH http://localhost:3001/api/notifications/read-all ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 23. Eliminar notificación

```bash
curl.exe -X DELETE http://localhost:3001/api/notifications/UUID_NOTIFICACION ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 24. Crear tarea (profesor)

```bash
curl.exe -X POST http://localhost:3001/api/assignments ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" ^
  -d "{\"title\":\"Ejercicios de vocabulario\",\"description\":\"Completa la hoja 3\",\"student_id\":\"UUID_DEL_ALUMNO\",\"due_date\":\"2026-07-01T23:59:00.000Z\"}"
```

También puedes usar `class_id` en lugar de `student_id`.

### 24b. Crear tarea con archivo adjunto (profesor)

```bash
curl.exe -X POST http://localhost:3001/api/assignments ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" ^
  -F "title=Ejercicios tema 5" ^
  -F "description=Completa los ejercicios del PDF" ^
  -F "student_id=UUID_ALUMNO" ^
  -F "due_date=2026-07-01T23:59:00.000Z" ^
  -F "attachment=@C:\ruta\tema5.pdf"
```

Campo del adjunto del profesor: `attachment`. Campo de entrega del alumno: `file`.

### 25. Listar tareas

```bash
curl.exe -X GET http://localhost:3001/api/assignments ^
  -H "Authorization: Bearer TU_TOKEN"
```

### 26. Entregar tarea con texto (alumno)

```bash
curl.exe -X POST http://localhost:3001/api/assignments/UUID_TAREA/submit ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer TU_TOKEN_ALUMNO" ^
  -d "{\"submission_text\":\"Aquí está mi respuesta\"}"
```

### 27. Entregar tarea con archivo (alumno)

```bash
curl.exe -X POST http://localhost:3001/api/assignments/UUID_TAREA/submit ^
  -H "Authorization: Bearer TU_TOKEN_ALUMNO" ^
  -F "submission_text=Adjunto el ejercicio resuelto" ^
  -F "file=@C:\ruta\entrega.pdf"
```

### 28. Revisar tarea (profesor)

```bash
curl.exe -X PATCH http://localhost:3001/api/assignments/UUID_TAREA/review ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR" ^
  -d "{\"teacher_feedback\":\"Muy bien, solo revisa la sección 2\"}"
```

### 29. Descargar archivo de entrega del alumno

```bash
curl.exe -L -X GET http://localhost:3001/api/assignments/UUID_TAREA/submission-file ^
  -H "Authorization: Bearer TU_TOKEN" ^
  -o entrega.pdf
```

### 29b. Descargar material adjunto del profesor

```bash
curl.exe -L -X GET http://localhost:3001/api/assignments/UUID_TAREA/attachment-file ^
  -H "Authorization: Bearer TU_TOKEN" ^
  -o material.pdf
```

### 30. Eliminar tarea (profesor)

```bash
curl.exe -X DELETE http://localhost:3001/api/assignments/UUID_TAREA ^
  -H "Authorization: Bearer TU_TOKEN_PROFESOR"
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
- Las notificaciones se guardan en PostgreSQL y se emiten en tiempo real por Socket.IO.
- Se generan automáticamente al recibir mensajes, subir documentos, crear clases o cancelar clases.
- Cada usuario solo puede ver y gestionar sus propias notificaciones.
- Las tareas las crea el profesor para sus alumnos o clases.
- El alumno entrega con texto y/o archivo; las entregas se guardan en `uploads/assignments`.
- El profesor puede adjuntar material opcional al crear o editar tarea; se guarda en `uploads/assignments/attachments`.
- `attachment_file_path` = material del profesor. `submission_file_path` = entrega del alumno.
- Al crear, entregar o revisar una tarea se genera notificación automática por Socket.IO.
- Estados de tarea: `pending`, `submitted`, `reviewed`, `cancelled`.
