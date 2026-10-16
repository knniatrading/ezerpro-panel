// Fechas en la hora de Colombia, como AAAA-MM-DD (así las entiende el servidor).
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });

export function todayCO(): string {
  return fmt.format(new Date());
}

function utc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(ymd: string, n: number): string {
  const t = utc(ymd);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export type Preset = "hoy" | "ayer" | "semana" | "mes" | "mes_pasado" | "rango";
export interface Range {
  preset: Preset;
  from: string;
  to: string;
}

export const PRESETS: { id: Preset; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "mes_pasado", label: "Mes pasado" },
  { id: "rango", label: "Otro rango" },
];

export function rangeOf(preset: Preset, current?: { from: string; to: string }): Range {
  const t = todayCO();
  switch (preset) {
    case "hoy":
      return { preset, from: t, to: t };
    case "ayer": {
      const y = addDays(t, -1);
      return { preset, from: y, to: y };
    }
    case "semana": {
      const dow = utc(t).getUTCDay(); // 0 = domingo
      return { preset, from: addDays(t, -((dow + 6) % 7)), to: t };
    }
    case "mes":
      return { preset, from: t.slice(0, 8) + "01", to: t };
    case "mes_pasado": {
      const first = t.slice(0, 8) + "01";
      const last = addDays(first, -1);
      return { preset, from: last.slice(0, 8) + "01", to: last };
    }
    default:
      return { preset: "rango", from: current?.from ?? t, to: current?.to ?? t };
  }
}

const show = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
export function labelDate(ymd: string): string {
  return show.format(utc(ymd));
}

const stamp = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export function stampCO(iso: string): string {
  return stamp.format(new Date(iso));
}
