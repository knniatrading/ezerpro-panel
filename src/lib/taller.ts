import type { TallerQuote, TallerStatus } from "./types";
export { addDays, todayCO, waLink, timeCO, weekdayName } from "./vet";
export { niceDate, dateCO, METHODS } from "./clinic";

export const STATUS_TEXT: Record<TallerStatus, { label: string; tone: "ok" | "info" | "warn" | "muted" | "danger"; hint: string }> = {
  recibido: { label: "Recibido", tone: "info", hint: "Ya tenemos tu vehículo en el taller." },
  diagnostico: { label: "En diagnóstico", tone: "info", hint: "Un mecánico está revisando el vehículo." },
  cotizado: { label: "Cotización lista", tone: "warn", hint: "Te enviamos la cotización para que la apruebes." },
  aprobado: { label: "Aprobado", tone: "ok", hint: "Aprobaste la reparación. Pronto empezamos." },
  en_reparacion: { label: "En reparación", tone: "info", hint: "Estamos trabajando en tu vehículo." },
  listo: { label: "Listo para entregar", tone: "ok", hint: "Tu vehículo está listo. Puedes pasar por él." },
  entregado: { label: "Entregado", tone: "muted", hint: "Vehículo entregado." },
  cancelado: { label: "Cancelado", tone: "muted", hint: "Orden cancelada." },
};
export const STEPS: TallerStatus[] = ["recibido", "diagnostico", "cotizado", "aprobado", "en_reparacion", "listo", "entregado"];
export const QUOTE_TEXT: Record<TallerQuote, string> = { ninguna: "Sin cotización", enviada: "Esperando respuesta", aprobada: "Aprobada", rechazada: "Rechazada" };
export const KIND_TEXT: Record<string, string> = { carro: "Carro", moto: "Moto", camioneta: "Camioneta", camion: "Camión", otro: "Otro" };
export const VEHICLE_KINDS = [{ v: "carro", l: "Carro" }, { v: "moto", l: "Moto" }, { v: "camioneta", l: "Camioneta" }, { v: "camion", l: "Camión" }, { v: "otro", l: "Otro" }];
export const kindIcon = (k: string) => (k === "moto" ? "🏍️" : k === "camion" ? "🚚" : k === "camioneta" ? "🚙" : "🚗");
export const FILTERS: { v: string; l: string }[] = [
  { v: "abiertas", l: "Abiertas" }, { v: "recibido", l: "Recibidas" }, { v: "diagnostico", l: "Diagnóstico" }, { v: "cotizado", l: "Cotizadas" },
  { v: "aprobado", l: "Aprobadas" }, { v: "en_reparacion", l: "En reparación" }, { v: "listo", l: "Listas" }, { v: "cerradas", l: "Cerradas" },
];
export const staffPhoto = (id: string) => `/api/taller/photos/${id}/file`;
export const publicPhoto = (host: string, t: string, id: string) => `/api/public/taller-photo?host=${encodeURIComponent(host)}&t=${encodeURIComponent(t)}&id=${encodeURIComponent(id)}`;
export const normPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Reduce una foto del celular a un tamaño que el servidor acepte (≤ 260.000 caracteres). */
export async function resizeImage(file: File): Promise<string> {
  const src = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("No se pudo leer la foto.")); r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Ese archivo no es una imagen válida.")); i.src = src; });
  let max = 1280, q = 0.78;
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL("image/jpeg", q);
    if (out.length <= 250000) return out;
    max = Math.round(max * 0.78); q = Math.max(0.5, q - 0.06);
  }
  throw new Error("La foto es demasiado grande. Prueba con otra.");
}
