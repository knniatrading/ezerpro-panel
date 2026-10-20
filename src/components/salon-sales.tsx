"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHOD_TEXT, PAY_METHODS, addDays, niceDate, timeCO, todayCO } from "@/lib/salon";
import type { SalonProfileData, SalonSaleDetail, SalonSaleList } from "@/lib/types";
import { NoAccess } from "./no-access";
import { Dlg, FRONT, SalonReceipt, errMsg, useSalonAccess } from "./salon-common";

function SaleDialog({ id, admin, onClose, onChanged }: { id: string; admin: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, error, reload } = useResource<SalonSaleDetail>(`/salon/sales/${id}`);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [print, setPrint] = useState(false);
  useEffect(() => { if (!print) return; const t = setTimeout(() => { window.print(); setPrint(false); }, 80); return () => clearTimeout(t); }, [print]);
  if (error) return <div><h2 id="dlg-title" tabIndex={-1}>Venta</h2><p className="form-error" role="alert">{error}</p></div>;
  if (!data) return <div><h2 id="dlg-title" tabIndex={-1}>Venta</h2><p className="lede">Cargando…</p></div>;
  const s = data.sale;
  async function doVoid() {
    if (reason.trim().length < 3) return setErr("Escribe el motivo.");
    try { await api(`/salon/sales/${id}/void`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }); onChanged(); reload(); setVoiding(false); } catch (x) { setErr(errMsg(x)); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Venta #{s.number} {s.status === "anulada" ? <span className="badge badge--warn">Anulada</span> : null}</h2>
      <p className="lede">{niceDate(s.createdAt)} {timeCO(s.createdAt)} · {s.clientName ?? "Sin cliente"} · {METHOD_TEXT[s.method] ?? s.method} · cobró {s.createdByName ?? "—"}</p>
      <div className="table-wrap"><table className="table"><thead><tr><th>Qué</th><th>Quién</th><th>Total</th>{admin ? <th>Comisión</th> : null}</tr></thead><tbody>
        {s.items.map((i) => <tr key={i.id}><td>{i.qty > 1 ? `${i.qty} × ` : ""}{i.name}{i.changed ? <> <span className="badge badge--warn" title={`Precio de lista: ${formatMoney(i.listPrice)}`}>Precio ajustado</span></> : null}</td><td>{i.staffName ?? "—"}</td><td>{formatMoney(i.total)}</td>{admin ? <td>{formatMoney(i.commission ?? 0)}</td> : null}</tr>)}
      </tbody></table></div>
      <p className="fe-sum"><span>{s.discount ? `Subtotal ${formatMoney(s.subtotal)} · descuento −${formatMoney(s.discount)}` : "Total"}{s.tip ? ` · propina ${formatMoney(s.tip)}` : ""}</span><strong>{formatMoney(s.total)}</strong></p>
      {s.status === "anulada" ? <p className="note note--warn">Anulada por {s.voidedByName}: {s.voidReason}</p> : null}
      {voiding ? (
        <div className="field"><label htmlFor="sv-r">Motivo de la anulación</label><input id="sv-r" type="text" maxLength={200} value={reason} autoComplete="off" onChange={(e) => { setReason(e.target.value); setErr(null); }} />
          {err ? <p className="form-error" role="alert">{err}</p> : null}
          <div className="actions-cell"><button type="button" className="btn btn--danger-ghost btn--sm" onClick={doVoid}>Anular venta</button><button type="button" className="btn btn--secondary btn--sm" onClick={() => setVoiding(false)}>No</button></div></div>
      ) : null}
      <div className="dialog__actions no-print"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="button" className="btn btn--secondary" onClick={() => setPrint(true)}>Imprimir recibo</button>{admin && s.status === "completada" && !voiding ? <button type="button" className="btn btn--danger-ghost" onClick={() => setVoiding(true)}>Anular venta</button> : null}</div>
      {print ? <SalonReceipt detail={data} /> : null}
    </div>
  );
}

export function SalonSalesView() {
  const { state, allowed, role } = useSalonAccess(FRONT);
  const admin = role === "TENANT_ADMIN";
  const [from, setFrom] = useState(addDays(todayCO(), -6));
  const [to, setTo] = useState(todayCO());
  const [method, setMethod] = useState("");
  const [staff, setStaff] = useState("");
  const [q, setQ] = useState("");
  const [voided, setVoided] = useState(false);
  const cfg = useResource<SalonProfileData>(allowed && admin ? "/salon/profile" : null);
  const qs = new URLSearchParams();
  if (admin) { qs.set("from", from); qs.set("to", to); if (method) qs.set("method", method); if (staff) qs.set("staffId", staff); if (voided) qs.set("status", "anulada"); }
  if (q.trim()) qs.set("q", q.trim());
  const { data, error, reload } = useResource<SalonSaleList>(allowed ? `/salon/sales?${qs}` : null);
  const [open, setOpen] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>{admin ? "Ventas" : "Mis ventas de hoy"}</h1><p className="lede">{admin ? "Todo lo cobrado en el salón. Las anuladas no suman." : "Lo que cobraste hoy."}</p></div></div>
      <div className="kpis"><div className="kpi"><span>Vendido</span><strong>{formatMoney(data?.total ?? 0)}</strong></div><div className="kpi"><span>Propinas</span><strong>{formatMoney(data?.tips ?? 0)}</strong></div><div className="kpi"><span>Ventas</span><strong>{data?.count ?? 0}</strong></div></div>
      <div className="agenda-bar">
        {admin ? <>
          <label>Desde <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
          <label>Hasta <input type="date" value={to} min={from} max={todayCO()} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          <select aria-label="Medio de pago" value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Todos los medios</option>{PAY_METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
          <select aria-label="Profesional" value={staff} onChange={(e) => setStaff(e.target.value)}><option value="">Todos los profesionales</option>{(cfg.data?.staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <label className="check"><input type="checkbox" checked={voided} onChange={(e) => setVoided(e.target.checked)} /> Solo anuladas</label>
        </> : null}
        <label>Buscar <input type="search" value={q} placeholder="# de venta o cliente" onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Cobró</th><th>Total</th><th></th></tr></thead><tbody>
        {(data?.sales ?? []).map((s) => (
          <tr key={s.id}><td>{s.number}</td><td>{niceDate(s.createdAt)} {timeCO(s.createdAt)}</td><td>{s.clientName ?? "—"}</td><td>{METHOD_TEXT[s.method] ?? s.method}</td><td>{s.createdByName ?? "—"}</td><td>{formatMoney(s.total)}{s.status === "anulada" ? <> <span className="badge badge--warn">Anulada</span></> : null}</td><td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setOpen(s.id)}>Ver</button></td></tr>
        ))}
      </tbody></table></div>
      {data && !data.sales.length ? <p className="lede">No hay ventas en este periodo.</p> : null}
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <SaleDialog id={open} admin={admin} onClose={() => setOpen(null)} onChanged={reload} /> : null}</Dlg>
    </div>
  );
}
