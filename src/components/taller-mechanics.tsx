"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import type { TallerMechanic } from "@/lib/types";
import { NoAccess } from "./no-access";
import { FRONT, Plate, StatusBadge, useTallerAccess } from "./taller-common";

const PAY: Record<string, string> = { hora: "por hora", dia: "por día", obra: "por mano de obra", rutina: "por rutina", domicilio: "por domicilio" };

export function TallerMechanicsView() {
  const { state, allowed, role } = useTallerAccess(FRONT);
  const { data, error, reload } = useResource<TallerMechanic[]>(allowed ? "/taller/mechanics" : null);
  useEffect(() => { if (!allowed) return; const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [allowed, reload]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const admin = role === "TENANT_ADMIN";
  return (
    <div className="page">
      <div className="page-head"><div><h1>Mecánicos</h1><p className="lede">Quién está trabajando en qué y cuánto ha entregado este mes.</p></div>{admin ? <Link className="btn btn--secondary btn--sm" href="/nomina">Ir a la nómina</Link> : null}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {data && !data.length ? <p className="note">Aún no tienes mecánicos. Créalos en <Link href="/equipo">Equipo</Link> con el rol “Mecánico”.</p> : null}
      <div className="tl-mechs">
        {(data ?? []).map((m) => (
          <section key={m.id} className="card" aria-label={m.name}>
            <h2>{m.name}</h2>
            <p className="field__hint">{m.payType ? `Pago ${PAY[m.payType] ?? m.payType}${m.payType === "obra" ? ` (${m.payRate}% de la mano de obra)` : m.payRate ? ` · ${formatMoney(m.payRate)}` : ""}` : "Sin forma de pago configurada"}</p>
            <div className="kpis">
              <div className="kpi"><span>En curso</span><strong>{m.active.length}</strong></div>
              <div className="kpi"><span>Entregadas (mes)</span><strong>{m.doneMonth}</strong></div>
              <div className="kpi"><span>Mano de obra (mes)</span><strong>{formatMoney(m.laborMonth)}</strong></div>
              {admin && m.payType === "obra" ? <div className="kpi"><span>Le corresponde (mes)</span><strong>{formatMoney(m.payMonth)}</strong></div> : null}
            </div>
            {m.active.length ? <ul className="dcard__list">{m.active.map((o) => <li key={o.id}><div><b><Link href={`/ordenes/${o.id}`}>#{o.number} · <Plate plate={o.plate} /></Link></b><p>{o.complaint.length > 70 ? o.complaint.slice(0, 70) + "…" : o.complaint}</p></div><StatusBadge status={o.status} /></li>)}</ul> : <p className="field__hint">Sin órdenes en curso. Asígnale una desde la orden.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
