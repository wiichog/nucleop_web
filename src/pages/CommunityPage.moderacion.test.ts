import { describe, expect, it } from "vitest";
import pagina from "./CommunityPage.tsx?raw";
import moderacion from "./comunidad/ModeracionTab.tsx?raw";
import atletaDelMes from "./comunidad/AtletaDelMesTab.tsx?raw";
import { MANUALES } from "../lib/manuales";

// El backend BORRA el comentario al eliminarlo (`comment.delete()`): no queda nada que
// apelar ni que devolver al feed. Los textos no pueden prometer lo contrario.
describe("Feed: eliminar un comentario no se puede apelar", () => {
  it("la ventana «Eliminar comentario» no promete una revisión", () => {
    const rama = moderacion.match(/`El comentario de \$\{rechazo\?\.quien\}[^`]*`/)?.[0] ?? "";
    expect(rama).toContain("para siempre");
    expect(rama).toContain("ya no podrá apelar");
    expect(rama).not.toContain("revises de nuevo");
  });

  it("el aviso al eliminar no dice que el autor puede debatirlo", () => {
    expect(moderacion).not.toContain("Comentario eliminado. El autor recibe el motivo y puede debatirlo.");
  });

  it("el manual del feed dice que el comentario eliminado no se apela", () => {
    const texto = JSON.stringify(Object.values(MANUALES));
    expect(texto).toContain("un comentario que eliminaste ya no existe y no se puede apelar");
  });
});

// Publicar anuncios y elegir atleta del mes son `required_roles=["gym_admin"]` en el
// backend: al coach le responden 403. La pantalla no se los ofrece.
describe("Feed: el coach no ve lo que el servidor le rechaza", () => {
  it("la pestaña Anuncios y su panel van tras esAdmin", () => {
    expect(pagina).toContain("const esAdmin = administraGym(roles, isSuperuser, gymId);");
    expect(pagina).toContain('{esAdmin && <Tabs.Tab value="anuncios">Anuncios</Tabs.Tab>}');
    const panel = pagina.indexOf('<Tabs.Panel value="anuncios">');
    expect(panel).toBeGreaterThan(0);
    expect(pagina.lastIndexOf("{esAdmin && (", panel)).toBeGreaterThan(0);
    // Un enlace viejo con ?tab=anuncios no deja al coach en una pestaña vacía.
    expect(pagina).toContain('!esAdmin && pedida === "anuncios" ? "moderar" : pedida');
  });

  it("elegir atleta del mes va tras esAdmin; el histórico no", () => {
    expect(atletaDelMes).toContain("{esAdmin && <Vigentes");
    expect(atletaDelMes).toContain("<Historico gymId={gymId}");
    expect(atletaDelMes.indexOf("<Historico gymId={gymId}")).toBeGreaterThan(
      atletaDelMes.indexOf("{esAdmin && <Vigentes"),
    );
    expect(atletaDelMes).not.toMatch(/\{esAdmin && <Historico/);
  });

  it("el manual le explica al coach por qué no ve esas partes", () => {
    const texto = JSON.stringify(Object.values(MANUALES));
    expect(texto).toContain("Soy coach y no veo la pestaña «Anuncios» ni puedo elegir al atleta del mes.");
  });
});

// Un servicio sin clases en el rango cargado no salía en «Segmento» ni en el atleta del
// mes: las opciones se armaban con las clases. Ahora salen del catálogo de servicios.
describe("Feed: segmento y atleta del mes salen del catálogo de servicios", () => {
  it("usa useServiceTypes y no las clases cargadas", () => {
    expect(pagina).toContain('useServiceTypes(esAdmin ? gymId : "")');
    expect(pagina).not.toContain("useGymClasses");
    expect(pagina).toContain("s.is_active && s.name && set.add(s.name)");
  });

  it("el manual ya no dice que las clases salen del calendario", () => {
    const texto = JSON.stringify(Object.values(MANUALES));
    expect(texto).not.toContain("Las clases de la lista son las que tiene tu calendario.");
    expect(texto).toContain("aunque todavía no tengan clases en el calendario");
  });
});
