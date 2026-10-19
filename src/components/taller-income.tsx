"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHODS, addDays, dateCO, todayCO } from "@/lib/taller";
import type { TallerPaymentsRes } from "@/lib/types";
import { NoAccess } from "./no-access";
import { FRONT, Plate, useTallerAccess } from "./taller-common";

export function TallerIncomeView() {
  const { state, allowed } = useTallerAccess(FRONT);
  const [from, setFrom] = useState(addDays(todayCO(), -6));
  const [to, setTo] = useState(todayCO());
  const { data, error } = useResource<TallerPaymentsRes>(allowed ? `/taller/payments?from=${from}&to=${to}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const label = (v: string) => METHODS.find((m) => m.v === v)?.l ?? v;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Ingresos</h1><p className="lede">Pagos y abonos recibidos. Para registrar uno, abre la orden.</p></div></div>
      <div className="agenda-bar"><label>Desde <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label><label>Hasta <input type="date" value={to} min={from} max={todayCO()} onChange={(e) => e.target.value && setTo(e.target.value)} /></label></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {data ? (
        <>
          <div className="kpis"><div className="kpi"><span>Total del período</span><strong>{formatMoney(data.total)}</strong></div>{Object.entries(data.byMethod).map(([m, v]) => <div key={m} className="kpi"><span>{label(m)}</span><strong>{formatMoney(v)}</strong></div>)}</div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Orden</th><th>Cliente</th><th>Medio</th><th>Valor</th></tr></thead><tbody>
            {data.rows.map((r) => <tr key={r.id}><td>{dateCO(r.paidAt)}</td><td><Link href={`/ordenes/${r.orderId}`}>#{r.number}</Link> <Plate plate={r.plate} /></td><td>{r.customerName}</td><td>{label(r.method)}</td><td><b>{formatMoney(r.amount)}</b></td></tr>)}
          </tbody></table></div>
          {!data.rows.length ? <p className="lede">No hay pagos en este período.</p> : null}
        </>
      ) : null}
    </div>
  );
}
