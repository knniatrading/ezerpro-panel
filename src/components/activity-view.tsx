"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { rangeOf, stampCO, type Range } from "@/lib/dates";
import { formatMoney, roleLabel } from "@/lib/format";
import type { AuditItem, AuditResponse } from "@/lib/types";
import { PeriodPicker } from "./period-picker";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

const KEY_LABEL: Record<string, string> = { name: "nombre", price: "precio", amount: "valor", status: "estado", months: "meses", method: "forma de pago", finalPrice: "valor final", role: "rol", reason: "motivo", slug: "dirección", companyName: "empresa", domain: "dominio", niche: "tipo de negocio" };
const MONEY = new Set(["price", "amount", "finalPrice", "perKm", "baseFee", "minFare", "deliveryFee", "payRate"]);

function detail(meta: AuditItem["meta"]): string {
  if (!meta) return "";
  return Object.entries(meta)
    .filter(([k]) => k !== "ruta" && k !== "id" && KEY_LABEL[k])
    .map(([k, v]) => `${KEY_LABEL[k]}: ${MONEY.has(k) && typeof v === "number" ? formatMoney(v) : String(v)}`)
    .join(" · ");
}

export function ActivityView() {
  const { state } = useSession();
  const allowed = state.status === "in" && ["SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "TENANT_ADMIN"].includes(state.user.role);
  const [range, setRange] = useState<Range>(() => rangeOf("semana"));
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (before?: string | null) => {
    setLoading(true);
    setErr(null);
    try {
      const qs = `from=${range.from}&to=${range.to}${q ? `&q=${encodeURIComponent(q)}` : ""}${before ? `&before=${encodeURIComponent(before)}` : ""}`;
      const r = await api<AuditResponse>(`/audit?${qs}`);
      setItems((cur) => (before ? [...cur, ...r.items] : r.items));
      setNext(r.next);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo cargar la actividad.");
    } finally {
      setLoading(false);
    }
  }, [range, q]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (state.status === "in" && !allowed) return <NoAccess />;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Actividad</h1>
          <p className="lede">Quién hizo qué y cuándo: accesos, cambios de precios, pagos y más. Se guarda un año.</p>
        </div>
      </header>
      <PeriodPicker value={range} onChange={setRange} />
      <form className="field-row" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }} style={{ margin: "12px 0" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="a-q">Buscar</label>
          <input id="a-q" type="search" value={text} placeholder="Correo o acción (ej: contraseña, pago)" autoComplete="off" onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--secondary" style={{ alignSelf: "flex-end" }}>Buscar</button>
      </form>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {!loading && items.length === 0 && !err ? <p className="note">No hay actividad en este periodo.</p> : null}
      {items.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Quién</th><th>Qué hizo</th><th>Detalle</th><th>Desde</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={i.action === "login_fail" ? "row--warn" : undefined}>
                  <td>{stampCO(i.at)}</td>
                  <td>{i.email ?? "—"}{i.role ? <><br /><span className="field__hint">{roleLabel(i.role as never)}</span></> : null}</td>
                  <td>{i.summary}</td>
                  <td>{detail(i.meta)}</td>
                  <td className="mono">{i.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {next ? <button type="button" className="btn btn--secondary" disabled={loading} onClick={() => load(next)}>{loading ? "Cargando…" : "Ver más"}</button> : null}
    </div>
  );
}
