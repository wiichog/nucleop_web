import { useState } from "react";
import { Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGymConfig, useUpdateGymConfig } from "../../api/hooks";
import { errMsg } from "../../lib/errors";

const ok = (m: string) => notifications.show({ color: "teal", message: m });
const fail = (m: string) => notifications.show({ color: "red", message: m });

/**
 * Las tres políticas que deciden quién cae en «En riesgo» y «Morosos»: días sin
 * venir, gracia de pago y corte por mora. Viven junto al padrón porque son los
 * números que definen esas listas. Solo del admin: el coach no lee ni guarda la
 * config del gimnasio (403), por eso la página ni la monta para él.
 *
 * Se guardan juntas en un solo `PATCH /gym/{id}` con SOLO lo que cambió, y cada
 * valor se VERIFICA contra la respuesta: si la API no lo aplicó, no se canta
 * éxito. Ir juntas además evita el orden incómodo de subir gracia y corte a la
 * vez (el backend exige corte > gracia).
 */
export function AjustesRiesgoModal({
  gymId,
  opened,
  onClose,
}: {
  gymId: string;
  opened: boolean;
  onClose: () => void;
}) {
  const gymConfig = useGymConfig(gymId);
  const updateGymConfig = useUpdateGymConfig(gymId);
  const actual = {
    riesgo: gymConfig.data?.risk_inactivity_days ?? 10,
    // 0 es válido (se bloquea el mismo día): no se filtra con `||`.
    gracia: gymConfig.data?.payment_grace_days ?? 0,
    corte: gymConfig.data?.overdue_grace_days ?? 30,
  };
  const [riesgo, setRiesgo] = useState<number | string>(actual.riesgo);
  const [gracia, setGracia] = useState<number | string>(actual.gracia);
  const [corte, setCorte] = useState<number | string>(actual.corte);
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (opened && !abiertoAntes) {
    setAbiertoAntes(true);
    setRiesgo(actual.riesgo);
    setGracia(actual.gracia);
    setCorte(actual.corte);
  } else if (!opened && abiertoAntes) {
    setAbiertoAntes(false);
  }

  const onGuardar = async () => {
    const r = Number(riesgo);
    const g = Number(gracia);
    const c = Number(corte);
    if (!Number.isFinite(r) || r < 1 || r > 365) return fail("El umbral debe estar entre 1 y 365 días.");
    if (!Number.isInteger(g) || g < 0 || g > 60) return fail("La gracia de pago debe estar entre 0 y 60 días.");
    if (!Number.isFinite(c) || c < 1 || c > 365) return fail("El corte por mora debe estar entre 1 y 365 días.");

    const body: { risk_inactivity_days?: number; payment_grace_days?: number; overdue_grace_days?: number } = {};
    if (r !== actual.riesgo) body.risk_inactivity_days = r;
    if (g !== actual.gracia) body.payment_grace_days = g;
    if (c !== actual.corte) body.overdue_grace_days = c;
    if (Object.keys(body).length === 0) return onClose();

    try {
      const saved = await updateGymConfig.mutateAsync(body);
      const noGuardo = [
        body.risk_inactivity_days !== undefined && saved.risk_inactivity_days !== r && "el umbral de riesgo",
        body.payment_grace_days !== undefined && saved.payment_grace_days !== g && "la gracia de pago",
        body.overdue_grace_days !== undefined && saved.overdue_grace_days !== c && "el corte por mora",
      ].filter(Boolean);
      if (noGuardo.length) {
        fail(`La API no guardó ${noGuardo.join(", ")}. Avisa a soporte de Nucleo.`);
        return;
      }
      ok(
        `Guardado: «En riesgo» a los ${r} días sin venir, ` +
          (g === 0 ? "sin gracia de pago" : `${g} días de gracia de pago`) +
          ` y corte por mora a los ${c} días.`,
      );
      onClose();
    } catch (error) {
      fail(errMsg(error, "No se pudo guardar la configuración."));
    }
  };

  const ocupado = gymConfig.isLoading || updateGymConfig.isPending;

  return (
    <Modal opened={opened} onClose={onClose} title="Riesgo y mora" centered>
      <Stack gap="sm">
        <NumberInput
          label="En riesgo a los … días sin venir"
          min={1}
          max={365}
          clampBehavior="strict"
          allowDecimal={false}
          value={riesgo}
          onChange={setRiesgo}
          disabled={ocupado}
          suffix=" días"
        />
        <NumberInput
          label="Gracia de pago"
          min={0}
          max={60}
          clampBehavior="strict"
          allowDecimal={false}
          value={gracia}
          onChange={setGracia}
          disabled={ocupado}
          suffix=" días"
        />
        <NumberInput
          label="Corte por mora a los"
          min={1}
          max={365}
          clampBehavior="strict"
          allowDecimal={false}
          value={corte}
          onChange={setCorte}
          disabled={ocupado}
          suffix=" días"
        />
        {gymConfig.isError && (
          <Text size="xs" c="red">
            No se pudo leer la configuración del gimnasio; se muestran los valores por defecto.
          </Text>
        )}
      </Stack>
      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
        <Button loading={updateGymConfig.isPending} onClick={onGuardar}>
          Guardar
        </Button>
      </Group>
    </Modal>
  );
}
