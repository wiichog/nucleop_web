import { describe, expect, it } from "vitest";
import pagina from "./CommunityPage.tsx?raw";
import { MANUALES } from "../lib/manuales";

// El backend BORRA el comentario al eliminarlo (`comment.delete()`): no queda nada que
// apelar ni que devolver al feed. Los textos no pueden prometer lo contrario.
describe("Feed: eliminar un comentario no se puede apelar", () => {
  it("la ventana «Eliminar comentario» no promete una revisión", () => {
    const rama = pagina.match(/`El comentario de \$\{rechazo\?\.quien\}[^`]*`/)?.[0] ?? "";
    expect(rama).toContain("para siempre");
    expect(rama).toContain("ya no podrá apelar");
    expect(rama).not.toContain("revises de nuevo");
  });

  it("el manual del feed dice que el comentario eliminado no se apela", () => {
    const texto = JSON.stringify(Object.values(MANUALES));
    expect(texto).toContain("un comentario que eliminaste ya no existe y no se puede apelar");
  });
});
