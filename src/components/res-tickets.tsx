"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { TICKET_KIND_TEXT, TICKET_STATES, TICKET_STATE_TEXT, dtCO } from "@/lib/residential";
import type { ResTicket } from "@/lib/residential";
import { NoAccess } from "./no-access";
import { ADMIN_BOARD, Dlg, Empty, Err, Pill, errMsg, useResAccess } from "./res-common";

const tone = (s: string): "ok" | "info" | "warn" => (s === "radicada" ? "warn" : s === "en_proceso" ? "info" : "ok");

function TicketDlg({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const t = useResource<ResTicket>(`/residential/tickets/${id}`);
  const [status, setStatus] = useState<string | null>(null);
  const [resp, setResp] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const d = t.data;
  if (!d) return <div><h2 id="dlg-title" tabIndex={-1}>PQRS</h2><p className="lede">{t.error ?? "Cargando…"}</p></div>;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const body: Record<string, unknown> = {};
    if (status && status !== d!.status) body.status = status;
    if (resp.trim()) body.response = resp.trim();
    if (note.trim()) body.note = note.trim();
    if (!Object.keys(body).length) { setBusy(false); return setErr("No hay cambios que guardar."); }
    try { await api(`/residential/tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) }); setResp(""); setNote(""); setStatus(null); t.reload(); onChanged(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>PQRS #{d.number} · {TICKET_KIND_TEXT[d.kind] ?? d.kind}</h2>
      <p><b>{d.title}</b></p>
      <p style={{ whiteSpace: "pre-wrap" }}>{d.body}</p>
      <p className="field__hint">{d.personName ?? "Anónimo"}{d.unit ? ` · ${d.unit}` : ""}{d.place ? ` · ${d.place}` : ""} · {dtCO(d.createdAt)}</p>
      {d.response ? <p className="note"><b>Respuesta enviada al residente:</b> {d.response}</p> : null}
      <form onSubmit={save} noValidate>
        <div className="field"><span className="label">Estado</span><div className="chips" role="group" aria-label="Estado">{TICKET_STATES.map((s) => <button type="button" key={s.v} className={(status ?? d.status) === s.v ? "is-on" : ""} aria-pressed={(status ?? d.status) === s.v} onClick={() => setStatus(s.v)}>{s.l}</button>)}</div></div>
        <div className="field"><label htmlFor="tk-r">Respuesta para el residente (la ve en su portal)</label><textarea id="tk-r" rows={3} maxLength={2000} value={resp} onChange={(e) => { setResp(e.target.value); setErr(null); }} /></div>
        <div className="field"><label htmlFor="tk-n">Nota interna (solo la ve la administración)</label><input id="tk-n" type="text" maxLength={1000} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
        <Err msg={err} />
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
      </form>
      <h3>Historial auditable</h3>
      <ul className="dcard__list">{d.events?.map((e) => <li key={e.id}><div><b>{e.action}</b>{e.note ? <p>{e.note}</p> : null}<p className="field__hint">{dtCO(e.createdAt)}{e.byName ? ` · ${e.byName}` : ""}</p></div></li>)}</ul>
      <div className="dialog__actions"><button className="btn btn--primary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

export function ResTicketsView() {
  const { state, allowed } = useResAccess(ADMIN_BOARD);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const list = useResource<ResTicket[]>(allowed ? `/residential/tickets${filter === "open" ? "?open=1" : ""}` : null);
  const [open, setOpen] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>PQRS</h1><p className="lede">Peticiones, quejas y reclamos de los residentes, con historial de cada cambio.</p></div></div>
      <div className="chips" role="group" aria-label="Ver">{([["open", "Pendientes"], ["all", "Todos"]] as const).map(([v, l]) => <button key={v} type="button" className={filter === v ? "is-on" : ""} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}</div>
      {list.error ? <p className="form-error" role="alert">{list.error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Asunto</th><th>Unidad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>
        {(list.data ?? []).map((t) => <tr key={t.id}><td>{t.number}</td><td><b>{t.title}</b><br /><span className="field__hint">{TICKET_KIND_TEXT[t.kind] ?? t.kind}{t.place ? ` · ${t.place}` : ""}</span></td><td>{t.unit ?? "—"}</td><td><Pill tone={tone(t.status)}>{TICKET_STATE_TEXT[t.status] ?? t.status}</Pill></td><td>{dtCO(t.createdAt)}</td><td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setOpen(t.id)}>Abrir</button></td></tr>)}
      </tbody></table></div>
      {list.data && !list.data.length ? <Empty>{filter === "open" ? "No hay PQRS pendientes." : "Aún no hay PQRS."}</Empty> : null}
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <TicketDlg id={open} onClose={() => setOpen(null)} onChanged={list.reload} /> : null}</Dlg>
    </div>
  );
}
