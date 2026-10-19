"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { SALE_METHODS, fmtQty, waLink } from "@/lib/ferre";
import type { FerreOrder, FerreOrderList } from "@/lib/types";
import { Dlg, NumInput, errMsg, useFerreAccess } from "./ferre-common";

const STATUS: Record<string, { label: string; tone: "ok" | "info" | "warn" }> = {
  nuevo: { label: "Nuevo", tone: "warn" }, preparando: { label: "Preparando", tone: "info" }, despachado: { label: "Despachado", tone: "ok" }, cancelado: { label: "Cancelado", tone: "info" },
};
const hour = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const OrderBadge = ({ s }: { s: string }) => <span className={`badge badge--${(STATUS[s] ?? STATUS.nuevo).tone}`}>{(STATUS[s] ?? { label: s }).label}</span>;

function OrderDialog({ o, admin, onClose, onChanged }: { o: FerreOrder; admin: boolean; onClose: () => void; onChanged: () => void }) {
  const [mode, setMode] = useState<"ver" | "despachar" | "cancelar">("ver");
  const [method, setMethod] = useState(o.payMethod === "transferencia" || o.payMethod === "tarjeta" ? o.payMethod : "efectivo");
  const [paid, setPaid] = useState("");
  const [force, setForce] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = o.status === "nuevo" || o.status === "preparando";
  const home = o.delivery === "domicilio";
  async function act(path: string, body: object, after?: () => void) {
    setBusy(true); setErr(null);
    try { await api(`/ferre/orders/${o.id}/${path}`, { method: "POST", body: JSON.stringify(body) }); (after ?? onChanged)(); }
    catch (x) { const m = errMsg(x); setErr(m); if (admin && /vencidas/.test(m)) setForce(true); setBusy(false); }
  }
  const first = o.customerName.split(" ")[0];
  const wa = waLink(o.phone, `Hola ${first}, recibimos tu pedido #${o.number} por ${formatMoney(o.total)}. ${home ? "Te lo despachamos a domicilio." : "Te avisamos cuando esté listo para recoger."}`);
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Pedido #{o.number} <OrderBadge s={o.status} /></h2>
      <p className="lede">{o.customerName} · {o.phone} · {hour(o.createdAt)}</p>
      <p><b>{home ? "Domicilio" : "Recoge en el local"}</b>{home && o.address ? `: ${o.address}` : ""} · Paga en <b>{o.payMethod}</b></p>
      {o.note ? <p className="note">Nota del cliente: {o.note}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead><tbody>
        {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{fmtQty(i.qty)} {i.unit}</td><td>{formatMoney(i.total)}</td></tr>)}
      </tbody></table></div>
      <p>Total: <b>{formatMoney(o.total)}</b></p>
      {o.status === "despachado" ? <p className="note">Despachado por {o.handledByName ?? "—"}{o.saleNumber ? ` · Venta #${o.saleNumber}` : ""}</p> : null}
      {o.status === "cancelado" ? <p className="note">Cancelado: {o.cancelReason}</p> : null}
      {mode === "despachar" ? (
        <div>
          <p className="lede">{home ? "Al despachar" : "Al entregar"} se registra la venta a tu nombre y se descuenta el inventario.</p>
          <div className="chips" role="group" aria-label="Medio de pago">{SALE_METHODS.map((m) => <button key={m.v} type="button" className={method === m.v ? "is-on" : ""} aria-pressed={method === m.v} onClick={() => { setMethod(m.v); setErr(null); }}>{m.l}</button>)}</div>
          {method === "credito" ? <div className="field"><label htmlFor="od-p">Abono inicial (opcional)</label><NumInput id="od-p" value={paid} onChange={setPaid} /><p className="field__hint">Solo para clientes registrados con cupo de crédito.</p></div> : null}
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}{force ? " Presiona de nuevo para autorizar." : ""}</p> : null}</div>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setMode("ver")}>Volver</button><button type="button" className="btn btn--primary" disabled={busy} onClick={() => act("dispatch", { method, paid: method === "credito" ? Number(paid || 0) : undefined, force: force || undefined })}>{busy ? "Registrando…" : home ? "Despachar y registrar venta" : "Entregar y registrar venta"}</button></div>
        </div>
      ) : mode === "cancelar" ? (
        <div>
          <div className="field"><label htmlFor="oc-r">Motivo de la cancelación</label><input id="oc-r" type="text" maxLength={200} value={reason} autoComplete="off" onChange={(e) => { setReason(e.target.value); setErr(null); }} /></div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setMode("ver")}>Volver</button><button type="button" className="btn btn--danger" disabled={busy || reason.trim().length < 3} onClick={() => act("cancel", { reason: reason.trim() })}>{busy ? "Cancelando…" : "Cancelar pedido"}</button></div>
        </div>
      ) : (
        <div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button>
            <a className="btn btn--secondary" href={wa} target="_blank" rel="noreferrer">WhatsApp al cliente</a>
            {open && o.status === "nuevo" ? <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => act("status", { status: "preparando" })}>Empezar a preparar</button> : null}
            {open ? <button type="button" className="btn btn--primary" onClick={() => setMode("despachar")}>{home ? "Despachar" : "Entregar"}</button> : null}
            {open ? <button type="button" className="btn btn--danger-ghost" onClick={() => setMode("cancelar")}>Cancelar pedido</button> : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pedidos que llegan por el catálogo o el QR. Al despacharlos se convierten en venta. */
export function FerreOrdersPanel({ onCount }: { onCount?: (n: number) => void }) {
  const { allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const [st, setSt] = useState("pendientes");
  const [q, setQ] = useState("");
  const { data, error, reload } = useResource<FerreOrderList>(allowed ? `/ferre/orders?status=${st}&q=${encodeURIComponent(q.trim())}` : null);
  const [open, setOpen] = useState<FerreOrder | null>(null);
  useEffect(() => { if (data) onCount?.(data.counts.pendientes); }, [data, onCount]);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 20000); return () => clearInterval(t); }, [reload]);
  const c = data?.counts;
  const filters: [string, string, number | undefined][] = [["pendientes", "Por despachar", c?.pendientes], ["despachado", "Despachados", c?.despachado], ["cancelado", "Cancelados", c?.cancelado], ["todos", "Todos", undefined]];
  return (
    <section aria-label="Pedidos">
      <p className="lede">Los pedidos llegan desde tu catálogo y el código QR. Al {`despacharlos o entregarlos`} se registran como venta.</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="chips" role="group" aria-label="Filtrar pedidos">{filters.map(([v, l, n]) => <button key={v} type="button" className={st === v ? "is-on" : ""} aria-pressed={st === v} onClick={() => setSt(v)}>{l}{n !== undefined ? ` (${n})` : ""}</button>)}</div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="# , nombre o celular" onChange={(e) => setQ(e.target.value)} /></label></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Cliente</th><th>Entrega</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
        {(data?.orders ?? []).map((o) => (
          <tr key={o.id}><td><b>{o.number}</b><br /><span className="field__hint">{hour(o.createdAt)}</span></td><td>{o.customerName}<br /><span className="field__hint">{o.phone}</span></td>
            <td>{o.delivery === "domicilio" ? <><b>Domicilio</b><br /><span className="field__hint">{o.address}</span></> : <b>Recoge en local</b>}</td><td>{formatMoney(o.total)}</td><td><OrderBadge s={o.status} /></td>
            <td className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setOpen(o)}>{o.status === "nuevo" || o.status === "preparando" ? "Atender" : "Ver"}</button></td></tr>
        ))}
      </tbody></table></div>
      {data && !data.orders.length ? <p className="lede">{st === "pendientes" ? "No hay pedidos por despachar. ¡Todo al día!" : "No hay pedidos."}</p> : null}
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <OrderDialog o={open} admin={admin} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); reload(); }} /> : null}</Dlg>
    </section>
  );
}
