"use client";

import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { rangeOf, stampCO, labelDate, type Range } from "@/lib/dates";
import { downloadXlsx } from "@/lib/excel";
import { RIDE_STATUS } from "@/lib/rides";
import type { DriverSummary, Ride } from "@/lib/types";
import { PeriodPicker } from "./period-picker";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

export function DriverHistoryView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("tarjeta");
  const [range, setRange] = useState<Range>(() => rangeOf("semana"));
  const [err, setErr] = useState<string | null>(null);
  const q = `from=${range.from}&to=${range.to}`;
  const sum = useResource<DriverSummary>(allowed ? `/rides/summary?${q}` : null);
  const list = useResource<Ride[]>(allowed ? `/rides?scope=history&${q}` : null);
  if (state.status === "in" && !allowed) return <NoAccess />;

  const s = sum.data;
  const rows = list.data ?? [];
  const max = Math.max(1, ...(s?.byDay ?? []).map((d) => d.total));

  async function exportExcel() {
    if (!s) return;
    setErr(null);
    try {
      const head = (t: string) => ({ value: t, bold: true });
      await downloadXlsx(`viajes_${range.from}_a_${range.to}.xlsx`, [
        {
          name: "Resumen",
          widths: [26, 18, 12],
          rows: [
            [{ value: "Historial y ganancias", bold: true }],
            [`Periodo: ${range.from} a ${range.to}`],
            [],
            [head("Concepto"), head("Valor"), head("Servicios")],
            ["Total ganado", { value: s.total, money: true }, s.count],
            ["Promedio por servicio", { value: s.average, money: true }, ""],
            ["Kilómetros", s.km, ""],
            ["Cancelados", "", s.cancelled],
            [],
            [head("Servicio"), head("Valor"), head("Cantidad")],
            ...s.byService.map((b) => [b.name, { value: b.total, money: true }, b.count] as (string | number | { value: number; money: boolean })[]),
          ],
        },
        {
          name: "Servicios",
          widths: [18, 8, 22, 22, 36, 36, 10, 14, 14],
          rows: [
            ["Fecha y hora", "N.º", "Servicio", "Pasajero", "Recogida", "Destino", "Km", "Estado", "Valor"].map(head),
            ...rows.map((r) => [
              stampCO(r.completedAt ?? r.cancelledAt ?? r.createdAt), r.number, r.serviceName ?? "Viaje", r.passengerName, r.pickup, r.dropoff,
              r.km ?? "", RIDE_STATUS[r.status]?.label ?? r.status, { value: r.status === "completado" ? r.finalPrice ?? 0 : 0, money: true },
            ]),
            [],
            [{ value: "TOTAL", bold: true }, "", "", "", "", "", "", "", { value: s.total, money: true, bold: true }],
          ],
        },
      ]);
    } catch {
      setErr("No se pudo generar el archivo de Excel. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Historial y ganancias</h1>
          <p className="lede">Lo que has ganado y todos tus servicios terminados o cancelados.</p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={exportExcel} disabled={!s || rows.length === 0}>Descargar Excel</button>
      </div>
      <PeriodPicker value={range} onChange={setRange} />
      {sum.error || list.error || err ? <p className="form-error" role="alert">{err ?? sum.error ?? list.error}</p> : null}
      {s ? (
        <div className="kpis">
          <div className="kpi"><span>Total ganado</span><strong>{formatMoney(s.total)}</strong></div>
          <div className="kpi"><span>Servicios</span><strong>{s.count}</strong></div>
          <div className="kpi"><span>Promedio</span><strong>{formatMoney(s.average)}</strong></div>
          <div className="kpi"><span>Kilómetros</span><strong>{String(s.km).replace(".", ",")}</strong></div>
          <div className="kpi"><span>Cancelados</span><strong>{s.cancelled}</strong></div>
        </div>
      ) : null}
      {s && s.byDay.length > 1 ? (
        <div className="bars" role="img" aria-label="Ganancias por día">
          {s.byDay.map((d) => (
            <div key={d.date} className="bars__col" title={`${labelDate(d.date)}: ${formatMoney(d.total)}`}>
              <span className="bars__bar" style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }} />
              <span className="bars__tick">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {s && s.byService.length ? (
        <div className="chips">{s.byService.map((b) => <span key={b.name} className="chip">{b.name}: {formatMoney(b.total)} ({b.count})</span>)}</div>
      ) : null}
      {list.data && rows.length === 0 ? <p className="note">No hay servicios en este periodo.</p> : null}
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>N.º</th><th>Servicio</th><th>Pasajero</th><th>Recorrido</th><th>Km</th><th>Estado</th><th>Valor</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{stampCO(r.completedAt ?? r.cancelledAt ?? r.createdAt)}</td>
                  <td>{r.number}</td>
                  <td>{r.serviceName ?? "Viaje"}</td>
                  <td>{r.passengerName}</td>
                  <td>{r.pickup} → {r.dropoff}</td>
                  <td>{r.km ?? ""}</td>
                  <td>{RIDE_STATUS[r.status]?.label ?? r.status}</td>
                  <td>{r.status === "completado" ? formatMoney(r.finalPrice ?? 0) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
