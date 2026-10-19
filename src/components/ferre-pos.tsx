"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { LIST_TEXT, SALE_METHODS, fmtQty, lineTotal, parseQty, priceFor, qtyOf, stepOf } from "@/lib/ferre";
import type { FerreCustomer, FerreProduct, FerreProfileData, FerreSale, FerreSaleDetail } from "@/lib/types";
import { NoAccess } from "./no-access";
import { Dlg, FerreReceipt, NumInput, errMsg, useFerreAccess, usePrintWhen } from "./ferre-common";

type Line = { p: FerreProduct; qty: string; custom: number | null };

function CustomerDialog({ admin, onPick, onClose }: { admin: boolean; onPick: (c: FerreCustomer | null) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<FerreCustomer[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", document: "", priceList: "detal", creditLimit: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (creating) return;
    const h = setTimeout(() => { api<FerreCustomer[]>(`/ferre/customers?q=${encodeURIComponent(q.trim())}`).then((r) => setList(r.slice(0, 8))).catch(() => setList([])); }, 200);
    return () => clearTimeout(h);
  }, [q, creating]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { name: f.name.trim(), phone: f.phone.trim(), document: f.document.trim() || null };
      if (admin) { body.priceList = f.priceList; body.creditLimit = Number(f.creditLimit || 0); }
      onPick(await api<FerreCustomer>("/ferre/customers", { method: "POST", body: JSON.stringify(body) }));
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  if (creating) {
    return (
      <form onSubmit={create} noValidate>
        <h2 id="dlg-title" tabIndex={-1}>Cliente nuevo</h2>
        <div className="field"><label htmlFor="cn-n">Nombre</label><input id="cn-n" type="text" maxLength={80} value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field-row">
          <div className="field"><label htmlFor="cn-p">Celular</label><input id="cn-p" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={(e) => { setF({ ...f, phone: e.target.value }); setErr(null); }} /></div>
          <div className="field"><label htmlFor="cn-d">Cédula o NIT (opcional)</label><input id="cn-d" type="text" value={f.document} autoComplete="off" onChange={(e) => setF({ ...f, document: e.target.value })} /></div>
        </div>
        {admin ? (
          <div className="field-row">
            <div className="field"><label htmlFor="cn-l">Lista de precios</label><select id="cn-l" value={f.priceList} onChange={(e) => setF({ ...f, priceList: e.target.value })}><option value="detal">Detal</option><option value="mayorista">Mayorista</option></select></div>
            <div className="field"><label htmlFor="cn-c">Cupo de crédito</label><NumInput id="cn-c" value={f.creditLimit} onChange={(v) => setF({ ...f, creditLimit: v })} placeholder="0 = sin crédito" /></div>
          </div>
        ) : <p className="field__hint">La lista de precios y el crédito los define el administrador.</p>}
        <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
        <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setCreating(false)}>Volver</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar y elegir"}</button></div>
      </form>
    );
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>¿A quién le vendes?</h2>
      <div className="field"><label htmlFor="cp-q">Busca por nombre, celular o cédula</label><input id="cp-q" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      <ul className="pick-list">{list.map((c) => (
        <li key={c.id}><button type="button" onClick={() => onPick(c)}><b>{c.name}</b> <span className="badge badge--info">{LIST_TEXT[c.priceList]}</span>{c.creditLimit > 0 ? <span className="field__hint"> · Cupo disponible {formatMoney(c.available)}</span> : null}{c.overdue > 0 ? <> <span className="badge badge--warn">Vencido {formatMoney(c.overdue)}</span></> : null}</button></li>
      ))}</ul>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => onPick(null)}>Venta de mostrador</button><button type="button" className="btn btn--secondary" onClick={() => setCreating(true)}>Cliente nuevo</button><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

export function FerrePosView() {
  const { state, allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<FerreProduct[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [cust, setCust] = useState<FerreCustomer | null>(null);
  const [pickCust, setPickCust] = useState(false);
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [received, setReceived] = useState("");
  const [initial, setInitial] = useState("");
  const [force, setForce] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<FerreSaleDetail | null>(null);
  const [print, setPrint] = useState<FerreSaleDetail | null>(null);
  const [maxDisc, setMaxDisc] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  usePrintWhen(print, () => setPrint(null));
  useEffect(() => { if (allowed) api<FerreProfileData>("/ferre/profile").then((r) => setMaxDisc(r.profile.cashierMaxDiscount)).catch(() => {}); }, [allowed]);

  const list = cust?.priceList ?? "detal";
  const parsed = useCallback((raw: string) => {
    const m = raw.match(/^\s*(\d+(?:[.,]\d+)?)\s*[*x×]\s*(.+)$/i);
    return m ? { qty: parseQty(m[1]), q: m[2].trim() } : { qty: 1, q: raw.trim() };
  }, []);

  // Búsqueda mientras escribe
  useEffect(() => {
    const { q } = parsed(term);
    if (q.length < 1) { setResults([]); return; }
    const h = setTimeout(() => { api<FerreProduct[]>(`/ferre/products/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => setResults([])); }, 120);
    return () => clearTimeout(h);
  }, [term, parsed]);

  function add(p: FerreProduct, qty = 1) {
    setErr(null); setHint(null);
    setLines((ls) => {
      const i = ls.findIndex((l) => l.p.id === p.id);
      if (i >= 0) { const c = [...ls]; c[i] = { ...c[i], qty: fmtQtyInput(parseQty(c[i].qty) + qty) }; return c; }
      return [...ls, { p, qty: fmtQtyInput(qty), custom: null }];
    });
  }
  const fmtQtyInput = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",");

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    const { qty, q } = parsed(term);
    if (!q) return;
    if (!Number.isFinite(qty) || qty <= 0) { setHint("La cantidad no es válida."); return; }
    try {
      const r = await api<FerreProduct[]>(`/ferre/products/search?q=${encodeURIComponent(q)}`);
      if (!r.length) { setHint(`No encontré “${q}”.`); return; }
      const p = r[0];
      if (p.unitKind === "unidad" && !Number.isInteger(qty)) { setHint(`${p.name} se vende por unidad completa.`); return; }
      add(p, qty); setTerm(""); setResults([]); input.current?.focus();
    } catch (x) { setHint(errMsg(x)); }
  }

  const priceOf = (l: Line) => l.custom ?? priceFor(l.p, list);
  const qtyNum = (l: Line) => parseQty(l.qty);
  const subtotal = lines.reduce((s, l) => s + (Number.isFinite(qtyNum(l)) && qtyNum(l) > 0 ? lineTotal(qtyNum(l), priceOf(l)) : 0), 0);
  const disc = Math.min(Number(discount || 0), subtotal);
  const total = subtotal - disc;
  const discOver = !admin && disc * 100 > maxDisc * subtotal;
  const change = method === "efectivo" && received ? Number(received) - total : null;
  const badQty = lines.some((l) => !(qtyNum(l) > 0) || (l.p.unitKind === "unidad" && !Number.isInteger(qtyNum(l))));
  const over = lines.filter((l) => qtyNum(l) > l.p.stock);

  async function charge() {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = {
        items: lines.map((l) => ({ productId: l.p.id, qty: qtyNum(l), ...(l.custom !== null && admin ? { unitPrice: l.custom } : {}) })),
        method, discount: disc, customerId: cust?.id, force: force || undefined,
      };
      if (method === "credito") body.paid = Number(initial || 0);
      const sale = await api<FerreSale>("/ferre/sales", { method: "POST", body: JSON.stringify(body) });
      const detail = await api<FerreSaleDetail>(`/ferre/sales/${sale.id}`);
      setDone(detail);
    } catch (x) {
      const m = errMsg(x);
      setErr(m);
      if (admin && /vencidas/.test(m)) setForce(true);
    } finally { setBusy(false); }
  }
  function reset() {
    setLines([]); setCust(null); setDiscount(""); setMethod("efectivo"); setReceived(""); setInitial(""); setForce(false); setErr(null); setHint(null); setDone(null); setTerm(""); setResults([]);
    setTimeout(() => input.current?.focus(), 50);
  }

  if (state.status === "in" && !allowed) return <NoAccess />;
  const creditOk = !!cust && cust.creditLimit > 0;
  return (
    <div className="page">
      <div className="no-print">
        <div className="page-head"><div><h1>Punto de venta</h1><p className="lede">Escribe el nombre, la referencia o pasa el código de barras y presiona Enter. Para varias unidades: <b>5*cemento</b>.</p></div></div>
        <div className="fe-pos">
          <section className="fe-pos__left" aria-label="Buscar productos">
            <form onSubmit={enter} className="fe-search" role="search">
              <label htmlFor="fe-q" className="sr-only">Buscar producto</label>
              <input id="fe-q" ref={input} type="search" autoFocus autoComplete="off" value={term} placeholder="Nombre, referencia o código…" onChange={(e) => { setTerm(e.target.value); setHint(null); }} />
              <button type="submit" className="btn btn--primary">Agregar</button>
            </form>
            {hint ? <p className="form-error" role="alert">{hint}</p> : null}
            <ul className="fe-results" aria-label="Resultados">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" className={`fe-result${p.exact ? " is-exact" : ""}`} onClick={() => { add(p, Math.max(1, parsed(term).qty || 1)); setTerm(""); setResults([]); input.current?.focus(); }}>
                    <span><b>{p.name}</b><small>{[p.sku, p.category].filter(Boolean).join(" · ")}</small></span>
                    <span className="fe-result__side"><b>{formatMoney(priceFor(p, list))}</b><small className={p.stock <= 0 ? "is-out" : p.low ? "is-low" : ""}>{p.stock <= 0 ? "Agotado" : `${qtyOf(p.stock, p.unit)}`}</small></span>
                  </button>
                </li>
              ))}
            </ul>
            {!results.length && !term ? <p className="field__hint">Los productos que busques aparecerán aquí. Si el lector de códigos está conectado, solo escanea.</p> : null}
          </section>
          <section className="fe-pos__right" aria-label="Venta actual">
            <div className="fe-cust">
              {cust ? (
                <div className="pick-chip"><span><b>{cust.name}</b> <span className="badge badge--info">{LIST_TEXT[cust.priceList]}</span>{cust.creditLimit > 0 ? <small className="field__hint"> · Cupo {formatMoney(cust.available)}</small> : null}{cust.overdue > 0 ? <> <span className="badge badge--warn">Vencido {formatMoney(cust.overdue)}</span></> : null}</span><button type="button" className="btn btn--secondary btn--sm" onClick={() => setPickCust(true)}>Cambiar</button></div>
              ) : (
                <button type="button" className="btn btn--secondary" onClick={() => setPickCust(true)}>Cliente: mostrador · Elegir cliente</button>
              )}
            </div>
            <div className="table-wrap fe-cart">
              <table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th></th></tr></thead><tbody>
                {lines.map((l, i) => {
                  const q = qtyNum(l);
                  return (
                    <tr key={l.p.id}>
                      <td><b>{l.p.name}</b>{q > l.p.stock ? <><br /><small className="is-out">Solo hay {qtyOf(l.p.stock, l.p.unit)}</small></> : null}</td>
                      <td className="fe-qty">
                        <button type="button" className="btn btn--secondary btn--sm" aria-label={`Quitar uno a ${l.p.name}`} onClick={() => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: fmtQtyInput(Math.max(stepOf(l.p.unitKind) === 1 ? 1 : 0.5, (Number.isFinite(q) ? q : 1) - stepOf(l.p.unitKind))) } : x)))}>−</button>
                        <input type="text" inputMode="decimal" aria-label={`Cantidad de ${l.p.name}`} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                        <button type="button" className="btn btn--secondary btn--sm" aria-label={`Agregar uno a ${l.p.name}`} onClick={() => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: fmtQtyInput((Number.isFinite(q) ? q : 0) + stepOf(l.p.unitKind)) } : x)))}>+</button>
                        <small>{l.p.unit}</small>
                      </td>
                      <td>{admin ? <NumInput id={`pr-${i}`} value={String(priceOf(l))} label={`Precio de ${l.p.name}`} className="fe-price" onChange={(v) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, custom: v === "" ? 0 : Number(v) } : x)))} /> : formatMoney(priceOf(l))}</td>
                      <td><b>{q > 0 ? formatMoney(lineTotal(q, priceOf(l))) : "—"}</b></td>
                      <td><button type="button" className="btn btn--danger-ghost btn--sm" aria-label={`Quitar ${l.p.name}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody></table>
              {!lines.length ? <p className="field__hint fe-empty">Aún no hay productos en esta venta.</p> : null}
            </div>
            <div className="fe-totals">
              <div className="field-row">
                <div className="field"><label htmlFor="fe-disc">Descuento ($){!admin ? ` — máximo ${maxDisc}%` : ""}</label><NumInput id="fe-disc" value={discount} onChange={(v) => { setDiscount(v); setErr(null); }} disabled={!admin && maxDisc === 0} placeholder="0" /></div>
                <div className="fe-sum"><span>Subtotal {formatMoney(subtotal)}</span><strong>{formatMoney(total)}</strong></div>
              </div>
              {discOver ? <p className="form-error" role="alert">Tu descuento máximo es {maxDisc}%. Pide autorización al administrador.</p> : null}
              <div className="chips" role="group" aria-label="Medio de pago">{SALE_METHODS.map((m) => <button key={m.v} type="button" className={method === m.v ? "is-on" : ""} aria-pressed={method === m.v} onClick={() => { setMethod(m.v); setErr(null); }}>{m.l}</button>)}</div>
              {method === "efectivo" ? (
                <div className="field-row"><div className="field"><label htmlFor="fe-rec">Recibido</label><NumInput id="fe-rec" value={received} onChange={setReceived} placeholder="Billete con el que pagan" /></div><div className="fe-sum">{change !== null ? <><span>Devuelta</span><strong className={change < 0 ? "is-out" : ""}>{change < 0 ? `Faltan ${formatMoney(-change)}` : formatMoney(change)}</strong></> : null}</div></div>
              ) : null}
              {method === "credito" ? (
                creditOk ? <div className="field"><label htmlFor="fe-ini">Abono inicial (opcional)</label><NumInput id="fe-ini" value={initial} onChange={setInitial} placeholder="0" /><p className="field__hint">Quedará a deber {formatMoney(Math.max(0, total - Number(initial || 0)))} · cupo disponible {formatMoney(cust!.available)}</p></div>
                  : <p className="form-error" role="alert">Para vender a crédito elige un cliente con cupo de crédito.</p>
              ) : null}
              {over.length ? <p className="form-error" role="alert">No alcanza el inventario de: {over.map((l) => l.p.name).join(", ")}.</p> : null}
              <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}{admin && force ? " Presiona Cobrar otra vez para autorizar." : ""}</p> : null}</div>
              <div className="actions-cell">
                <button type="button" className="btn btn--primary fe-charge" disabled={busy || !lines.length || badQty || discOver || (method === "credito" && !creditOk) || over.length > 0} onClick={charge}>{busy ? "Cobrando…" : `Cobrar ${formatMoney(total)}`}</button>
                <button type="button" className="btn btn--secondary" disabled={!lines.length} onClick={reset}>Cancelar venta</button>
              </div>
            </div>
          </section>
        </div>
      </div>
      {print ? <FerreReceipt detail={print} /> : null}
      <Dlg open={pickCust} onClose={() => setPickCust(false)}>{pickCust ? <CustomerDialog admin={admin} onPick={(c) => { setCust(c); setPickCust(false); setForce(false); setErr(null); if (method === "credito" && !(c && c.creditLimit > 0)) setMethod("efectivo"); }} onClose={() => setPickCust(false)} /> : null}</Dlg>
      <Dlg open={!!done} onClose={reset}>{done ? (
        <div>
          <h2 id="dlg-title" tabIndex={-1}>Venta #{done.sale.number} registrada</h2>
          <p className="lede" role="status">Total {formatMoney(done.sale.total)}{done.sale.method === "efectivo" && received && Number(received) >= done.sale.total ? ` · Devuelta ${formatMoney(Number(received) - done.sale.total)}` : ""}{done.sale.method === "credito" ? ` · Quedó a deber ${formatMoney(done.sale.total - done.sale.paid)}` : ""}</p>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setPrint(done)}>Imprimir recibo</button><button type="button" className="btn btn--primary" onClick={reset}>Nueva venta</button></div>
        </div>
      ) : null}</Dlg>
    </div>
  );
}
