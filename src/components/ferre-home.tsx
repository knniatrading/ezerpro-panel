"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHOD_TEXT, fmtQty, niceDate, todayCO, waLink, weekdayName } from "@/lib/ferre";
import type { FerreDashboard } from "@/lib/types";
import { useSession } from "./session";
import { Bars } from "./vet-common";

export function FerreHome() {
  const { state } = useSession();
  const { data: d, reload } = useResource<FerreDashboard>("/ferre/dashboard");
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const today = todayCO();
  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">Así va la ferretería hoy, {weekdayName(today)} {niceDate(today)}.</p></div>
        <div className="actions-cell"><Link className="btn btn--primary btn--sm" href="/pos">Abrir el punto de venta</Link><Link className="btn btn--secondary btn--sm" href="/ventas-mostrador">Pedidos</Link><Link className="btn btn--secondary btn--sm" href="/vendedores">Vendedores</Link></div></div>
      <div className="kpis" role="group" aria-label="Resumen de hoy">
        <Link className="kpi kpi--link kpi--warn" href="/ventas-mostrador"><span>Pedidos por despachar</span><strong>{d?.ordersPending ?? 0}</strong></Link>
        <div className="kpi"><span>Vendido hoy</span><strong>{formatMoney(d?.today.total ?? 0)}</strong></div>
        <div className="kpi"><span>Ganancia de hoy</span><strong>{formatMoney(d?.today.profit ?? 0)}</strong></div>
        <div className="kpi"><span>Ventas de hoy</span><strong>{d?.today.sales ?? 0}</strong></div>
        <div className="kpi kpi--warn"><span>Productos por agotarse</span><strong>{d?.lowStock.length ?? 0}</strong></div>
        <div className="kpi"><span>Te deben</span><strong>{formatMoney(d?.receivables.total ?? 0)}</strong></div>
        <div className="kpi kpi--warn"><span>Cartera vencida</span><strong>{formatMoney(d?.receivables.overdue ?? 0)}</strong></div>
        <div className="kpi"><span>Cotizaciones abiertas</span><strong>{d?.quotesOpen ?? 0}</strong></div>
      </div>
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Por agotarse"><h2>Se está acabando</h2>
          {d && !d.lowStock.length ? <p className="field__hint">Todo el inventario está por encima del mínimo.</p> : null}
          <ul className="dcard__list">{(d?.lowStock ?? []).map((p) => <li key={p.id}><div><b>{p.name}</b><p className={p.stock <= 0 ? "is-out" : "is-low"}>{p.stock <= 0 ? "Agotado" : `Solo quedan ${fmtQty(p.stock)} ${p.unit}`} (mínimo {fmtQty(p.minStock)})</p></div></li>)}</ul>
          <Link className="btn btn--secondary btn--sm" href="/inventario">Abrir inventario</Link>
        </section>
        <section className="dcard__sec" aria-label="Quién debe"><h2>Quién te debe</h2>
          {d && !d.receivables.debtors.length ? <p className="field__hint">Nadie debe nada.</p> : null}
          <ul className="dcard__list">{(d?.receivables.debtors ?? []).map((c) => (
            <li key={c.id}><div><b><Link href={`/cuentas/${c.id}`}>{c.name}</Link></b><p>{formatMoney(c.balance)}{c.overdue > 0 ? <> · <span className="badge badge--warn">Vencido {formatMoney(c.overdue)}</span></> : null}</p></div>
              <a className="btn btn--secondary btn--sm" href={waLink(c.phone, `Hola ${c.name.split(" ")[0]}, te recordamos tu saldo pendiente de ${formatMoney(c.balance)}. ¡Gracias!`)} target="_blank" rel="noreferrer">Recordar</a></li>
          ))}</ul>
          <Link className="btn btn--secondary btn--sm" href="/cuentas">Ver cuentas por cobrar</Link>
        </section>
        <section className="dcard__sec" aria-label="Ventas de la semana"><h2>Ventas de los últimos 7 días</h2>
          <Bars rows={(d?.days ?? []).map((x) => ({ label: weekdayName(x.date).slice(0, 3), value: x.total }))} format={(n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n))} />
        </section>
        <section className="dcard__sec" aria-label="Más vendidos"><h2>Lo que más se vendió (7 días)</h2>
          <ul className="dcard__list">{(d?.top ?? []).map((t) => <li key={t.name}><div><b>{t.name}</b><p>{formatMoney(t.total)}</p></div></li>)}</ul>
          {d && Object.keys(d.today.byMethod).length ? <p className="field__hint">Hoy: {Object.entries(d.today.byMethod).map(([m, v]) => `${METHOD_TEXT[m] ?? m} ${formatMoney(v)}`).join(" · ")}</p> : null}
        </section>
      </div>
    </div>
  );
}
