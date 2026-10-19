"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { niceDate } from "@/lib/gym";
import { dateCO } from "@/lib/vet";
import type { GymMember, GymRoutine } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { MemberAvatar, useGymAccess } from "./gym-common";

export function RoutineDialog({ routine, memberId, onClose, onDone }: { routine: GymRoutine | null; memberId?: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(routine?.title ?? "");
  const [body, setBody] = useState(routine?.body ?? "");
  const [video, setVideo] = useState(routine?.videoUrl ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Escribe el nombre de la rutina.");
    if (body.trim().length < 2) return setErr("Escribe los ejercicios.");
    if (video.trim() && !/^https:\/\//i.test(video.trim())) return setErr("El enlace del video debe empezar por https://");
    setBusy(true);
    const payload = { title: title.trim(), body: body.trim(), videoUrl: video.trim() || null };
    try {
      if (routine) await api(`/gym/routines/${routine.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/gym/routines", { method: "POST", body: JSON.stringify({ ...payload, memberId: memberId ?? null }) });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{routine ? "Editar rutina" : memberId ? "Nueva rutina para el socio" : "Nueva plantilla de rutina"}</h2>
      <div className="field"><label htmlFor="rt-title">Nombre</label><input id="rt-title" type="text" value={title} placeholder="Pierna y glúteo, Full body…" autoComplete="off" onChange={(e) => { setTitle(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="rt-body">Ejercicios</label><textarea id="rt-body" rows={8} maxLength={3000} value={body} placeholder={"Sentadilla 4x12\nPress de pecho 3x10\nPlancha 3x30 s"} onChange={(e) => { setBody(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="rt-video">Video (opcional)</label><input id="rt-video" type="url" value={video} placeholder="https://www.youtube.com/watch?v=…" autoComplete="off" onChange={(e) => { setVideo(e.target.value); setErr(null); }} /><p className="field__hint">Pega un enlace de YouTube: el socio lo ve dentro de su rutina.</p></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function AssignDialog({ tpl, onClose, onDone }: { tpl: GymRoutine; onClose: () => void; onDone: (n: number) => void }) {
  const { data } = useResource<GymMember[]>("/gym/members");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = (data ?? []).filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setSel(n); setErr(null); };
  async function go() {
    if (!sel.size) return setErr("Elige al menos un socio.");
    if (sel.size > 50) return setErr("Máximo 50 socios a la vez.");
    setBusy(true);
    try { const r = await api<{ assigned: number }>(`/gym/routines/${tpl.id}/assign`, { method: "POST", body: JSON.stringify({ memberIds: [...sel] }) }); onDone(r.assigned); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Asignar “{tpl.title}”</h2>
      <div className="field"><label htmlFor="as-q">Buscar socio</label><input id="as-q" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      <ul className="pick-list">
        {list.map((m) => (
          <li key={m.id}><label className="pick-list__row"><input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} /><MemberAvatar m={m} size={32} /><span>{m.name}</span></label></li>
        ))}
      </ul>
      <p className="field__hint">{sel.size} socio{sel.size === 1 ? "" : "s"} elegido{sel.size === 1 ? "" : "s"}.</p>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="button" className="btn btn--primary" disabled={busy} onClick={go}>{busy ? "Asignando…" : "Asignar"}</button></div>
    </div>
  );
}

export function GymRoutinesView() {
  const { state, allowed, role } = useGymAccess(["TENANT_ADMIN", "EMPLOYEE"]);
  const tpls = useResource<GymRoutine[]>(allowed ? "/gym/routines" : null);
  const members = useResource<GymMember[]>(allowed ? "/gym/members" : null);
  const [memberId, setMemberId] = useState("");
  const [q, setQ] = useState("");
  const mine = useResource<GymRoutine[]>(allowed && memberId ? `/gym/routines?memberId=${memberId}` : null);
  const [dlg, setDlg] = useState<{ k: "edit"; r: GymRoutine | null; memberId?: string } | { k: "assign"; r: GymRoutine } | { k: "del"; r: GymRoutine } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { const m = new URLSearchParams(window.location.search).get("member"); if (m) setMemberId(m); }, []);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const sel = (members.data ?? []).find((m) => m.id === memberId);
  const cand = (members.data ?? []).filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  const done = () => { setDlg(null); tpls.reload(); if (memberId) mine.reload(); };
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/gym/routines/${dlg.r.id}`, { method: "DELETE" }); setDlg(null); tpls.reload(); if (memberId) mine.reload(); } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const canDel = (r: GymRoutine) => role === "TENANT_ADMIN" || (!r.memberId);

  return (
    <div className="page">
      <div className="page-head"><div><h1>Rutinas</h1><p className="lede">Crea plantillas y asígnalas a tus socios: ellos las ven en su celular, con texto y video.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "edit", r: null })}>Nueva plantilla</button></div>
      {msg ? <p className="note" role="status">{msg}</p> : null}
      {err || tpls.error ? <p className="form-error" role="alert">{err ?? tpls.error}</p> : null}

      <h2 className="section-title">Plantillas</h2>
      {tpls.data && !tpls.data.length ? <p className="field__hint">Aún no tienes plantillas. Crea una y asígnala a varios socios de una vez.</p> : null}
      <ul className="routine-list">
        {(tpls.data ?? []).map((r) => (
          <li key={r.id} className="routine">
            <div><b>{r.title}</b>{r.videoUrl ? <span className="badge badge--info">Con video</span> : null}<pre>{r.body}</pre></div>
            <div className="actions-cell">
              <button className="btn btn--primary btn--sm" onClick={() => { setMsg(null); setDlg({ k: "assign", r }); }}>Asignar a socios</button>
              <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit", r })}>Editar</button>
              {canDel(r) ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", r })}>Quitar</button> : null}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Rutinas de un socio</h2>
      <div className="field"><label htmlFor="rq">Buscar socio</label><input id="rq" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips" role="group" aria-label="Elegir socio">{cand.map((m) => <button type="button" key={m.id} className={memberId === m.id ? "is-on" : ""} aria-pressed={memberId === m.id} onClick={() => setMemberId(m.id)}>{m.name}</button>)}</div>
      {sel ? (
        <>
          <div className="page-head"><h3>{sel.name}</h3><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit", r: null, memberId: sel.id })}>Nueva rutina para {sel.name.split(" ")[0]}</button></div>
          {mine.data && !mine.data.length ? <p className="field__hint">Este socio aún no tiene rutinas.</p> : null}
          <ul className="routine-list">
            {(mine.data ?? []).map((r) => (
              <li key={r.id} className="routine">
                <div><b>{r.title}</b> <span className="field__hint">{niceDate(dateCO(r.createdAt))}{r.trainerName ? ` · ${r.trainerName}` : ""}</span>{r.videoUrl ? <span className="badge badge--info">Con video</span> : null}<pre>{r.body}</pre></div>
                <div className="actions-cell">
                  <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "edit", r })}>Editar</button>
                  {canDel(r) ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", r })}>Quitar</button> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Modal open={dlg?.k === "edit"} onClose={() => setDlg(null)} wide>{dlg?.k === "edit" ? <RoutineDialog routine={dlg.r} memberId={dlg.memberId} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <Modal open={dlg?.k === "assign"} onClose={() => setDlg(null)}>{dlg?.k === "assign" ? <AssignDialog tpl={dlg.r} onClose={() => setDlg(null)} onDone={(n) => { setDlg(null); setMsg(`Rutina asignada a ${n} socio${n === 1 ? "" : "s"}.`); if (memberId) mine.reload(); }} /> : null}</Modal>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar rutina" message="¿Quitar esta rutina?" confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
