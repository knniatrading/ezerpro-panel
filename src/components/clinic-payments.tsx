"use client";

import { useState } from "react";
import Link from "next/link";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHODS, addDays, niceDate, todayCO, waLink } from "@/lib/clinic";
import type { ClinicPatient, ClinicPaymentsRes } from "@/lib/types";
import { NoAccess } from "./no-access";
import { useClinicAccess } from "./clinic-common";

export function ClinicPaymentsView() {
  const { state, allowed } = useClinicAccess(["TENANT_ADMIN", "CASHIER"]);
  const [tab, setTab] = useState<"deuda" | "pagos">("deuda");
  const [from, setFrom] = useState(addDays(todayCO(), -6));
  const [to, setTo] = useState(todayCO());
  const debt = useResource<ClinicPatient[]>(allowed && tab === "deuda" ? "/clinic/patients?filter=deuda" : null);
  const pays = useResource<ClinicPaymentsRes>(allowed && tab === "pagos" ? `/clinic/payments?from=${from}&to=${to}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const label = (v: string) => METHODS.find((m) => m.v === v)?.l ?? v;
  const total = (debt.data ?? []).reduce((s, p) => s + (p.debt ?? 0), 0);
  return (
    <div className="page">
      <div className="page-head"><div><h1>Cobros</h1><p className="lede">Saldos pendientes de tratamientos y pagos recibidos. Para registrar un abono, entra a la ficha del paciente.</p></div></div>
      <div className="chips" role="group" aria-label="Vista"><button className={`chip${tab === "deuda" ? " is-on" : ""}`} aria-pressed={tab === "deuda"} onClick={() => setTab("deuda")}>Por cobrar</button><button className={`chip${tab === "pagos" ? " is-on" : ""}`} aria-pressed={tab === "pagos"} onClick={() => setTab("pagos")}>Pagos recibidos</button></div>
      {tab === "deuda" ? (
        <>
          {debt.error ? <p className="form-error" role="alert">{debt.error}</p> : null}
          <p className="lede">Total por cobrar: <b>{formatMoney(total)}</b></p>
          <div className="table-wrap"><table className="table"><thead><tr><th>Paciente</th><th>Saldo</th><th></th></tr></thead><tbody>
            {(debt.data ?? []).map((p) => (
              <tr key={p.id}><td><Link href={`/historias/${p.id}`}><b>{p.name}</b></Link><br /><span className="field__hint">{p.phone}</span></td><td><b>{formatMoney(p.debt ?? 0)}</b></td>
                <td className="actions-cell"><Link className="btn btn--primary btn--sm" href={`/historias/${p.id}`}>Abonar</Link><a className="btn btn--secondary btn--sm" href={waLink(p.phone, `Hola ${p.name.split(" ")[0]}, te recordamos que tienes un saldo pendiente de ${formatMoney(p.debt ?? 0)}. ¡Gracias!`)} target="_blank" rel="noopener noreferrer">Recordar</a></td></tr>
            ))}
          </tbody></table></div>
          {debt.data && !debt.data.length ? <p className="lede">Nadie tiene saldo pendiente.</p> : null}
        </>
      ) : (
        <>
          <div className="agenda-bar"><label>Desde <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label><label>Hasta <input type="date" value={to} min={from} max={todayCO()} onChange={(e) => e.target.value && setTo(e.target.value)} /></label></div>
          {pays.error ? <p className="form-error" role="alert">{pays.error}</p> : null}
          {pays.data ? (
            <>
              <div className="kpis"><div className="kpi"><span>Total del período</span><strong>{formatMoney(pays.data.total)}</strong></div>{Object.entries(pays.data.byMethod).map(([m, v]) => <div key={m} className="kpi"><span>{label(m)}</span><strong>{formatMoney(v)}</strong></div>)}</div>
              <div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Concepto</th><th>Medio</th><th>Valor</th></tr></thead><tbody>
                {pays.data.rows.map((r) => <tr key={r.id}><td>{niceDate(r.paidAt)}</td><td>{r.patientId ? <Link href={`/historias/${r.patientId}`}>{r.patientName}</Link> : r.patientName}</td><td>{r.treatmentName}</td><td>{label(r.method)}</td><td><b>{formatMoney(r.amount)}</b></td></tr>)}
              </tbody></table></div>
              {!pays.data.rows.length ? <p className="lede">No hay pagos en este período.</p> : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
