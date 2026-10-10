import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Accordion, Alert, Badge, Drawer, Group, List, Stack, Text, TextInput, Title } from "@mantine/core";
import { Search } from "lucide-react";
import { manualDeRuta, type Manual } from "../lib/manuales";
import { SectionLabel } from "./ui";

/** Sin mayúsculas ni tildes: «publicacion» encuentra «Publicación». */
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Lo que queda del manual tras la búsqueda (todo, si no se busca nada). */
function filtrar(manual: Manual, q: string): Manual {
  if (!q) return manual;
  const hay = (...textos: (string | undefined)[]) => textos.some((t) => t && normalizar(t).includes(q));
  return {
    ...manual,
    tareas: manual.tareas.filter((t) => hay(t.titulo, t.nota, ...t.pasos)),
    conceptos: manual.conceptos?.filter((c) => hay(c.termino, c.detalle)),
    problemas: manual.problemas?.filter((p) => hay(p.sintoma, p.solucion)),
  };
}

/**
 * Manual de la pantalla actual, en un panel lateral. El contenido vive en
 * `lib/manuales/` y se elige por la ruta: el usuario no tiene que buscarlo.
 */
export function ManualDrawer({
  opened,
  onClose,
  pathname,
}: {
  opened: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const manual = manualDeRuta(pathname);
  const q = normalizar(busqueda.trim());
  const visible = useMemo(() => (manual ? filtrar(manual, q) : null), [manual, q]);
  const buscando = q.length > 0;
  const sinResultados =
    buscando && visible && !visible.tareas.length && !visible.conceptos?.length && !visible.problemas?.length;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={<SectionLabel mb={0}>Manual de esta pantalla</SectionLabel>}
    >
      {!manual || !visible ? (
        <Text c="dimmed" size="sm">
          Esta pantalla todavía no tiene manual. Si tienes una duda, repórtala con el botón de la
          barra superior y te ayudamos.
        </Text>
      ) : (
        <Stack gap="md">
          <Title order={3}>{manual.titulo}</Title>
          <TextInput
            placeholder="Buscar en este manual…"
            leftSection={<Search size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
          {!buscando && <Text size="sm">{manual.paraQue}</Text>}
          {sinResultados && (
            <Text c="dimmed" size="sm">
              Nada coincide con «{busqueda.trim()}».
            </Text>
          )}

          {visible.tareas.length > 0 && (
            <div>
              <SectionLabel as="h2" mb={6}>
                Cómo se hace
              </SectionLabel>
              {/* Al buscar se abren las coincidencias: la búsqueda que deja todo
                  cerrado obliga a abrir cada tarea para ver por qué apareció. */}
              <Accordion
                key={buscando ? `q-${q}` : "todo"}
                multiple
                variant="separated"
                defaultValue={buscando ? visible.tareas.map((t) => t.titulo) : []}
              >
                {visible.tareas.map((t) => (
                  <Accordion.Item key={t.titulo} value={t.titulo}>
                    <Accordion.Control>
                      <Text fw={600} size="sm">
                        {t.titulo}
                      </Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="ordered" size="sm" spacing={6}>
                        {t.pasos.map((p) => (
                          <List.Item key={p}>{p}</List.Item>
                        ))}
                      </List>
                      {t.nota && (
                        <Alert variant="light" color="gray" mt="sm" p="xs">
                          <Text size="sm">{t.nota}</Text>
                        </Alert>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          )}

          {!!visible.conceptos?.length && (
            <Seccion titulo="Qué significa" abierta={buscando || visible.conceptos.length <= 8}>
              <Stack gap={8}>
                {visible.conceptos.map((c) => (
                  <div key={c.termino}>
                    <Text fw={600} size="sm">
                      {c.termino}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {c.detalle}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Seccion>
          )}

          {!!visible.problemas?.length && (
            <Seccion titulo="Si algo sale mal" abierta={buscando}>
              <Stack gap={8}>
                {visible.problemas.map((p) => (
                  <div key={p.sintoma}>
                    <Text fw={600} size="sm">
                      {p.sintoma}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {p.solucion}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Seccion>
          )}

          {!buscando && !!manual.relacionadas?.length && (
            <div>
              <SectionLabel as="h2" mb={6}>
                Pantallas relacionadas
              </SectionLabel>
              <Group gap="xs">
                {manual.relacionadas.map((r) => (
                  <Badge
                    key={r.href}
                    component={Link}
                    to={r.href}
                    onClick={onClose}
                    variant="light"
                    style={{ cursor: "pointer", textTransform: "none" }}
                  >
                    {r.label}
                  </Badge>
                ))}
              </Group>
            </div>
          )}
        </Stack>
      )}
    </Drawer>
  );
}

/** Sección plegable; se remonta al cambiar `abierta` para respetar el nuevo valor. */
function Seccion({ titulo, abierta, children }: { titulo: string; abierta: boolean; children: ReactNode }) {
  return (
    <Accordion key={String(abierta)} defaultValue={abierta ? titulo : null} variant="contained">
      <Accordion.Item value={titulo}>
        <Accordion.Control>
          <SectionLabel mb={0}>{titulo}</SectionLabel>
        </Accordion.Control>
        <Accordion.Panel>{children}</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
