"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { fmtQty, waLink } from "@/lib/ferre";
import type { FerrePublicOrder } from "@/lib/types";

const STEPS = [["nuevo", "Recibido"], ["preparando", "Preparando"], ["despachado", "Entregado"]] as const;

/** Seguimiento del pedido para el cliente (enlace secreto). */
export function FerreOrderPage() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<FerrePublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    const load = () => api<FerrePublicOrder>("/public/ferre-order-track", { method: "POST", body: JSON.stringify({ host, t }) }).then(setD).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido." : e instanceof ApiError ? e.message : "No se pudo cargar el pedido."));
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [host]);
  if (error) return <div className="landing"><div className="landing__card"><h1>Pedido</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended || !d.order || !d.shop) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const o = d.order, s = d.shop;
  const cancelled = o.status === "cancelado";
  const idx = STEPS.findIndex(([k]) => k === o.status);
  const dom = o.delivery === "domicilio";
  return (
    <div className="doc-wrap">
      <article className="doc fe-quote">
        <header className="fe-quote__head">
          <div><h1>{s.name}</h1>{s.address ? <p>{s.address}</p> : null}{s.phone ? <p>Tel. {s.phone}</p> : null}</div>
          <div className="fe-quote__num"><b>Pedido #{o.number}</b><span className={`badge badge--${cancelled ? "danger" : o.status === "despachado" ? "ok" : "info"}`}>{cancelled ? "Cancelado" : o.status === "despachado" ? (dom ? "Enviado" : "Entregado") : o.status === "preparando" ? "Preparando" : "Recibido"}</span></div>
        </header>
        {cancelled ? <p className="note note--warn" role="status">Tu pedido fue cancelado{o.cancelReason ? `: ${o.cancelReason}` : "."}</p> : (
          <ol className="fe-steps" aria-label="Estado del pedido">{STEPS.map(([k, l], i) => <li key={k} className={i <= idx ? "is-done" : ""} aria-current={i === idx ? "step" : undefined}>{k === "despachado" ? (dom ? "Enviado" : "Listo / entregado") : l}</li>)}</ol>
        )}
        <p><b>Para:</b> {o.customerName} · {dom ? `Domicilio: ${o.address}` : "Recoger en la tienda"} · Pago: {o.payMethod}</p>
        <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>
          {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{fmtQty(i.qty)} {i.unit}</td><td>{formatMoney(i.unitPrice)}</td><td>{formatMoney(i.total)}</td></tr>)}
        </tbody></table></div>
        <p className="fe-sum"><span>Total</span> <strong>{formatMoney(o.total)}</strong></p>
        {o.note ? <p><b>Nota:</b> {o.note}</p> : null}
        <div className="actions-cell no-print">
          {s.phone ? <a className="btn btn--secondary" href={waLink(s.phone, `Hola, escribo por mi pedido #${o.number}.`)} target="_blank" rel="noreferrer">Escribir por WhatsApp</a> : null}
          <Link className="btn btn--secondary" href="/catalogo">Seguir comprando</Link>
        </div>
        <p className="field__hint no-print">Este enlace es personal: no lo compartas con extraños. Se actualiza solo.</p>
      </article>
    </div>
  );
}
