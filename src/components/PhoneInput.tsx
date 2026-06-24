import { useMemo } from "react";
import { Group, Input, Select, TextInput } from "@mantine/core";

/**
 * Campo de teléfono con selector de país (default Guatemala +502). Emite el número
 * en formato E.164 (`+502########`) para soportar atletas de otros países
 * (ticket 356eb7cb). El padre guarda/lee un solo string E.164.
 */
const DIAL_CODES = [
  { value: "+502", label: "🇬🇹 +502" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+52", label: "🇲🇽 +52" },
  { value: "+503", label: "🇸🇻 +503" },
  { value: "+504", label: "🇭🇳 +504" },
  { value: "+505", label: "🇳🇮 +505" },
  { value: "+506", label: "🇨🇷 +506" },
  { value: "+507", label: "🇵🇦 +507" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+34", label: "🇪🇸 +34" },
  { value: "+44", label: "🇬🇧 +44" },
];

const DEFAULT_DIAL = "+502";

// Separa un E.164 en (código de país, número nacional), tomando el prefijo más largo.
function splitE164(value: string): { dial: string; national: string } {
  if (!value) return { dial: DEFAULT_DIAL, national: "" };
  const match = DIAL_CODES.map((c) => c.value)
    .sort((a, b) => b.length - a.length)
    .find((code) => value.startsWith(code));
  if (match) return { dial: match, national: value.slice(match.length) };
  return { dial: DEFAULT_DIAL, national: value.replace(/^\+/, "") };
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = "5588 7744",
}: {
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const { dial, national } = useMemo(() => splitE164(value), [value]);

  const emit = (d: string, n: string) => {
    const digits = n.replace(/\D/g, "");
    onChange(digits ? `${d}${digits}` : "");
  };

  return (
    <Input.Wrapper label={label}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Select
          data={DIAL_CODES}
          value={dial}
          onChange={(d) => emit(d ?? DEFAULT_DIAL, national)}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          w={110}
          aria-label="Código de país"
        />
        <TextInput
          style={{ flex: 1 }}
          placeholder={placeholder}
          value={national}
          onChange={(e) => emit(dial, e.currentTarget.value)}
          inputMode="tel"
        />
      </Group>
    </Input.Wrapper>
  );
}
