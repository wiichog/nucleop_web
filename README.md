# nucleo-web-admin — Panel administrativo de Nucleo

Panel de **escritorio** para roles internos: `gym_admin`, `coach`, `trainer`,
`club_admin` y `superadmin`. Consume `nucleo-api`. La pantalla insignia es
**retención y morosidad** (gancho de adopción del producto).

Repositorio: https://github.com/wiichog/nucleop_web

## Stack

- React 18 + TypeScript + Vite
- React Query (estado de servidor), Axios con JWT (access + refresh rotatorio)
- Deploy: AWS Amplify (`amplify.yml`)

## Puesta en marcha

```bash
npm install
copy .env.example .env     # VITE_API_BASE_URL apunta a la API
npm run dev                # http://localhost:5173
```

Con la API corriendo y `seed_demo` ejecutado, inicia sesión con:
`+50250000000` / `nucleo123`.

## Tipos desde el contrato OpenAPI

```bash
npm run gen:api    # genera src/api/schema.d.ts desde /api/schema/
```

No inventar formas de datos: derivarlas del contrato.

## Estructura

- `src/api/` — cliente HTTP centralizado + hooks de React Query.
- `src/lib/` — auth (contexto + roles/ámbito), tokens de marca (`theme.css`).
- `src/pages/` — Login/recuperación, Dashboard, Atletas, Pagos, Planes,
  Solicitudes/Invitaciones, Clases, Auditoría y Plataforma.
- `src/components/` — layout y componentes compartidos.

## Aislamiento por gimnasio (CRÍTICO)

La UI solo solicita y muestra datos del/los gym(s) del rol. La autoridad de
permisos y visibilidad por relación la impone la API; ocultar un botón no es seguridad.

## Flujos Operativos Incluidos

- Bandeja para aprobar, rechazar y ofrecer prueba en solicitudes de unión.
- Invitación de atletas por teléfono con vinculación de identidad existente.
- Asignación de plan y cuota personalizada por relación atleta-gym.
- Registro de transferencia con comprobante adjunto.
- Registro auditado de reembolsos administrativos parciales.
- Selector de gimnasio para usuarios con más de un ámbito.
- Ficha relacional segura con pagos y asistencia del gym actual.
- Calendario, check-in desde recepción y bitácora exportable en CSV.
- Exportación CSV de atletas, pagos y retención/morosidad.
- Panel local de plataforma para que el superadmin liste, cree y configure plan SaaS, comisión y suscripción mensual de gimnasios.
