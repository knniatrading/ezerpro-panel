"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { addDays, niceDate, timeCO, todayCO, waLink, weekdayName } from "@/lib/vet";
import type { VetDashboard } from "@/lib/types";
import { useSession } from "./session";
import { ApptBadge, Bars } from "./vet-common";

export function VetHome() {
  const { state } = useSession();
  const { data, reload } = useResource<VetDashboard>("/vet/dashboard");
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) reload(); }, 30000);
    return () => clearInterval(t);
  }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const today = todayCO();
  const d = data;
  const pendingAppts = (d?.appointments ?? []).filter((a) => a.status === "pendiente").length;

  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">El resumen de hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><Link className="btn btn--primary btn--sm" href="/citas">Ver agenda</Link><Link className="btn btn--secondary btn--sm" href="/pacientes">Pacientes</Link></div></div>
      {pendingAppts > 0 ? <p className="banner" role="status">Tienes {pendingAppts} cita{pendingAppts === 1 ? "" : "s"} por confirmar hoy. <Link href="/citas">Ir a la agenda</Link></p> : null}

      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <div className="kpi"><span>Ingresos de hoy</span><strong>{formatMoney(d?.today.income ?? 0)}</strong></div>
        <div className="kpi"><span>Servicios</span><strong>{formatMoney(d?.today.services ?? 0)}</strong></div>
        <div className="kpi"><span>Tienda</span><strong>{formatMoney(d?.today.products ?? 0)}</strong></div>
        <div className="kpi"><span>Pacientes atendidos</span><strong>{d?.today.patients ?? 0}</strong></div>
        <div className="kpi"><span>Citas de hoy</span><strong>{d ? `${d.today.attended}/${d.today.appointments}` : "0/0"}</strong></div>
        <div className="kpi"><span>Mascotas registradas</span><strong>{d?.totals.pets ?? 0}</strong></div>
      </div>

      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Agenda de hoy">
          <h2>Agenda de hoy</h2>
          {d && d.appointments.length === 0 ? <p className="field__hint">No hay citas para hoy.</p> : null}
          <ul className="dcard__list">
            {(d?.appointments ?? []).map((a) => (
              <li key={a.id}>
                <div><b>{timeCO(a.start)} · {a.serviceName}</b><p>{a.petName ?? "—"} · {a.ownerName ?? ""}</p></div>
                <ApptBadge status={a.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="dcard__sec" aria-label="Ingresos de la semana">
          <h2>Ingresos de los últimos 7 días</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.income }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n))} />
          <p className="field__hint">Servicios de la clínica más ventas pagadas de la tienda.</p>
        </section>

        <section className="dcard__sec" aria-label="Próximas vacunas y cuidados">
          <h2>Vacunas y cuidados por vencer</h2>
          {d && d.upcoming.length === 0 ? <p className="field__hint">Nada vence en los próximos 14 días.</p> : null}
          <ul className="dcard__list">
            {(d?.upcoming ?? []).slice(0, 8).map((u) => (
              <li key={u.id}>
                <div>
                  <b><Link href={`/paciente/${u.petId}`}>{u.petName}</Link> · {u.title}</b>
                  <p>{u.ownerName} · <span className={u.overdue ? "text-danger" : ""}>{u.overdue ? "Vencido el " : "Toca el "}{niceDate(u.nextDue)}</span></p>
                </div>
                <a className="btn btn--secondary btn--sm" href={waLink(u.phone, `Hola ${u.ownerName}, te recordamos que a ${u.petName} le toca "${u.title}" ${u.overdue ? "desde" : "el"} ${niceDate(u.nextDue)}. ¿Agendamos?`)} target="_blank" rel="noreferrer">Avisar</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="dcard__sec" aria-label="Inventario bajo">
          <h2>Inventario bajo</h2>
          {d && d.lowStock.length === 0 ? <p className="field__hint">Todo tiene existencias suficientes.</p> : null}
          <ul className="dcard__list">
            {(d?.lowStock ?? []).map((i) => (
              <li key={i.id}><div><b>{i.name}</b><p>Mínimo {i.min}</p></div><span className={`badge badge--${i.stock === 0 ? "warn" : "info"}`}>{i.stock === 0 ? "Agotado" : `Quedan ${i.stock}`}</span></li>
            ))}
          </ul>
          {d && d.lowStock.length ? <Link className="btn btn--secondary btn--sm" href="/menu">Ir a productos</Link> : null}
        </section>
      </div>
      <p className="field__hint">Próximos 7 días: <Link href={`/citas?date=${addDays(today, 1)}`}>mañana</Link>.</p>
    </div>
  );
}
