export const RIDE_STATUS: Record<string, { label: string; tone: "ok" | "info" | "warn" | "muted" }> = {
  solicitado: { label: "Nueva solicitud", tone: "warn" },
  negociando: { label: "Negociando precio", tone: "info" },
  aceptado: { label: "Precio acordado", tone: "ok" },
  en_curso: { label: "En curso", tone: "info" },
  completado: { label: "Terminado", tone: "ok" },
  cancelado: { label: "Cancelado", tone: "muted" },
};

/** Teléfono colombiano de 10 dígitos → "300 123 4567". Otros se dejan como llegan. */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return "";
  return /^\d{10}$/.test(p) ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p;
}

/** Número para WhatsApp: los celulares colombianos de 10 dígitos llevan el indicativo 57. */
export function waNumber(p: string): string {
  return /^3\d{9}$/.test(p) ? `57${p}` : p;
}

/** Tarjeta de contacto (.vcf) para que el pasajero guarde al conductor en su celular. */
export function vcard(opts: { name: string; phone: string; org?: string; note?: string; url?: string }): string {
  const esc = (v: string) => v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const tel = /^\d{10}$/.test(opts.phone) ? `+57${opts.phone}` : `+${opts.phone}`;
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(opts.name)}`,
    `TEL;TYPE=CELL:${tel}`,
    opts.org ? `ORG:${esc(opts.org)}` : "",
    opts.note ? `NOTE:${esc(opts.note)}` : "",
    opts.url ? `URL:${opts.url}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadText(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
