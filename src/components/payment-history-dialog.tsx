"use client";

import { Modal } from "./modal";
import { useResource } from "@/lib/use-resource";
import { formatDateUTC, formatMoney } from "@/lib/format";
import type { PayTarget, Payment } from "@/lib/types";

export function PaymentHistoryDialog({
  target: tenant,
  onClose,
}: {
  target: PayTarget | null;
  onClose: () => void;
}) {
  const { data, error, loading } = useResource<Payment[]>(
    tenant ? `/${tenant.kind === "tenant" ? "tenants" : "distributors"}/${tenant.id}/payments` : null,
  );
  const list = data ?? [];

  return (
    <Modal open={tenant !== null} onClose={onClose} wide>
      {tenant ? (
        <div>
          <h2 id="dlg-title" tabIndex={-1}>
            Pagos de {tenant.name}
          </h2>
          <p className="lede">{tenant.subtitle}</p>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {loading && !data ? <p className="muted">Cargando pagos…</p> : null}
          {!loading && !error && list.length === 0 ? (
            <p className="muted">Todavía no hay pagos registrados.</p>
          ) : null}

          {list.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col" className="num-r">
                      Valor
                    </th>
                    <th scope="col">Forma</th>
                    <th scope="col">Cubre hasta</th>
                    <th scope="col">Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="nowrap">{formatDateUTC(p.paidAt)}</td>
                      <td className="num-r">{formatMoney(p.amount)}</td>
                      <td>
                        {p.method}
                        {p.reference ? <span className="sub">Ref. {p.reference}</span> : null}
                        {p.note ? <span className="sub">{p.note}</span> : null}
                      </td>
                      <td className="nowrap">
                        {formatDateUTC(p.periodEnd)}
                        <span className="sub">
                          {p.months} {p.months === 1 ? "mes" : "meses"}
                        </span>
                      </td>
                      <td>{p.recordedBy.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="dialog__actions">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
