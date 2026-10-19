"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { addDays, niceDate, todayCO, timeCO, waLink } from "@/lib/clinic";
import type { ClinicAppt, ClinicProfileData } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ALL_ROLES, ApptBadge, ApptDialog, Dlg, errMsg, useClinicAccess } from "./clinic-common";

export function ClinicAgendaView() {
  const { state, allowed, role } = useClinicAccess(ALL_ROLES);
  const [day, setDay] = useState(todayCO());
  const [ag, setAg] = useState("");
  const cfg = useResource<ClinicProfileData>(allowed ? "/clinic/profile" : null);
  const list = useResource<ClinicAppt[]>(allowed ? `/clinic/appointments?from=${day}&to=${day}${ag ? `&agendaId=${ag}` : ""}` : null);
  const [dlg, setDlg] = useState<{ k: "new" } | { k: "move"; a: ClinicAppt } | { k: "del"; a: ClinicAppt } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const agendas = cfg.data?.agendas.filter((a) => a.active) ?? [];
  const rows = list.data ?? [];
  const cols = useMemo(() => {
    const g = new Map<string, ClinicAppt[]>();
    for (const a of rows) g.set(a.agendaId, [...(g.get(a.agendaId) ?? []), a]);
    return agendas.filter((a) => !ag || a.id === ag).map((a) => ({ a, items: g.get(a.id) ?? [] }));
  }, [rows, agendas, ag]);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function setStatus(a: ClinicAppt, status: string) {
    try { await api(`/clinic/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); list.reload(); } catch (x) { setErr(errMsg(x)); }
  }
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/clinic/appointments/${dlg.a.id}`, { method: "DELETE" }); setDlg(null); list.reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); }
  }
  const done = () => { setDlg(null); list.reload(); };
  const remind = (a: ClinicAppt) => waLink(a.phone, `Hola ${a.patientName.split(" ")[0]}, te recordamos tu cita de ${a.serviceName} el ${niceDate(a.start)} a las ${timeCO(a.start)}. ¿Nos confirmas tu asistencia?`);
  const isToday = day === todayCO();

  return (
    <div className="page">
      <div className="page-head"><div><h1>Agenda</h1><p className="lede">{isToday ? "Hoy, " : ""}{niceDate(day)}</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "new" })} disabled={!agendas.length}>Nueva cita</button></div>
      <div className="agenda-bar">
        <button className="btn btn--secondary btn--sm" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))}>‹</button>
        <input type="date" aria-label="Fecha" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <button className="btn btn--secondary btn--sm" aria-label="Día siguiente" onClick={() => setDay(addDays(day, 1))}>›</button>
        {!isToday ? <button className="btn btn--secondary btn--sm" onClick={() => setDay(todayCO())}>Hoy</button> : null}
        {agendas.length > 1 ? <select aria-label="Doctor o silla" value={ag} onChange={(e) => setAg(e.target.value)}><option value="">Todos</option>{agendas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select> : null}
      </div>
      {list.error || err ? <p className="form-error" role="alert">{err ?? list.error}</p> : null}
      {cfg.data && !agendas.length ? <p className="lede">Primero crea al menos un doctor o silla en <Link href="/agendas">Agendas y servicios</Link>.</p> : null}
      <div className="agenda-cols">
        {cols.map(({ a, items }) => (
          <section key={a.id} className="agenda-col" aria-label={a.name}>
            <h2 style={{ borderColor: a.color }}><i style={{ background: a.color }} aria-hidden="true" />{a.name}<span className="field__hint"> · {items.filter((x) => x.status !== "cancelada").length} citas</span></h2>
            {items.length ? items.map((x) => (
              <article key={x.id} className={`appt appt--${x.status}`} style={{ borderLeftColor: a.color }}>
                <div className="appt__top"><b>{timeCO(x.start)}</b><ApptBadge status={x.status} /></div>
                <div><Link href={`/historias/${x.patientId}`}><b>{x.patientName}</b></Link></div>
                <div className="field__hint">{x.serviceName}{x.notes ? ` · ${x.notes}` : ""}</div>
                <div className="appt__actions">
                  {x.status === "programada" ? <button className="btn btn--secondary btn--sm" onClick={() => setStatus(x, "confirmada")}>Confirmar</button> : null}
                  {x.status === "programada" || x.status === "confirmada" ? (
                    <>
                      <button className="btn btn--primary btn--sm" onClick={() => setStatus(x, "atendida")}>Atendida</button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "move", a: x })}>Mover</button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setStatus(x, "no_asistio")}>No asistió</button>
                      <button className="btn btn--danger-ghost btn--sm" onClick={() => setStatus(x, "cancelada")}>Cancelar</button>
                      <a className="btn btn--secondary btn--sm" href={remind(x)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    </>
                  ) : null}
                  {role !== "EMPLOYEE" && (x.status === "cancelada" || x.status === "no_asistio") ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", a: x })}>Quitar</button> : null}
                </div>
              </article>
            )) : <p className="field__hint">Sin citas.</p>}
          </section>
        ))}
      </div>
      <Dlg open={dlg?.k === "new"} onClose={() => setDlg(null)}>{cfg.data ? <ApptDialog cfg={cfg.data} date={day} agendaId={ag || undefined} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "move"} onClose={() => setDlg(null)}>{cfg.data && dlg?.k === "move" ? <ApptDialog cfg={cfg.data} move={dlg.a} date={day} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar cita" message="¿Quitar esta cita de la agenda?" confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
