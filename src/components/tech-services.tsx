"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import type { RideServiceItem, TechData } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { useTechAccess } from "./tech-profile-admin";

function ServiceDialog({ item, onClose, onDone }: { item: RideServiceItem | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [val, setVal] = useState(item?.price ? String(item.price) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(val);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre del servicio.");
    setBusy(true);
    const body = JSON.stringify({ name: name.trim(), description: desc.trim() || null, price: v || null });
    try {
      if (item) await api(`/tech/services/${item.id}`, { method: "PATCH", body });
      else await api("/tech/services", { method: "POST", body });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar servicio" : "Nuevo servicio"}</h2>
      <div className="field"><label htmlFor="s-name">Nombre</label><input id="s-name" type="text" value={name} placeholder="Reparación de lavadoras" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="s-desc">Descripción (opcional)</label><input id="s-desc" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="field"><label htmlFor="s-val">Precio desde (opcional)</label><input id="s-val" type="text" inputMode="numeric" value={val} autoComplete="off" onChange={(e) => { setVal(e.target.value); setErr(null); }} />
        <p className="field__hint">{v ? formatMoney(v) : "Si lo dejas vacío, dirá “A cotizar”."}</p></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function TechServicesView() {
  const { state, allowed } = useTechAccess();
  const { data, error, reload } = useResource<TechData>(allowed ? "/tech/profile" : null);
  const [dlg, setDlg] = useState<{ kind: "edit"; item: RideServiceItem | null } | { kind: "del"; id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function toggle(id: string, active: boolean) {
    try { await api(`/tech/services/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function del() {
    if (dlg?.kind !== "del") return;
    try { await api(`/tech/services/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Mis servicios</h1><p className="lede">La lista que ven tus clientes en tu página. Pon precios “desde” solo si te ayudan a conseguir trabajo.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "edit", item: null })}>Agregar servicio</button>
      </div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Precio</th><th>Visible</th><th></th></tr></thead><tbody>
        {(data?.services ?? []).map((s) => (
          <tr key={s.id}>
            <td><b>{s.name}</b>{s.description ? <><br /><span className="field__hint">{s.description}</span></> : null}</td>
            <td>{s.price ? `Desde ${formatMoney(s.price)}` : "A cotizar"}</td>
            <td><button className={`chip ${s.active ? "is-on" : ""}`} aria-pressed={s.active} onClick={() => toggle(s.id, !s.active)}>{s.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "edit", item: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", id: s.id, name: s.name })}>Quitar</button></td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.services.length ? <p className="lede">Aún no tienes servicios. Agrega el primero.</p> : null}
      <Modal open={dlg?.kind === "edit"} onClose={() => setDlg(null)}>
        {dlg?.kind === "edit" ? <ServiceDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <ConfirmDialog open={dlg?.kind === "del"} title="Quitar servicio" message={dlg?.kind === "del" ? `¿Quitar “${dlg.name}” de tu página?` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
