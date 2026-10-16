"use client";

import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney, PAY_LABEL } from "@/lib/format";
import { labelDate, rangeOf, type Range } from "@/lib/dates";
import { PeriodPicker } from "./period-picker";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { MetricsResponse } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = { mesa: "En mesa", recoger: "Para llevar", domicilio: "Domicilio" };

function Bars({ items, label }: { items: { key: string; label: string; value: number; sub?: string }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bars" role="img" aria-label={label}>
      {items.map((i) => (
        <div className="bars__col" key={i.key} title={`${i.label}: ${formatMoney(i.value)}${i.sub ? ` · ${i.sub}` : ""}`}>
          <div className="bars__bar" style={{ height: `${Math.max(i.value > 0 ? 3 : 0, (i.value / max) * 100)}%` }} />
          <span className="bars__tick">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function Split({ title, data, labels }: { title: string; data: Record<string, { total: number; count: number }>; labels: Record<string, string> }) {
  const rows = Object.entries(data).sort((a, b) => b[1].total - a[1].total);
  const sum = rows.reduce((s, r) => s + r[1].total, 0) || 1;
  return (
    <section className="account-card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="field__hint">Sin datos.</p> : null}
      <ul className="hbars">
        {rows.map(([k, v]) => (
          <li key={k}>
            <span>{labels[k] ?? k}</span>
            <span className="hbars__track"><span className="hbars__fill" style={{ width: `${(v.total / sum) * 100}%` }} /></span>
            <strong>{formatMoney(v.total)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MetricsView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN";
  const [range, setRange] = useState<Range>(() => rangeOf("semana"));
  const { data, error } = useResource<MetricsResponse>(allowed ? `/metrics?from=${range.from}&to=${range.to}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const s = data?.summary;
  const dayItems = (data?.byDay ?? []).map((d) => ({
    key: d.date,
    label: data && data.byDay.length > 14 ? d.date.slice(8) : labelDate(d.date).replace(/ de /g, " ").slice(0, 6),
    value: d.total,
    sub: `${d.count} ventas`,
  }));
  const hourItems = (data?.byHour ?? []).filter((h) => h.hour >= 6 || h.count > 0).map((h) => ({ key: String(h.hour), label: String(h.hour), value: h.total, sub: `${h.count} ventas` }));
  const topQty = Math.max(1, ...(data?.topDishes ?? []).map((d) => d.quantity));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Métricas</h1>
          <p className="lede">Cómo va tu negocio: ventas, horas fuertes y platos estrella.</p>
        </div>
      </header>
      <PeriodPicker value={range} onChange={setRange} />
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}

      {s ? (
        <div className="kpis" role="group" aria-label="Resumen">
          <div className="kpi"><span className="kpi__value">{formatMoney(s.total)}</span><span className="kpi__label">vendido</span></div>
          <div className="kpi"><span className="kpi__value">{s.count}</span><span className="kpi__label">ventas</span></div>
          <div className="kpi"><span className="kpi__value">{formatMoney(s.average)}</span><span className="kpi__label">ticket promedio</span></div>
          <div className="kpi"><span className="kpi__value">{s.cancelled}</span><span className="kpi__label">{s.cancelled === 1 ? "pedido cancelado" : "pedidos cancelados"}</span></div>
        </div>
      ) : null}

      {s && s.count === 0 ? (
        <section className="note"><h2>Todavía no hay ventas en este periodo</h2><p>Las métricas se llenan con los pedidos ya cobrados.</p></section>
      ) : null}

      {s && s.count > 0 ? (
        <>
          <section className="account-card" style={{ marginBottom: 20 }}>
            <h2>Ventas por día</h2>
            <Bars items={dayItems} label="Ventas por día" />
          </section>
          <section className="account-card" style={{ marginBottom: 20 }}>
            <h2>Ventas por hora del día</h2>
            <Bars items={hourItems} label="Ventas por hora" />
          </section>
          <section className="account-card" style={{ marginBottom: 20 }}>
            <h2>Platos estrella</h2>
            <ol className="stars">
              {data!.topDishes.map((d, i) => (
                <li key={d.name}>
                  <span className="stars__n">{i + 1}</span>
                  <span className="stars__name">{d.name}</span>
                  <span className="hbars__track"><span className="hbars__fill" style={{ width: `${(d.quantity / topQty) * 100}%` }} /></span>
                  <strong>{d.quantity} und.</strong>
                  <span className="sub">{formatMoney(d.revenue)}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="account-grid">
            <Split title="Por tipo de venta" data={data!.byType} labels={TYPE_LABEL} />
            <Split title="Por forma de pago" data={data!.byMethod} labels={PAY_LABEL} />
          </div>
        </>
      ) : null}
    </div>
  );
}
