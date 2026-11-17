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
import type { ScoreType, WodPart, WodPartKind } from "../../api/types";
import { MOVIMIENTOS_DE_CARGA } from "../../lib/movimientos";
import {
  exigeSetsYReps,
  MAX_REPS,
  MAX_SETS,
  moverParte,
  parteNueva,
  type ParteBorrador,
} from "../../lib/wodPartes";

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
 * Cada bloque con score tiene su propio board. Un workout nuevo necesita al
 * menos uno (ronda 6): la rutina ya no se guarda como texto suelto.
 *
 * Con scores registrados un bloque no se quita ni cambia de tipo de score: el
 * backend lo rechazaría (`guardar_partes_wod`), así que aquí ni se ofrece.
 */
export function WodPartsEditor({
  partes,
  onChange,
  scoreTypes,
  originales,
}: {
  partes: ParteBorrador[];
  onChange: (partes: ParteBorrador[]) => void;
  scoreTypes: { value: ScoreType; label: string }[];
  /** Los bloques como estaban guardados: un bloque de carga viejo sin Sets x Reps no los exige. */
  originales?: WodPart[];
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
        const original = p.id ? originales?.find((o) => o.id === p.id) : undefined;
        const pideSetsReps = exigeSetsYReps(p, original);
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
              <>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
                  <Select
                    label="Unidad"
                    data={[
                      { value: "lb", label: "lb" },
                      { value: "kg", label: "kg" },
                    ]}
                    value={p.load_unit === "kg" ? "kg" : "lb"}
                    onChange={(v) => cambiar(i, { load_unit: (v as "kg" | "lb") ?? "lb" })}
                    allowDeselect={false}
                    // Se puede cambiar ya publicado: el servidor convierte las marcas
                    // al guardar (100 kg → 220.5 lb), nunca quedan rotuladas con otra unidad.
                    description={conScores ? "Si la cambias, sus scores se convierten al guardar." : undefined}
                  />
                  {/* Obligatorio (Vertikal, 10-nov-2026): sin él el atleta no ve sus
                      porcentajes ni su PR se actualiza solo. Antes «Ninguno» quedaba
                      puesto sin querer. Uno fuera del catálogo se conserva. */}
                  <Select
                    label="Levantamiento base"
                    placeholder="Elige el levantamiento"
                    data={
                      p.movement && !MOVIMIENTOS.some((m) => m.value === p.movement)
                        ? [{ value: p.movement, label: p.movement }, ...MOVIMIENTOS]
                        : MOVIMIENTOS
                    }
                    value={p.movement ?? null}
                    onChange={(v) => cambiar(i, { movement: v || null })}
                    searchable
                    required
                    error={p.movement ? undefined : "Obligatorio en un bloque de carga"}
                  />
                </SimpleGrid>
                {/* Scoring = Sets x Reps (Vertikal, ronda 6): «5 x 3 @ peso». Con
                    esto se le prellena el score al atleta (lo puede cambiar) y su PR
                    sabe a cuántas reps corresponde el peso. El backend los exige en
                    bloques de carga nuevos con el mismo mensaje. */}
                <Text size="sm" fw={600} mt="sm">
                  Scoring{" "}
                  {pideSetsReps ? (
                    <Text span c="red" inherit>
                      *
                    </Text>
                  ) : null}
                </Text>
                <Text size="xs" c="dimmed" mb={4}>
                  Series y repeticiones del peso que se anota: «5 x 3» son 5 series de 3. Un 1RM es 1 x 1.
                </Text>
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <NumberInput
                    label="Sets"
                    placeholder="5"
                    min={1}
                    max={MAX_SETS}
                    clampBehavior="strict"
                    allowDecimal={false}
                    allowNegative={false}
                    value={p.sets ?? ""}
                    onChange={(v) => cambiar(i, { sets: typeof v === "number" ? v : null })}
                    error={pideSetsReps && p.sets == null ? "Obligatorio" : undefined}
                    w={96}
                  />
                  <Text mt={30} fw={600} c="dimmed">
                    x
                  </Text>
                  <NumberInput
                    label="Reps"
                    placeholder="3"
                    min={1}
                    max={MAX_REPS}
                    clampBehavior="strict"
                    allowDecimal={false}
                    allowNegative={false}
                    value={p.movement_reps ?? ""}
                    onChange={(v) => cambiar(i, { movement_reps: typeof v === "number" ? v : null })}
                    error={pideSetsReps && p.movement_reps == null ? "Obligatorio" : undefined}
                    w={96}
                  />
                </Group>
              </>
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
            La rutina se arma con bloques: necesitas al menos uno. Un bloque por cada parte del día
            (Warmup, Fuerza, Metcon…); cada bloque con score tiene su propio board.
          </Text>
        ) : null}
      </Group>
    </Stack>
  );
}
