"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import type { ConsentTpl } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { Dlg, errMsg, useClinicAccess } from "./clinic-common";

function TplDialog({ item, onClose, onDone }: { item: ConsentTpl | null; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Escribe el título.");
    if (body.trim().length < 20) return setErr("El texto es muy corto.");
    setBusy(true);
    const b = JSON.stringify({ title: title.trim(), body: body.trim() });
    try { if (item) await api(`/clinic/consent-templates/${item.id}`, { method: "PATCH", body: b }); else await api("/clinic/consent-templates", { method: "POST", body: b }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar plantilla" : "Nueva plantilla"}</h2>
      <div className="field"><label htmlFor="ct-t">Título</label><input id="ct-t" type="text" maxLength={100} value={title} autoComplete="off" onChange={(e) => { setTitle(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="ct-b">Texto del consentimiento</label><textarea id="ct-b" rows={10} maxLength={6000} value={body} onChange={(e) => { setBody(e.target.value); setErr(null); }} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function ClinicConsentTemplatesView() {
  const { state, allowed } = useClinicAccess();
  const { data, error, reload } = useResource<ConsentTpl[]>(allowed ? "/clinic/consent-templates" : null);
  const [dlg, setDlg] = useState<{ k: "edit"; item: ConsentTpl | null } | { k: "del"; t: ConsentTpl } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const done = () => { setDlg(null); reload(); };
  async function toggle(t: ConsentTpl) { try { await api(`/clinic/consent-templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ active: !t.active }) }); reload(); } catch (x) { setErr(errMsg(x)); } }
  async function del() { if (dlg?.k !== "del") return; try { await api(`/clinic/consent-templates/${dlg.t.id}`, { method: "DELETE" }); setDlg(null); reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); } }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Consentimientos</h1><p className="lede">Plantillas que le envías al paciente para firmar desde su celular o en recepción. Los textos son modelos generales: pide a tu asesor legal que los revise.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "edit", item: null })}>Nueva plantilla</button></div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Plantilla</th><th>Activa</th><th></th></tr></thead><tbody>
        {(data ?? []).map((t) => (
          <tr key={t.id}><td><b>{t.title}</b><br /><span className="field__hint">{t.body.slice(0, 110)}…</span></td>
            <td><button className={`chip ${t.active ? "is-on" : ""}`} aria-pressed={t.active} onClick={() => toggle(t)}>{t.active ? "Sí" : "No"}</button></td>
            <td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit", item: t })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", t })}>Quitar</button></td></tr>
        ))}
      </tbody></table></div>
      <Dlg open={dlg?.k === "edit"} onClose={() => setDlg(null)} wide>{dlg?.k === "edit" ? <TplDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar plantilla" message={dlg?.k === "del" ? `¿Quitar “${dlg.t.title}”? Los consentimientos ya creados no cambian.` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
