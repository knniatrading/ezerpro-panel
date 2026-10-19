"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { LIST_TEXT, QUOTE_TEXT, SALE_METHODS, dateCO, fmtQty, lineTotal, niceDate, parseQty, priceFor, waLink } from "@/lib/ferre";
import type { FerreCustomer, FerreProduct, FerreQuote } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { Dlg, NumInput, errMsg, useFerreAccess } from "./ferre-common";

type Line = { p: { id: string; name: string; unit: string; unitKind: string; priceDetal: number; priceMayor: number }; qty: string };

function Badge({ s }: { s: string }) {
  const t = QUOTE_TEXT[s] ?? { label: s, tone: "info" as const };
  return <span className={`badge badge--${t.tone}`}>{t.label}</span>;
}

/** Cotización rápida: busca productos, cantidades y listo. También sirve para corregir una existente. */
function QuoteEditor({ quote, onClose, onDone }: { quote: FerreQuote | null; onClose: () => void; onDone: (q: FerreQuote) => void }) {
  const [cust, setCust] = useState<FerreCustomer | null>(null);
  const [name, setName] = useState(quote?.customerName ?? "");
  const [phone, setPhone] = useState(quote?.customerPhone ?? "");
  const [cq, setCq] = useState("");
  const [cl, setCl] = useState<FerreCustomer[]>([]);
  const [term, setTerm] = useState("");
  const [res, setRes] = useState<FerreProduct[]>([]);
  const [lines, setLines] = useState<Line[]>(() => (quote?.items ?? []).filter((i) => i.productId).map((i) => ({ p: { id: i.productId as string, name: i.name, unit: i.unit, unitKind: "peso", priceDetal: i.unitPrice, priceMayor: i.unitPrice }, qty: String(i.qty).replace(".", ",") })));
  const [note, setNote] = useState(quote?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = quote ? quote.priceList : cust?.priceList ?? "detal";
  useEffect(() => {
    if (quote || cq.trim().length < 2) { setCl([]); return; }
    const h = setTimeout(() => { api<FerreCustomer[]>(`/ferre/customers?q=${encodeURIComponent(cq.trim())}`).then((r) => setCl(r.slice(0, 5))).catch(() => setCl([])); }, 200);
    return () => clearTimeout(h);
  }, [cq, quote]);
  useEffect(() => {
    if (term.trim().length < 1) { setRes([]); return; }
    const h = setTimeout(() => { api<FerreProduct[]>(`/ferre/products/search?q=${encodeURIComponent(term.trim())}`).then((r) => setRes(r.slice(0, 6))).catch(() => setRes([])); }, 150);
    return () => clearTimeout(h);
  }, [term]);
  const price = (l: Line) => priceFor(l.p, list);
  const total = lines.reduce((s, l) => { const q = parseQty(l.qty); return s + (q > 0 ? lineTotal(q, price(l)) : 0); }, 0);
  async function save() {
    setBusy(true); setErr(null);
    try {
      if (!lines.length) throw new Error("Agrega al menos un producto.");
      const items = lines.map((l) => { const q = parseQty(l.qty); if (!(q > 0)) throw new Error(`La cantidad de ${l.p.name} no es válida.`); return { productId: l.p.id, qty: q }; });
      if (!quote && !cust && name.trim().length < 2) throw new Error("Escribe el nombre del cliente.");
      const r = quote
        ? await api<FerreQuote>(`/ferre/quotes/${quote.id}`, { method: "PATCH", body: JSON.stringify({ items, note: note.trim() || null }) })
        : await api<FerreQuote>("/ferre/quotes", { method: "POST", body: JSON.stringify({ items, note: note.trim() || null, ...(cust ? { customerId: cust.id } : { customerName: name.trim(), customerPhone: phone.trim() || undefined }) }) });
      onDone(r);
    } catch (x) { setErr(x instanceof Error && !("status" in x) ? x.message : errMsg(x)); setBusy(false); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>{quote ? `Editar cotización #${quote.number}` : "Nueva cotización"}</h2>
      {!quote ? (
        cust ? <div className="field"><span className="label">Cliente</span><div className="pick-chip"><b>{cust.name} <span className="badge badge--info">{LIST_TEXT[cust.priceList]}</span></b><button type="button" className="btn btn--secondary btn--sm" onClick={() => { setCust(null); setCq(""); }}>Cambiar</button></div></div> : (
          <div className="field">
            <label htmlFor="qe-c">Cliente existente (busca por nombre o celular)</label>
            <input id="qe-c" type="search" value={cq} autoComplete="off" onChange={(e) => setCq(e.target.value)} />
            {cl.length ? <ul className="pick-list">{cl.map((c) => <li key={c.id}><button type="button" onClick={() => setCust(c)}><b>{c.name}</b> <span className="field__hint">{c.phone} · {LIST_TEXT[c.priceList]}</span></button></li>)}</ul> : null}
            <div className="field-row"><div className="field"><label htmlFor="qe-n">O escribe el nombre</label><input id="qe-n" type="text" maxLength={80} value={name} autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div><div className="field"><label htmlFor="qe-p">Celular</label><input id="qe-p" type="tel" inputMode="numeric" value={phone} autoComplete="off" onChange={(e) => setPhone(e.target.value)} /></div></div>
          </div>
        )
      ) : <p className="lede">{quote.customerName} · lista {LIST_TEXT[quote.priceList]}</p>}
      <div className="field"><label htmlFor="qe-q">Agregar producto</label><input id="qe-q" type="search" value={term} placeholder="Nombre, referencia o código" autoComplete="off" onChange={(e) => setTerm(e.target.value)} />
        {res.length ? <ul className="pick-list">{res.map((p) => <li key={p.id}><button type="button" onClick={() => { setLines((ls) => ls.some((l) => l.p.id === p.id) ? ls : [...ls, { p, qty: "1" }]); setTerm(""); setRes([]); }}><b>{p.name}</b> <span className="field__hint">{formatMoney(priceFor(p, list))} /{p.unit}</span></button></li>)}</ul> : null}</div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th></th></tr></thead><tbody>
        {lines.map((l, i) => { const q = parseQty(l.qty); return (
          <tr key={l.p.id}><td>{l.p.name}</td><td><input className="fe-qtyin" type="text" inputMode="decimal" aria-label={`Cantidad de ${l.p.name}`} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /> {l.p.unit}</td><td>{formatMoney(price(l))}</td><td>{q > 0 ? formatMoney(lineTotal(q, price(l))) : "—"}</td><td><button type="button" className="btn btn--danger-ghost btn--sm" aria-label={`Quitar ${l.p.name}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>✕</button></td></tr>
        ); })}
      </tbody></table></div>
      <p className="fe-sum"><span>Total</span> <strong>{formatMoney(total)}</strong></p>
      <div className="field"><label htmlFor="qe-no">Nota para el cliente (opcional)</label><input id="qe-no" type="text" maxLength={400} value={note} placeholder="Ej.: Materiales para la placa del segundo piso" autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="button" className="btn btn--primary" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar cotización"}</button></div>
    </div>
  );
}

export function FerreQuotesView() {
  const { state, allowed } = useFerreAccess();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, error, reload } = useResource<FerreQuote[]>(allowed ? `/ferre/quotes?${status ? `status=${status}&` : ""}q=${encodeURIComponent(q.trim())}` : null);
  const [nw, setNw] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const filters: [string, string][] = [["", "Todas"], ["solicitada", "Pedidas por clientes"], ["borrador", "Borradores"], ["enviada", "Enviadas"], ["aceptada", "Vendidas"], ["rechazada", "Rechazadas"]];
  return (
    <div className="page">
      <div className="page-head"><div><h1>Cotizaciones</h1><p className="lede">Presupuestos para obra en segundos. El cliente los ve en su celular y puede guardarlos en PDF.</p></div><button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Nueva cotización</button></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="chips" role="group" aria-label="Filtrar">{filters.map(([v, l]) => <button key={v} type="button" className={status === v ? "is-on" : ""} aria-pressed={status === v} onClick={() => setStatus(v)}>{l}</button>)}</div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="# o nombre del cliente" onChange={(e) => setQ(e.target.value)} /></label></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Vence</th><th></th></tr></thead><tbody>
        {(data ?? []).map((x) => (
          <tr key={x.id}><td><b><Link href={`/cotizaciones/${x.id}`}>{x.number}</Link></b></td><td>{x.customerName}<br /><span className="field__hint">{x.createdByName} · {dateCO(x.createdAt)}</span></td><td><Badge s={x.status} />{x.expired ? <> <span className="badge badge--warn">Vencida</span></> : null}</td><td>{formatMoney(x.total)}</td><td>{niceDate(x.validUntil)}</td><td className="actions-cell"><Link className="btn btn--secondary btn--sm" href={`/cotizaciones/${x.id}`}>Abrir</Link></td></tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">No hay cotizaciones.</p> : null}
      <Dlg open={nw} onClose={() => setNw(false)} wide>{nw ? <QuoteEditor quote={null} onClose={() => setNw(false)} onDone={(r) => { setNw(false); reload(); router.push(`/cotizaciones/${r.id}`); }} /> : null}</Dlg>
    </div>
  );
}

function ConvertDialog({ quote, onClose, onDone }: { quote: FerreQuote; onClose: () => void; onDone: (n: number) => void }) {
  const [method, setMethod] = useState("efectivo");
  const [paid, setPaid] = useState("");
  const [force, setForce] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { role } = useFerreAccess();
  async function go() {
    setBusy(true); setErr(null);
    try { const s = await api<{ number: number }>(`/ferre/quotes/${quote.id}/convert`, { method: "POST", body: JSON.stringify({ method, paid: method === "credito" ? Number(paid || 0) : undefined, force: force || undefined }) }); onDone(s.number); }
    catch (x) { const m = errMsg(x); setErr(m); if (role === "TENANT_ADMIN" && /vencidas/.test(m)) setForce(true); setBusy(false); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Vender cotización #{quote.number}</h2>
      <p className="lede">Se cobra a los precios de la cotización: <b>{formatMoney(quote.total)}</b>. El inventario se descuenta.</p>
      <div className="chips" role="group" aria-label="Medio de pago">{SALE_METHODS.map((m) => <button key={m.v} type="button" className={method === m.v ? "is-on" : ""} aria-pressed={method === m.v} onClick={() => { setMethod(m.v); setErr(null); }}>{m.l}</button>)}</div>
      {method === "credito" ? <div className="field"><label htmlFor="cv-p">Abono inicial (opcional)</label><NumInput id="cv-p" value={paid} onChange={setPaid} /><p className="field__hint">Solo para clientes registrados con cupo de crédito.</p></div> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}{force ? " Presiona Vender otra vez para autorizar." : ""}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="button" className="btn btn--primary" disabled={busy} onClick={go}>{busy ? "Vendiendo…" : "Vender"}</button></div>
    </div>
  );
}

export function FerreQuoteView({ id }: { id: string }) {
  const { state, allowed, role } = useFerreAccess();
  const router = useRouter();
  const { data: qt, error, reload } = useResource<FerreQuote>(allowed ? `/ferre/quotes/${id}` : null);
  const [edit, setEdit] = useState(false);
  const [conv, setConv] = useState(false);
  const [del, setDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/cotizaciones">← Volver</Link></div>;
  if (!qt) return <div className="page"><p className="lede">Cargando…</p></div>;
  const sold = qt.status === "aceptada";
  async function setStatus(status: string) { try { await api(`/ferre/quotes/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); reload(); } catch (x) { setMsg(errMsg(x)); } }
  async function copy() { try { await navigator.clipboard.writeText(qt!.url ?? ""); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMsg("No se pudo copiar el enlace."); } }
  function send() {
    const w = window.open("", "_blank");
    const text = `Hola ${qt!.customerName.split(" ")[0]}, te enviamos tu cotización #${qt!.number} por ${formatMoney(qt!.total)}. Puedes verla y guardarla en PDF aquí: ${qt!.url}`;
    const finish = () => { const href = qt!.customerPhone ? waLink(qt!.customerPhone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`; if (w) w.location.href = href; else window.location.href = href; };
    if (qt!.status === "enviada") { finish(); return; }
    api(`/ferre/quotes/${id}/status`, { method: "POST", body: JSON.stringify({ status: "enviada" }) }).then(() => { reload(); finish(); }).catch((x) => { w?.close(); setMsg(errMsg(x)); });
  }
  return (
    <div className="page">
      <div className="page-head"><div><p className="field__hint"><Link href="/cotizaciones">← Cotizaciones</Link></p><h1>Cotización #{qt.number} <Badge s={qt.status} /></h1><p className="lede">{qt.customerName}{qt.customerPhone ? ` · ${qt.customerPhone}` : ""} · Lista {LIST_TEXT[qt.priceList]} · Vence {niceDate(qt.validUntil)}{qt.expired ? " (vencida)" : ""}</p></div>
        <div className="actions-cell">
          {!sold && qt.status !== "rechazada" ? <button className="btn btn--primary btn--sm" onClick={send}>{qt.status === "enviada" ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}</button> : null}
          {!sold && qt.status !== "rechazada" && qt.status !== "solicitada" ? <button className="btn btn--secondary btn--sm" onClick={() => setConv(true)}>Vender</button> : null}
          <a className="btn btn--secondary btn--sm" href={qt.url} target="_blank" rel="noreferrer">Ver como cliente / PDF</a>
          <button className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
          {!sold ? <button className="btn btn--secondary btn--sm" onClick={() => setEdit(true)}>Editar</button> : null}
          {!sold && qt.status !== "rechazada" ? <button className="btn btn--secondary btn--sm" onClick={() => setStatus("rechazada")}>Marcar rechazada</button> : null}
          {!sold ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDel(true)}>Eliminar</button> : null}
        </div></div>
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      {qt.status === "solicitada" ? <p className="note note--warn" role="status">El cliente pidió esta cotización desde el catálogo. Revisa los productos, ajusta si hace falta y envíasela.</p> : null}
      {sold ? <p className="note" role="status">Se vendió como la venta #{qt.saleNumber}.</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>
        {qt.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{fmtQty(i.qty)} {i.unit}</td><td>{formatMoney(i.unitPrice)}</td><td>{formatMoney(i.total)}</td></tr>)}
      </tbody></table></div>
      <p className="fe-sum"><span>Total</span> <strong>{formatMoney(qt.total)}</strong></p>
      {qt.note ? <p className="lede">Nota: {qt.note}</p> : null}
      <Dlg open={edit} onClose={() => setEdit(false)} wide>{edit ? <QuoteEditor quote={qt} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload(); }} /> : null}</Dlg>
      <Dlg open={conv} onClose={() => setConv(false)}>{conv ? <ConvertDialog quote={qt} onClose={() => setConv(false)} onDone={() => { setConv(false); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={del} title="Eliminar cotización" message="Se borra para siempre. El enlace que enviaste dejará de funcionar." confirmLabel="Eliminar" onConfirm={async () => { setDel(false); try { await api(`/ferre/quotes/${id}`, { method: "DELETE" }); router.push("/cotizaciones"); } catch (x) { setMsg(errMsg(x)); } }} onClose={() => setDel(false)} />
      <span hidden>{role}</span>
    </div>
  );
}
