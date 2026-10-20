"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { NOTICE_LEVELS, NOTICE_TONE, dtCO } from "@/lib/residential";
import type { ResNotice } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ALL, Dlg, Empty, Err, Pill, errMsg, useResAccess } from "./res-common";

function NoticeForm({ item, onClose, onDone }: { item: ResNotice | null; onClose: () => void; onDone: (emailed?: number) => void }) {
  const [f, setF] = useState({ title: item?.title ?? "", body: item?.body ?? "", level: item?.level ?? "info", pinned: item?.pinned ?? false, email: false, active: item?.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.title.trim().length < 3) return setErr("Escribe el título.");
    if (f.body.trim().length < 3) return setErr("Escribe el mensaje.");
    setBusy(true);
    const base = { title: f.title.trim(), body: f.body.trim(), level: f.level, pinned: f.pinned };
    try {
      if (item) { await api(`/residential/notices/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...base, active: f.active }) }); onDone(); }
      else { const r = await api<{ emailed: number }>("/residential/notices", { method: "POST", body: JSON.stringify({ ...base, email: f.email }) }); onDone(r.emailed); }
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar aviso" : "Aviso nuevo"}</h2>
      <div className="field"><label htmlFor="nt-t">Título</label><input id="nt-t" type="text" value={f.title} placeholder="Corte de agua mañana" autoComplete="off" onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(null); }} /></div>
      <div className="field"><label htmlFor="nt-b">Mensaje</label><textarea id="nt-b" rows={5} maxLength={2000} value={f.body} onChange={(e) => { setF({ ...f, body: e.target.value }); setErr(null); }} /></div>
      <div className="chips" role="group" aria-label="Importancia">{NOTICE_LEVELS.map((l) => <button type="button" key={l.v} className={f.level === l.v ? "is-on" : ""} aria-pressed={f.level === l.v} onClick={() => setF({ ...f, level: l.v })}>{l.l}</button>)}</div>
      <label className="check"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Fijar arriba en la cartelera</label>
      {!item ? <label className="check"><input type="checkbox" checked={f.email} onChange={(e) => setF({ ...f, email: e.target.checked })} /> También enviarlo por correo a los residentes que tienen correo registrado</label> : <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Visible para los residentes</label>}
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar" : "Publicar"}</button></div>
    </form>
  );
}

export function ResNoticesView() {
  const { state, allowed, role } = useResAccess(ALL);
  const canEdit = role !== "CASHIER";
  const list = useResource<ResNotice[]>(allowed ? "/residential/notices" : null);
  const [dlg, setDlg] = useState<null | "new" | { edit: ResNotice } | { del: ResNotice } | { mail: ResNotice }>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const close = () => setDlg(null);
  async function del(n: ResNotice) { try { await api(`/residential/notices/${n.id}`, { method: "DELETE" }); close(); list.reload(); } catch (x) { setErr(errMsg(x)); close(); } }
  async function mail(n: ResNotice) { try { const r = await api<{ emailed: number }>(`/residential/notices/${n.id}/email`, { method: "POST", body: JSON.stringify({}) }); setMsg(`Se envió por correo a ${r.emailed} personas.`); close(); list.reload(); } catch (x) { setErr(errMsg(x)); close(); } }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Cartelera digital</h1><p className="lede">Los comunicados que ven todos los residentes en su portal. Se acabó el papel pegado en el ascensor.</p></div>
        {canEdit ? <button className="btn btn--primary btn--sm" onClick={() => setDlg("new")}>Aviso nuevo</button> : null}</div>
      {msg ? <p className="note" role="status">{msg}</p> : null}{err ? <p className="form-error" role="alert">{err}</p> : null}
      <div className="vet-grid">
        {(list.data ?? []).map((n) => (
          <section key={n.id} className="dcard__sec" style={n.active ? undefined : { opacity: 0.6 }}>
            <h2>{n.pinned ? "📌 " : ""}{n.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p>
            <p className="field__hint"><Pill tone={NOTICE_TONE[n.level] ?? "info"}>{NOTICE_LEVELS.find((l) => l.v === n.level)?.l ?? n.level}</Pill> {dtCO(n.publishedAt)}{n.authorName ? ` · ${n.authorName}` : ""}{n.emailedAt ? " · enviado por correo" : ""}{!n.active ? " · oculto" : ""}</p>
            {canEdit ? <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ edit: n })}>Editar</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ mail: n })}>Enviar por correo</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ del: n })}>Borrar</button></div> : null}
          </section>
        ))}
      </div>
      {list.data && !list.data.length ? <Empty>Todavía no hay avisos.</Empty> : null}
      <Dlg open={dlg === "new" || (typeof dlg === "object" && dlg !== null && "edit" in dlg)} onClose={close}>{dlg === "new" ? <NoticeForm item={null} onClose={close} onDone={(n) => { close(); if (n !== undefined && n > 0) setMsg(`Aviso publicado y enviado por correo a ${n} personas.`); list.reload(); }} /> : typeof dlg === "object" && dlg && "edit" in dlg ? <NoticeForm item={dlg.edit} onClose={close} onDone={() => { close(); list.reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "del" in dlg} title="Borrar aviso" message="¿Borrar este aviso de la cartelera?" confirmLabel="Sí, borrar" onConfirm={() => (typeof dlg === "object" && dlg && "del" in dlg ? del(dlg.del) : undefined)} onClose={close} />
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "mail" in dlg} title="Enviar por correo" message="Se enviará este aviso por correo a los residentes con correo registrado. ¿Continuar?" confirmLabel="Sí, enviar" onConfirm={() => (typeof dlg === "object" && dlg && "mail" in dlg ? mail(dlg.mail) : undefined)} onClose={close} />
    </div>
  );
}
