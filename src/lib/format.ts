import type { Role } from "./types";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

export type StatusTone = "ok" | "info" | "warn";

export function statusInfo(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case "active":
      return { label: "Activo", tone: "ok" };
    case "trial":
      return { label: "En prueba", tone: "info" };
    case "suspended":
      return { label: "Suspendido", tone: "warn" };
    default:
      return { label: status, tone: "warn" };
  }
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "DISTRIBUTOR_ADMIN":
      return "Distribuidor";
    case "TENANT_ADMIN":
      return "Administrador de negocio";
    case "EMPLOYEE":
      return "Entrenador";
    case "CASHIER":
      return "Cajero";
    case "WAITER":
      return "Mesero";
    case "DRIVER":
      return "Domiciliario";
    default:
      return "Cliente";
  }
}

// Sin caracteres ambiguos (0/O, 1/l/I) para poder copiarla o dictarla sin errores.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generatePassword(length = 16): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

// Acepta "https://www.Mi-Distribuidor.com/" y lo deja como "mi-distribuidor.com".
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

export const DOMAIN_RE =
  /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Pizzería Don Juan" -> "pizzeria-don-juan"
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const moneyFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return moneyFmt.format(amount);
}

// Fecha de hoy en la zona del navegador, como AAAA-MM-DD (para el campo de fecha).
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Suma meses de calendario en UTC (31 ene + 1 mes = 28/29 feb). Igual que el servidor.
export function addMonthsUTC(date: Date, months: number): Date {
  const r = new Date(date.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

// Fechas de pago/vencimiento: el servidor las guarda a mediodía UTC, así que se muestran en UTC.
const dateUtcFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateUTC(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? "" : dateUtcFmt.format(d);
}

export type PayTone = "ok" | "warn" | "danger" | "muted";

/** Estado de pago de un cliente según hasta cuándo está pagado. */
export function payStatus(
  paidUntil: string | null,
  now: Date = new Date(),
): { label: string; detail: string; tone: PayTone; overdue: boolean } {
  if (!paidUntil) {
    return { label: "Sin pagos", detail: "Aún no registra pagos", tone: "muted", overdue: false };
  }
  const end = new Date(paidUntil);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diff = Math.round((endDay - todayUtc) / 86400000);
  const until = formatDateUTC(end);
  if (diff < 0) {
    const n = -diff;
    return {
      label: "Vencido",
      detail: `Venció el ${until} (hace ${n} ${n === 1 ? "día" : "días"})`,
      tone: "danger",
      overdue: true,
    };
  }
  if (diff <= 7) {
    return {
      label: "Vence pronto",
      detail: `Pagado hasta el ${until} (${diff === 0 ? "vence hoy" : `en ${diff} ${diff === 1 ? "día" : "días"}`})`,
      tone: "warn",
      overdue: false,
    };
  }
  return { label: "Al día", detail: `Pagado hasta el ${until}`, tone: "ok", overdue: false };
}

export const PAY_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
};

/** Convierte lo que se escribe ("12.500", "12500") en pesos enteros; 0 si está vacío. */
export function parsePesos(text: string): number {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}
