"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDateUTC, formatMoney } from "@/lib/format";
import type { PaymentsResponse } from "@/lib/types";

export function PaymentsView() {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === "in" ? state.user.role : null;
  const allowed = role === "SUPER_ADMIN" || role === "DISTRIBUTOR_ADMIN";
  const isSuper = role === "SUPER_ADMIN";

  useEffect(() => {
    if (state.status === "in" && !allowed) router.replace("/");
  }, [state, allowed, router]);

  const { data, error, loading, reload } = useResource<PaymentsResponse>(
    allowed ? "/payments" : null,
  );
  if (!allowed) return null;
  const items = data?.items ?? [];
  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(
    new Date(),
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Pagos</h1>
          <p className="lede">
            Los pagos que has registrado. Para registrar uno nuevo, entra a{" "}
            {isSuper ? "Clientes" : "Mis clientes"} y usa “Registrar pago”.
          </p>
        </div>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={reload}>
            <IconRefresh />
            <span>Reintentar</span>
          </button>
        </div>
      ) : null}

      {data ? (
        <section className="kpis" aria-label="Resumen del mes">
          <div className="kpi">
            <span className="kpi__value">{formatMoney(data.monthTotal)}</span>
            <span className="kpi__label">Recibido en {monthName}</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">{data.monthCount}</span>
            <span className="kpi__label">
              {data.monthCount === 1 ? "pago registrado" : "pagos registrados"} este mes
            </span>
          </div>
        </section>
      ) : null}

      {loading && !data ? <p className="muted">Cargando pagos…</p> : null}

      {!loading && !error && items.length === 0 ? (
        <section className="note">
          <h2>Todavía no hay pagos registrados</h2>
          <p>
            Cuando recibas un pago de un cliente, regístralo desde su fila y aparecerá aquí.
          </p>
        </section>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Cliente</th>
                  <th scope="col" className="num-r">
                    Valor
                  </th>
                  <th scope="col">Forma de pago</th>
                  <th scope="col">Cubre hasta</th>
                  <th scope="col">Registró</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{formatDateUTC(p.paidAt)}</td>
                    <td>
                      <span className="strong">{p.tenant.name}</span>
                      {isSuper ? <span className="sub">{p.tenant.distributor.companyName}</span> : null}
                    </td>
                    <td className="num-r strong">{formatMoney(p.amount)}</td>
                    <td>
                      {p.method}
                      {p.reference ? <span className="sub">Ref. {p.reference}</span> : null}
                    </td>
                    <td className="nowrap">{formatDateUTC(p.periodEnd)}</td>
                    <td>{p.recordedBy.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length >= 200 ? (
            <p className="muted">Se muestran los últimos 200 pagos.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
