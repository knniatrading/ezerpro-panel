import type { SalonStatus } from "./types";
export { addDays, todayCO, waLink, timeCO, weekdayName } from "./clinic";
export { niceDate, hhmm, coStart, WEEKDAYS, WEEK_ORDER, toMin } from "./clinic";

export const STATUS_TEXT: Record<SalonStatus, { label: string; tone: "ok" | "info" | "warn" }> = {
  programada: { label: "Por confirmar", tone: "warn" }, confirmada: { label: "Confirmada", tone: "info" }, atendida: { label: "Atendida", tone: "ok" },
  cancelada: { label: "Cancelada", tone: "info" }, no_asistio: { label: "No asistió", tone: "warn" },
};
export const PAY_METHODS = [{ v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" }, { v: "tarjeta", l: "Tarjeta" }, { v: "otro", l: "Otro" }];
export const METHOD_TEXT: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", otro: "Otro" };
export const RECORD_KINDS = [{ v: "formula", l: "Fórmula / color" }, { v: "servicio", l: "Servicio realizado" }, { v: "nota", l: "Nota" }];
export const KIND_TEXT: Record<string, string> = { formula: "Fórmula", servicio: "Servicio", nota: "Nota" };
export const durationLabel = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);
/** Lunes de la semana (AAAA-MM-DD) de una fecha. */
export function weekStart(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
}
export const publicBookingUrl = (host: string) => `https://${host}/reservar`;
