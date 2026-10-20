"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { niceDate, timeCO } from "@/lib/salon";
import type { SalonProductRow } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { NumInput } from "./taller-common";
import { Dlg, FRONT, errMsg, useSalonAccess } from "./salon-common";

function ProductForm({ item, categories, onClose, onDone }: { item: SalonProductRow | null; categories: string[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", brand: item?.brand ?? "", category: item?.category ?? "", sku: item?.sku ?? "", barcode: item?.barcode ?? "", price: item ? String(item.price) : "", cost: item?.cost != null ? String(item.cost) : "", stock: "", minStock: item ? String(item.minStock) : "", commissionPct: item?.commissionPct != null ? String(item.commissionPct) : "", visible: item?.visible ?? true, active: item?.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: "name" | "brand" | "category" | "sku" | "barcode" | "commissionPct") => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del producto.");
    if (!f.price) return setErr("Escribe el precio de venta.");
    const body: Record<string, unknown> = { name: f.name.trim(), brand: f.brand.trim() || null, category: f.category.trim() || null, sku: f.sku.trim() || null, barcode: f.barcode.trim() || null, price: Number(f.price), cost: Number(f.cost) || 0, minStock: Number(f.minStock) || 0, commissionPct: f.commissionPct.trim() === "" ? null : Number(f.commissionPct), visible: f.visible, active: f.active };
    if (!item && f.stock) body.stock = Number(f.stock);
    setBusy(true);
    try { await api(item ? `/salon/products/${item.id}` : "/salon/products", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar producto" : "Producto nuevo"}</h2>
      <div className="field"><label htmlFor="pf-n">Nombre</label><input id="pf-n" type="text" value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="pf-b">Marca</label><input id="pf-b" type="text" value={f.brand} autoComplete="off" onChange={set("brand")} /></div>
        <div className="field"><label htmlFor="pf-c">Categoría</label><input id="pf-c" type="text" list="pf-cats" value={f.category} autoComplete="off" onChange={set("category")} /><datalist id="pf-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pf-p">Precio de venta</label><NumInput id="pf-p" value={f.price} onChange={(v) => setF({ ...f, price: v })} /></div>
        <div className="field"><label htmlFor="pf-co">Costo</label><NumInput id="pf-co" value={f.cost} onChange={(v) => setF({ ...f, cost: v })} /></div>
      </div>
      <div className="field-row">
        {!item ? <div className="field"><label htmlFor="pf-s">Existencia inicial</label><NumInput id="pf-s" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} /></div> : null}
        <div className="field"><label htmlFor="pf-m">Avisar cuando queden</label><NumInput id="pf-m" value={f.minStock} onChange={(v) => setF({ ...f, minStock: v })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pf-sku">Referencia</label><input id="pf-sku" type="text" value={f.sku} autoComplete="off" onChange={set("sku")} /></div>
        <div className="field"><label htmlFor="pf-bc">Código de barras</label><input id="pf-bc" type="text" value={f.barcode} autoComplete="off" onChange={set("barcode")} /></div>
      </div>
      <div className="field"><label htmlFor="pf-cm">Comisión de este producto (%) — opcional</label><input id="pf-cm" type="text" inputMode="numeric" value={f.commissionPct} placeholder="Vacío = la comisión de productos de cada profesional" autoComplete="off" onChange={set("commissionPct")} /></div>
      <label className="check"><input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} /> Mostrar en el catálogo público</label>
      {item ? <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo (se puede vender)</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function MoveForm({ item, onClose, onDone }: { item: SalonProductRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<"compra" | "ajuste" | "conteo">("compra");
  const [qty, setQty] = useState("");
  const [neg, setNeg] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const moves = useResource<{ id: string; delta: number; reason: string; note: string | null; byName: string | null; createdAt: string }[]>(`/salon/products/${item.id}/moves`);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (qty === "") return setErr("Escribe la cantidad.");
    if (reason !== "compra" && note.trim().length < 3) return setErr("Escribe el motivo.");
    setBusy(true);
    try { await api(`/salon/products/${item.id}/move`, { method: "POST", body: JSON.stringify({ reason, qty: reason === "ajuste" && neg ? -Number(qty) : Number(qty), note: note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Inventario de {item.name}</h2>
      <p className="lede">Existencia actual: <b>{item.stock}</b></p>
      <div className="chips" role="group" aria-label="Movimiento">{([["compra", "Entró mercancía"], ["ajuste", "Ajuste"], ["conteo", "Conteo físico"]] as const).map(([v, l]) => <button type="button" key={v} className={reason === v ? "is-on" : ""} aria-pressed={reason === v} onClick={() => { setReason(v); setErr(null); }}>{l}</button>)}</div>
      <div className="field-row">
        <div className="field"><label htmlFor="mv-q">{reason === "conteo" ? "Cantidad contada" : "Cantidad"}</label><NumInput id="mv-q" value={qty} onChange={setQty} /></div>
        {reason === "ajuste" ? <label className="check"><input type="checkbox" checked={neg} onChange={(e) => setNeg(e.target.checked)} /> Es una salida (resta)</label> : null}
      </div>
      <div className="field"><label htmlFor="mv-n">{reason === "compra" ? "Nota (opcional)" : "Motivo"}</label><input id="mv-n" type="text" maxLength={160} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button></div>
      <h3>Últimos movimientos</h3>
      <ul className="dcard__list">{(moves.data ?? []).slice(0, 8).map((m) => <li key={m.id}><div><b>{m.delta > 0 ? "+" : ""}{m.delta} · {m.reason}</b><p>{niceDate(m.createdAt)} {timeCO(m.createdAt)}{m.byName ? ` · ${m.byName}` : ""}{m.note ? ` · ${m.note}` : ""}</p></div></li>)}</ul>
    </form>
  );
}

export function SalonProductsView() {
  const { state, allowed, role } = useSalonAccess(FRONT);
  const admin = role === "TENANT_ADMIN";
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const { data, error, reload } = useResource<{ products: SalonProductRow[]; low: number }>(allowed ? `/salon/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}` : null);
  const [dlg, setDlg] = useState<{ k: "edit"; p: SalonProductRow | null } | { k: "move"; p: SalonProductRow } | { k: "del"; p: SalonProductRow } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const rows = (data?.products ?? []).filter((p) => !low || p.low);
  const cats = [...new Set((data?.products ?? []).map((p) => p.category).filter(Boolean))] as string[];
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/salon/products/${dlg.p.id}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };
  return (
    <div className="page">
      <div className="page-head"><div><h1>{admin ? "Productos e inventario" : "Consultar productos"}</h1><p className="lede">Champús, ceras, cremas y todo lo que vendes en el salón. Al cobrar, la existencia baja sola.</p></div>{admin ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "edit", p: null })}>Producto nuevo</button> : null}</div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Nombre, marca o código" onChange={(e) => setQ(e.target.value)} /></label><button type="button" className={`btn btn--sm ${low ? "btn--primary" : "btn--secondary"}`} aria-pressed={low} onClick={() => setLow(!low)}>Por agotarse ({data?.low ?? 0})</button></div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th>{admin ? <th>Costo</th> : null}<th>Existencia</th><th></th></tr></thead><tbody>
        {rows.map((p) => (
          <tr key={p.id}><td><b>{p.name}</b>{p.brand ? <><br /><span className="field__hint">{p.brand}</span></> : null}{!p.active ? <> <span className="badge badge--info">Inactivo</span></> : null}{!p.visible ? <> <span className="badge badge--info">Oculto</span></> : null}</td><td>{p.category ?? "—"}</td><td>{formatMoney(p.price)}</td>{admin ? <td>{formatMoney(p.cost ?? 0)}</td> : null}<td><span className={p.stock <= 0 ? "is-out" : p.low ? "is-low" : ""}>{p.stock <= 0 ? "Agotado" : p.stock}</span>{p.low && p.stock > 0 ? <span className="badge badge--warn"> Poco</span> : null}</td>
            <td className="actions-cell">{admin ? <><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "move", p })}>Inventario</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit", p })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", p })}>Eliminar</button></> : null}</td></tr>
        ))}
      </tbody></table></div>
      {data && !rows.length ? <p className="lede">{low ? "Ningún producto está por agotarse." : "Todavía no hay productos."}</p> : null}
      <Dlg open={dlg?.k === "edit"} onClose={() => setDlg(null)}>{dlg?.k === "edit" ? <ProductForm item={dlg.p} categories={cats} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "move"} onClose={() => setDlg(null)}>{dlg?.k === "move" ? <MoveForm item={dlg.p} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "del"} title="Eliminar producto" message={dlg?.k === "del" ? `¿Eliminar «${dlg.p.name}»? Si ya tiene ventas, desactívalo en su lugar.` : ""} confirmLabel="Sí, eliminar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
