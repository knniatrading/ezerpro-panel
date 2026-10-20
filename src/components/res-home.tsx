"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { dateLongCO } from "@/lib/residential";
import type { ResDash } from "@/lib/residential";
import { useSession } from "./session";

export function ResHome() {
  const { state } = useSession();
  const { data: d, reload } = useResource<ResDash>("/residential/dashboard");
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) reload(); }, 30000); return () => clearInterval(t); }, [reload]);
  const user = state.status === "in" ? state.user : null;
  const role = user?.role;
  const gate = role === "CASHIER";
  const admin = role === "TENANT_ADMIN";
  return (
    <div className="page">
      <div className="page-head"><div><h1>{gate ? `Hola, ${(user?.name ?? "").split(" ")[0]}` : user?.tenant?.name ?? "Mi conjunto"}</h1><p className="lede">{gate ? "Lo que pasa hoy en la portería." : "El resumen de tu conjunto."}</p></div>
        <div className="actions-cell">
          {gate || admin ? <Link className="btn btn--primary btn--sm" href="/porteria">Portería</Link> : null}
          {!gate ? <Link className="btn btn--secondary btn--sm" href="/cj-asambleas">Asambleas</Link> : null}
        </div></div>
      <div className="kpis" role="group" aria-label="Resumen">
        <div className="kpi"><span>Visitas adentro</span><strong>{d?.visitors.inside ?? 0}</strong></div>
        <div className="kpi"><span>Visitas esperadas</span><strong>{d?.visitors.expected ?? 0}</strong></div>
        <div className="kpi"><span>Paquetes en portería</span><strong>{d?.parcels ?? 0}</strong></div>
        {!gate ? <div className="kpi"><span>Reservas por aprobar</span><strong>{d?.pendingBookings ?? 0}</strong></div> : null}
        {!gate ? <div className="kpi"><span>PQRS abiertos</span><strong>{d?.tickets ?? 0}</strong></div> : null}
        {d?.money ? <div className="kpi kpi--warn"><span>Unidades en mora</span><strong>{d.money.morosos}</strong><small>{formatMoney(d.money.overdue)} vencido</small></div> : null}
        {d?.money ? <div className="kpi"><span>Recaudo del mes</span><strong>{formatMoney(d.money.collectedMonth)}</strong></div> : null}
      </div>
      {d?.nextAssembly ? (
        <section className="dcard__sec" aria-label="Próxima asamblea"><h2>Próxima asamblea</h2>
          <p><b>{d.nextAssembly.title}</b></p><p className="field__hint">{dateLongCO(d.nextAssembly.startsAt)}</p>
          <Link className="btn btn--secondary btn--sm" href={`/cj-asambleas/${d.nextAssembly.id}`}>Abrir</Link>
        </section>
      ) : null}
      <div className="vet-grid">
        <section className="dcard__sec" aria-label="Atajos"><h2>Atajos</h2>
          <ul className="dcard__list">
            {gate || admin ? <li><div><b><Link href="/porteria">Portería</Link></b><p>Escanear visitas, registrar paquetes y buscar por placa.</p></div></li> : null}
            {!gate ? <li><div><b><Link href="/cj-cartera">Cartera y cuotas</Link></b><p>Quién debe, pagos y recordatorios.</p></div></li> : null}
            {!gate ? <li><div><b><Link href="/cj-areas">Áreas comunes</Link></b><p>Reservas de BBQ, salón, piscina y cancha.</p></div></li> : null}
            {!gate ? <li><div><b><Link href="/cj-pqrs">PQRS</Link></b><p>Peticiones, quejas y reclamos con historial.</p></div></li> : null}
            {!gate ? <li><div><b><Link href="/cj-cartelera">Cartelera</Link></b><p>Comunicados para todos los residentes.</p></div></li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
