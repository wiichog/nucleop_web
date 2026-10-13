import { useState } from "react";
import { Anchor, Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useWodPartsFromText } from "../../api/hooks";
import { errMsg } from "../../lib/errors";
import { bloqueoParaReemplazar, partesDesdeSugerencia, type ParteBorrador } from "../../lib/wodPartes";

/**
 * «Armar bloques desde el texto»: el box pega la rutina tal como la escribe en su
 * sistema de programación («Warmup», «Weightlifting (Power Clean)», «Custom Metcon
 * (Tiempo)»…) y el backend propone un bloque por encabezado, con su score.
 *
 * Existe porque armar cada bloque a mano dependía de acordarse: un WOD real quedó
 * con la fuerza y sin el metcon, y nadie tenía dónde subir su tiempo.
 *
 * El texto pasa a los bloques; en la descripción queda sólo lo que no es de
 * ninguno (lo que va antes del primer encabezado). Nada se guarda hasta que se
 * presiona guardar, y «Deshacer» devuelve el formulario a como estaba.
 */
export function ArmarBloquesDesdeTexto({
  gymId,
  description,
  partes,
  onAplicar,
}: {
  gymId: string;
  description: string;
  partes: ParteBorrador[];
  onAplicar: (description: string, partes: ParteBorrador[]) => void;
}) {
  const sugerir = useWodPartsFromText(gymId);
  const [previo, setPrevio] = useState<{ description: string; partes: ParteBorrador[] } | null>(null);
  const [armados, setArmados] = useState(0);
  const sinTexto = !description.trim();

  const armar = async () => {
    const bloqueo = bloqueoParaReemplazar(partes);
    if (bloqueo) {
      notifications.show({ color: "red", message: bloqueo });
      return;
    }
    if (
      partes.length > 0 &&
      !window.confirm(`¿Reemplazar los ${partes.length} bloques actuales por los que salen del texto?`)
    )
      return;
    try {
      const res = await sugerir.mutateAsync(description);
      if (res.parts.length === 0) {
        notifications.show({
          color: "yellow",
          message:
            "No encontré bloques en el texto. Cada bloque tiene que empezar con un encabezado en su propia línea, como «Warmup», «Fuerza:» o «Metcon (Tiempo)».",
        });
        return;
      }
      setPrevio({ description, partes });
      setArmados(res.parts.length);
      onAplicar(res.notes, partesDesdeSugerencia(res.parts));
    } catch (error) {
      notifications.show({ color: "red", message: errMsg(error, "No se pudieron armar los bloques.") });
    }
  };

  const deshacer = () => {
    if (!previo) return;
    onAplicar(previo.description, previo.partes);
    setPrevio(null);
  };

  return (
    <Group gap="sm" mt="xs" wrap="wrap">
      <Button
        variant="light"
        size="xs"
        onClick={armar}
        loading={sugerir.isPending}
        disabled={sinTexto}
        title={sinTexto ? "Pega primero la rutina en la descripción." : undefined}
      >
        Armar bloques desde el texto
      </Button>
      {previo ? (
        <Text size="xs" c="dimmed">
          Se armaron {armados} {armados === 1 ? "bloque" : "bloques"}: revisa cada uno antes de guardar.{" "}
          <Anchor component="button" type="button" size="xs" onClick={deshacer}>
            Deshacer
          </Anchor>
        </Text>
      ) : (
        <Text size="xs" c="dimmed">
          ¿Pegaste la rutina completa? Arma un bloque por cada encabezado (Warmup, Fuerza, Metcon…).
        </Text>
      )}
    </Group>
  );
}
