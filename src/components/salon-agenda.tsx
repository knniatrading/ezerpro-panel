"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { addDays, niceDate, timeCO, todayCO, waLink, weekdayName } from "@/lib/salon";
import type { SalonAppt, SalonProfileData, SalonWaRow } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { ALL, ApptDialog, Dlg, SalonBadge, errMsg, useSalonAccess } from "./salon-common";

function Reminders({ onChange }: { onChange: () => void }) {
  const { data, reload } = useResource<SalonWaRow[]>("/salon/reminders");
  const rows = data ?? [];
  const pending = rows.filter((r) => !r.sent);
  async function send(r: SalonWaRow) {
    window.open(r.whatsapp, "_blank", "noopener,noreferrer");
    try { await api(`/salon/appointments/${r.id}/wa-sent`, { method: "POST" }); reload(); onChange(); } catch { /* se puede reintentar */ }
  }
  if (!rows.length) return null;
  const when = (iso: string) => { const d = new Date(Date.parse(iso) - 5 * 3600e3).toISOString().slice(0, 10); return `${d === todayCO() ? "Hoy" : d === addDays(todayCO(), 1) ? "Mañana" : weekdayName(d)} ${timeCO(iso)}`; };
  return (
    <details className="note" open={pending.length > 0}>
      <summary><b>Recordatorios por WhatsApp</b> · {pending.length ? `${pending.length} por enviar` : "todos enviados"}</summary>
      <p className="field__hint">Un clic abre WhatsApp con el mensaje listo (incluye el enlace para confirmar o cancelar). Se marca como enviado.</p>
      <ul className="dcard__list">{rows.map((r) => (
        <li key={r.id}><div><b>{when(r.start)} · {r.clientName}</b><p>con {r.staffName}{r.status === "confirmada" ? " · ya confirmó" : ""}</p></div>
          <button type="button" className={`btn btn--sm ${r.sent ? "btn--secondary" : "btn--primary"}`} onClick={() => send(r)}>{r.sent ? "Reenviar" : "Enviar WhatsApp"}</button></li>
      ))}</ul>
    </details>
  );
}

export function SalonAgendaView() {
  const { state, allowed, role } = useSalonAccess(ALL);
  const [day, setDay] = useState(todayCO());
  const [st, setSt] = useState("");
  const cfg = useResource<SalonProfileData>(allowed ? "/salon/profile" : null);
  const list = useResource<SalonAppt[]>(allowed ? `/salon/appointments?from=${day}&to=${day}${st ? `&staffId=${st}` : ""}` : null);
  const [dlg, setDlg] = useState<{ k: "new" } | { k: "move"; a: SalonAppt } | { k: "del"; a: SalonAppt } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mine = cfg.data?.myStaffId ?? null;
  const staff = (cfg.data?.staff ?? []).filter((s) => s.active && (role !== "EMPLOYEE" || s.id === mine));
  const rows = list.data ?? [];
  const cols = useMemo(() => {
    const g = new Map<string, SalonAppt[]>();
    for (const a of rows) g.set(a.staffId, [...(g.get(a.staffId) ?? []), a]);
    return staff.filter((s) => !st || s.id === st).map((s) => ({ s, items: g.get(s.id) ?? [] }));
  }, [rows, staff, st]);
  if (state.status === "in" && !allowed) return <NoAccess />;

  async function setStatus(a: SalonAppt, status: string) {
    try { await api(`/salon/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); list.reload(); setTick((n) => n + 1); } catch (x) { setErr(errMsg(x)); }
  }
  async function del() {
    if (dlg?.k !== "del") return;
    try { await api(`/salon/appointments/${dlg.a.id}`, { method: "DELETE" }); setDlg(null); list.reload(); } catch (x) { setErr(errMsg(x)); setDlg(null); }
  }
  const done = () => { setDlg(null); list.reload(); setTick((n) => n + 1); };
  const remind = (a: SalonAppt) => waLink(a.phone, `Hola ${a.clientName.split(" ")[0]}, te recordamos tu cita el ${niceDate(a.start)} a las ${timeCO(a.start)} (${a.services.map((s) => s.name).join(", ")}). ¿Nos confirmas tu asistencia?`);
  const isToday = day === todayCO();
  const canCharge = role !== "EMPLOYEE";

  return (
    <div className="page">
      <div className="page-head"><div><h1>Agenda</h1><p className="lede">{isToday ? "Hoy, " : ""}{weekdayName(day)} {niceDate(day)}</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ k: "new" })} disabled={!staff.length || (role === "EMPLOYEE" && !mine)}>Nueva cita</button></div>
      <div className="agenda-bar">
        <button className="btn btn--secondary btn--sm" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))}>‹</button>
        <input type="date" aria-label="Fecha" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <button className="btn btn--secondary btn--sm" aria-label="Día siguiente" onClick={() => setDay(addDays(day, 1))}>›</button>
        {!isToday ? <button className="btn btn--secondary btn--sm" onClick={() => setDay(todayCO())}>Hoy</button> : null}
        {role !== "EMPLOYEE" && staff.length > 1 ? <select aria-label="Profesional" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Todos</option>{staff.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select> : null}
      </div>
      {role === "EMPLOYEE" && cfg.data && !mine ? <p className="note" role="status">Tu usuario todavía no está vinculado a un profesional. Pídele al administrador que lo vincule en «Profesionales y servicios».</p> : null}
      {list.error || err ? <p className="form-error" role="alert">{err ?? list.error}</p> : null}
      {cfg.data && !staff.length && role !== "EMPLOYEE" ? <p className="lede">Primero crea al menos un profesional en <Link href="/salon-equipo">Profesionales y servicios</Link>.</p> : null}
      <Reminders key={tick} onChange={() => undefined} />
      <div className="agenda-cols">
        {cols.map(({ s, items }) => (
          <section key={s.id} className="agenda-col" aria-label={s.name}>
            <h2 style={{ borderColor: s.color }}><i style={{ background: s.color }} aria-hidden="true" />{s.name}<span className="field__hint"> · {items.filter((x) => x.status !== "cancelada").length} citas</span></h2>
            {items.length ? items.map((x) => {
              const open = x.status === "programada" || x.status === "confirmada";
              return (
                <article key={x.id} className={`appt appt--${x.status}`} style={{ borderLeftColor: s.color }}>
                  <div className="appt__top"><b>{timeCO(x.start)}–{timeCO(x.end)}</b><SalonBadge status={x.status} /></div>
                  <div><Link href={`/salon-clientes/${x.clientId}`}><b>{x.clientName}</b></Link>{x.allergies ? <span className="badge badge--warn" title={x.allergies}> ⚠ alergia</span> : null}</div>
                  <div className="field__hint">{x.services.map((v) => v.name).join(" + ")}{x.notes ? ` · ${x.notes}` : ""}</div>
                  {x.allergies ? <div className="field__hint"><b>Alergia:</b> {x.allergies}</div> : null}
                  <div className="appt__actions">
                    {x.status === "programada" ? <button className="btn btn--secondary btn--sm" onClick={() => setStatus(x, "confirmada")}>Confirmar</button> : null}
                    {open && canCharge ? <Link className="btn btn--primary btn--sm" href={`/salon-caja?cita=${x.id}`}>Cobrar</Link> : null}
                    {open && !canCharge ? <button className="btn btn--primary btn--sm" onClick={() => setStatus(x, "atendida")}>Atendida</button> : null}
                    {open ? (
                      <>
                        <button className="btn btn--secondary btn--sm" onClick={() => setDlg({ k: "move", a: x })}>Mover</button>
                        <button className="btn btn--secondary btn--sm" onClick={() => setStatus(x, "no_asistio")}>No asistió</button>
                        <button className="btn btn--danger-ghost btn--sm" onClick={() => setStatus(x, "cancelada")}>Cancelar</button>
                        <a className="btn btn--secondary btn--sm" href={remind(x)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                      </>
                    ) : null}
                    {x.status === "atendida" && x.saleId ? <span className="field__hint">Cobrada</span> : null}
                    {canCharge && (x.status === "cancelada" || x.status === "no_asistio") ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ k: "del", a: x })}>Quitar</button> : null}
                  </div>
                </article>
              );
            }) : <p className="field__hint">Sin citas.</p>}
          </section>
        ))}
      </div>
      <Dlg open={dlg?.k === "new"} onClose={() => setDlg(null)}>{cfg.data ? <ApptDialog cfg={cfg.data} date={day} staffId={st || undefined} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <Dlg open={dlg?.k === "move"} onClose={() => setDlg(null)}>{cfg.data && dlg?.k === "move" ? <ApptDialog cfg={cfg.data} move={dlg.a} date={day} onClose={() => setDlg(null)} onDone={done} /> : null}</Dlg>
      <ConfirmDialog open={dlg?.k === "del"} title="Quitar cita" message="¿Quitar esta cita de la agenda?" confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
