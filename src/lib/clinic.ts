import { addDays, niceDate as niceYmd, todayCO } from "./vet";
export { addDays, todayCO };
export { waLink, timeCO, weekdayName } from "./vet";
/** Acepta AAAA-MM-DD o un instante ISO (se muestra en hora de Colombia). */
export function niceDate(v: string | null | undefined): string {
  if (!v) return "";
  return niceYmd(v.length > 10 ? new Date(Date.parse(v) - 5 * 3600e3).toISOString().slice(0, 10) : v);
}
import type { ApptStatus } from "./types";

export const APPT_TEXT: Record<ApptStatus, { label: string; tone: "ok" | "info" | "warn" | "muted" }> = {
  programada: { label: "Por confirmar", tone: "warn" },
  confirmada: { label: "Confirmada", tone: "ok" },
  atendida: { label: "Atendida", tone: "info" },
  cancelada: { label: "Cancelada", tone: "muted" },
  no_asistio: { label: "No asistió", tone: "warn" },
};
/** Fecha corta legible (hora de Colombia). */
export const dateCO = (iso: string) => niceDate(iso);
export const METHODS = [{ v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" }, { v: "tarjeta", l: "Tarjeta" }, { v: "otro", l: "Otro" }];
export const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
/** Inicio de un día de Colombia (UTC-5) + minutos, como instante ISO. */
export const coStart = (ymd: string, min: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + 5 * 3600e3 + min * 60e3).toISOString();

export function age(birth: string | null | undefined): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const now = new Date(Date.now() - 5 * 3600e3);
  let a = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) a--;
  return a < 0 ? "" : `${a} años`;
}

export const RECORD_KIND: Record<string, string> = { evolucion: "Evolución", procedimiento: "Procedimiento", odontograma: "Odontograma", otro: "Otro" };

// ---------- Odontograma ----------
export const UPPER_PERM = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
export const LOWER_PERM = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
export const UPPER_TEMP = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
export const LOWER_TEMP = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];
export const SURF_TOOLS = [
  { v: "caries", l: "Caries", c: "#e03131" },
  { v: "obturado", l: "Obturado", c: "#1c7ed6" },
  { v: "sellante", l: "Sellante", c: "#2f9e44" },
] as const;
export const WHOLE_TOOLS = [
  { v: "ausente", l: "Ausente", c: "#868e96" },
  { v: "extraido", l: "Extraído", c: "#c92a2a" },
  { v: "implante", l: "Implante", c: "#0b7285" },
  { v: "corona", l: "Corona", c: "#f08c00" },
  { v: "endodoncia", l: "Endodoncia", c: "#7048e8" },
  { v: "puente", l: "Puente", c: "#e8590c" },
  { v: "fractura", l: "Fractura", c: "#a61e4d" },
] as const;
export const SURF_NAME: Record<string, string> = { O: "oclusal", V: "vestibular", L: "lingual/palatina", M: "mesial", D: "distal" };
