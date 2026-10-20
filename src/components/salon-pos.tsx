"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { PAY_METHODS, durationLabel } from "@/lib/salon";
import type { SalonAppt, SalonPos, SalonSale, SalonSaleDetail } from "@/lib/types";
import { NumInput } from "./taller-common";
import { NoAccess } from "./no-access";
import { ClientPicker, Dlg, FRONT, SalonReceipt, errMsg, useSalonAccess } from "./salon-common";

type Line = { key: string; kind: "servicio" | "producto"; id: string; name: string; listPrice: number; price: string; qty: number; staffId: string; stock?: number };
let seq = 0;

/** Caja: cobra servicios y productos; el profesional de cada línea recibe su comisión. */
export function SalonPosView() {
  const { state, allowed, role } = useSalonAccess(FRONT);
  const cat = useResource<SalonPos>(allowed ? "/salon/pos-catalog" : null);
  const [tab, setTab] = useState<"servicio" | "producto">("servicio");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [appt, setAppt] = useState<SalonAppt | null>(null);
  const [discount, setDiscount] = useState("");
  const [tip, setTip] = useState("");
  const [tipStaff, setTipStaff] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SalonSale | null>(null);
  const [receipt, setReceipt] = useState<SalonSaleDetail | null>(null);
  const [pick, setPick] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const admin = role === "TENANT_ADMIN";

  // Cobrar una cita: precarga cliente, profesional y servicios.
  useEffect(() => {
    if (!allowed || !cat.data) return;
    const id = new URLSearchParams(window.location.search).get("cita");
    if (!id) return;
    api<SalonAppt>(`/salon/appointments/${id}`).then((a) => {
      if (a.saleId) { setErr("Esta cita ya fue cobrada."); return; }
      setAppt(a); setClient({ id: a.clientId, name: a.clientName });
      setLines(a.services.map((s) => ({ key: `l${++seq}`, kind: "servicio" as const, id: s.id, name: s.name, listPrice: s.price, price: String(s.price), qty: 1, staffId: a.staffId })));
      setTipStaff(a.staffId);
    }).catch((x) => setErr(errMsg(x)));
  }, [allowed, cat.data]);
  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => window.print(), 80);
    return () => clearTimeout(t);
  }, [receipt]);

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!cat.data) return [];
    if (tab === "servicio") return cat.data.services.filter((s) => !term || s.name.toLowerCase().includes(term) || (s.category ?? "").toLowerCase().includes(term));
    return cat.data.products.filter((p) => !term || p.name.toLowerCase().includes(term) || (p.brand ?? "").toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term) || p.barcode === q.trim());
  }, [cat.data, tab, term, q]);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const defaultStaff = lines.find((l) => l.kind === "servicio" && l.staffId)?.staffId ?? appt?.staffId ?? "";
  function addService(s: SalonPos["services"][number]) {
    setLines((l) => [...l, { key: `l${++seq}`, kind: "servicio", id: s.id, name: s.name, listPrice: s.price, price: String(s.price), qty: 1, staffId: defaultStaff }]);
  }
  function addProduct(p: SalonPos["products"][number]) {
    setLines((l) => {
      const i = l.findIndex((x) => x.kind === "producto" && x.id === p.id);
      if (i >= 0) { const c = [...l]; c[i] = { ...c[i], qty: Math.min(c[i].qty + 1, p.stock) }; return c; }
      return [...l, { key: `l${++seq}`, kind: "producto", id: p.id, name: p.name, listPrice: p.price, price: String(p.price), qty: 1, staffId: defaultStaff, stock: p.stock }];
    });
  }
  const add = (r: (typeof results)[number]) => { if (tab === "servicio") addService(r as SalonPos["services"][number]); else { const p = r as SalonPos["products"][number]; if (p.stock > 0) addProduct(p); } setQ(""); input.current?.focus(); };
  const patch = (key: string, d: Partial<Line>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...d } : x)));

  const subtotal = lines.reduce((t, l) => t + (Number(l.price) || 0) * l.qty, 0);
  const disc = Number(discount) || 0;
  const tipN = Number(tip) || 0;
  const total = subtotal - disc + tipN;
  const maxDisc = cat.data?.maxDiscount ?? 0;
  const discTooBig = !admin && disc * 100 > maxDisc * subtotal;
  const missingStaff = lines.some((l) => l.kind === "servicio" && !l.staffId);
  const badTip = tipN > 0 && !(tipStaff || defaultStaff);
  const canCharge = lines.length > 0 && !busy && !discTooBig && disc <= subtotal && !missingStaff && !badTip;

  async function charge() {
    setBusy(true); setErr(null);
    try {
      const sale = await api<SalonSale>("/salon/sales", {
        method: "POST",
        body: JSON.stringify({ appointmentId: appt?.id, clientId: client?.id, method, discount: disc || undefined, tip: tipN || undefined, tipStaffId: tipN ? tipStaff || defaultStaff : undefined, items: lines.map((l) => ({ kind: l.kind, id: l.id, qty: l.qty, staffId: l.staffId || undefined, unitPrice: l.kind === "servicio" || admin ? Number(l.price) : undefined })) }),
      });
      setDone(sale);
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  function reset() { setLines([]); setClient(null); setAppt(null); setDiscount(""); setTip(""); setTipStaff(""); setMethod("efectivo"); setDone(null); setErr(null); setReceipt(null); if (window.location.search) window.history.replaceState(null, "", "/salon-caja"); }
  async function printReceipt() { if (!done) return; try { setReceipt(await api<SalonSaleDetail>(`/salon/sales/${done.id}`)); } catch (x) { setErr(errMsg(x)); } }
  const staff = cat.data?.staff ?? [];

  return (
    <div className="page">
      <div className="no-print">
        <div className="page-head"><div><h1>Caja</h1><p className="lede">Cobra los servicios y productos. Cada servicio queda a nombre de quien lo hizo para calcular su comisión.</p></div></div>
        {appt ? <p className="note" role="status">Cobrando la cita de <b>{appt.clientName}</b> con {appt.staffName}.{appt.allergies ? <> <b>⚠ Alergia:</b> {appt.allergies}</> : null}</p> : null}
        <div className="fe-pos">
          <section className="fe-pos__left" aria-label="Servicios y productos">
            <div className="chips" role="tablist" aria-label="Qué vendes">{(["servicio", "producto"] as const).map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => { setTab(k); setQ(""); }}>{k === "servicio" ? "Servicios" : "Productos"}</button>)}</div>
            <form className="fe-search" role="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) add(results[0]); }}>
              <label htmlFor="sp-q" className="sr-only">Buscar</label>
              <input id="sp-q" ref={input} type="search" value={q} placeholder={tab === "servicio" ? "Buscar servicio…" : "Buscar producto o escanear código…"} autoComplete="off" onChange={(e) => setQ(e.target.value)} />
            </form>
            <ul className="fe-results">
              {results.slice(0, 40).map((r) => {
                const isP = "stock" in r;
                const out = isP && (r as SalonPos["products"][number]).stock <= 0;
                return (
                  <li key={r.id}><button type="button" className="fe-result" disabled={out} onClick={() => add(r)}>
                    <span><b>{r.name}</b><small>{isP ? `${(r as SalonPos["products"][number]).brand ?? ""} ${out ? "· Agotado" : `· Quedan ${(r as SalonPos["products"][number]).stock}`}`.trim() : `${(r as SalonPos["services"][number]).category ?? ""} · ${durationLabel((r as SalonPos["services"][number]).minutes)}`}</small></span>
                    <span className="fe-result__side"><b>{formatMoney(r.price)}</b></span>
                  </button></li>
                );
              })}
            </ul>
            {cat.data && !results.length ? <p className="field__hint fe-empty">No encontramos nada con esa búsqueda.</p> : null}
          </section>
          <section className="fe-pos__right" aria-label="Cuenta">
            {!appt ? <div className="fe-cust">{client ? <div className="pick-chip"><b>{client.name}</b><button type="button" className="btn btn--secondary btn--sm" onClick={() => setClient(null)}>Quitar</button></div> : <button type="button" className="btn btn--secondary btn--sm" onClick={() => setPick(true)}>Elegir cliente (opcional)</button>}</div> : null}
            <div className="table-wrap fe-cart"><table className="table"><thead><tr><th>Qué</th><th>Quién</th><th>Cant.</th><th>Precio</th><th></th></tr></thead><tbody>
              {lines.map((l) => (
                <tr key={l.key}>
                  <td><b>{l.name}</b><br /><span className="field__hint">{l.kind === "servicio" ? "Servicio" : "Producto"}</span></td>
                  <td><select aria-label={`Quién hizo ${l.name}`} value={l.staffId} onChange={(e) => patch(l.key, { staffId: e.target.value })}><option value="">{l.kind === "servicio" ? "Elegir…" : "Sin comisión"}</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                  <td className="fe-qty">{l.kind === "producto" ? <><button type="button" className="btn btn--secondary btn--sm" aria-label="Menos" onClick={() => patch(l.key, { qty: Math.max(1, l.qty - 1) })}>−</button> {l.qty} <button type="button" className="btn btn--secondary btn--sm" aria-label="Más" onClick={() => patch(l.key, { qty: Math.min(l.stock ?? 99, l.qty + 1) })}>+</button></> : 1}</td>
                  <td>{l.kind === "servicio" || admin ? <NumInput id={`pr-${l.key}`} className="fe-price" label={`Precio de ${l.name}`} value={l.price} onChange={(v) => patch(l.key, { price: v })} /> : formatMoney(l.listPrice)}</td>
                  <td><button type="button" className="btn btn--danger-ghost btn--sm" aria-label={`Quitar ${l.name}`} onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}>✕</button></td>
                </tr>
              ))}
              {!lines.length ? <tr><td colSpan={5} className="field__hint fe-empty">Agrega servicios o productos de la izquierda.</td></tr> : null}
            </tbody></table></div>
            <div className="fe-totals">
              <div className="field-row">
                <div className="field"><label htmlFor="sp-d">Descuento ($)</label><NumInput id="sp-d" value={discount} onChange={setDiscount} placeholder="0" />{!admin ? <p className="field__hint">Máximo {maxDisc} %.</p> : null}</div>
                <div className="field"><label htmlFor="sp-t">Propina ($)</label><NumInput id="sp-t" value={tip} onChange={setTip} placeholder="0" /></div>
              </div>
              {tipN > 0 ? <div className="field"><label htmlFor="sp-ts">¿A quién va la propina?</label><select id="sp-ts" value={tipStaff || defaultStaff} onChange={(e) => setTipStaff(e.target.value)}><option value="">Elegir…</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div> : null}
              <div className="chips" role="group" aria-label="Medio de pago">{PAY_METHODS.map((m) => <button type="button" key={m.v} className={method === m.v ? "is-on" : ""} aria-pressed={method === m.v} onClick={() => setMethod(m.v)}>{m.l}</button>)}</div>
              {discTooBig ? <p className="form-error" role="alert">Tu descuento máximo es {maxDisc} %. Pide autorización al administrador.</p> : null}
              {missingStaff ? <p className="field__hint">Elige quién hizo cada servicio.</p> : null}
              <p className="fe-sum"><span>{disc ? `Subtotal ${formatMoney(subtotal)} · descuento −${formatMoney(disc)}` : "Total"}{tipN ? ` · propina ${formatMoney(tipN)}` : ""}</span><strong>{formatMoney(Math.max(0, total))}</strong></p>
              <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
              <div className="actions-cell"><button type="button" className="btn btn--primary fe-charge" disabled={!canCharge} onClick={charge}>{busy ? "Cobrando…" : "Cobrar"}</button><button type="button" className="btn btn--secondary" onClick={reset}>Vaciar</button></div>
            </div>
          </section>
        </div>
        <Dlg open={pick} onClose={() => setPick(false)}>{pick ? <div><h2 id="dlg-title" tabIndex={-1}>Elegir cliente</h2><ClientPicker value={client} onPick={(c) => { setClient(c); if (c) setPick(false); }} /><div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setPick(false)}>Cerrar</button></div></div> : null}</Dlg>
        <Dlg open={!!done} onClose={reset}>{done ? (
          <div><h2 id="dlg-title" tabIndex={-1}>Venta #{done.number} registrada</h2>
            <p role="status">Total cobrado: <b>{formatMoney(done.total)}</b>{done.tip ? ` (incluye propina ${formatMoney(done.tip)})` : ""}.</p>
            <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={printReceipt}>Imprimir recibo</button><Link className="btn btn--secondary" href="/salon-agenda">Ir a la agenda</Link><button type="button" className="btn btn--primary" onClick={reset}>Nueva venta</button></div></div>
        ) : null}</Dlg>
      </div>
      {receipt ? <SalonReceipt detail={receipt} /> : null}
    </div>
  );
}
