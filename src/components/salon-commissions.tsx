"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { addDays, niceDate, timeCO, todayCO, weekStart } from "@/lib/salon";
import type { SalonCommDetail, SalonCommissions, SalonMine, SalonPayout } from "@/lib/types";
import { NoAccess } from "./no-access";
import { useSession } from "./session";
import { ADMIN, Dlg, errMsg, useSalonAccess } from "./salon-common";

const KIND: Record<string, string> = { servicio: "Servicio", producto: "Producto", propina: "Propina" };

function Detail({ staffId, from, to, admin, onClose, onChanged }: { staffId: string; from: string; to: string; admin: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, error, reload } = useResource<SalonCommDetail>(`/salon/commissions/${staffId}?from=${from}&to=${to}`);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  async function pay() {
    setBusy(true); setErr(null);
    try { await api(`/salon/commissions/${staffId}/payout`, { method: "POST", body: JSON.stringify({ from, to, note: note.trim() || undefined }) }); setAsk(false); onChanged(); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  if (error) return <div><h2 id="dlg-title" tabIndex={-1}>Detalle</h2><p className="form-error" role="alert">{error}</p></div>;
  if (!data) return <div><h2 id="dlg-title" tabIndex={-1}>Detalle</h2><p className="lede">Cargando…</p></div>;
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>{data.staff.name}</h2>
      <p className="lede">Del {niceDate(from)} al {niceDate(to)}</p>
      <div className="kpis">
        <div className="kpi"><span className="kpi__label">Servicios</span><b>{formatMoney(data.services.commission)}</b></div>
        <div className="kpi"><span className="kpi__label">Productos</span><b>{formatMoney(data.products.commission)}</b></div>
        <div className="kpi"><span className="kpi__label">Propinas</span><b>{formatMoney(data.tips)}</b></div>
        <div className="kpi"><span className="kpi__label">Pendiente de pago</span><b>{formatMoney(data.pending)}</b></div>
      </div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Venta</th><th>Qué</th><th>Vendido</th><th>%</th><th>Le toca</th></tr></thead><tbody>
        {data.lines.map((l) => (
          <tr key={l.id}><td>#{l.saleNumber}<br /><span className="field__hint">{niceDate(l.at)} {timeCO(l.at)}</span></td><td>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ""}<br /><span className="field__hint">{KIND[l.kind] ?? l.kind}{l.clientName ? ` · ${l.clientName}` : ""}</span></td><td>{formatMoney(l.total)}</td><td>{l.kind === "propina" ? "100%" : `${l.pct}%`}</td><td><b>{formatMoney(l.kind === "propina" ? l.total : l.commission)}</b>{l.paid ? <><br /><span className="badge badge--ok">Pagado</span></> : null}</td></tr>
        ))}
        {!data.lines.length ? <tr><td colSpan={5}>No hay ventas en este periodo.</td></tr> : null}
      </tbody></table></div>
      {admin && data.pending > 0 ? (
        <div className="field"><label htmlFor="po-n">Nota del pago (opcional)</label><input id="po-n" type="text" maxLength={160} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
          {!ask ? <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={() => setAsk(true)}>Liquidar {formatMoney(data.pending)}</button>
            : <div className="dialog__actions"><span>¿Marcar {formatMoney(data.pending)} como pagado a {data.staff.name}?</span><button className="btn btn--secondary" onClick={() => setAsk(false)}>No</button><button className="btn btn--primary" disabled={busy} onClick={pay}>{busy ? "Guardando…" : "Sí, ya pagué"}</button></div>}
        </div>
      ) : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <div className="dialog__actions"><button className="btn btn--secondary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

function Payouts({ rows }: { rows: SalonPayout[] }) {
  if (!rows.length) return <p className="lede">Todavía no hay pagos registrados.</p>;
  return (
    <div className="table-wrap"><table className="table"><thead><tr><th>Pagado</th><th>Quién</th><th>Periodo</th><th>Total</th></tr></thead><tbody>
      {rows.map((p) => <tr key={p.id}><td>{niceDate(p.paidAt)}<br /><span className="field__hint">{p.byName ?? ""}</span></td><td>{p.staffName}</td><td>{niceDate(p.fromYmd)} – {niceDate(p.toYmd)}</td><td><b>{formatMoney(p.total)}</b>{p.note ? <><br /><span className="field__hint">{p.note}</span></> : null}</td></tr>)}
    </tbody></table></div>
  );
}

export function SalonCommissionsView() {
  const { state, allowed } = useSalonAccess(ADMIN);
  const today = todayCO();
  const [from, setFrom] = useState(weekStart(today));
  const [to, setTo] = useState(today);
  const { data, error, reload } = useResource<SalonCommissions>(allowed ? `/salon/commissions?from=${from}&to=${to}` : null);
  const pays = useResource<SalonPayout[]>(allowed ? "/salon/payouts" : null);
  const [open, setOpen] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const ws = weekStart(today);
  const preset = (f: string, t: string) => { setFrom(f); setTo(t); };
  const changed = () => { reload(); pays.reload(); };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Comisiones</h1><p className="lede">Lo que le toca a cada profesional, calculado solo con cada venta. Sin cuaderno.</p></div></div>
      <div className="chips" aria-label="Periodo">
        <button type="button" className={from === ws && to === today ? "is-on" : ""} onClick={() => preset(ws, today)}>Esta semana</button>
        <button type="button" className={from === addDays(ws, -7) && to === addDays(ws, -1) ? "is-on" : ""} onClick={() => preset(addDays(ws, -7), addDays(ws, -1))}>Semana pasada</button>
        <button type="button" className={from === `${today.slice(0, 8)}01` && to === today ? "is-on" : ""} onClick={() => preset(`${today.slice(0, 8)}01`, today)}>Este mes</button>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="cm-f">Desde</label><input id="cm-f" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div>
        <div className="field"><label htmlFor="cm-t">Hasta</label><input id="cm-t" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {data ? (
        <>
          <div className="kpis">
            <div className="kpi"><span className="kpi__label">Vendido</span><b>{formatMoney(data.totals.sold)}</b></div>
            <div className="kpi"><span className="kpi__label">Comisiones</span><b>{formatMoney(data.totals.commission)}</b></div>
            <div className="kpi"><span className="kpi__label">Por pagar</span><b>{formatMoney(data.totals.pending)}</b></div>
          </div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Profesional</th><th>Servicios</th><th>Productos</th><th>Propinas</th><th>Total</th><th>Por pagar</th><th></th></tr></thead><tbody>
            {data.staff.map((s) => (
              <tr key={s.staffId}><td><b>{s.name}</b><br /><span className="field__hint">{s.commissionPct}% / {s.productPct}%</span></td><td>{formatMoney(s.services.commission)}<br /><span className="field__hint">{s.services.count} de {formatMoney(s.services.total)}</span></td><td>{formatMoney(s.products.commission)}<br /><span className="field__hint">{s.products.count} de {formatMoney(s.products.total)}</span></td><td>{formatMoney(s.tips)}</td><td><b>{formatMoney(s.total)}</b></td><td>{s.pending > 0 ? <b>{formatMoney(s.pending)}</b> : <span className="badge badge--ok">Al día</span>}</td>
                <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setOpen(s.staffId)}>{s.pending > 0 ? "Ver y liquidar" : "Ver detalle"}</button></td></tr>
            ))}
          </tbody></table></div>
        </>
      ) : null}
      <h2>Pagos hechos</h2>
      <Payouts rows={pays.data ?? []} />
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <Detail staffId={open} from={from} to={to} admin onClose={() => setOpen(null)} onChanged={changed} /> : null}</Dlg>
    </div>
  );
}

export function SalonMineView() {
  const { state, allowed } = useSalonAccess(["TENANT_ADMIN", "CASHIER", "EMPLOYEE"]);
  const { data, error } = useResource<SalonMine>(allowed ? "/salon/my-commissions" : null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Mis comisiones</h1><p className="lede">Lo que llevas ganado, siempre al día.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {data && !data.linked ? <p className="lede">Tu usuario todavía no está vinculado a un profesional. Pídele al administrador que lo vincule en «Profesionales y servicios».</p> : null}
      {data && data.linked ? (
        <>
          <div className="kpis">
            <div className="kpi"><span className="kpi__label">Hoy</span><b>{formatMoney(data.today.total)}</b></div>
            <div className="kpi"><span className="kpi__label">Esta semana</span><b>{formatMoney(data.week.total)}</b></div>
            <div className="kpi"><span className="kpi__label">Este mes</span><b>{formatMoney(data.month.total)}</b></div>
            <div className="kpi"><span className="kpi__label">Pendiente de pago</span><b>{formatMoney(data.month.pending)}</b></div>
          </div>
          <h2>Últimos servicios y ventas</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>Venta</th><th>Qué</th><th>Le toca</th></tr></thead><tbody>
            {data.lines.map((l) => <tr key={l.id}><td>#{l.saleNumber}<br /><span className="field__hint">{niceDate(l.at)} {timeCO(l.at)}</span></td><td>{l.name}<br /><span className="field__hint">{KIND[l.kind] ?? l.kind}</span></td><td><b>{formatMoney(l.kind === "propina" ? l.total : l.commission)}</b>{l.paid ? <> <span className="badge badge--ok">Pagado</span></> : null}</td></tr>)}
            {!data.lines.length ? <tr><td colSpan={3}>Aún no hay ventas.</td></tr> : null}
          </tbody></table></div>
          <h2>Pagos recibidos</h2>
          <Payouts rows={data.payouts} />
        </>
      ) : null}
    </div>
  );
}

export function SalonCommissionsRoute() {
  const { state } = useSession();
  if (state.status !== "in") return null;
  return state.user.role === "TENANT_ADMIN" ? <SalonCommissionsView /> : <SalonMineView />;
}
