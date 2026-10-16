"use client";

import { useMemo, useState } from "react";
import { useResource } from "@/lib/use-resource";
import { formatMoney, PAY_LABEL } from "@/lib/format";
import { rangeOf, stampCO, type Range } from "@/lib/dates";
import { downloadXlsx } from "@/lib/excel";
import { PeriodPicker } from "./period-picker";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { SalesResponse } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = { mesa: "En mesa", recoger: "Para llevar", domicilio: "Domicilio" };

export function SalesView() {
  const { state } = useSession();
  const allowed = state.status === "in" && (state.user.role === "TENANT_ADMIN" || state.user.role === "CASHIER");
  const [range, setRange] = useState<Range>(() => rangeOf("hoy"));
  const [method, setMethod] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data, error } = useResource<SalesResponse>(allowed ? `/sales?from=${range.from}&to=${range.to}` : null);

  const rows = useMemo(() => (data?.items ?? []).filter((r) => !method || (r.paymentMethod ?? "otro") === method), [data, method]);
  const shownTotal = rows.reduce((s, r) => s + r.total, 0);

  if (state.status === "in" && !allowed) return <NoAccess />;

  async function exportExcel() {
    if (!data) return;
    setBusy(true);
    setErr(null);
    try {
      const tenant = state.status === "in" ? state.user.tenant?.name ?? "Negocio" : "Negocio";
      const s = data.summary;
      const head = (t: string) => ({ value: t, bold: true });
      await downloadXlsx(`ventas_${range.from}_a_${range.to}.xlsx`, [
        {
          name: "Resumen",
          widths: [26, 18, 12],
          rows: [
            [{ value: `Ventas de ${tenant}`, bold: true }],
            [`Periodo: ${range.from} a ${range.to}`],
            [],
            [head("Concepto"), head("Valor"), head("Ventas")],
            ["Total vendido", { value: s.total, money: true }, s.count],
            ["Ticket promedio", { value: s.average, money: true }, ""],
            ["Domicilios cobrados", { value: s.deliveryFees, money: true }, ""],
            [],
            [head("Forma de pago"), head("Valor"), head("Ventas")],
            ...Object.entries(s.byMethod).map(([m, v]) => [PAY_LABEL[m] ?? m, { value: v.total, money: true }, v.count] as (string | number | { value: number; money: boolean })[]),
            [],
            [head("Tipo de venta"), head("Valor"), head("Ventas")],
            ...Object.entries(s.byType).map(([m, v]) => [TYPE_LABEL[m] ?? m, { value: v.total, money: true }, v.count] as (string | number | { value: number; money: boolean })[]),
          ],
        },
        {
          name: "Ventas",
          widths: [18, 9, 14, 24, 50, 14, 20, 14, 14],
          rows: [
            ["Fecha y hora", "Pedido", "Tipo", "Cliente / Mesa", "Productos", "Forma de pago", "Cobró", "Domicilio", "Total"].map(head),
            ...data.items.map((r) => [
              stampCO(r.paidAt),
              r.number,
              TYPE_LABEL[r.type] ?? r.type,
              r.type === "mesa" ? r.tableName ?? r.customerName : r.customerName,
              r.products,
              PAY_LABEL[r.paymentMethod ?? "otro"] ?? r.paymentMethod ?? "",
              r.cashier ?? "",
              { value: r.deliveryFee, money: true },
              { value: r.total, money: true },
            ]),
            [],
            [{ value: "TOTAL", bold: true }, "", "", "", "", "", "", "", { value: s.total, money: true, bold: true }],
          ],
        },
      ]);
    } catch {
      setErr("No se pudo generar el archivo de Excel. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const s = data?.summary;
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Mis ventas</h1>
          <p className="lede">Todo lo cobrado en el periodo. Descárgalo a Excel cuando lo necesites.</p>
        </div>
        <button type="button" className="btn btn--primary" disabled={!data || busy || data.items.length === 0} onClick={exportExcel}>
          {busy ? "Generando…" : "Descargar Excel"}
        </button>
      </header>

      <PeriodPicker value={range} onChange={setRange} />
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}
      {data?.truncated ? <div className="banner" role="status"><span>Hay muchas ventas en este periodo; se muestran las más recientes. Elige un rango más corto.</span></div> : null}

      {s ? (
        <div className="kpis" role="group" aria-label="Resumen de ventas">
          <div className="kpi"><span className="kpi__value">{formatMoney(s.total)}</span><span className="kpi__label">vendido</span></div>
          <div className="kpi"><span className="kpi__value">{s.count}</span><span className="kpi__label">{s.count === 1 ? "venta" : "ventas"}</span></div>
          <div className="kpi"><span className="kpi__value">{formatMoney(s.average)}</span><span className="kpi__label">ticket promedio</span></div>
          <div className="kpi"><span className="kpi__value">{formatMoney(s.deliveryFees)}</span><span className="kpi__label">en domicilios</span></div>
        </div>
      ) : null}

      {s && s.count > 0 ? (
        <div className="chips" role="group" aria-label="Filtrar por forma de pago">
          <button type="button" className={`chip${method === "" ? " is-on" : ""}`} onClick={() => setMethod("")}>Todas · {formatMoney(s.total)}</button>
          {Object.entries(s.byMethod).map(([m, v]) => (
            <button key={m} type="button" className={`chip${method === m ? " is-on" : ""}`} onClick={() => setMethod(m)}>
              {PAY_LABEL[m] ?? m} · {formatMoney(v.total)}
            </button>
          ))}
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <section className="note">
          <h2>No hay ventas en este periodo</h2>
          <p>Aquí aparecen los pedidos ya cobrados. Prueba con otro periodo.</p>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Pedido</th><th>Detalle</th><th>Pago</th><th>Cobró</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{stampCO(r.paidAt)}</td>
                  <td className="nowrap">#{r.number}</td>
                  <td>
                    <div className="strong-t">{TYPE_LABEL[r.type]} · {r.type === "mesa" ? r.tableName ?? r.customerName : r.customerName}</div>
                    <div className="sub">{r.products}</div>
                  </td>
                  <td>{PAY_LABEL[r.paymentMethod ?? "otro"] ?? r.paymentMethod}</td>
                  <td>{r.cashier ?? "—"}</td>
                  <td className="num">{formatMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5} className="strong-t">{method ? `Total (${PAY_LABEL[method] ?? method})` : "Total"}</td><td className="num strong-t">{formatMoney(shownTotal)}</td></tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
