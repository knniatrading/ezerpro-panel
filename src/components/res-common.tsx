"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSession } from "./session";
export { errMsg, Dlg } from "./clinic-common";

export const ADMIN = ["TENANT_ADMIN"];
export const ADMIN_BOARD = ["TENANT_ADMIN", "EMPLOYEE"];
export const ADMIN_GATE = ["TENANT_ADMIN", "CASHIER"];
export const ALL = ["TENANT_ADMIN", "CASHIER", "EMPLOYEE"];

export function useResAccess(roles: string[] = ALL) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("residencial");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}

export function Pill({ tone, children }: { tone: "ok" | "info" | "warn"; children: React.ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return <div className="chips" role="tablist" aria-label="Sección">{tabs.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "is-on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

/** Imagen del código QR de un enlace o texto. */
export function QrImg({ value, size = 220, label }: { value: string; size?: number; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let off = false; QRCode.toDataURL(value, { width: size * 3, margin: 1 }).then((u) => { if (!off) setSrc(u); }).catch(() => { if (!off) setSrc(null); }); return () => { off = true; }; }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label ?? "Código QR"} width={size} height={size} style={{ imageRendering: "pixelated", background: "#fff" }} />;
}

export function CopyBtn({ text, label = "Copiar enlace" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn--secondary btn--sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* sin portapapeles */ } }}>{ok ? "¡Copiado!" : label}</button>;
}

export function Empty({ children }: { children: React.ReactNode }) { return <p className="lede">{children}</p>; }
export function Err({ msg }: { msg: string | null }) { return <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>; }

export interface UnitOpt { id: string; label: string; kind: string; tower: string | null }
/** Lista de unidades para elegir (portería, administración). */
export function useUnitOptions(enabled = true) {
  const [list, setList] = useState<UnitOpt[]>([]);
  useEffect(() => { if (!enabled) return; import("@/lib/api").then(({ api }) => api<UnitOpt[]>("/residential/unit-options").then(setList).catch(() => setList([]))); }, [enabled]);
  return list;
}
export function UnitSelect({ id, value, onChange, label = "Unidad", opts, placeholder = "Elige la unidad…" }: { id: string; value: string; onChange: (v: string) => void; label?: string; opts: UnitOpt[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const f = q.trim() ? opts.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : opts;
  const shown = value && !f.some((o) => o.id === value) ? [opts.find((o) => o.id === value)!, ...f].filter(Boolean) : f;
  return (
    <div className="field"><label htmlFor={id}>{label}</label>
      {opts.length > 12 ? <input type="search" aria-label="Filtrar unidades" placeholder="Escribe para filtrar (ej. 101)" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" /> : null}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder}</option>{shown.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
  );
}
