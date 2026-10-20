"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { niceDate, timeCO, todayCO, weekdayName } from "@/lib/salon";
import type { SalonDash } from "@/lib/types";
import { useSession } from "./session";
import { SalonBadge } from "./salon-common";

export function SalonHome() {
  const { state } = useSession();
  const { data: d, reload } = useResource<SalonDash>("/salon/dashboard");
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [reload]);
  const user = state.status === "in" ? state.user : null;
  const role = user?.role;
  const name = user?.tenant?.name ?? "";
  const today = todayCO();
  const stylist = role === "EMPLOYEE";
  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {stylist ? (user?.name ?? "").split(" ")[0] : name}</h1><p className="lede">El resumen de hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><Link className="btn btn--primary btn--sm" href="/salon-agenda">Agenda</Link>{!stylist ? <Link className="btn btn--secondary btn--sm" href="/salon-caja">Cobrar</Link> : <Link className="btn btn--secondary btn--sm" href="/salon-comisiones">Mis comisiones</Link>}</div></div>
      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <div className="kpi"><span>Citas de hoy</span><strong>{d?.today.total ?? 0}</strong></div>
        <div className="kpi"><span>Por atender</span><strong>{d?.today.open ?? 0}</strong></div>
        <div className="kpi"><span>Atendidas</span><strong>{d?.today.done ?? 0}</strong></div>
        <div className="kpi"><span>Confirmadas</span><strong>{d?.today.confirmed ?? 0}</strong></div>
        {d?.sales ? <div className="kpi"><span>Ventas de hoy</span><strong>{formatMoney(d.sales.today)}</strong><small>{d.sales.count} ventas</small></div> : null}
        {d?.sales && d.sales.month != null ? <div className="kpi"><span>Ventas del mes</span><strong>{formatMoney(d.sales.month)}</strong></div> : null}
        {d && d.lowStock ? <div className="kpi kpi--warn"><span>Productos por agotarse</span><strong>{d.lowStock}</strong></div> : null}
        {!stylist && d && d.waPending ? <div className="kpi kpi--warn"><span>WhatsApp por enviar</span><strong>{d.waPending}</strong><small>recordatorios de mañana</small></div> : null}
      </div>
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Próximas citas"><h2>Próximas citas</h2>
          {d && !d.upcoming.length ? <p className="field__hint">No hay citas próximas.</p> : null}
          <ul className="dcard__list">{(d?.upcoming ?? []).map((a) => (
            <li key={a.id}><div><b>{timeCO(a.start)} · {a.clientName}</b><p>{a.services.join(", ")} · <i className="dot" style={{ background: a.color, display: "inline-block", width: 8, height: 8, borderRadius: 4 }} aria-hidden="true" /> {a.staffName}</p></div><SalonBadge status={a.status} /></li>
          ))}</ul>
          <Link className="btn btn--secondary btn--sm" href="/salon-agenda">Abrir la agenda</Link>
        </section>
        {!stylist ? (
          <section className="dcard__sec" aria-label="Atajos"><h2>Atajos</h2>
            <ul className="dcard__list">
              <li><div><b><Link href="/salon-clientes">Clientes y fichas</Link></b><p>Fórmulas, alergias e historial.</p></div></li>
              <li><div><b><Link href="/salon-productos">Productos e inventario</Link></b><p>Shampoos, ceras, cremas.</p></div></li>
              {role === "TENANT_ADMIN" ? <li><div><b><Link href="/salon-comisiones">Comisiones</Link></b><p>Cuánto le toca a cada uno esta semana.</p></div></li> : null}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
