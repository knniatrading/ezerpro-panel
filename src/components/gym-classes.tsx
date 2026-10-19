"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { WEEKDAYS, WEEK_ORDER, addDays, hhmm, niceDate, todayCO, toMin } from "@/lib/gym";
import type { GymClassItem, GymMember, GymSession } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { useGymAccess } from "./gym-common";

function ClassDialog({ c, onClose, onDone }: { c: GymClassItem | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: c?.name ?? "", instructor: c?.instructor ?? "", description: c?.description ?? "", weekday: c?.weekday ?? 1, start: c ? hhmm(c.startMin) : "06:00", minutes: c?.minutes ?? 60, capacity: c?.capacity ?? 20, active: c?.active ?? true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre de la clase.");
    if (!f.start) return setErr("Elige la hora.");
    if (!(f.capacity >= 1)) return setErr("El cupo debe ser de al menos 1.");
    setBusy(true);
    const payload = { name: f.name.trim(), instructor: f.instructor.trim() || null, description: f.description.trim() || null, weekday: f.weekday, startMin: toMin(f.start), minutes: f.minutes, capacity: f.capacity, active: f.active };
    try {
      if (c) await api(`/gym/classes/${c.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/gym/classes", { method: "POST", body: JSON.stringify(payload) });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{c ? "Editar clase" : "Nueva clase semanal"}</h2>
      <div className="field"><label htmlFor="cl-name">Nombre</label><input id="cl-name" type="text" value={f.name} placeholder="CrossFit, Yoga, Spinning…" autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
      <div className="field"><label htmlFor="cl-ins">Instructor (opcional)</label><input id="cl-ins" type="text" value={f.instructor} autoComplete="off" onChange={(e) => setF({ ...f, instructor: e.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="cl-day">Día</label><select id="cl-day" value={f.weekday} onChange={(e) => setF({ ...f, weekday: Number(e.target.value) })}>{WEEK_ORDER.map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}</select></div>
        <div className="field"><label htmlFor="cl-start">Hora</label><input id="cl-start" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="cl-min">Duración (min)</label><input id="cl-min" type="number" min={15} max={240} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="cl-cap">Cupo</label><input id="cl-cap" type="number" min={1} max={500} value={f.capacity} onChange={(e) => { setF({ ...f, capacity: Number(e.target.value) }); setErr(null); }} /></div>
      </div>
      <div className="field"><label htmlFor="cl-desc">Descripción (opcional)</label><input id="cl-desc" type="text" maxLength={200} value={f.description} autoComplete="off" onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Clase activa (visible para reservar)</label>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function AddBooking({ s, onClose, onDone }: { s: GymSession; onClose: () => void; onDone: () => void }) {
  const { data } = useResource<GymMember[]>("/gym/members");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const taken = new Set((s.attendees ?? []).map((a) => a.memberId));
  const list = (data ?? []).filter((m) => !m.archived && !taken.has(m.id) && (!q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 12);
  async function add(id: string) {
    try { await api("/gym/bookings", { method: "POST", body: JSON.stringify({ memberId: id, classId: s.classId, date: s.date }) }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Inscribir en {s.name}</h2>
      <p className="field__hint">{niceDate(s.date)} · {hhmm(s.startMin)} · quedan {s.capacity - s.booked} cupos</p>
      <div className="field"><label htmlFor="ab-q">Buscar socio</label><input id="ab-q" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      <ul className="dcard__list">{list.map((m) => <li key={m.id}><div><b>{m.name}</b></div><button type="button" className="btn btn--primary btn--sm" onClick={() => add(m.id)}>Inscribir</button></li>)}</ul>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

export function GymClassesView() {
  const { state, allowed, role } = useGymAccess(["TENANT_ADMIN", "CASHIER", "EMPLOYEE"]);
  const admin = role === "TENANT_ADMIN";
  const staff = role !== "EMPLOYEE";
  const classes = useResource<GymClassItem[]>(allowed ? "/gym/classes" : null);
  const today = todayCO();
  const [from] = useState(today);
  const [day, setDay] = useState(today);
  const sessions = useResource<GymSession[]>(allowed ? `/gym/sessions?from=${from}&to=${addDays(from, 6)}` : null);
  const [dlg, setDlg] = useState<{ k: "class"; c: GymClassItem | null } | { k: "add"; s: GymSession } | { k: "del"; c: GymClassItem } | { k: "cancel"; id: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const list = (sessions.data ?? []).filter((s) => s.date === day).sort((a, b) => a.startMin - b.startMin);
  const refresh = () => { setDlg(null); classes.reload(); sessions.reload(); };
  const fail = (x: unknown) => { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); };
  async function delClass() { if (dlg?.k !== "del") return; try { await api(`/gym/classes/${dlg.c.id}`, { method: "DELETE" }); refresh(); } catch (x) { fail(x); } }
  async function cancel() { if (dlg?.k !== "cancel") return; try { await api(`/gym/bookings/${dlg.id}`, { method: "DELETE" }); refresh(); } catch (x) { fail(x); } }

  return (
    <div className="page">
      <div className="page-head"><div><h1>Clases</h1><p className="lede">Agenda semanal con cupos. Los socios reservan desde su portal.</p></div>
        {admin ? <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "class", c: null })}>Nueva clase</button> : null}</div>
      {err || sessions.error ? <p className="form-error" role="alert">{err ?? sessions.error}</p> : null}

      <div className="chips" role="group" aria-label="Día">
        {days.map((d) => <button type="button" key={d} className={day === d ? "is-on" : ""} aria-pressed={day === d} onClick={() => setDay(d)}>{d === today ? "Hoy" : niceDate(d)}</button>)}
      </div>
      {sessions.data && !list.length ? <p className="field__hint">No hay clases este día.</p> : null}
      <ul className="sessions">
        {list.map((s) => (
          <li key={s.classId + s.date} className="session">
            <div className="session__head"><div><b>{hhmm(s.startMin)} · {s.name}</b><p>{s.instructor ?? "Sin instructor"} · {s.minutes} min</p></div>
              <span className={`badge ${s.full ? "badge--warn" : "badge--ok"}`}>{s.booked}/{s.capacity}{s.full ? " · Lleno" : ""}</span></div>
            {s.attendees?.length ? <ul className="session__people">{s.attendees.map((a) => <li key={a.bookingId}>{a.name}{staff ? <button type="button" className="link-btn" onClick={() => setDlg({ k: "cancel", id: a.bookingId })} aria-label={`Quitar a ${a.name}`}>Quitar</button> : null}</li>)}</ul> : <p className="field__hint">Nadie inscrito todavía.</p>}
            {staff && !s.full ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "add", s })}>Inscribir socio</button> : null}
          </li>
        ))}
      </ul>

      {admin ? (
        <>
          <h2 className="section-title">Horario semanal</h2>
          <ul className="ledger">
            {(classes.data ?? []).map((c) => (
              <li key={c.id}><span>{WEEKDAYS[c.weekday]} {hhmm(c.startMin)} · <b>{c.name}</b>{c.instructor ? ` · ${c.instructor}` : ""} · cupo {c.capacity}{c.active ? "" : " · (inactiva)"}</span><span />
                <span className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "class", c })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", c })}>Quitar</button></span></li>
            ))}
          </ul>
        </>
      ) : null}

      <Modal open={dlg?.k === "class"} onClose={() => setDlg(null)}>{dlg?.k === "class" ? <ClassDialog c={dlg.c} onClose={() => setDlg(null)} onDone={refresh} /> : null}</Modal>
      <Modal open={dlg?.k === "add"} onClose={() => setDlg(null)}>{dlg?.k === "add" ? <AddBooking s={dlg.s} onClose={() => setDlg(null)} onDone={refresh} /> : null}</Modal>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar clase" message="Se quita del horario y se cancelan sus reservas." confirmLabel="Sí, quitar" onConfirm={delClass} onClose={() => setDlg(null)} />
      <ConfirmDialog open={dlg?.k === "cancel"} title="Quitar reserva" message="¿Quitar a este socio de la clase?" confirmLabel="Sí, quitar" onConfirm={cancel} onClose={() => setDlg(null)} />
    </div>
  );
}
