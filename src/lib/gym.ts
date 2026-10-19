import { addDays, niceDate, todayCO } from "./vet";
export { addDays, niceDate, todayCO };
export { waLink } from "./vet";

export const STATE_LABEL: Record<string, { label: string; tone: "ok" | "info" | "warn" | "danger" | "muted" }> = {
  al_dia: { label: "Al día", tone: "ok" },
  por_vencer: { label: "Por vencer", tone: "warn" },
  vencido: { label: "Vencido", tone: "danger" },
  sin_plan: { label: "Sin plan", tone: "muted" },
};
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const METHODS = [{ v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" }, { v: "tarjeta", l: "Tarjeta" }, { v: "otro", l: "Otro" }];

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const weekdayOfDate = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

export function dueText(daysLeft: number | null, paidUntil: string | null): string {
  if (daysLeft === null || !paidUntil) return "Sin membresía";
  if (daysLeft < 0) return `Venció hace ${-daysLeft} día${daysLeft === -1 ? "" : "s"}`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  return `Vence en ${daysLeft} días`;
}
export function memberPhoto(id: string, img: number | null): string | null {
  return img ? `/api/gym/members/${id}/photo?v=${img}` : null;
}
/** Enlace de YouTube → enlace para incrustar; null si no es de YouTube. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (/(^|\.)youtube\.com$/.test(u.hostname)) id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
