"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "./session";
import { APPT_TEXT, coStart, hhmm, todayCO } from "@/lib/clinic";
import type { ApptStatus, ClinicAppt, ClinicPatient, ClinicProfileData } from "@/lib/types";
import { Modal } from "./modal";

export function useClinicAccess(roles: string[] = ["TENANT_ADMIN"]) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("clinica");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}
export const ALL_ROLES = ["TENANT_ADMIN", "CASHIER", "EMPLOYEE"];

export function ApptBadge({ status }: { status: ApptStatus }) {
  const s = APPT_TEXT[status] ?? { label: status, tone: "muted" as const };
  return <span className={`badge badge--${s.tone === "muted" ? "info" : s.tone}`}>{s.label}</span>;
}

export const errMsg = (x: unknown) => (x instanceof ApiError ? x.message : "Algo salió mal.");

/** Buscador de paciente con opción de crear uno nuevo en el momento. */
export function PatientPicker({ value, onPick }: { value: { id: string; name: string } | null; onPick: (p: { id: string; name: string } | null) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<ClinicPatient[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return; }
    const h = setTimeout(() => { api<ClinicPatient[]>(`/clinic/patients?q=${encodeURIComponent(q.trim())}`).then((r) => setList(r.slice(0, 6))).catch(() => setList([])); }, 250);
    return () => clearTimeout(h);
  }, [q]);
  async function create() {
    setErr(null);
    try {
      const p = await api<ClinicPatient>("/clinic/patients", { method: "POST", body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      onPick({ id: p.id, name: p.name });
    } catch (x) { setErr(errMsg(x)); }
  }
  if (value) return <div className="field"><span className="label">Paciente</span><div className="pick-chip"><b>{value.name}</b><button type="button" className="btn btn--secondary btn--sm" onClick={() => onPick(null)}>Cambiar</button></div></div>;
  return (
    <div className="field">
      <label htmlFor="pp-q">Paciente</label>
      {!creating ? (
        <>
          <input id="pp-q" type="text" value={q} placeholder="Busca por nombre, celular o documento" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
          {list.length ? <ul className="pick-list">{list.map((p) => <li key={p.id}><button type="button" onClick={() => onPick({ id: p.id, name: p.name })}>{p.name}<span className="field__hint"> · {p.phone}</span></button></li>)}</ul> : q.trim().length >= 2 ? <p className="field__hint">Sin resultados.</p> : null}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(true)}>Paciente nuevo</button>
        </>
      ) : (
        <div className="pick-new">
          <input type="text" aria-label="Nombre completo" value={name} placeholder="Nombre completo" autoComplete="off" onChange={(e) => setName(e.target.value)} />
          <input type="text" aria-label="Celular" inputMode="tel" value={phone} placeholder="Celular" autoComplete="off" onChange={(e) => setPhone(e.target.value)} />
          {err ? <p className="form-error" role="alert">{err}</p> : null}
          <div className="actions-cell"><button type="button" className="btn btn--primary btn--sm" onClick={create}>Crear y elegir</button><button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(false)}>Buscar</button></div>
        </div>
      )}
    </div>
  );
}

/** Nueva cita o reprogramación. */
export function ApptDialog({ cfg, patient, date, agendaId, move, onClose, onDone }: {
  cfg: ClinicProfileData; patient?: { id: string; name: string } | null; date?: string; agendaId?: string; move?: ClinicAppt | null; onClose: () => void; onDone: () => void;
}) {
  const agendas = cfg.agendas.filter((a) => a.active);
  const services = cfg.services.filter((s) => s.active);
  const [p, setP] = useState<{ id: string; name: string } | null>(patient ?? (move ? { id: move.patientId, name: move.patientName } : null));
  const [ag, setAg] = useState(move?.agendaId ?? agendaId ?? agendas[0]?.id ?? "");
  const [sv, setSv] = useState(services[0]?.id ?? "");
  const [day, setDay] = useState(date ?? todayCO());
  const [slots, setSlots] = useState<{ start: string; label: string }[] | null>(null);
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minutes = move ? Math.round((Date.parse(move.end) - Date.parse(move.start)) / 60000) : services.find((s) => s.id === sv)?.minutes ?? 30;
  useEffect(() => {
    if (!ag || !day) return;
    let off = false;
    setSlots(null); setStart("");
    api<{ slots: { start: string; label: string }[] }>(`/clinic/slots?agendaId=${ag}&date=${day}&minutes=${minutes}${move ? `&exclude=${move.id}` : ""}`).then((r) => { if (!off) setSlots(r.slots); }).catch(() => { if (!off) setSlots([]); });
    return () => { off = true; };
  }, [ag, day, minutes, move]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return setErr("Elige el paciente.");
    if (!start) return setErr("Elige un horario.");
    setBusy(true);
    try {
      if (move) await api(`/clinic/appointments/${move.id}`, { method: "PATCH", body: JSON.stringify({ start, agendaId: ag }) });
      else await api("/clinic/appointments", { method: "POST", body: JSON.stringify({ patientId: p.id, agendaId: ag, serviceId: sv || undefined, serviceName: sv ? undefined : "Consulta", start, notes: notes.trim() || null }) });
      onDone();
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  void coStart; void hhmm;
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{move ? "Reprogramar cita" : "Nueva cita"}</h2>
      {move ? <p className="lede">{move.patientName} · {move.serviceName}</p> : <PatientPicker value={p} onPick={setP} />}
      <div className="field-row">
        <div className="field"><label htmlFor="ap-ag">Doctor o silla</label><select id="ap-ag" value={ag} onChange={(e) => setAg(e.target.value)}>{agendas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        {!move ? <div className="field"><label htmlFor="ap-sv">Servicio</label><select id="ap-sv" value={sv} onChange={(e) => setSv(e.target.value)}>{services.length ? null : <option value="">Consulta</option>}{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.minutes} min</option>)}</select></div> : null}
      </div>
      <div className="field"><label htmlFor="ap-day">Fecha</label><input id="ap-day" type="date" min={todayCO()} value={day} onChange={(e) => setDay(e.target.value)} /></div>
      <div className="field"><span className="label">Horario</span>
        {slots === null ? <p className="field__hint">Buscando horarios…</p> : slots.length ? <div className="chips" role="group" aria-label="Horarios disponibles">{slots.map((s) => <button type="button" key={s.start} className={`chip${start === s.start ? " is-on" : ""}`} aria-pressed={start === s.start} onClick={() => { setStart(s.start); setErr(null); }}>{s.label}</button>)}</div> : <p className="field__hint">No hay horarios libres ese día. Prueba otra fecha u otro doctor.</p>}
      </div>
      {!move ? <div className="field"><label htmlFor="ap-n">Nota (opcional)</label><input id="ap-n" type="text" maxLength={300} value={notes} autoComplete="off" onChange={(e) => setNotes(e.target.value)} /></div> : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : move ? "Reprogramar" : "Agendar"}</button></div>
    </form>
  );
}

export function PatientDialog({ item, canClinical, onClose, onDone }: { item: ClinicPatient | null; canClinical: boolean; onClose: () => void; onDone: (p: ClinicPatient) => void }) {
  const [f, setF] = useState({ name: item?.name ?? "", phone: item?.phone ?? "", email: item?.email ?? "", document: item?.document ?? "", birthDate: item?.birthDate ?? "", allergies: item?.allergies ?? "", conditions: item?.conditions ?? "", notes: item?.notes ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del paciente.");
    if (f.phone.replace(/\D/g, "").length < 7) return setErr("Escribe un celular válido.");
    setBusy(true);
    const body: Record<string, unknown> = { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, document: f.document.trim() || null, birthDate: f.birthDate || null, allergies: f.allergies.trim() || null, notes: f.notes.trim() || null };
    if (canClinical) body.conditions = f.conditions.trim() || null;
    try {
      const r = item ? await api<ClinicPatient>(`/clinic/patients/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }) : await api<ClinicPatient>("/clinic/patients", { method: "POST", body: JSON.stringify(body) });
      onDone(r);
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar paciente" : "Nuevo paciente"}</h2>
      <div className="field"><label htmlFor="pt-name">Nombre completo</label><input id="pt-name" type="text" value={f.name} autoComplete="off" onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="pt-phone">Celular</label><input id="pt-phone" type="text" inputMode="tel" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
        <div className="field"><label htmlFor="pt-mail">Correo (para recordatorios)</label><input id="pt-mail" type="email" value={f.email} autoComplete="off" onChange={set("email")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="pt-doc">Documento</label><input id="pt-doc" type="text" value={f.document} autoComplete="off" onChange={set("document")} /></div>
        <div className="field"><label htmlFor="pt-bd">Fecha de nacimiento</label><input id="pt-bd" type="date" value={f.birthDate} onChange={set("birthDate")} /></div>
      </div>
      <div className="field"><label htmlFor="pt-al">Alergias</label><input id="pt-al" type="text" maxLength={300} value={f.allergies} placeholder="Ej.: penicilina, látex" autoComplete="off" onChange={set("allergies")} /></div>
      {canClinical ? <div className="field"><label htmlFor="pt-co">Antecedentes médicos</label><textarea id="pt-co" rows={2} maxLength={600} value={f.conditions} placeholder="Diabetes, hipertensión, embarazo…" onChange={set("conditions")} /></div> : null}
      <div className="field"><label htmlFor="pt-no">Notas</label><input id="pt-no" type="text" maxLength={500} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

export function Dlg({ open, onClose, wide, children }: { open: boolean; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return <Modal open={open} onClose={onClose} wide={wide}>{open ? children : null}</Modal>;
}
