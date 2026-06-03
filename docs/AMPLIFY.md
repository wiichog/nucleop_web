# Deploy web admin en AWS Amplify — `app.nucleo.fit`

## Requisitos previos

- API en producción: `https://api.nucleo.fit` (health OK).
- Repo GitHub: `nucleop_web` (carpeta local `nucleo-web-admin`).
- Acceso DNS de `nucleo.fit` (Route 53 u otro) para crear un CNAME.
- Usuario `gym_admin` en la API (correo + contraseña).

---

## Parte A — Preparar la API (EC2 / Secrets Manager)

1. Edita el secreto `prod/nucleo` en **AWS Secrets Manager** (o el JSON que uses).
2. Actualiza **`CORS_ALLOWED_ORIGINS`** (lista separada por comas, sin espacios extra):

   ```
   https://app.nucleo.fit,https://www.app.nucleo.fit
   ```

   Si el navegador abre `https://www.app.nucleo.fit`, el Origin lleva `www` y la API debe permitirlo (en producción también se añade automáticamente el espejo `www` si ya tienes `https://app.nucleo.fit`).

   Si quieres probar antes del dominio final, añade también la URL temporal de Amplify:

   ```
   https://app.nucleo.fit,https://www.app.nucleo.fit,https://main.xxxxx.amplifyapp.com
   ```

3. Opcional pero recomendado — enlace de recuperación de contraseña del panel:

   ```
   PASSWORD_RESET_URL_TEMPLATE=https://app.nucleo.fit/password-reset?uid={uid}&token={token}
   ```

4. En el EC2:

   ```bash
   sudo systemctl restart nucleo-api
   ```

5. Comprueba CORS (desde tu PC):

   ```bash
   curl -sI -X OPTIONS https://api.nucleo.fit/api/v1/auth/login \
     -H "Origin: https://app.nucleo.fit" \
     -H "Access-Control-Request-Method: POST"
   ```

   Debe aparecer `access-control-allow-origin: https://app.nucleo.fit`.

---

## Parte B — Crear la app en Amplify

1. Entra a [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
2. **Create new app** → **Host web app**.
3. **GitHub** → autoriza AWS → elige el repo **`nucleop_web`** (o el nombre de tu fork).
4. Rama: **`main`**.
5. Amplify detecta **Amplify Gen 1** y el archivo `amplify.yml` en la raíz:
   - `npm ci`
   - `npm run build`
   - artefactos en `dist/`
6. En **Environment variables** (muy importante, se inyectan en el build):

   | Clave | Valor |
   |-------|--------|
   | `VITE_API_BASE_URL` | `https://api.nucleo.fit/api/v1` |

7. **Save and deploy** y espera el primer build (verde).

---

## Parte C — SPA (React Router)

El repo incluye `public/_redirects` para que rutas como `/login` o `/athletes` no den 404 al refrescar.

Si el build anterior no lo tenía, en Amplify → **Hosting** → **Rewrites and redirects** → **Manage redirects** y añade:

| Source | Target | Type |
|--------|--------|------|
| `</^[^.]+$|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json)$)([^.]+$)/>` | `/index.html` | **200 (Rewrite)** |

(O la regla simple de Amplify: source `/<*>` → `/index.html` → **404-200**.)

---

## Parte D — Dominio `app.nucleo.fit`

1. En la app Amplify → **Hosting** → **Custom domains** → **Add domain**.
2. Dominio: **`nucleo.fit`** → subdominio **`app`** → resultado **`app.nucleo.fit`**.
3. Amplify te muestra un **CNAME** (ej. `app.nucleo.fit` → `xxxx.cloudfront.net` o similar).
4. En tu DNS (Route 53 u otro registrador):
   - Tipo **CNAME**
   - Nombre: **`app`**
   - Valor: el que indica Amplify
   - TTL: 300 o por defecto
5. Espera validación SSL (Amplify + ACM), suele tardar **5–30 min** (a veces hasta 1 h).
6. Cuando esté **Available**, abre `https://app.nucleo.fit`.
7. (Recomendado) En **Custom domains**, si Amplify creó también `www.app.nucleo.fit`, configura **redirect** de `www` → `app` para un solo origen en el navegador. Si usas ambos, incluye ambos en CORS (ver arriba).

---

## Parte E — Probar el panel

1. `https://app.nucleo.fit/login` (evita `www` si aún no actualizaste CORS en el secreto)
2. Correo y contraseña de un usuario con rol **`gym_admin`** en un gym.
3. Debe cargar el dashboard; prueba **Solicitudes** o **Atletas**.
4. Si falla el login:
   - F12 → **Network** → petición a `api.nucleo.fit` (CORS, 401, 502).
   - Si el error CORS menciona `www.app.nucleo.fit`, añade ese Origin al secreto o entra sin `www`.
   - Confirma `VITE_API_BASE_URL` en Amplify (redeploy tras cambiarla).
   - Confirma `CORS_ALLOWED_ORIGINS` en el secreto y reinicia `nucleo-api`.

---

## Despliegues siguientes

Cada `git push` a `main` dispara un build en Amplify.

Para forzar redeploy: Amplify → la rama `main` → **Redeploy this version**.

---

## Checklist rápido

- [ ] `VITE_API_BASE_URL=https://api.nucleo.fit/api/v1` en Amplify
- [ ] `CORS_ALLOWED_ORIGINS` incluye `https://app.nucleo.fit` y `https://www.app.nucleo.fit` (o redirect www→app)
- [ ] CNAME `app` → Amplify
- [ ] SSL verde en Amplify
- [ ] Login con correo en `https://app.nucleo.fit`
- [ ] Rewrite SPA ( `_redirects` o regla en consola)
