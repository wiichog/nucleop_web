/**
 * Copiar al portapapeles con respaldo.
 *
 * La Clipboard API se niega en varias situaciones normales (pestaña sin foco, permiso
 * denegado, contexto no seguro) y ahí el `textarea` + `execCommand` de toda la vida sí
 * funciona. Importa porque en el alta lo que se copia es irrepetible: el enlace privado
 * cuando el correo no salió, y la contraseña temporal que solo se muestra una vez.
 *
 * Devuelve si se copió: quien llama tiene que avisar cuando NO, o la persona se va
 * creyendo que ya lo tiene.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Cae al respaldo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand("copy");
    document.body.removeChild(area);
    return copiado;
  } catch {
    return false;
  }
}
