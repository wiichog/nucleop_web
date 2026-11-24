import { describe, expect, it } from "vitest";
import type { Role } from "../api/hooks";
import { inicioDe, perfilEnGym, rutaPermitida, veCuotas } from "./perfilPanel";

const rol = (role: string, gym_id: string | null = "A"): Role => ({
  role,
  gym_id,
  club_id: null,
  gym_name: null,
  club_name: null,
  can_program_wods: false,
});

describe("perfilEnGym", () => {
  it("el superusuario es admin en cualquier gym", () => {
    expect(perfilEnGym([], true, "X")).toBe("admin");
  });

  it("es POR gimnasio: admin de A y recepción de B", () => {
    const roles = [rol("gym_admin", "A"), rol("front_desk", "B")];
    expect(perfilEnGym(roles, false, "A")).toBe("admin");
    expect(perfilEnGym(roles, false, "B")).toBe("recepcion");
  });

  it("con varios roles en el mismo gym manda el más amplio", () => {
    expect(perfilEnGym([rol("coach"), rol("front_desk")], false, "A")).toBe("recepcion");
    expect(perfilEnGym([rol("front_desk"), rol("gym_admin")], false, "A")).toBe("admin");
  });

  it("sin rol en ese gym (admin de club, trainer) no se restringe", () => {
    expect(perfilEnGym([rol("club_admin", null)], false, "A")).toBe("otro");
    expect(perfilEnGym([rol("trainer")], false, "A")).toBe("otro");
  });
});

describe("rutaPermitida", () => {
  it("la recepción entra al mostrador y no al resto del panel", () => {
    for (const r of ["/panel/recepcion", "/panel/atletas", "/panel/solicitudes", "/panel/pagos", "/panel/pos"]) {
      expect(rutaPermitida("recepcion", r)).toBe(true);
    }
    for (const r of ["/panel", "/panel/gastos", "/panel/coaches-pagos", "/panel/inventario", "/panel/reportes", "/panel/planes"]) {
      expect(rutaPermitida("recepcion", r)).toBe(false);
    }
  });

  it("el coach solo ve sus clases (y su perfil)", () => {
    expect(rutaPermitida("coach", "/panel/clases")).toBe(true);
    expect(rutaPermitida("coach", "/panel/perfil")).toBe(true);
    expect(rutaPermitida("coach", "/panel")).toBe(false);
    expect(rutaPermitida("coach", "/panel/pagos")).toBe(false);
  });

  it("no confunde prefijos: /panel/posx no es /panel/pos", () => {
    expect(rutaPermitida("recepcion", "/panel/posx")).toBe(false);
    expect(rutaPermitida("recepcion", "/panel/pos/")).toBe(true);
  });

  it("el admin y «otro» no se restringen", () => {
    expect(rutaPermitida("admin", "/panel/gastos")).toBe(true);
    expect(rutaPermitida("otro", "/panel/club")).toBe(true);
  });

  it("cada perfil restringido aterriza en una ruta que sí puede abrir", () => {
    expect(inicioDe("recepcion")).toBe("/panel/recepcion");
    expect(inicioDe("coach")).toBe("/panel/clases");
    expect(rutaPermitida("recepcion", inicioDe("recepcion"))).toBe(true);
    expect(rutaPermitida("coach", inicioDe("coach"))).toBe(true);
  });
});

describe("veCuotas", () => {
  it("el admin y la recepción ven la cuota; el coach no", () => {
    expect(veCuotas("admin")).toBe(true);
    expect(veCuotas("recepcion")).toBe(true);
    expect(veCuotas("coach")).toBe(false);
  });
});
