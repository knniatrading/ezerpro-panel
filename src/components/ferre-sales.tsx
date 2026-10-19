"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { LIST_TEXT, METHOD_TEXT, addDays, fmtQty, todayCO } from "@/lib/ferre";
import type { FerreSale, FerreSaleDetail, FerreSalesRes } from "@/lib/types";
import { NoAccess } from "./no-access";
import { Dlg, FerreReceipt, errMsg, useFerreAccess, usePrintWhen } from "./ferre-common";

const hour = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function SaleDialog({ id, admin, onClose, onChanged, onPrint }: { id: string; admin: boolean; onClose: () => void; onChanged: () => void; onPrint: (d: FerreSaleDetail) => void }) {
  const { data, error } = useResource<FerreSaleDetail>(`/ferre/sales/${id}`);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <div><h2 id="dlg-title" tabIndex={-1}>Venta</h2><p className="form-error" role="alert">{error}</p></div>;
  if (!data) return <div><h2 id="dlg-title" tabIndex={-1}>Venta</h2><p className="lede">Cargando…</p></div>;
  const s = data.sale;
  async function doVoid(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/ferre/sales/${id}/void`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }); onChanged(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Venta #{s.number} {s.status === "anulada" ? <span className="badge badge--warn">Anulada</span> : null}</h2>
      <p className="lede">{hour(s.createdAt)} · {s.createdByName ?? "—"} · {METHOD_TEXT[s.method]}{s.customerName ? ` · ${s.customerName}` : ""} · Lista {LIST_TEXT[s.priceList] ?? s.priceList}</p>
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>
        {s.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{fmtQty(i.qty)} {i.unit}</td><td>{formatMoney(i.unitPrice)}</td><td>{formatMoney(i.total)}</td></tr>)}
      </tbody></table></div>
      <p>{s.discount ? <>Descuento: <b>-{formatMoney(s.discount)}</b> · </> : null}Total: <b>{formatMoney(s.total)}</b>{s.method === "credito" ? <> · Abonado {formatMoney(s.paid)}</> : null}{admin && s.profit !== null && s.status === "completada" ? <> · Ganancia <b>{formatMoney(s.profit)}</b></> : null}</p>
      {s.status === "anulada" ? <p className="note">Anulada por {s.voidedByName}: {s.voidReason}</p> : null}
      {voiding ? (
        <form onSubmit={doVoid} noValidate>
          <div className="field"><label htmlFor="vd-r">Motivo de la anulación</label><input id="vd-r" type="text" maxLength={200} value={reason} autoComplete="off" onChange={(e) => { setReason(e.target.value); setErr(null); }} /></div>
          <p className="field__hint">La mercancía vuelve al inventario.</p>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setVoiding(false)}>Volver</button><button type="submit" className="btn btn--danger" disabled={busy || reason.trim().length < 3}>{busy ? "Anulando…" : "Anular venta"}</button></div>
        </form>
      ) : (
        <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="button" className="btn btn--secondary" onClick={() => onPrint(data)}>Imprimir recibo</button>{admin && s.status === "completada" ? <button type="button" className="btn btn--danger-ghost" onClick={() => setVoiding(true)}>Anular venta</button> : null}</div>
      )}
    </div>
  );
}

export function FerreSalesView() {
  const { state, allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const today = todayCO();
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [q, setQ] = useState("");
  const [onlyVoid, setOnlyVoid] = useState(false);
  const qs = admin ? `?from=${from}&to=${to}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}${onlyVoid ? "&status=anulada" : ""}` : "";
  const { data, error, reload } = useResource<FerreSalesRes>(allowed ? `/ferre/sales${qs}` : null);
  const [open, setOpen] = useState<FerreSale | null>(null);
  const [print, setPrint] = useState<FerreSaleDetail | null>(null);
  usePrintWhen(print, () => setPrint(null));
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="no-print">
        <div className="page-head"><div><h1>{admin ? "Ventas de mostrador" : "Mis ventas de hoy"}</h1><p className="lede">{admin ? "Todas las ventas del negocio, con su responsable." : "Solo ves las ventas que cobraste hoy."}</p></div></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {admin ? (
          <div className="agenda-bar">
            <label>Desde <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>Hasta <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} /></label>
            <label>Buscar <input type="search" value={q} placeholder="# de venta o cliente" onChange={(e) => setQ(e.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={onlyVoid} onChange={(e) => setOnlyVoid(e.target.checked)} /> Solo anuladas</label>
          </div>
        ) : null}
        <div className="kpis"><div className="kpi"><span>Ventas</span><strong>{data?.count ?? 0}</strong></div><div className="kpi"><span>Total vendido</span><strong>{formatMoney(data?.total ?? 0)}</strong></div>{admin ? <div className="kpi"><span>Ganancia</span><strong>{formatMoney(data?.profit ?? 0)}</strong></div> : null}</div>
        <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Cajero</th><th></th></tr></thead><tbody>
          {(data?.sales ?? []).map((s) => (
            <tr key={s.id} className={s.status === "anulada" ? "is-off" : ""}><td><b>{s.number}</b></td><td>{hour(s.createdAt)}</td><td>{s.customerName ?? <span className="field__hint">Mostrador</span>}</td><td>{METHOD_TEXT[s.method]}</td><td>{formatMoney(s.total)} {s.status === "anulada" ? <span className="badge badge--warn">Anulada</span> : null}</td><td>{s.createdByName}</td><td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setOpen(s)}>Ver</button></td></tr>
          ))}
        </tbody></table></div>
        {data && !data.sales.length ? <p className="lede">No hay ventas en este periodo.</p> : null}
      </div>
      {print ? <FerreReceipt detail={print} /> : null}
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <SaleDialog id={open.id} admin={admin} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); reload(); }} onPrint={(d) => { setOpen(null); setPrint(d); }} /> : null}</Dlg>
    </div>
  );
}
