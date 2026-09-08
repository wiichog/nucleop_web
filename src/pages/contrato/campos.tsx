import { useState, type ReactNode } from "react";
import {
  ActionIcon,
  Button,
  Checkbox,
  Chip,
  FileButton,
  Group,
  Input,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { Check, Paperclip, Plus, Trash2 } from "lucide-react";

/**
 * Primitivos del contrato de alta.
 *
 * Viven aparte del formulario porque el formulario ya es largo de por sí, y
 * porque estos controles tienen una regla que el resto del panel no tiene: son
 * **controlados de punta a punta y reciben su error desde afuera**. Un 400 de la
 * API tiene que poder pintar en rojo un campo que la persona llenó hace tres
 * pasos, y eso solo funciona si el único dueño del valor y del error es el
 * estado del formulario, nunca el input.
 *
 * Por lo mismo NO se usa `@mantine/dates` para fecha y hora: sus estilos se
 * cargan en `AdminShell`, que esta página no monta. Un `DateInput` aquí se
 * vería sin CSS. Los tipos nativos `date`/`time` del navegador dan además el
 * formato ISO que espera el serializer sin ninguna conversión de por medio.
 */

// --------------------------------------------------------------------------
// Base
// --------------------------------------------------------------------------
export type PropsCampo = {
  label: string;
  descripcion?: ReactNode;
  /** Mensaje de error. Viene del formulario (validación local o 400 de la API). */
  error?: string;
  requerido?: boolean;
};

/**
 * Envoltorio para controles que no son un input de Mantine (pastillas, listas,
 * archivos). Les presta la misma etiqueta, descripción y ranura de error que
 * usan `TextInput` y compañía, para que un error se vea igual en todos lados.
 */
export function Campo({
  label,
  descripcion,
  error,
  requerido,
  children,
}: PropsCampo & { children: ReactNode }) {
  return (
    <Input.Wrapper
      label={label}
      description={descripcion}
      error={error}
      withAsterisk={requerido}
    >
      <div style={{ marginTop: 8 }}>{children}</div>
    </Input.Wrapper>
  );
}

type PropsTexto = PropsCampo & {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
};

/** Único sitio donde se construye un `TextInput`: cambia el tipo, nada más. */
function Entrada({
  tipo,
  inputMode,
  label,
  descripcion,
  error,
  requerido,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete,
}: PropsTexto & {
  tipo: "text" | "email" | "tel" | "date" | "time";
  inputMode?: "text" | "email" | "tel" | "numeric";
}) {
  return (
    <TextInput
      type={tipo}
      inputMode={inputMode}
      label={label}
      description={descripcion}
      error={error}
      withAsterisk={requerido}
      value={value}
      onChange={(evento) => onChange(evento.currentTarget.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete={autoComplete}
      // Los selectores nativos de fecha y hora heredan el esquema del sistema:
      // sin esto, sobre el fondo oscuro sale un calendario blanco.
      styles={{ input: { colorScheme: "dark" } }}
    />
  );
}

export function Texto(props: PropsTexto) {
  return <Entrada {...props} tipo="text" />;
}

export function Correo(props: PropsTexto) {
  return <Entrada {...props} tipo="email" inputMode="email" autoComplete="email" />;
}

export function Telefono(props: PropsTexto) {
  return <Entrada {...props} tipo="tel" inputMode="tel" autoComplete="tel" />;
}

/** Fecha en ISO (`YYYY-MM-DD`), que es exactamente lo que come un `DateField`. */
export function Fecha(props: PropsTexto) {
  return <Entrada {...props} tipo="date" />;
}

/** Hora en `HH:MM`, formato que acepta el `TimeField` del serializer. */
export function Hora(props: PropsTexto) {
  return <Entrada {...props} tipo="time" />;
}

/**
 * Número entero o decimal. `null` es "no contestado", y se distingue del `0`
 * a propósito: 0 atletas activos es un dato; no haberlo dicho, no.
 */
export function Numero({
  label,
  descripcion,
  error,
  requerido,
  value,
  onChange,
  min = 0,
  max,
  decimales = 0,
  prefijo,
  placeholder,
}: PropsCampo & {
  value: number | null;
  onChange: (valor: number | null) => void;
  min?: number;
  max?: number;
  decimales?: number;
  prefijo?: string;
  placeholder?: string;
}) {
  return (
    <NumberInput
      label={label}
      description={descripcion}
      error={error}
      withAsterisk={requerido}
      value={value ?? ""}
      onChange={(bruto) => {
        if (bruto === "") return onChange(null);
        const numero = typeof bruto === "number" ? bruto : Number(bruto);
        onChange(Number.isFinite(numero) ? numero : null);
      }}
      min={min}
      max={max}
      decimalScale={decimales}
      fixedDecimalScale={decimales > 0}
      allowNegative={false}
      thousandSeparator={decimales > 0 ? "," : undefined}
      prefix={prefijo}
      placeholder={placeholder}
      hideControls
    />
  );
}

export function AreaTexto({
  label,
  descripcion,
  error,
  requerido,
  value,
  onChange,
  placeholder,
  maxLength,
  filas = 3,
}: PropsTexto & { filas?: number }) {
  return (
    <Textarea
      label={label}
      description={descripcion}
      error={error}
      withAsterisk={requerido}
      value={value}
      onChange={(evento) => onChange(evento.currentTarget.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autosize
      minRows={filas}
      maxRows={filas + 6}
    />
  );
}

// --------------------------------------------------------------------------
// Elección
// --------------------------------------------------------------------------
export type OpcionItem<T extends string> = { value: T; label: string };

/**
 * Enum corto como pastillas. Se prefiere al `Select` porque las opciones se leen
 * todas de un vistazo: en un contrato, esconder las alternativas detrás de un
 * desplegable hace que la gente acepte el default sin enterarse de que había otro.
 */
export function Opcion<T extends string>({
  label,
  descripcion,
  error,
  requerido,
  value,
  onChange,
  opciones,
}: PropsCampo & {
  value: T;
  onChange: (valor: T) => void;
  opciones: OpcionItem<T>[];
}) {
  return (
    <Campo label={label} descripcion={descripcion} error={error} requerido={requerido}>
      <Chip.Group multiple={false} value={value} onChange={(v) => onChange(v as T)}>
        <Group gap={8}>
          {opciones.map((opcion) => (
            <Chip key={opcion.value} value={opcion.value} size="sm" variant="outline">
              {opcion.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Campo>
  );
}

/** La misma pastilla, para los campos que son una lista (`ListField`). */
export function OpcionMultiple<T extends string>({
  label,
  descripcion,
  error,
  requerido,
  value,
  onChange,
  opciones,
}: PropsCampo & {
  value: T[];
  onChange: (valor: T[]) => void;
  opciones: OpcionItem<T>[];
}) {
  return (
    <Campo label={label} descripcion={descripcion} error={error} requerido={requerido}>
      <Chip.Group multiple value={value} onChange={(v) => onChange(v as T[])}>
        <Group gap={8}>
          {opciones.map((opcion) => (
            <Chip key={opcion.value} value={opcion.value} size="sm" variant="outline">
              {opcion.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Campo>
  );
}

/**
 * Casilla con etiqueta rica: en la firma, cada renuncia lleva su párrafo dentro
 * del propio label, para que aceptar y leer sean el mismo gesto.
 */
export function Casilla({
  label,
  descripcion,
  error,
  checked,
  onChange,
}: {
  label: ReactNode;
  descripcion?: ReactNode;
  error?: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={(evento) => onChange(evento.currentTarget.checked)}
      label={label}
      description={descripcion}
      error={error}
      styles={{ label: { lineHeight: 1.45 } }}
    />
  );
}

// --------------------------------------------------------------------------
// Repetidor
// --------------------------------------------------------------------------
/**
 * Lista editable de sub-objetos (sedes, usuarios del panel, disciplinas…).
 *
 * Es genérico sobre la fila y no sabe nada de sus campos: quien lo usa dice cómo
 * se crea una fila vacía (`nueva`) y cómo se dibuja (`children`). Así los cuatro
 * repetidores del contrato comparten el mismo comportamiento de agregar/quitar
 * en vez de tener cada uno el suyo, ligeramente distinto.
 */
export function Repetidor<T>({
  label,
  descripcion,
  error,
  filas,
  onChange,
  nueva,
  textoAgregar = "Agregar",
  vacio,
  children,
}: {
  label: string;
  descripcion?: ReactNode;
  error?: string;
  filas: T[];
  onChange: (filas: T[]) => void;
  nueva: () => T;
  textoAgregar?: string;
  vacio?: string;
  children: (fila: T, actualizar: (parcial: Partial<T>) => void, indice: number) => ReactNode;
}) {
  const actualizarFila = (indice: number, parcial: Partial<T>) =>
    onChange(filas.map((fila, i) => (i === indice ? { ...fila, ...parcial } : fila)));

  return (
    <Campo label={label} descripcion={descripcion} error={error}>
      <Stack gap="sm">
        {filas.length === 0 && vacio && (
          <Text c="dimmed" size="sm">
            {vacio}
          </Text>
        )}

        {filas.map((fila, indice) => (
          <Paper key={indice} withBorder p="md" radius="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
              <div style={{ flex: 1, minWidth: 0 }}>
                {children(fila, (parcial) => actualizarFila(indice, parcial), indice)}
              </div>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Quitar ${indice + 1}`}
                onClick={() => onChange(filas.filter((_, i) => i !== indice))}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}

        <Button
          variant="default"
          size="xs"
          leftSection={<Plus size={14} />}
          onClick={() => onChange([...filas, nueva()])}
          style={{ alignSelf: "flex-start" }}
        >
          {textoAgregar}
        </Button>
      </Stack>
    </Campo>
  );
}

// --------------------------------------------------------------------------
// Archivo
// --------------------------------------------------------------------------
/** Espeja `ALLOWED_DOCUMENT_EXTENSIONS` de `apps/onboarding/serializers.py`. */
export const EXTENSIONES_DOCUMENTO = ["pdf", "jpg", "jpeg", "png", "heic", "webp"] as const;
/** Espeja `ONBOARDING_MAX_UPLOAD_MB`. */
export const MAX_MB_DOCUMENTO = 8;

/**
 * Valida antes de subir. No es una comodidad: el nginx de producción corta por
 * tamaño con un 413 sin cuerpo JSON, así que un archivo demasiado grande llega
 * como un error mudo. Vale más decírselo a la persona sin salir del navegador.
 */
export function validarArchivo(archivo: File): string | null {
  const extension = (archivo.name.split(".").pop() ?? "").toLowerCase();
  if (!EXTENSIONES_DOCUMENTO.includes(extension as (typeof EXTENSIONES_DOCUMENTO)[number])) {
    return `Formato no admitido. Usa ${EXTENSIONES_DOCUMENTO.join(", ")}.`;
  }
  if (archivo.size > MAX_MB_DOCUMENTO * 1024 * 1024) {
    return `El archivo pesa más de ${MAX_MB_DOCUMENTO} MB.`;
  }
  return null;
}

const pesoLegible = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function Archivo({
  label,
  descripcion,
  error,
  valor,
  onSeleccionar,
  subido = false,
  subiendo = false,
}: PropsCampo & {
  valor: File | null;
  onSeleccionar: (archivo: File | null) => void;
  subido?: boolean;
  subiendo?: boolean;
}) {
  const [errorLocal, setErrorLocal] = useState("");

  const elegir = (archivo: File | null) => {
    if (!archivo) {
      setErrorLocal("");
      onSeleccionar(null);
      return;
    }
    const problema = validarArchivo(archivo);
    setErrorLocal(problema ?? "");
    // Un archivo que ya sabemos que el backend va a rechazar no se guarda: si se
    // guardara, el botón de subir quedaría habilitado para fallar sí o sí.
    onSeleccionar(problema ? null : archivo);
  };

  return (
    <Campo label={label} descripcion={descripcion} error={errorLocal || error}>
      <Group gap="sm" wrap="wrap">
        <FileButton
          onChange={elegir}
          accept={EXTENSIONES_DOCUMENTO.map((e) => `.${e}`).join(",")}
        >
          {(props) => (
            <Button
              {...props}
              variant="default"
              size="xs"
              disabled={subiendo}
              leftSection={<Paperclip size={14} />}
            >
              {valor ? "Cambiar archivo" : "Elegir archivo"}
            </Button>
          )}
        </FileButton>

        {valor && (
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            {subido && <Check size={15} color="var(--mantine-color-teal-5)" />}
            <Text size="sm" truncate style={{ maxWidth: 260 }}>
              {valor.name}
            </Text>
            <Text size="xs" c="dimmed">
              {pesoLegible(valor.size)}
            </Text>
          </Group>
        )}

        {subido && (
          <Text size="xs" c="teal">
            Recibido
          </Text>
        )}
      </Group>
    </Campo>
  );
}
