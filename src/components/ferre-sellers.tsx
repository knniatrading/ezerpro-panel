"use client";

import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { niceDate, weekdayName } from "@/lib/ferre";
import type { FerreAgg, FerreSellerDetail, FerreSellers } from "@/lib/types";
import { NoAccess } from "./no-access";
import { Dlg, ADMIN, useFerreAccess } from "./ferre-common";

const cell = (a: FerreAgg) => <><b>{formatMoney(a.total)}</b><br /><span className="field__hint">{a.count} {a.count === 1 ? "venta" : "ventas"} · gan. {formatMoney(a.profit)}</span></>;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error } = useResource<FerreSellerDetail>(`/ferre/sellers/${id}`);
  const [tab, setTab] = useState<"dias" | "semanas" | "meses">("dias");
  if (error) return <div><h2 id="dlg-title" tabIndex={-1}>Récord</h2><p className="form-error" role="alert">{error}</p></div>;
  if (!data) return <div><h2 id="dlg-title" tabIndex={-1}>Récord</h2><p className="lede">Cargando…</p></div>;
  return (
    <div>
      <h2 id="dlg-title" tabIndex={-1}>Récord de {data.name}</h2>
      <div className="chips" role="tablist" aria-label="Periodo">{([["dias", "Por día"], ["semanas", "Por semana"], ["meses", "Por mes"]] as const).map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "is-on" : ""} onClick={() => setTab(v)}>{l}</button>)}</div>
      <div className="table-wrap fe-scroll"><table className="table"><thead><tr><th>{tab === "dias" ? "Día" : tab === "semanas" ? "Semana (desde el lunes)" : "Mes"}</th><th>Ventas</th><th>Vendido</th><th>Ganancia</th></tr></thead><tbody>
        {tab === "dias" ? [...data.days].reverse().map((r) => <tr key={r.date}><td>{weekdayName(r.date)} {niceDate(r.date)}</td><td>{r.count}</td><td>{formatMoney(r.total)}</td><td>{formatMoney(r.profit)}</td></tr>) : null}
        {tab === "semanas" ? [...data.weeks].reverse().map((r) => <tr key={r.weekStart}><td>{niceDate(r.weekStart)}</td><td>{r.count}</td><td>{formatMoney(r.total)}</td><td>{formatMoney(r.profit)}</td></tr>) : null}
        {tab === "meses" ? [...data.months].reverse().map((r) => <tr key={r.month}><td>{MONTHS[Number(r.month.slice(5)) - 1]} {r.month.slice(0, 4)}</td><td>{r.count}</td><td>{formatMoney(r.total)}</td><td>{formatMoney(r.profit)}</td></tr>) : null}
      </tbody></table></div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cerrar</button></div>
    </div>
  );
}

/** Récord de ventas de cada vendedor: hoy, esta semana y este mes. Solo el administrador. */
export function FerreSellersView() {
  const { state, allowed } = useFerreAccess(ADMIN);
  const { data, error } = useResource<FerreSellers>(allowed ? "/ferre/sellers" : null);
  const [open, setOpen] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Vendedores</h1><p className="lede">Quién vendió cuánto: hoy, esta semana (desde el lunes) y este mes. Las ventas anuladas no cuentan.</p></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="kpis"><div className="kpi"><span>Vendido hoy</span><strong>{formatMoney(data?.totals.today.total ?? 0)}</strong></div><div className="kpi"><span>Esta semana</span><strong>{formatMoney(data?.totals.week.total ?? 0)}</strong></div><div className="kpi"><span>Este mes</span><strong>{formatMoney(data?.totals.month.total ?? 0)}</strong></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Vendedor</th><th>Hoy</th><th>Esta semana</th><th>Este mes</th><th></th></tr></thead><tbody>
        {(data?.sellers ?? []).map((s) => (
          <tr key={s.id}><td><b>{s.name}</b>{s.role === "TENANT_ADMIN" ? <><br /><span className="field__hint">Administrador</span></> : null}</td><td>{cell(s.today)}</td><td>{cell(s.week)}</td><td>{cell(s.month)}</td><td className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setOpen(s.id)}>Ver récord</button></td></tr>
        ))}
      </tbody></table></div>
      {data && !data.sellers.length ? <p className="lede">Todavía no hay ventas.</p> : null}
      <p className="field__hint">Cada venta queda a nombre de quien la registra en el punto de venta o despacha el pedido.</p>
      <Dlg open={!!open} onClose={() => setOpen(null)} wide>{open ? <Detail id={open} onClose={() => setOpen(null)} /> : null}</Dlg>
    </div>
  );
}
