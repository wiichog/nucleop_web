# Deploy en AWS Amplify (panel web admin)

## Repositorio

Conectar el repo `nucleo-web-admin`, rama `main`.

## Build

Amplify detecta `amplify.yml` en la raíz:

- `npm ci`
- `npm run build`
- Artefactos en `dist/`

## Variables de entorno (obligatorias)

En **Amplify → App settings → Environment variables**:

| Variable | Ejemplo |
|----------|---------|
| `VITE_API_BASE_URL` | `https://api.nucleo.fit/api/v1` |

Sin esta variable, el build usa `localhost` del `.env.example`.

## CORS en la API

En Secrets Manager / `CORS_ALLOWED_ORIGINS` incluir el dominio de Amplify, por ejemplo:

```
https://admin.nucleo.fit
https://main.d1234abcd.amplifyapp.com
```

## Dominio

1. Amplify → **Domain management** → asignar `admin.nucleo.fit` (CNAME al hosting de Amplify).
2. Certificado SSL lo gestiona Amplify.

## Login

El panel usa **correo + contraseña** (`POST /api/v1/auth/login` con `{ "email", "password" }`).

Crear un usuario staff en Django admin o con `seed_demo` y asignar rol `gym_admin` al gym.

## Orden de despliegue

1. API en EC2 con HTTPS (`api.nucleo.fit`).
2. Migrar API (`python manage.py migrate`) tras cambios de identidad.
3. Amplify con `VITE_API_BASE_URL` apuntando a la API.
4. Probar login y una pantalla con datos (atletas / solicitudes).
