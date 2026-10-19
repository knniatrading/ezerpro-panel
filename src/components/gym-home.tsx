"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { dueText, niceDate, todayCO, waLink } from "@/lib/gym";
import { timeCO, weekdayName } from "@/lib/vet";
import type { GymDashboard } from "@/lib/types";
import { useSession } from "./session";
import { Bars } from "./vet-common";

export function GymHome() {
  const { state } = useSession();
  const { data: d, reload } = useResource<GymDashboard>("/gym/dashboard");
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) reload(); }, 30000);
    return () => clearInterval(t);
  }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const today = todayCO();

  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">El resumen de hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><Link className="btn btn--primary btn--sm" href="/acceso">Control de acceso</Link><Link className="btn btn--secondary btn--sm" href="/socios">Socios</Link></div></div>

      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <div className="kpi"><span>Ingresos de hoy</span><strong>{formatMoney(d?.today.income ?? 0)}</strong></div>
        <div className="kpi"><span>Membresías</span><strong>{formatMoney(d?.today.memberships ?? 0)}</strong></div>
        <div className="kpi"><span>Tienda</span><strong>{formatMoney(d?.today.store ?? 0)}</strong></div>
        <div className="kpi"><span>Entradas hoy</span><strong>{d?.today.visits ?? 0}</strong></div>
        <div className="kpi"><span>Socios activos</span><strong>{d?.members.active ?? 0}</strong></div>
        <div className="kpi kpi--warn"><span>Por vencer</span><strong>{d?.members.expiring ?? 0}</strong></div>
        <div className="kpi kpi--danger"><span>Vencidos</span><strong>{d?.members.overdue ?? 0}</strong></div>
        <div className="kpi"><span>Inactivos (30 días)</span><strong>{d?.members.inactive ?? 0}</strong></div>
      </div>

      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Cobros pendientes">
          <h2>Por cobrar</h2>
          {d && d.expiring.length === 0 ? <p className="field__hint">Nadie vence en los próximos días.</p> : null}
          <ul className="dcard__list">
            {(d?.expiring ?? []).slice(0, 10).map((m) => (
              <li key={m.id}>
                <div><b><Link href={`/socios/${m.id}`}>{m.name}</Link></b><p className={m.daysLeft < 0 ? "text-danger" : ""}>{m.planName ?? "Membresía"} · {dueText(m.daysLeft, m.paidUntil)}</p></div>
                <a className="btn btn--secondary btn--sm" href={waLink(m.phone, `Hola ${m.name.split(" ")[0]}, ${m.daysLeft < 0 ? "tu membresía venció" : "tu membresía vence"} ${niceDate(m.paidUntil)}. ¿Te ayudamos a renovarla?`)} target="_blank" rel="noreferrer">Cobrar</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="dcard__sec" aria-label="Ingresos de la semana">
          <h2>Ingresos de los últimos 7 días</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.income }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n))} />
          <p className="field__hint">Membresías más ventas pagadas de la tienda.</p>
        </section>

        <section className="dcard__sec" aria-label="Entradas de la semana">
          <h2>Entradas por día</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.visits }))} format={(n) => String(n)} />
          <p className="field__hint">Cuántas veces entraron socios cada día.</p>
        </section>

        <section className="dcard__sec" aria-label="Últimas entradas">
          <h2>Últimas entradas de hoy</h2>
          {d && d.recent.length === 0 ? <p className="field__hint">Aún no ha entrado nadie hoy.</p> : null}
          <ul className="dcard__list">
            {(d?.recent ?? []).map((r) => (
              <li key={r.id}><div><b>{r.name}</b><p>{timeCO(r.at)}</p></div><span className={`badge ${r.ok ? "badge--ok" : "badge--warn"}`}>{r.ok ? "Entró" : "Rechazado"}</span></li>
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
    </div>
  );
}
