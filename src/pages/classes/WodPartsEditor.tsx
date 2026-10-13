import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import type { ScoreType, WodPartKind } from "../../api/types";
import { MOVIMIENTOS_DE_CARGA } from "../../lib/movimientos";
import { moverParte, parteNueva, type ParteBorrador } from "../../lib/wodPartes";

const KINDS: { value: WodPartKind; label: string }[] = [
  { value: "warmup", label: "Calentamiento" },
  { value: "strength", label: "Fuerza" },
  { value: "skill", label: "Técnica" },
  { value: "metcon", label: "Metcon" },
  { value: "accessory", label: "Accesorios" },
  { value: "cooldown", label: "Enfriamiento" },
];

const MOVIMIENTOS = Object.entries(MOVIMIENTOS_DE_CARGA).map(([value, label]) => ({ value, label }));

/**
 * Los bloques del WOD, uno debajo del otro: «Fuerza A», «Fuerza B», «Metcon»…
 * Cada bloque con score tiene su propio board. Vacío = WOD de un solo score.
 *
 * Con scores registrados un bloque no se quita ni cambia de tipo de score: el
 * backend lo rechazaría (`guardar_partes_wod`), así que aquí ni se ofrece.
 */
export function WodPartsEditor({
  partes,
  onChange,
  scoreTypes,
}: {
  partes: ParteBorrador[];
  onChange: (partes: ParteBorrador[]) => void;
  scoreTypes: { value: ScoreType; label: string }[];
}) {
  const cambiar = (i: number, cambio: Partial<ParteBorrador>) =>
    onChange(partes.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  const marcarPrincipal = (i: number) =>
    onChange(partes.map((p, j) => ({ ...p, is_primary: j === i })));

  return (
    <Stack gap="sm">
      {partes.map((p, i) => {
        const conScores = (p.results_count ?? 0) > 0;
        const puntua = (p.score_type ?? "none") !== "none";
        const carga = p.score_type === "load";
        return (
          <Card key={p.id ?? `nuevo-${i}`} withBorder padding="md" radius="md">
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Group gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Bloque {i + 1}
                </Text>
                {p.is_primary && puntua ? (
                  <Badge size="xs" variant="light">
                    Board principal
                  </Badge>
                ) : null}
                {conScores ? (
                  <Badge size="xs" color="gray" variant="light">
                    {p.results_count} {p.results_count === 1 ? "score" : "scores"}
                  </Badge>
                ) : null}
              </Group>
              <Group gap={4} wrap="nowrap">
                <Tooltip label="Subir bloque">
                  <ActionIcon
                    variant="subtle"
                    aria-label={`Subir bloque ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => onChange(moverParte(partes, i, -1))}
                  >
                    ↑
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Bajar bloque">
                  <ActionIcon
                    variant="subtle"
                    aria-label={`Bajar bloque ${i + 1}`}
                    disabled={i === partes.length - 1}
                    onClick={() => onChange(moverParte(partes, i, 1))}
                  >
                    ↓
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={conScores ? "Ya tiene scores: no se puede quitar" : "Quitar bloque"}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`Quitar bloque ${i + 1}`}
                    disabled={conScores}
                    onClick={() => onChange(partes.filter((_, j) => j !== i))}
                  >
                    ✕
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <TextInput
                label="Título"
                placeholder="Fuerza A (Back squat)"
                value={p.title}
                onChange={(e) => cambiar(i, { title: e.currentTarget.value })}
                required
              />
              <Select
                label="Tipo de bloque"
                data={KINDS}
                value={p.kind ?? "metcon"}
                onChange={(v) => cambiar(i, { kind: (v as WodPartKind) ?? "metcon" })}
                allowDeselect={false}
              />
              <Select
                label="Score"
                data={scoreTypes}
                value={p.score_type ?? "none"}
                onChange={(v) => cambiar(i, { score_type: (v as ScoreType) ?? "none" })}
                disabled={conScores}
                description={conScores ? "Ya tiene scores: no se puede cambiar." : undefined}
                allowDeselect={false}
              />
            </SimpleGrid>
            <Textarea
              label="Texto"
              placeholder={"5 x 3 @ 75%\nDescanso 2 min"}
              value={p.description ?? ""}
              onChange={(e) => cambiar(i, { description: e.currentTarget.value })}
              mt="sm"
              autosize
              minRows={2}
              maxRows={10}
            />

            {carga ? (
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="sm">
                <Select
                  label="Unidad"
                  data={[
                    { value: "lb", label: "lb" },
                    { value: "kg", label: "kg" },
                  ]}
                  value={p.load_unit === "kg" ? "kg" : "lb"}
                  onChange={(v) => cambiar(i, { load_unit: (v as "kg" | "lb") ?? "lb" })}
                  allowDeselect={false}
                />
                <Select
                  label="Levantamiento"
                  description="Con él, lo que anota cada atleta cuenta para su RM estimado."
                  placeholder="Ninguno"
                  data={MOVIMIENTOS}
                  value={p.movement ?? null}
                  onChange={(v) => cambiar(i, { movement: v || null })}
                  searchable
                  clearable
                />
                {p.movement ? (
                  <NumberInput
                    label="Reps por serie del peso que se anota"
                    description="«5 x 3 subiendo hasta pesado» = 3. Un 1RM = 1."
                    placeholder="1"
                    min={1}
                    max={30}
                    allowDecimal={false}
                    value={p.movement_reps ?? ""}
                    onChange={(v) => cambiar(i, { movement_reps: typeof v === "number" ? v : null })}
                  />
                ) : null}
              </SimpleGrid>
            ) : null}

            {puntua ? (
              <Group gap="lg" mt="sm">
                <Switch
                  label="Board principal del día"
                  checked={!!p.is_primary}
                  onChange={() => marcarPrincipal(i)}
                />
                <Switch
                  label="Benchmark"
                  checked={!!p.is_benchmark}
                  onChange={(e) => cambiar(i, { is_benchmark: e.currentTarget.checked })}
                />
              </Group>
            ) : null}
          </Card>
        );
      })}
      <Group>
        <Button variant="light" onClick={() => onChange([...partes, parteNueva()])}>
          Agregar bloque
        </Button>
        {partes.length === 0 ? (
          <Text size="sm" c="dimmed">
            Sin bloques el workout tiene un solo score. Agrégalos para separar, por ejemplo, Fuerza A,
            Fuerza B y Metcon, cada uno con su board.
          </Text>
        ) : null}
      </Group>
    </Stack>
  );
}
