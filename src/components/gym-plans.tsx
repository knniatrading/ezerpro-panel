"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import type { GymPlanItem, GymProfileData } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { useGymAccess } from "./gym-common";

function PlanDialog({ item, onClose, onDone }: { item: GymPlanItem | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [val, setVal] = useState(item ? String(item.price) : "");
  const [days, setDays] = useState(String(item?.days ?? 30));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(val);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre del plan.");
    const d = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 400) return setErr("La duración debe estar entre 1 y 400 días.");
    if (val.trim() === "" || Number.isNaN(v)) return setErr("Escribe el precio (puede ser 0).");
    setBusy(true);
    const body = JSON.stringify({ name: name.trim(), description: desc.trim() || null, price: v, days: d });
    try {
      if (item) await api(`/gym/plans/${item.id}`, { method: "PATCH", body });
      else await api("/gym/plans", { method: "POST", body });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar plan" : "Nuevo plan"}</h2>
      <div className="field"><label htmlFor="pl-name">Nombre</label><input id="pl-name" type="text" value={name} placeholder="Mensual, Trimestral, Día…" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="pl-desc">Descripción (opcional)</label><input id="pl-desc" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="pl-val">Precio</label><input id="pl-val" type="text" inputMode="numeric" value={val} autoComplete="off" onChange={(e) => { setVal(e.target.value); setErr(null); }} /><p className="field__hint">{val.trim() !== "" && !Number.isNaN(v) ? formatMoney(v) : ""}</p></div>
        <div className="field"><label htmlFor="pl-days">Duración (días)</label><input id="pl-days" type="text" inputMode="numeric" value={days} autoComplete="off" onChange={(e) => { setDays(e.target.value); setErr(null); }} /><p className="field__hint">30 = un mes, 1 = un día.</p></div>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function GymPlansView() {
  const { state, allowed } = useGymAccess();
  const { data, error, reload } = useResource<GymProfileData>(allowed ? "/gym/profile" : null);
  const [dlg, setDlg] = useState<{ kind: "edit"; item: GymPlanItem | null } | { kind: "del"; id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function toggle(id: string, active: boolean) {
    try { await api(`/gym/plans/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }); reload(); } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function del() {
    if (dlg?.kind !== "del") return;
    try { await api(`/gym/plans/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Planes y precios</h1><p className="lede">Las membresías que vendes. Al cobrar, se suma la duración del plan al vencimiento del socio.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "edit", item: null })}>Agregar plan</button></div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Plan</th><th>Precio</th><th>Duración</th><th>Visible</th><th></th></tr></thead><tbody>
        {(data?.plans ?? []).map((p) => (
          <tr key={p.id}>
            <td><b>{p.name}</b>{p.description ? <><br /><span className="field__hint">{p.description}</span></> : null}</td>
            <td>{formatMoney(p.price)}</td>
            <td>{p.days === 1 ? "1 día" : `${p.days} días`}</td>
            <td><button className={`chip ${p.active ? "is-on" : ""}`} aria-pressed={p.active} onClick={() => toggle(p.id, !p.active)}>{p.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "edit", item: p })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", id: p.id, name: p.name })}>Quitar</button></td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.plans.length ? <p className="lede">Aún no tienes planes. Agrega el primero para poder cobrar membresías.</p> : null}
      <Modal open={dlg?.kind === "edit"} onClose={() => setDlg(null)}>{dlg?.kind === "edit" ? <PlanDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <ConfirmDialog open={dlg?.kind === "del"} title="Quitar plan" message={dlg?.kind === "del" ? `¿Quitar “${dlg.name}”? Los socios que ya lo tienen conservan su vencimiento.` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
