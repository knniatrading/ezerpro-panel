"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import type { VetProfileData, VetServiceItem } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { useVetAccess } from "./vet-common";

function ServiceDialog({ item, onClose, onDone }: { item: VetServiceItem | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [val, setVal] = useState(item?.price ? String(item.price) : "");
  const [minutes, setMinutes] = useState(String(item?.minutes ?? 30));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const v = parsePesos(val);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe el nombre del servicio.");
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins < 10 || mins > 480) return setErr("La duración debe estar entre 10 y 480 minutos.");
    setBusy(true);
    const body = JSON.stringify({ name: name.trim(), description: desc.trim() || null, price: v || null, minutes: mins });
    try {
      if (item) await api(`/vet/services/${item.id}`, { method: "PATCH", body });
      else await api("/vet/services", { method: "POST", body });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar servicio" : "Nuevo servicio"}</h2>
      <div className="field"><label htmlFor="vs-name">Nombre</label><input id="vs-name" type="text" value={name} placeholder="Consulta general" autoComplete="off" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="vs-desc">Descripción (opcional)</label><input id="vs-desc" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="vs-val">Precio (opcional)</label><input id="vs-val" type="text" inputMode="numeric" value={val} autoComplete="off" onChange={(e) => { setVal(e.target.value); setErr(null); }} /><p className="field__hint">{v ? formatMoney(v) : "Vacío = a cotizar"}</p></div>
        <div className="field"><label htmlFor="vs-min">Duración (minutos)</label><input id="vs-min" type="text" inputMode="numeric" value={minutes} autoComplete="off" onChange={(e) => { setMinutes(e.target.value); setErr(null); }} /><p className="field__hint">Ocupa ese tiempo en la agenda.</p></div>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function VetServicesView() {
  const { state, allowed } = useVetAccess();
  const { data, error, reload } = useResource<VetProfileData>(allowed ? "/vet/profile" : null);
  const [dlg, setDlg] = useState<{ kind: "edit"; item: VetServiceItem | null } | { kind: "del"; id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function toggle(id: string, active: boolean) {
    try { await api(`/vet/services/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function del() {
    if (dlg?.kind !== "del") return;
    try { await api(`/vet/services/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Servicios de la clínica</h1><p className="lede">Lo que tus clientes pueden agendar en línea: consulta, vacunación, peluquería, guardería…</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "edit", item: null })}>Agregar servicio</button>
      </div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Servicio</th><th>Precio</th><th>Duración</th><th>Visible</th><th></th></tr></thead><tbody>
        {(data?.services ?? []).map((s) => (
          <tr key={s.id}>
            <td><b>{s.name}</b>{s.description ? <><br /><span className="field__hint">{s.description}</span></> : null}</td>
            <td>{s.price ? formatMoney(s.price) : "A cotizar"}</td>
            <td>{s.minutes >= 480 ? "Todo el día" : `${s.minutes} min`}</td>
            <td><button className={`chip ${s.active ? "is-on" : ""}`} aria-pressed={s.active} onClick={() => toggle(s.id, !s.active)}>{s.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "edit", item: s })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", id: s.id, name: s.name })}>Quitar</button></td>
          </tr>
        ))}
      </tbody></table></div>
      {data && !data.services.length ? <p className="lede">Aún no tienes servicios. Agrega el primero para que te agenden citas.</p> : null}
      <Modal open={dlg?.kind === "edit"} onClose={() => setDlg(null)}>
        {dlg?.kind === "edit" ? <ServiceDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <ConfirmDialog open={dlg?.kind === "del"} title="Quitar servicio" message={dlg?.kind === "del" ? `¿Quitar “${dlg.name}”? Las citas ya agendadas no cambian.` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
