import { waNumber } from "./rides";

export const KIND_LABEL: Record<string, string> = { consulta: "Consulta", vacuna: "Vacuna", desparasitacion: "Desparasitación", servicio: "Servicio", otro: "Otro" };
export const APPT_LABEL: Record<string, { label: string; tone: "ok" | "info" | "warn" | "muted" }> = {
  pendiente: { label: "Por confirmar", tone: "warn" },
  confirmada: { label: "Confirmada", tone: "info" },
  atendida: { label: "Atendida", tone: "ok" },
  cancelada: { label: "Cancelada", tone: "muted" },
  no_asistio: { label: "No asistió", tone: "muted" },
};
export const SPECIES = ["Perro", "Gato", "Ave", "Conejo", "Roedor", "Reptil", "Otro"];
export const DAYS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mié" }, { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sáb" }, { n: 0, label: "Dom" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-19" → "19 oct 2026" */
export function niceDate(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
/** Fecha de hoy en Colombia (AAAA-MM-DD). */
export function todayCO(): string {
  return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
}
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** Hora de Colombia de un instante ISO → "14:30" */
export function timeCO(iso: string): string {
  const l = new Date(new Date(iso).getTime() - 5 * 3600000);
  return `${String(l.getUTCHours()).padStart(2, "0")}:${String(l.getUTCMinutes()).padStart(2, "0")}`;
}
export function dateCO(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 10);
}
/** Instante ISO de una fecha y hora de Colombia. */
export function toISO(ymd: string, hhmm: string): string {
  return new Date(`${ymd}T${hhmm}:00-05:00`).toISOString();
}
export function weekdayName(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
/** Edad en texto a partir de la fecha de nacimiento. */
export function ageText(birth: string | null | undefined): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const now = new Date(Date.now() - 5 * 3600000);
  let months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  if (now.getUTCDate() < d) months--;
  if (months < 0) return "";
  if (months < 1) return "menos de 1 mes";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const yrs = Math.floor(months / 12);
  const rest = months % 12;
  return `${yrs} ${yrs === 1 ? "año" : "años"}${rest ? ` y ${rest} ${rest === 1 ? "mes" : "meses"}` : ""}`;
}
export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}
export function waLink(phone: string, text?: string): string {
  return `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
