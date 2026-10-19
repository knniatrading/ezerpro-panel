"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { niceDate, todayCO, waLink, weekdayName } from "@/lib/taller";
import type { TallerDashboard } from "@/lib/types";
import { useSession } from "./session";
import { Bars } from "./vet-common";
import { Dlg, NewOrderDialog, Plate, StatusBadge } from "./taller-common";

export function TallerHome() {
  const { state } = useSession();
  const router = useRouter();
  const { data: d, reload } = useResource<TallerDashboard>("/taller/dashboard");
  const [nw, setNw] = useState(false);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const today = todayCO();
  const by = d?.orders.byStatus ?? {};
  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">Así va el taller hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setNw(true)}>Nueva orden</button><Link className="btn btn--secondary btn--sm" href="/ordenes">Ver órdenes</Link></div></div>
      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <div className="kpi"><span>Ingresos de hoy</span><strong>{formatMoney(d?.today.income ?? 0)}</strong></div>
        <div className="kpi"><span>Órdenes abiertas</span><strong>{d?.orders.open ?? 0}</strong></div>
        <div className="kpi"><span>Recibidos hoy</span><strong>{d?.today.received ?? 0}</strong></div>
        <div className="kpi"><span>Entregados hoy</span><strong>{d?.today.delivered ?? 0}</strong></div>
        <div className="kpi kpi--warn"><span>Esperan aprobación</span><strong>{d?.waiting.length ?? 0}</strong></div>
        <div className="kpi"><span>Listos para entregar</span><strong>{d?.ready.length ?? 0}</strong></div>
        <div className="kpi"><span>Sin mecánico</span><strong>{d?.unassigned ?? 0}</strong></div>
        <div className="kpi"><span>Mantenimientos por avisar</span><strong>{d?.reminders ?? 0}</strong></div>
      </div>
      <div className="tl-flow" role="group" aria-label="Órdenes por etapa">
        {(["recibido", "diagnostico", "cotizado", "aprobado", "en_reparacion", "listo"] as const).map((s) => (
          <Link key={s} href={`/ordenes?view=${s}`} className="tl-flow__step"><strong>{by[s] ?? 0}</strong><StatusBadge status={s} /></Link>
        ))}
      </div>
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Cotizaciones por aprobar"><h2>Esperando aprobación del cliente</h2>
          {d && !d.waiting.length ? <p className="field__hint">No hay cotizaciones pendientes.</p> : null}
          <ul className="dcard__list">{(d?.waiting ?? []).map((o) => (
            <li key={o.id}><div><b><Link href={`/ordenes/${o.id}`}>#{o.number} · <Plate plate={o.plate} /></Link></b><p>{o.customerName} · {formatMoney(o.total)}</p></div>
              <a className="btn btn--secondary btn--sm" href={waLink(o.phone, `Hola ${o.customerName.split(" ")[0]}, te recordamos que tu cotización de ${o.label} está lista para aprobar.`)} target="_blank" rel="noreferrer">Recordar</a></li>
          ))}</ul>
        </section>
        <section className="dcard__sec" aria-label="Listos para entregar"><h2>Listos para entregar</h2>
          {d && !d.ready.length ? <p className="field__hint">Ningún vehículo listo todavía.</p> : null}
          <ul className="dcard__list">{(d?.ready ?? []).map((o) => (
            <li key={o.id}><div><b><Link href={`/ordenes/${o.id}`}>#{o.number} · <Plate plate={o.plate} /></Link></b><p>{o.customerName} · {formatMoney(o.total)}</p></div>
              <a className="btn btn--secondary btn--sm" href={waLink(o.phone, `Hola ${o.customerName.split(" ")[0]}, tu ${o.label} ya está listo. ¡Te esperamos!`)} target="_blank" rel="noreferrer">Avisar</a></li>
          ))}</ul>
        </section>
        <section className="dcard__sec" aria-label="Ingresos de la semana"><h2>Ingresos de los últimos 7 días</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.income }))} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n))} />
        </section>
        <section className="dcard__sec" aria-label="Repuestos por agotarse"><h2>Repuestos por agotarse</h2>
          {d && !d.lowStock.length ? <p className="field__hint">El inventario está bien surtido.</p> : null}
          <ul className="dcard__list">{(d?.lowStock ?? []).map((p) => <li key={p.id}><div><b>{p.name}</b><p>Quedan {p.stock} (mínimo {p.minStock})</p></div></li>)}</ul>
          <Link className="btn btn--secondary btn--sm" href="/repuestos">Abrir inventario</Link>
        </section>
        <section className="dcard__sec" aria-label="Mecánicos"><h2>Mecánicos</h2>
          <ul className="dcard__list">{(d?.mechanics ?? []).map((m) => <li key={m.id}><div><b>{m.name}</b><p>{m.active.length} en curso · {m.doneMonth} entregados este mes</p></div></li>)}</ul>
          <Link className="btn btn--secondary btn--sm" href="/mecanicos">Ver productividad</Link>
        </section>
      </div>
      <Dlg open={nw} onClose={() => setNw(false)}>{nw ? <NewOrderDialog mechanics={d?.mechanics ?? []} canAssign onClose={() => setNw(false)} onDone={(id) => router.push(`/ordenes/${id}`)} /> : null}</Dlg>
    </div>
  );
}
