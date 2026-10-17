"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { rangeOf } from "@/lib/dates";
import type { DriverSummary, Ride } from "@/lib/types";
import { useSession } from "./session";

export function DriverHome() {
  const { state } = useSession();
  const hoy = rangeOf("hoy");
  const mes = rangeOf("mes");
  const today = useResource<DriverSummary>(`/rides/summary?from=${hoy.from}&to=${hoy.to}`);
  const month = useResource<DriverSummary>(`/rides/summary?from=${mes.from}&to=${mes.to}`);
  const open = useResource<Ride[]>("/rides?scope=open");
  const reload = open.reload;
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) reload(); }, 10000);
    return () => clearInterval(t);
  }, [reload]);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const pending = (open.data ?? []).filter((r) => r.status === "solicitado" || r.status === "negociando").length;

  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">Tu resumen de hoy.</p></div></div>
      {pending > 0 ? <p className="banner" role="status">Tienes {pending} solicitud{pending === 1 ? "" : "es"} por atender. <Link href="/solicitudes">Ver solicitudes</Link></p> : null}
      <div className="kpis" role="group" aria-label="Resumen">
        <div className="kpi"><span>Ganado hoy</span><strong>{formatMoney(today.data?.total ?? 0)}</strong></div>
        <div className="kpi"><span>Servicios hoy</span><strong>{today.data?.count ?? 0}</strong></div>
        <div className="kpi"><span>Ganado en el mes</span><strong>{formatMoney(month.data?.total ?? 0)}</strong></div>
        <div className="kpi"><span>Servicios del mes</span><strong>{month.data?.count ?? 0}</strong></div>
      </div>
      <div className="chips">
        <Link className="chip" href="/solicitudes">Solicitudes</Link>
        <Link className="chip" href="/mi-tarjeta">Mi tarjeta y QR</Link>
        <Link className="chip" href="/tarifas">Tarifas y servicios</Link>
        <Link className="chip" href="/historial">Historial</Link>
      </div>
    </div>
  );
}
