"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { niceDate, timeCO, todayCO, waLink, weekdayName } from "@/lib/clinic";
import type { ClinicDashboard } from "@/lib/types";
import { useSession } from "./session";
import { Bars } from "./vet-common";
import { ApptBadge } from "./clinic-common";

export function ClinicHome() {
  const { state } = useSession();
  const { data: d, reload } = useResource<ClinicDashboard>("/clinic/dashboard");
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const today = todayCO();
  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">El resumen de hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><Link className="btn btn--primary btn--sm" href="/agenda">Agenda</Link><Link className="btn btn--secondary btn--sm" href="/historias">Pacientes</Link></div></div>
      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <div className="kpi"><span>Ingresos de hoy</span><strong>{formatMoney(d?.today.income ?? 0)}</strong></div>
        <div className="kpi"><span>Citas de hoy</span><strong>{d?.today.appointments ?? 0}</strong></div>
        <div className="kpi"><span>Atendidas</span><strong>{d?.today.attended ?? 0}</strong></div>
        <div className="kpi"><span>Por confirmar hoy</span><strong>{d?.today.pending ?? 0}</strong></div>
        <div className="kpi"><span>Mañana</span><strong>{d?.tomorrow.confirmed ?? 0}/{d?.tomorrow.total ?? 0}</strong><small>confirmadas</small></div>
        <div className="kpi"><span>Pacientes</span><strong>{d?.patients.total ?? 0}</strong></div>
        <div className="kpi kpi--warn"><span>Con saldo</span><strong>{d?.patients.withDebt ?? 0}</strong></div>
        <div className="kpi kpi--danger"><span>Por cobrar</span><strong>{formatMoney(d?.patients.debtTotal ?? 0)}</strong></div>
      </div>
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Agenda de hoy"><h2>Agenda de hoy</h2>
          {d && !d.agenda.length ? <p className="field__hint">No hay citas para hoy.</p> : null}
          <ul className="dcard__list">{(d?.agenda ?? []).map((a) => (
            <li key={a.id}><div><b>{timeCO(a.start)} · <Link href={`/historias/${a.patientId}`}>{a.patientName}</Link></b><p>{a.serviceName} · {a.agendaName}</p></div><ApptBadge status={a.status} /></li>
          ))}</ul>
          <Link className="btn btn--secondary btn--sm" href="/agenda">Abrir la agenda</Link>
        </section>
        <section className="dcard__sec" aria-label="Ingresos de la semana"><h2>Ingresos de los últimos 7 días</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.income }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n))} />
          <p className="field__hint">Pagos y abonos registrados.</p>
        </section>
        <section className="dcard__sec" aria-label="Pacientes con saldo"><h2>Por cobrar</h2>
          {d && !d.debtors.length ? <p className="field__hint">Nadie tiene saldo pendiente.</p> : null}
          <ul className="dcard__list">{(d?.debtors ?? []).slice(0, 8).map((p) => (
            <li key={p.id}><div><b><Link href={`/historias/${p.id}`}>{p.name}</Link></b><p>Debe {formatMoney(p.debt)}</p></div>
              <a className="btn btn--secondary btn--sm" href={waLink(p.phone, `Hola ${p.name.split(" ")[0]}, te recordamos que tienes un saldo pendiente de ${formatMoney(p.debt)} con nosotros. ¡Gracias!`)} target="_blank" rel="noreferrer">Recordar</a></li>
          ))}</ul>
        </section>
      </div>
    </div>
  );
}
