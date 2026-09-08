import axios from "axios";

/**
 * Cliente para las rutas que se usan SIN sesión: la página del contrato de alta.
 *
 * No es un capricho de estilo. El `api` de `client.ts` mete `Authorization` en
 * toda petición y, ante un 401, dispara el refresh rotatorio. En `/contrato` no
 * hay sesión y nunca la va a haber: quien entra es un prospecto con un enlace.
 * Si se usara el cliente normal, un token viejo que quedara en el localStorage
 * de esa máquina viajaría a un endpoint público, y el 403 de un enlace vencido
 * se leería como «sesión muerta» y acabaría redirigiendo al login a alguien que
 * no tiene cuenta.
 */
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const publicApi = axios.create({ baseURL: BASE_URL });
