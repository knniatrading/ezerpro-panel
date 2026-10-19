"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { KINDS, dateCO, fmtQty, parseQty, qtyOf } from "@/lib/ferre";
import type { FerreKind, FerreMove, FerreProduct, FerreProfileData } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { Dlg, NumInput, errMsg, useFerreAccess } from "./ferre-common";

const REASON: Record<string, string> = { inicial: "Existencia inicial", compra: "Compra", ajuste: "Ajuste", conteo: "Conteo físico", venta: "Venta", anulacion: "Venta anulada" };

function ProductDialog({ item, categories, onClose, onDone }: { item: FerreProduct | null; categories: string[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    name: item?.name ?? "", sku: item?.sku ?? "", barcode: item?.barcode ?? "", category: item?.category ?? "", unitKind: (item?.unitKind ?? "unidad") as FerreKind, unit: item?.unit ?? "und",
    priceDetal: String(item?.priceDetal ?? ""), priceMayor: String(item?.priceMayor || ""), cost: String(item?.cost ?? ""), stock: "", minStock: item ? String(item.minStock).replace(".", ",") : "",
  });
  const [active, setActive] = useState(item?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  const kind = KINDS.find((k) => k.v === f.unitKind)!;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const num = (s: string, label: string) => { if (s.trim() === "") return 0; const n = parseQty(s); if (!(n >= 0)) throw new Error(`${label} no es válido.`); return n; };
      const body: Record<string, unknown> = {
        name: f.name.trim(), sku: f.sku.trim() || null, barcode: f.barcode.trim() || null, category: f.category.trim() || null, unitKind: f.unitKind, unit: f.unit.trim() || kind.unit,
        priceDetal: Number(f.priceDetal || 0), priceMayor: Number(f.priceMayor || 0), cost: Number(f.cost || 0), minStock: num(f.minStock, "El mínimo"),
      };
      if (!item) body.stock = num(f.stock, "La existencia");
      else body.active = active;
      if (item) await api(`/ferre/products/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/ferre/products", { method: "POST", body: JSON.stringify(body) });
      onDone();
    } catch (x) { setErr(x instanceof Error && !("status" in x) ? x.message : errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar producto" : "Nuevo producto"}</h2>
      <div className="field"><label htmlFor="fp-n">Nombre</label><input id="fp-n" type="text" maxLength={120} value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="fp-s">Referencia</label><input id="fp-s" type="text" value={f.sku} autoComplete="off" onChange={set("sku")} /></div>
        <div className="field"><label htmlFor="fp-b">Código de barras</label><input id="fp-b" type="text" inputMode="numeric" value={f.barcode} autoComplete="off" onChange={set("barcode")} /></div>
        <div className="field"><label htmlFor="fp-c">Categoría</label><input id="fp-c" type="text" list="fp-cats" value={f.category} autoComplete="off" onChange={set("category")} /><datalist id="fp-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
      </div>
      <fieldset className="field"><legend>¿Cómo se vende?</legend>
        <div className="chips" role="group">{KINDS.map((k) => <button key={k.v} type="button" className={f.unitKind === k.v ? "is-on" : ""} aria-pressed={f.unitKind === k.v} onClick={() => setF({ ...f, unitKind: k.v, unit: k.unit })}>{k.l}</button>)}</div>
        <p className="field__hint">{kind.hint}</p>
      </fieldset>
      <div className="field-row">
        <div className="field"><label htmlFor="fp-u">Se mide en</label><input id="fp-u" type="text" maxLength={12} value={f.unit} placeholder="und, bulto, kg, m" autoComplete="off" onChange={set("unit")} /></div>
        {!item ? <div className="field"><label htmlFor="fp-st">Existencia inicial</label><input id="fp-st" type="text" inputMode="decimal" value={f.stock} placeholder="0" autoComplete="off" onChange={set("stock")} /></div> : null}
        <div className="field"><label htmlFor="fp-mi">Avisar cuando queden</label><input id="fp-mi" type="text" inputMode="decimal" value={f.minStock} placeholder="0" autoComplete="off" onChange={set("minStock")} /></div>
      </div>
      <p className="field__hint">Precios por cada {f.unit || kind.unit}:</p>
      <div className="field-row">
        <div className="field"><label htmlFor="fp-pd">Precio al detal</label><NumInput id="fp-pd" value={f.priceDetal} onChange={(v) => { setF({ ...f, priceDetal: v }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="fp-pm">Precio mayorista</label><NumInput id="fp-pm" value={f.priceMayor} placeholder="Igual al detal" onChange={(v) => { setF({ ...f, priceMayor: v }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="fp-co">Costo (lo que pagas)</label><NumInput id="fp-co" value={f.cost} onChange={(v) => { setF({ ...f, cost: v }); setErr(null); }} /></div>
      </div>
      {item ? <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Disponible para vender</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function MoveDialog({ p, onClose, onDone }: { p: FerreProduct; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<"compra" | "ajuste" | "conteo">("compra");
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState<1 | -1>(-1);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const n = parseQty(qty);
    if (!(n >= 0) || (reason !== "conteo" && n === 0)) { setErr("Escribe una cantidad válida."); setBusy(false); return; }
    const body = reason === "conteo" ? { reason, counted: n, note: note.trim() || null } : { reason, delta: reason === "ajuste" ? sign * n : n, note: note.trim() || null };
    try { await api(`/ferre/products/${p.id}/move`, { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{p.name}</h2>
      <p className="lede">Existencia actual: <b>{qtyOf(p.stock, p.unit)}</b></p>
      <div className="chips" role="group" aria-label="Movimiento">
        <button type="button" className={reason === "compra" ? "is-on" : ""} aria-pressed={reason === "compra"} onClick={() => setReason("compra")}>Entrada de compra</button>
        <button type="button" className={reason === "conteo" ? "is-on" : ""} aria-pressed={reason === "conteo"} onClick={() => setReason("conteo")}>Conteo físico</button>
        <button type="button" className={reason === "ajuste" ? "is-on" : ""} aria-pressed={reason === "ajuste"} onClick={() => setReason("ajuste")}>Ajuste (merma, daño)</button>
      </div>
      <div className="field-row">
        {reason === "ajuste" ? <div className="field"><label htmlFor="mv-s">Tipo de ajuste</label><select id="mv-s" value={sign} onChange={(e) => setSign(Number(e.target.value) as 1 | -1)}><option value={-1}>Restar</option><option value={1}>Sumar</option></select></div> : null}
        <div className="field"><label htmlFor="mv-q">{reason === "conteo" ? `Cantidad que hay en bodega (${p.unit})` : `Cantidad (${p.unit})`}</label><input id="mv-q" type="text" inputMode="decimal" value={qty} autoComplete="off" onChange={(e) => { setQty(e.target.value); setErr(null); }} /></div>
      </div>
      <div className="field"><label htmlFor="mv-n">{reason === "ajuste" ? "Motivo (obligatorio)" : "Nota (opcional)"}</label><input id="mv-n" type="text" maxLength={200} value={note} placeholder={reason === "ajuste" ? "Bolsa rota, robo, daño…" : reason === "compra" ? "Proveedor, factura…" : "Quién contó"} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      {reason === "conteo" ? <p className="field__hint">El sistema calcula la diferencia con lo que dice el inventario y la deja registrada.</p> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button></div>
    </form>
  );
}

function Moves() {
  const [reason, setReason] = useState("");
  const { data, error } = useResource<FerreMove[]>(`/ferre/moves${reason ? `?reason=${reason}` : ""}`);
  return (
    <section aria-label="Auditoría de mercancía">
      <p className="lede">Cada entrada, salida y ajuste queda con la fecha y quién lo hizo. Los últimos 200 movimientos.</p>
      <div className="chips" role="group" aria-label="Filtrar por motivo">{[["", "Todos"], ["compra", "Compras"], ["venta", "Ventas"], ["ajuste", "Ajustes"], ["conteo", "Conteos"], ["anulacion", "Anulaciones"]].map(([v, l]) => <button key={v} type="button" className={reason === v ? "is-on" : ""} aria-pressed={reason === v} onClick={() => setReason(v)}>{l}</button>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Quién</th><th>Nota</th></tr></thead><tbody>
        {(data ?? []).map((m) => (
          <tr key={m.id}><td>{dateCO(m.createdAt)}</td><td>{m.productName}</td><td>{REASON[m.reason] ?? m.reason}{m.saleNumber ? ` #${m.saleNumber}` : ""}</td><td className={m.delta < 0 ? "is-out" : ""}><b>{m.delta > 0 ? "+" : ""}{fmtQty(m.delta)}</b> {m.unit}</td><td>{m.byName ?? "—"}</td><td>{m.note ?? ""}</td></tr>
        ))}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">No hay movimientos.</p> : null}
    </section>
  );
}

export function FerreInventoryView() {
  const { state, allowed, role } = useFerreAccess();
  const admin = role === "TENANT_ADMIN";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [low, setLow] = useState(false);
  const [tab, setTab] = useState<"lista" | "auditoria">("lista");
  const path = allowed ? `/ferre/products?active=all${cat ? `&category=${encodeURIComponent(cat)}` : ""}` : null;
  const { data, error, reload } = useResource<FerreProduct[]>(path);
  const prof = useResource<FerreProfileData>(allowed ? "/ferre/profile" : null);
  const [edit, setEdit] = useState<FerreProduct | "new" | null>(null);
  const [move, setMove] = useState<FerreProduct | null>(null);
  const [del, setDel] = useState<FerreProduct | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const term = q.trim().toLowerCase();
  const rows = (data ?? []).filter((p) => (!low || p.low) && (!term || `${p.name} ${p.sku ?? ""} ${p.barcode ?? ""}`.toLowerCase().includes(term)));
  const active = (data ?? []).filter((p) => p.active);
  const value = active.reduce((s, p) => s + Math.round(p.stock * (p.cost ?? 0)), 0);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Inventario</h1><p className="lede">{admin ? "Cada venta descuenta la existencia exacta, en unidades, kilos o metros." : "Consulta qué hay en bodega."}</p></div>
        {admin ? <button className="btn btn--primary btn--sm" onClick={() => setEdit("new")}>Nuevo producto</button> : null}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <div className="kpis"><div className="kpi"><span>Productos activos</span><strong>{active.length}</strong></div><div className="kpi kpi--warn"><span>Por agotarse</span><strong>{active.filter((p) => p.low).length}</strong></div>{admin ? <div className="kpi"><span>Valor en bodega (a costo)</span><strong>{formatMoney(value)}</strong></div> : null}</div>
      {admin ? <div className="chips" role="tablist" aria-label="Vista"><button type="button" role="tab" aria-selected={tab === "lista"} className={tab === "lista" ? "is-on" : ""} onClick={() => setTab("lista")}>Productos</button><button type="button" role="tab" aria-selected={tab === "auditoria"} className={tab === "auditoria" ? "is-on" : ""} onClick={() => setTab("auditoria")}>Auditoría de movimientos</button></div> : null}
      {tab === "auditoria" && admin ? <Moves /> : (
        <>
          <div className="agenda-bar">
            <label>Buscar <input type="search" value={q} placeholder="Nombre, referencia o código" onChange={(e) => setQ(e.target.value)} /></label>
            <label>Categoría <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas</option>{(prof.data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Solo por agotarse</label>
          </div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Existencia</th><th>Detal</th><th>Mayorista</th>{admin ? <th>Costo</th> : null}{admin ? <th></th> : null}</tr></thead><tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.active ? "" : "is-off"}>
                <td><b>{p.name}</b><br /><span className="field__hint">{[p.sku, p.barcode, p.category].filter(Boolean).join(" · ")}</span>{!p.active ? <> <span className="badge badge--info">Inactivo</span></> : null}</td>
                <td><b>{fmtQty(p.stock)}</b> {p.unit} {p.low ? <span className="badge badge--warn">Por agotarse</span> : null}<br /><span className="field__hint">Mínimo {fmtQty(p.minStock)}</span></td>
                <td>{formatMoney(p.priceDetal)}<small className="field__hint"> /{p.unit}</small></td><td>{p.priceMayor > 0 ? formatMoney(p.priceMayor) : <span className="field__hint">igual</span>}</td>
                {admin ? <td>{formatMoney(p.cost ?? 0)}</td> : null}
                {admin ? <td className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setMove(p)}>Entrada / ajuste</button><button className="btn btn--secondary btn--sm" onClick={() => setEdit(p)}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDel(p)}>Eliminar</button></td> : null}
              </tr>
            ))}
          </tbody></table></div>
          {data && !rows.length ? <p className="lede">No hay productos que coincidan.</p> : null}
        </>
      )}
      <Dlg open={edit !== null} onClose={() => setEdit(null)} wide>{edit !== null ? <ProductDialog item={edit === "new" ? null : edit} categories={prof.data?.categories ?? []} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); prof.reload(); }} /> : null}</Dlg>
      <Dlg open={!!move} onClose={() => setMove(null)}>{move ? <MoveDialog p={move} onClose={() => setMove(null)} onDone={() => { setMove(null); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={!!del} title="Eliminar producto" message="Si ya tiene ventas o cotizaciones, mejor desactívalo desde “Editar”." confirmLabel="Eliminar" onConfirm={async () => { const p = del!; setDel(null); try { await api(`/ferre/products/${p.id}`, { method: "DELETE" }); reload(); } catch (x) { setMsg(errMsg(x)); } }} onClose={() => setDel(null)} />
    </div>
  );
}
