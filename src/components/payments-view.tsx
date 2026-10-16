"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { IconRefresh } from "./icons";
import { useResource } from "@/lib/use-resource";
import { formatDateUTC, formatMoney, payStatus } from "@/lib/format";
import type { DistributorPaymentsResponse, PaymentsResponse } from "@/lib/types";

function monthName() {
  return new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(new Date());
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
        <IconRefresh />
        <span>Reintentar</span>
      </button>
    </div>
  );
}

function Totals({ total, count }: { total: number; count: number }) {
  return (
    <div className="kpis" role="group" aria-label="Resumen del mes">
      <div className="kpi">
        <span className="kpi__value">{formatMoney(total)}</span>
        <span className="kpi__label">Recibido en {monthName()}</span>
      </div>
      <div className="kpi">
        <span className="kpi__value">{count}</span>
        <span className="kpi__label">
          {count === 1 ? "pago registrado" : "pagos registrados"} este mes
        </span>
      </div>
    </div>
  );
}

// Pagos que los clientes le hacen a su distribuidor.
function TenantPayments({ isSuper }: { isSuper: boolean }) {
  const { data, error, loading, reload } = useResource<PaymentsResponse>("/payments");
  const items = data?.items ?? [];

  return (
    <section className="block" aria-labelledby="sec-clientes">
      <div className="block__head">
        <h2 id="sec-clientes">{isSuper ? "Pagos de clientes a distribuidores" : "Pagos de mis clientes"}</h2>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Para registrar uno nuevo, entra a {isSuper ? "Clientes" : "Mis clientes"} y usa “Registrar pago”.
      </p>

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {data ? <Totals total={data.monthTotal} count={data.monthCount} /> : null}
      {loading && !data ? <p className="muted">Cargando pagos…</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="muted">Todavía no hay pagos de clientes registrados.</p>
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
                    <td className="num-r">{formatMoney(p.amount)}</td>
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
          {items.length >= 200 ? <p className="muted">Se muestran los últimos 200 pagos.</p> : null}
        </>
      ) : null}
    </section>
  );
}

// Pagos que los distribuidores le hacen a la plataforma.
function DistributorPayments({ isSuper, paidUntil }: { isSuper: boolean; paidUntil: string | null }) {
  const { data, error, loading, reload } =
    useResource<DistributorPaymentsResponse>("/distributor-payments");
  const items = data?.items ?? [];
  const pay = payStatus(paidUntil);

  return (
    <section className="block" aria-labelledby="sec-dist">
      <div className="block__head">
        <h2 id="sec-dist">
          {isSuper ? "Pagos de distribuidores a EzerPro" : "Mi cuenta con EzerPro"}
        </h2>
      </div>
      {isSuper ? (
        <p className="muted" style={{ marginBottom: 14 }}>
          Para registrar uno nuevo, entra a Distribuidores y usa “Registrar pago”.
        </p>
      ) : (
        <p className={`callout`} role="status">
          <span className={`pay__label pay__label--${pay.tone}`}>{pay.label}</span> · {pay.detail}
        </p>
      )}

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
      {data && isSuper ? <Totals total={data.monthTotal} count={data.monthCount} /> : null}
      {loading && !data ? <p className="muted">Cargando pagos…</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="muted">
          {isSuper
            ? "Todavía no hay pagos de distribuidores registrados."
            : "Todavía no hay pagos registrados en tu cuenta."}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                {isSuper ? <th scope="col">Distribuidor</th> : null}
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
                  {isSuper ? (
                    <td>
                      <span className="strong">{p.distributor.companyName}</span>
                      <span className="sub">{p.distributor.domain}</span>
                    </td>
                  ) : null}
                  <td className="num-r">{formatMoney(p.amount)}</td>
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
      ) : null}
    </section>
  );
}

export function PaymentsView() {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === "in" ? state.user.role : null;
  const allowed = role === "SUPER_ADMIN" || role === "DISTRIBUTOR_ADMIN";
  const isSuper = role === "SUPER_ADMIN";

  useEffect(() => {
    if (state.status === "in" && !allowed) router.replace("/");
  }, [state, allowed, router]);

  if (!allowed || state.status !== "in") return null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Pagos</h1>
          <p className="lede">
            {isSuper
              ? "Lo que recibes de tus distribuidores y lo que ellos reciben de sus clientes."
              : "Lo que recibes de tus clientes y el estado de tu cuenta con EzerPro."}
          </p>
        </div>
      </header>

      {isSuper ? (
        <>
          <DistributorPayments isSuper paidUntil={null} />
          <TenantPayments isSuper />
        </>
      ) : (
        <>
          <TenantPayments isSuper={false} />
          <DistributorPayments isSuper={false} paidUntil={state.user.distributor?.paidUntil ?? null} />
        </>
      )}
    </div>
  );
}
