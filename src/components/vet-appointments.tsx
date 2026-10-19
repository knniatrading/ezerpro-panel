"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, parsePesos } from "@/lib/format";
import { addDays, KIND_LABEL, niceDate, timeCO, toISO, todayCO, waLink, weekdayName } from "@/lib/vet";
import type { VetAppt, VetPet, VetProfileData } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ApptBadge, useVetAccess } from "./vet-common";

function NewApptDialog({ date, petId, onClose, onDone }: { date: string; petId: string; onClose: () => void; onDone: () => void }) {
  const { data: prof } = useResource<VetProfileData>("/vet/profile");
  const { data: pets } = useResource<VetPet[]>("/vet/pets");
  const [mode, setMode] = useState<"pet" | "guest">(petId ? "pet" : "pet");
  const [f, setF] = useState({ serviceId: "", date, time: "09:00", petId, guestName: "", guestPhone: "", guestPet: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.serviceId) return setErr("Elige el servicio.");
    if (!f.date || !/^\d{2}:\d{2}$/.test(f.time)) return setErr("Elige la fecha y la hora.");
    const body: Record<string, unknown> = { serviceId: f.serviceId, start: toISO(f.date, f.time), notes: f.notes.trim() || null };
    if (mode === "pet") { if (!f.petId) return setErr("Elige la mascota."); body.petId = f.petId; }
    else { if (f.guestName.trim().length < 2 || !f.guestPhone.trim() || !f.guestPet.trim()) return setErr("Escribe el nombre del dueño, su celular y el nombre de la mascota."); body.guestName = f.guestName.trim(); body.guestPhone = f.guestPhone.trim(); body.guestPet = f.guestPet.trim(); }
    setBusy(true);
    try { await api("/vet/appointments", { method: "POST", body: JSON.stringify(body) }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva cita</h2>
      <div className="chips"><button type="button" className={mode === "pet" ? "is-on" : ""} aria-pressed={mode === "pet"} onClick={() => setMode("pet")}>Paciente registrado</button><button type="button" className={mode === "guest" ? "is-on" : ""} aria-pressed={mode === "guest"} onClick={() => setMode("guest")}>Cliente nuevo</button></div>
      {mode === "pet" ? (
        <div className="field"><label htmlFor="na-pet">Mascota</label><select id="na-pet" value={f.petId} onChange={set("petId")}><option value="">Elige…</option>{(pets ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.owner?.name}</option>)}</select></div>
      ) : (
        <>
          <div className="field-row">
            <div className="field"><label htmlFor="na-gn">Dueño</label><input id="na-gn" type="text" value={f.guestName} autoComplete="off" onChange={set("guestName")} /></div>
            <div className="field"><label htmlFor="na-gp">Celular</label><input id="na-gp" type="tel" inputMode="numeric" value={f.guestPhone} autoComplete="off" onChange={set("guestPhone")} /></div>
          </div>
          <div className="field"><label htmlFor="na-gm">Nombre de la mascota</label><input id="na-gm" type="text" value={f.guestPet} autoComplete="off" onChange={set("guestPet")} /></div>
        </>
      )}
      <div className="field"><label htmlFor="na-svc">Servicio</label><select id="na-svc" value={f.serviceId} onChange={set("serviceId")}><option value="">Elige…</option>{(prof?.services ?? []).filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.minutes} min)</option>)}</select></div>
      <div className="field-row">
        <div className="field"><label htmlFor="na-d">Fecha</label><input id="na-d" type="date" value={f.date} onChange={set("date")} /></div>
        <div className="field"><label htmlFor="na-t">Hora</label><input id="na-t" type="time" value={f.time} onChange={set("time")} /></div>
      </div>
      <div className="field"><label htmlFor="na-n">Nota (opcional)</label><input id="na-n" type="text" value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Agendar"}</button></div>
    </form>
  );
}

function AttendDialog({ appt, onClose, onDone }: { appt: VetAppt; onClose: () => void; onDone: () => void }) {
  const canRecord = !!appt.petId;
  const [f, setF] = useState({ kind: "consulta", title: appt.serviceName, notes: "", amount: "", weightKg: "", nextDue: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = f.weightKg.trim() ? Number(f.weightKg.replace(",", ".")) : null;
    if (w !== null && (!Number.isFinite(w) || w <= 0 || w > 200)) return setErr("El peso debe ser un número en kilos.");
    if (f.nextDue && f.nextDue < todayCO()) return setErr("La próxima fecha no puede ser pasada.");
    const body: Record<string, unknown> = { status: "atendida" };
    if (canRecord) body.record = { kind: f.kind, title: f.title.trim() || appt.serviceName, notes: f.notes.trim() || null, amount: parsePesos(f.amount), weightKg: w, nextDue: f.nextDue || null };
    setBusy(true);
    try { await api(`/vet/appointments/${appt.id}`, { method: "PATCH", body: JSON.stringify(body) }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Atender a {appt.petName}</h2>
      {canRecord ? (
        <>
          <p className="lede">Lo que escribas queda en el historial de la mascota y el valor suma a los ingresos de hoy.</p>
          <div className="field-row">
            <div className="field"><label htmlFor="at-kind">Tipo</label><select id="at-kind" value={f.kind} onChange={set("kind")}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label htmlFor="at-title">Detalle</label><input id="at-title" type="text" value={f.title} autoComplete="off" onChange={set("title")} /></div>
          </div>
          <div className="field"><label htmlFor="at-notes">Notas</label><textarea id="at-notes" rows={3} maxLength={400} value={f.notes} onChange={set("notes")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="at-amt">Valor cobrado</label><input id="at-amt" type="text" inputMode="numeric" value={f.amount} autoComplete="off" onChange={set("amount")} /><p className="field__hint">{parsePesos(f.amount) ? formatMoney(parsePesos(f.amount)) : ""}</p></div>
            <div className="field"><label htmlFor="at-w">Peso (kg)</label><input id="at-w" type="text" inputMode="decimal" value={f.weightKg} autoComplete="off" onChange={set("weightKg")} /></div>
          </div>
          <div className="field"><label htmlFor="at-next">Próximo control (opcional)</label><input id="at-next" type="date" value={f.nextDue} onChange={set("nextDue")} /></div>
        </>
      ) : <p className="lede">Esta cita es de un cliente que aún no está registrado. Para guardar el historial, primero registra su mascota en Pacientes.</p>}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Marcar atendida"}</button></div>
    </form>
  );
}

export function VetAppointmentsView() {
  const { state, allowed } = useVetAccess();
  const [date, setDate] = useState(todayCO());
  const [petId, setPetId] = useState("");
  const [dlg, setDlg] = useState<{ k: "new" } | { k: "attend"; a: VetAppt } | { k: "del"; a: VetAppt } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("date"); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
    const pet = p.get("pet"); if (pet) { setPetId(pet); setDlg({ k: "new" }); }
  }, []);
  const { data, error, reload } = useResource<VetAppt[]>(allowed ? `/vet/appointments?from=${date}&to=${date}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function setStatus(a: VetAppt, status: string) {
    setErr(null);
    try { await api(`/vet/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/vet/appointments/${dlg.a.id}`, { method: "DELETE" }); setDlg(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Agenda</h1><p className="lede">{weekdayName(date)} {niceDate(date)}{date === todayCO() ? " (hoy)" : ""}</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "new" })}>Nueva cita</button>
      </div>
      <div className="actions-cell">
        <button className="btn btn--secondary btn--sm" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">← Anterior</button>
        <button className="btn btn--secondary btn--sm" onClick={() => setDate(todayCO())}>Hoy</button>
        <button className="btn btn--secondary btn--sm" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">Siguiente →</button>
        <label className="sr-only" htmlFor="ag-date">Ir a la fecha</label><input id="ag-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Hora</th><th>Servicio</th><th>Mascota y dueño</th><th>Estado</th><th></th></tr></thead><tbody>
        {(data ?? []).map((a) => {
          const open = a.status === "pendiente" || a.status === "confirmada";
          return (
            <tr key={a.id}>
              <td><b>{timeCO(a.start)}</b></td>
              <td>{a.serviceName}{a.source !== "clinica" ? <><br /><span className="field__hint">Pedida en línea</span></> : null}{a.notes ? <><br /><span className="field__hint">{a.notes}</span></> : null}</td>
              <td>{a.petId ? <Link href={`/paciente/${a.petId}`}>{a.petName}</Link> : a.petName}<br /><span className="field__hint">{a.ownerName} {a.phone ? <a href={waLink(a.phone, `Hola ${a.ownerName}, sobre la cita de ${a.petName} (${a.serviceName}) el ${niceDate(date)} a las ${timeCO(a.start)}.`)} target="_blank" rel="noreferrer">· {a.phone}</a> : null}</span></td>
              <td><ApptBadge status={a.status} /></td>
              <td className="actions-cell">
                {a.status === "pendiente" ? <button className="btn btn--primary btn--sm" onClick={() => setStatus(a, "confirmada")}>Confirmar</button> : null}
                {open ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "attend", a })}>Atender</button> : null}
                {open ? <button className="btn btn--secondary btn--sm" onClick={() => setStatus(a, "no_asistio")}>No vino</button> : null}
                {open ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setStatus(a, "cancelada")}>Cancelar</button> : null}
                {!open ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", a })}>Quitar</button> : null}
              </td>
            </tr>
          );
        })}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">No hay citas este día.</p> : null}
      <Modal open={dlg?.k === "new"} onClose={() => setDlg(null)}>{dlg?.k === "new" ? <NewApptDialog date={date} petId={petId} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <Modal open={dlg?.k === "attend"} onClose={() => setDlg(null)}>{dlg?.k === "attend" ? <AttendDialog appt={dlg.a} onClose={() => setDlg(null)} onDone={done} /> : null}</Modal>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar cita" message="¿Quitar esta cita de la agenda?" confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
