"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { LIST_TEXT, QUOTE_TEXT, fmtQty, niceDate, waLink } from "@/lib/ferre";
import type { FerrePublicQuote } from "@/lib/types";

/** Cotización que ve el cliente: se puede imprimir o guardar como PDF desde el navegador. */
export function FerreQuotePage() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<FerrePublicQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    api<FerrePublicQuote>("/public/ferre-quote", { method: "POST", body: JSON.stringify({ host, t }) }).then(setD).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido." : e instanceof ApiError ? e.message : "No se pudo cargar la cotización."));
  }, [host]);
  if (error) return <div className="landing"><div className="landing__card"><h1>Cotización</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended || !d.quote || !d.shop) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const q = d.quote, s = d.shop;
  const st = QUOTE_TEXT[q.status] ?? { label: q.status, tone: "info" as const };
  const accept = s.phone ? waLink(s.phone, `Hola, quiero aceptar la cotización #${q.number} por ${formatMoney(q.total)}.`) : null;
  return (
    <div className="doc-wrap">
      <article className="doc fe-quote">
        <header className="fe-quote__head">
          <div><h1>{s.name}</h1>{s.nit ? <p>NIT {s.nit}</p> : null}{s.address ? <p>{s.address}</p> : null}{s.phone ? <p>Tel. {s.phone}</p> : null}</div>
          <div className="fe-quote__num"><b>Cotización #{q.number}</b><span className={`badge badge--${st.tone}`}>{q.pending ? "En preparación" : q.status === "aceptada" ? "Vendida" : q.expired ? "Vencida" : st.label}</span><small>Válida hasta {niceDate(q.validUntil)}</small></div>
        </header>
        <p><b>Para:</b> {q.customerName}{q.customerPhone ? ` · ${q.customerPhone}` : ""} · Lista {LIST_TEXT[q.priceList] ?? q.priceList}</p>
        {q.pending ? <p className="note note--warn no-print" role="status">Recibimos tu solicitud. La ferretería revisará los productos y te enviará la cotización final. Los precios de abajo son de referencia.</p> : null}
        <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>
          {q.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{fmtQty(i.qty)} {i.unit}</td><td>{formatMoney(i.unitPrice)}</td><td>{formatMoney(i.total)}</td></tr>)}
        </tbody></table></div>
        <p className="fe-sum"><span>Total</span> <strong>{formatMoney(q.total)}</strong></p>
        {q.note ? <p><b>Nota:</b> {q.note}</p> : null}
        {s.note ? <p className="field__hint">{s.note}</p> : null}
        <div className="actions-cell no-print">
          <button type="button" className="btn btn--primary" onClick={() => window.print()}>Guardar en PDF / Imprimir</button>
          {accept && !q.pending && q.status !== "aceptada" ? <a className="btn btn--secondary" href={accept} target="_blank" rel="noreferrer">Aceptar por WhatsApp</a> : null}
          <Link className="btn btn--secondary" href="/">Ir a la ferretería</Link>
        </div>
        <p className="field__hint no-print">Este enlace es personal: no lo compartas con extraños.</p>
      </article>
    </div>
  );
}
