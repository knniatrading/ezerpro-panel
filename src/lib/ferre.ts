import type { FerreKind } from "./types";
export { addDays, todayCO, waLink, weekdayName } from "./vet";
export { niceDate, dateCO } from "./clinic";

export const KINDS: { v: FerreKind; l: string; unit: string; hint: string }[] = [
  { v: "unidad", l: "Por unidad", unit: "und", hint: "Se vende de a uno: martillo, bulto, caja." },
  { v: "peso", l: "Por peso", unit: "kg", hint: "Se vende por kilos o fracciones: puntillas, alambre." },
  { v: "longitud", l: "Por longitud", unit: "m", hint: "Se vende por metros: cable, manguera, cadena." },
];
export const SALE_METHODS = [{ v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" }, { v: "tarjeta", l: "Tarjeta" }, { v: "credito", l: "A crédito" }];
export const PAY_METHODS = [{ v: "efectivo", l: "Efectivo" }, { v: "transferencia", l: "Transferencia" }, { v: "tarjeta", l: "Tarjeta" }, { v: "otro", l: "Otro" }];
export const METHOD_TEXT: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", credito: "Crédito", otro: "Otro" };
export const QUOTE_TEXT: Record<string, { label: string; tone: "ok" | "info" | "warn" }> = {
  solicitada: { label: "Solicitada por el cliente", tone: "warn" }, borrador: { label: "Borrador", tone: "info" }, enviada: { label: "Enviada", tone: "info" },
  aceptada: { label: "Vendida", tone: "ok" }, rechazada: { label: "Rechazada", tone: "info" },
};
export const LIST_TEXT: Record<string, string> = { detal: "Detal", mayorista: "Mayorista" };

/** Cantidad legible: 2, 1,5 o 0,25 (hasta 3 decimales). */
export const fmtQty = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 3 });
export const qtyOf = (n: number, unit: string) => `${fmtQty(n)} ${unit}`;
export const stepOf = (k: FerreKind) => (k === "unidad" ? 1 : 0.5);
/** Interpreta lo que escribe el cajero: "2,5" o "2.5". Devuelve NaN si no es un número. */
export function parseQty(s: string): number { const n = Number(s.trim().replace(",", ".")); return Number.isFinite(n) ? n : NaN; }
/** Total de una línea: igual que el servidor (redondeo al peso). */
export const lineTotal = (qty: number, price: number) => Math.floor((Math.round(qty * 1000) * price + 500) / 1000);
export const priceFor = (p: { priceDetal: number; priceMayor: number }, list: string) => (list === "mayorista" && p.priceMayor > 0 ? p.priceMayor : p.priceDetal);
export const publicCatalogUrl = (host: string) => `https://${host}/catalogo`;
