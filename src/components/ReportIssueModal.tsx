import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ActionIcon,
  Button,
  FileInput,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Bug } from "lucide-react";
import { useReportConfig, useSubmitReport } from "../api/hooks";
import { useAuth } from "../lib/auth";

// Versión inyectada en build por Vite (vite.config.ts → define).
declare const __APP_VERSION__: string;

/** Contexto que la superficie web captura automáticamente, sin que el usuario lo escriba. */
function captureContext(screen: string, gymId: string | null) {
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timezone = "";
  }
  return {
    surface: "web_admin",
    app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "",
    os_name: navigator.platform || "",
    user_agent: navigator.userAgent || "",
    screen,
    locale: navigator.language || "",
    timezone,
    gym: gymId,
  };
}

function ReportIssueDialog({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const location = useLocation();
  const { primaryGymId } = useAuth();
  const submit = useSubmitReport();
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const close = () => {
    setDescription("");
    setAttachment(null);
    onClose();
  };

  const send = async () => {
    if (!description.trim()) return;
    try {
      await submit.mutateAsync({
        description: description.trim(),
        attachment,
        ...captureContext(location.pathname, primaryGymId),
      });
      notifications.show({
        color: "teal",
        title: "¡Gracias!",
        message: "Recibimos tu reporte. Lo revisaremos pronto.",
      });
      close();
    } catch {
      notifications.show({
        color: "red",
        message: "No se pudo enviar el reporte. Intenta de nuevo.",
      });
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Reportar un problema" centered>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Cuéntanos qué pasó. Adjuntamos automáticamente tu versión, pantalla y navegador
          para ayudarnos a reproducirlo.
        </Text>
        <Textarea
          label="¿Qué salió mal?"
          placeholder="Describe el problema con el mayor detalle posible…"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={4}
          data-autofocus
        />
        <FileInput
          label="Captura de pantalla (opcional)"
          placeholder="Adjuntar imagen"
          accept="image/*"
          value={attachment}
          onChange={setAttachment}
          clearable
        />
        <Button onClick={send} loading={submit.isPending} disabled={!description.trim()}>
          Enviar reporte
        </Button>
        {/* PREPARADO (sin implementar): aquí, a futuro, se mostrará un aviso al usuario
            cuando su reporte cambie a "resuelto" (ver MyReports + notificación push). */}
      </Stack>
    </Modal>
  );
}

/**
 * Punto de entrada discreto del reporter en el admin web: un ícono en el header.
 * Se oculta si el superadmin apagó el kill-switch de la superficie web.
 */
export function ReportIssueButton() {
  const config = useReportConfig();
  const [opened, setOpened] = useState(false);

  if (config.data && config.data.web_enabled === false) return null;

  return (
    <>
      <Tooltip label="Reportar un problema" withinPortal>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          radius="xl"
          aria-label="Reportar un problema"
          onClick={() => setOpened(true)}
        >
          <Bug size={20} />
        </ActionIcon>
      </Tooltip>
      <ReportIssueDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
