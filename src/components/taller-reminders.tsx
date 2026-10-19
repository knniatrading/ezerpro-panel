"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { niceDate, waLink } from "@/lib/taller";
import type { TallerBookingRow, TallerReminderFull } from "@/lib/types";
import { NoAccess } from "./no-access";
import { FRONT, Plate, errMsg, useTallerAccess } from "./taller-common";

/** Mantenimientos por avisar (aceite a los 6 meses o a cierto kilometraje). */
export function TallerRemindersView() {
  const { state, allowed } = useTallerAccess(FRONT);
  const { data, error, reload } = useResource<TallerReminderFull[]>(allowed ? "/taller/reminders" : null);
  const [msg, setMsg] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const done = async (id: string) => { try { await api(`/taller/reminders/${id}/done`, { method: "POST" }); reload(); } catch (x) { setMsg(errMsg(x)); } };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Recordatorios de mantenimiento</h1><p className="lede">Vehículos a los que les toca su próximo servicio en los próximos 30 días. Si tienen correo, se les avisa solos 7 días antes; aquí puedes escribirles por WhatsApp.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <div className="table-wrap"><table className="table"><thead><tr><th>Vehículo</th><th>Cliente</th><th>Servicio</th><th>Le toca</th><th></th></tr></thead><tbody>
        {(data ?? []).map((r) => {
          const first = r.customerName.split(" ")[0];
          const text = `Hola ${first}, es hora del ${r.serviceName.toLowerCase()} de tu ${r.label} (${r.plate}). ¿Agendamos cita? Puedes ver tu historial aquí: ${r.portalUrl}`;
          return (
            <tr key={r.id}><td><Link href={`/vehiculos/${r.vehicleId}`}><Plate plate={r.plate} kind={r.kind} /></Link><br /><span className="field__hint">{r.label}</span></td><td>{r.customerName}<br /><span className="field__hint">{r.phone}</span></td>
              <td><b>{r.serviceName}</b></td><td>{niceDate(r.dueDate)}{r.dueKm ? <><br /><span className="field__hint">o a los {r.dueKm.toLocaleString("es-CO")} km (lleva {r.km.toLocaleString("es-CO")})</span></> : null}{r.overdue ? <> <span className="badge badge--warn">Vencido</span></> : null}{r.sentAt ? <><br /><span className="field__hint">Correo enviado {niceDate(r.sentAt.slice(0, 10))}</span></> : null}</td>
              <td className="actions-cell"><a className="btn btn--primary btn--sm" href={waLink(r.phone, text)} target="_blank" rel="noreferrer">Avisar por WhatsApp</a><button className="btn btn--secondary btn--sm" onClick={() => done(r.id)}>Ya se atendió</button></td></tr>
          );
        })}
      </tbody></table></div>
      {data && !data.length ? <p className="lede">Nada por avisar en los próximos 30 días.</p> : null}
    </div>
  );
}

/** Solicitudes de cita que llegan desde la página pública. */
export function TallerBookingsView() {
  const { state, allowed } = useTallerAccess(FRONT);
  const [tab, setTab] = useState<"nueva" | "atendida">("nueva");
  const { data, error, reload } = useResource<TallerBookingRow[]>(allowed ? `/taller/bookings?status=${tab}` : null);
  const [msg, setMsg] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const set = async (id: string, status: string) => { try { await api(`/taller/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); reload(); } catch (x) { setMsg(errMsg(x)); } };
  return (
    <div className="page">
      <div className="page-head"><div><h1>Solicitudes de cita</h1><p className="lede">Lo que piden tus clientes desde la página pública. Contáctalos para confirmar el día.</p></div></div>
      <div className="chips" role="group" aria-label="Vista"><button className={`chip${tab === "nueva" ? " is-on" : ""}`} aria-pressed={tab === "nueva"} onClick={() => setTab("nueva")}>Nuevas</button><button className={`chip${tab === "atendida" ? " is-on" : ""}`} aria-pressed={tab === "atendida"} onClick={() => setTab("atendida")}>Atendidas</button></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <ul className="dcard__list">{(data ?? []).map((b) => (
        <li key={b.id}><div><b>{b.name}</b> · {b.phone}{b.plate ? <> · <Plate plate={b.plate} /></> : null}<p>{b.service}{b.prefDate ? ` · prefiere el ${niceDate(b.prefDate)}` : ""}{b.notes ? ` · ${b.notes}` : ""}</p></div>
          <div className="actions-cell"><a className="btn btn--primary btn--sm" href={waLink(b.phone, `Hola ${b.name.split(" ")[0]}, recibimos tu solicitud de cita (${b.service}). ¿Te queda bien ${b.prefDate ? `el ${niceDate(b.prefDate)}` : "mañana"}?`)} target="_blank" rel="noreferrer">Responder</a>
            {tab === "nueva" ? <><button className="btn btn--secondary btn--sm" onClick={() => set(b.id, "atendida")}>Atendida</button><button className="btn btn--danger-ghost btn--sm" onClick={() => set(b.id, "descartada")}>Descartar</button></> : null}</div></li>
      ))}</ul>
      {data && !data.length ? <p className="lede">{tab === "nueva" ? "No hay solicitudes nuevas." : "Aún no hay solicitudes atendidas."}</p> : null}
    </div>
  );
}
