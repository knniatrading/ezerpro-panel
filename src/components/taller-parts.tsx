"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { dateCO } from "@/lib/taller";
import type { TallerMove, TallerPart } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { ALL, Dlg, NumInput, errMsg, useTallerAccess } from "./taller-common";

function PartDialog({ item, onClose, onDone }: { item: TallerPart | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", sku: item?.sku ?? "", unit: item?.unit ?? "unidad", stock: "0", minStock: String(item?.minStock ?? 2), cost: String(item?.cost ?? 0), price: String(item?.price ?? 0) });
  const [active, setActive] = useState(item?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const body: Record<string, unknown> = { name: f.name.trim(), sku: f.sku.trim() || null, unit: f.unit.trim() || "unidad", minStock: Number(f.minStock || 0), cost: Number(f.cost || 0), price: Number(f.price || 0) };
    if (!item) body.stock = Number(f.stock || 0); else body.active = active;
    try { if (item) await api(`/taller/parts/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }); else await api("/taller/parts", { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar repuesto" : "Nuevo repuesto"}</h2>
      <div className="field"><label htmlFor="pp-n">Nombre</label><input id="pp-n" type="text" maxLength={80} value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="pp-s">Código (opcional)</label><input id="pp-s" type="text" value={f.sku} autoComplete="off" onChange={set("sku")} /></div>
        <div className="field"><label htmlFor="pp-u">Unidad</label><input id="pp-u" type="text" value={f.unit} placeholder="und, litro, juego" autoComplete="off" onChange={set("unit")} /></div>
      </div>
      <div className="field-row">
        {!item ? <div className="field"><label htmlFor="pp-st">Existencia inicial</label><input id="pp-st" type="number" min={0} value={f.stock} onChange={set("stock")} /></div> : null}
        <div className="field"><label htmlFor="pp-mi">Avisar cuando queden</label><input id="pp-mi" type="number" min={0} value={f.minStock} onChange={set("minStock")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pp-c">Costo (lo que pagas)</label><NumInput id="pp-c" value={f.cost} onChange={(v) => { setF({ ...f, cost: v }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="pp-p">Precio al cliente</label><NumInput id="pp-p" value={f.price} onChange={(v) => { setF({ ...f, price: v }); setErr(null); }} /></div>
      </div>
      {item ? <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Disponible para cotizar</label> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function MoveDialog({ part, onClose, onDone }: { part: TallerPart; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<"entrada" | "ajuste">("entrada");
  const [qty, setQty] = useState("1");
  const [sign, setSign] = useState<1 | -1>(1);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const moves = useResource<TallerMove[]>(`/taller/parts/${part.id}/moves`);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/taller/parts/${part.id}/move`, { method: "POST", body: JSON.stringify({ reason, delta: (reason === "entrada" ? 1 : sign) * Number(qty), note: note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  const label: Record<string, string> = { entrada: "Entrada", ajuste: "Ajuste", orden: "Usado en orden", devolucion: "Devuelto" };
  return (
    <div>
      <form onSubmit={submit} noValidate>
        <h2 id="dlg-title" tabIndex={-1}>{part.name}</h2>
        <p className="lede">Existencia actual: <b>{part.stock}</b> {part.unit}</p>
        <div className="chips" role="group" aria-label="Movimiento"><button type="button" className={`chip${reason === "entrada" ? " is-on" : ""}`} aria-pressed={reason === "entrada"} onClick={() => setReason("entrada")}>Entrada de compra</button><button type="button" className={`chip${reason === "ajuste" ? " is-on" : ""}`} aria-pressed={reason === "ajuste"} onClick={() => setReason("ajuste")}>Ajuste</button></div>
        <div className="field-row">
          {reason === "ajuste" ? <div className="field"><label htmlFor="mv-s">Tipo de ajuste</label><select id="mv-s" value={sign} onChange={(e) => setSign(Number(e.target.value) as 1 | -1)}><option value={1}>Sumar</option><option value={-1}>Restar</option></select></div> : null}
          <div className="field"><label htmlFor="mv-q">Cantidad</label><input id="mv-q" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="mv-n">{reason === "ajuste" ? "Motivo (obligatorio)" : "Nota (opcional)"}</label><input id="mv-n" type="text" maxLength={200} value={note} placeholder={reason === "ajuste" ? "Merma, conteo, daño…" : "Proveedor, factura…"} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
        <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
        <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button></div>
      </form>
      <h3>Últimos movimientos</h3>
      <ul className="plain-list">{(moves.data ?? []).slice(0, 8).map((m) => <li key={m.id}>{dateCO(m.createdAt)} · <b>{m.delta > 0 ? "+" : ""}{m.delta}</b> · {label[m.reason] ?? m.reason}{m.orderNumber ? ` #${m.orderNumber}` : ""}{m.note ? ` · ${m.note}` : ""}</li>)}</ul>
    </div>
  );
}

export function TallerPartsView() {
  const { state, allowed, role } = useTallerAccess(ALL);
  const { data, error, reload } = useResource<TallerPart[]>(allowed ? "/taller/parts" : null);
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [edit, setEdit] = useState<TallerPart | "new" | null>(null);
  const [move, setMove] = useState<TallerPart | null>(null);
  const [del, setDel] = useState<TallerPart | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const admin = role === "TENANT_ADMIN";
  const rows = (data ?? []).filter((p) => (!low || p.low) && (!q.trim() || (p.name + " " + (p.sku ?? "")).toLowerCase().includes(q.trim().toLowerCase())));
  const value = (data ?? []).filter((p) => p.active).reduce((s, p) => s + p.stock * (p.cost ?? 0), 0);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Repuestos e inventario</h1><p className="lede">{role === "EMPLOYEE" ? "Consulta qué hay en bodega." : "Cada repuesto usado en una orden se descuenta solo."}</p></div>
        {admin ? <button className="btn btn--primary btn--sm" onClick={() => setEdit("new")}>Nuevo repuesto</button> : null}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <div className="kpis"><div className="kpi"><span>Repuestos</span><strong>{(data ?? []).filter((p) => p.active).length}</strong></div><div className="kpi kpi--warn"><span>Por agotarse</span><strong>{(data ?? []).filter((p) => p.low).length}</strong></div>{admin ? <div className="kpi"><span>Valor en bodega (costo)</span><strong>{formatMoney(value)}</strong></div> : null}</div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Nombre o código" onChange={(e) => setQ(e.target.value)} /></label><label className="check"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Solo por agotarse</label></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Repuesto</th><th>Existencia</th><th>Precio</th>{admin ? <th>Costo</th> : null}{role !== "EMPLOYEE" ? <th></th> : null}</tr></thead><tbody>
        {rows.map((p) => (
          <tr key={p.id} className={p.active ? "" : "is-off"}><td><b>{p.name}</b>{p.sku ? <><br /><span className="field__hint">{p.sku}</span></> : null}{!p.active ? <> <span className="badge badge--info">Inactivo</span></> : null}</td>
            <td><b>{p.stock}</b> {p.unit} {p.low ? <span className="badge badge--warn">Por agotarse</span> : null}<br /><span className="field__hint">Mínimo {p.minStock}</span></td><td>{formatMoney(p.price)}</td>{admin ? <td>{formatMoney(p.cost ?? 0)}</td> : null}
            {role !== "EMPLOYEE" ? <td className="actions-cell">{admin ? <><button className="btn btn--primary btn--sm" onClick={() => setMove(p)}>Entrada / ajuste</button><button className="btn btn--secondary btn--sm" onClick={() => setEdit(p)}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDel(p)}>Eliminar</button></> : null}</td> : null}</tr>
        ))}
      </tbody></table></div>
      {data && !rows.length ? <p className="lede">No hay repuestos que coincidan.</p> : null}
      <Dlg open={edit !== null} onClose={() => setEdit(null)}>{edit !== null ? <PartDialog item={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} /> : null}</Dlg>
      <Dlg open={!!move} onClose={() => setMove(null)}>{move ? <MoveDialog part={move} onClose={() => setMove(null)} onDone={() => { setMove(null); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={!!del} title="Eliminar repuesto" message="Si ya se usó en órdenes, mejor desactívalo desde “Editar”." confirmLabel="Eliminar" onConfirm={async () => { const p = del!; setDel(null); try { await api(`/taller/parts/${p.id}`, { method: "DELETE" }); reload(); } catch (x) { setMsg(errMsg(x)); } }} onClose={() => setDel(null)} />
    </div>
  );
}
