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
      return "Empleado";
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
