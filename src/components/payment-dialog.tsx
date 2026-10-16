"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import {
  addMonthsUTC,
  formatDateUTC,
  formatMoney,
  todayISO,
} from "@/lib/format";
import type { Distributor, PayTarget, RegisterPaymentResult, Tenant } from "@/lib/types";
import { Modal } from "./modal";
import { StatusBadge } from "./status-badge";

export function tenantTarget(t: Tenant): PayTarget {
  return {
    kind: "tenant",
    id: t.id,
    name: t.name,
    subtitle: t.address,
    status: t.status,
    paidUntil: t.paidUntil,
  };
}

export function distributorTarget(d: Distributor): PayTarget {
  return {
    kind: "distributor",
    id: d.id,
    name: d.companyName,
    subtitle: d.domain,
    status: d.status,
    paidUntil: d.paidUntil,
  };
}

const METHODS = ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Tarjeta", "Consignación"];
const MONTHS = [1, 2, 3, 6, 12];

interface Errors {
  amount?: string;
  method?: string;
  paidAt?: string;
}

export function PaymentDialog({
  target: tenant,
  onClose,
  onDone,
}: {
  target: PayTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const open = tenant !== null;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [months, setMonths] = useState(1);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [reactivate, setReactivate] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RegisterPaymentResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setMethod("");
    setMonths(1);
    setPaidAt(todayISO());
    setReference("");
    setNote("");
    setReactivate(true);
    setErrors({});
    setServerError(null);
    setBusy(false);
    setDone(null);
  }, [tenant?.id, open]);

  const amountNumber = Number(amount.replace(/\D/g, ""));

  // Hasta cuándo quedará pagado: igual que lo calcula el servidor.
  const preview = useMemo(() => {
    if (!tenant || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return null;
    const paid = new Date(`${paidAt}T12:00:00.000Z`);
    if (Number.isNaN(paid.getTime())) return null;
    const current = tenant.paidUntil ? new Date(tenant.paidUntil) : null;
    const start = current && current.getTime() > paid.getTime() ? current : paid;
    return addMonthsUTC(start, months);
  }, [tenant, paidAt, months]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !tenant) return;
    setServerError(null);

    const next: Errors = {};
    if (!Number.isInteger(amountNumber) || amountNumber <= 0)
      next.amount = "Escribe el valor recibido, solo números.";
    if (method.trim().length < 2) next.method = "Indica la forma de pago (puede ser cualquiera).";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || paidAt > todayISO())
      next.paidAt = "Elige la fecha en que recibiste el pago (no puede ser futura).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const result = await api<RegisterPaymentResult>(`/${tenant.kind === "tenant" ? "tenants" : "distributors"}/${tenant.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: amountNumber,
          method: method.trim(),
          months,
          paidAt,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
          reactivate: tenant.status === "suspended" ? reactivate : undefined,
        }),
      });
      setDone(result);
      onDone();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      {tenant && done ? (
        <div>
          <h2 id="dlg-title" tabIndex={-1}>
            Pago registrado
          </h2>
          <p className="lede">
            Se guardó el pago de {formatMoney(done.payment.amount)} de {tenant.name}.
          </p>
          <dl className="cred">
            <div>
              <dt>Pagado hasta</dt>
              <dd>{formatDateUTC(done.tenant.paidUntil)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <StatusBadge status={done.tenant.status} />
              </dd>
            </div>
          </dl>
          <div className="dialog__actions">
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Listo
            </button>
          </div>
        </div>
      ) : tenant ? (
        <form onSubmit={onSubmit} noValidate>
          <h2 id="dlg-title" tabIndex={-1}>
            Registrar pago
          </h2>
          <p className="lede">
            {tenant.name} · {tenant.subtitle}
          </p>

          <div className="field-row">
            <div className="field">
              <label htmlFor="p-amount">Valor recibido (COP)</label>
              <input
                id="p-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="80000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((er) => ({ ...er, amount: undefined }));
                }}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? "p-amount-err" : "p-amount-hint"}
              />
              {errors.amount ? (
                <p id="p-amount-err" className="field__error">
                  {errors.amount}
                </p>
              ) : (
                <p id="p-amount-hint" className="field__hint">
                  {amountNumber > 0 ? formatMoney(amountNumber) : "Sin puntos ni signos."}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="p-months">Meses que cubre</label>
              <select id="p-months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? "mes" : "meses"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="p-method">Forma de pago</label>
              <input
                id="p-method"
                type="text"
                list="p-methods"
                autoComplete="off"
                placeholder="Nequi, efectivo…"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setErrors((er) => ({ ...er, method: undefined }));
                }}
                aria-invalid={errors.method ? true : undefined}
                aria-describedby={errors.method ? "p-method-err" : undefined}
              />
              <datalist id="p-methods">
                {METHODS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              {errors.method ? (
                <p id="p-method-err" className="field__error">
                  {errors.method}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="p-date">Fecha del pago</label>
              <input
                id="p-date"
                type="date"
                max={todayISO()}
                value={paidAt}
                onChange={(e) => {
                  setPaidAt(e.target.value);
                  setErrors((er) => ({ ...er, paidAt: undefined }));
                }}
                aria-invalid={errors.paidAt ? true : undefined}
                aria-describedby={errors.paidAt ? "p-date-err" : undefined}
              />
              {errors.paidAt ? (
                <p id="p-date-err" className="field__error">
                  {errors.paidAt}
                </p>
              ) : null}
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-ref">Referencia (opcional)</label>
            <input
              id="p-ref"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder="Número de transferencia, recibo…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="p-note">Nota (opcional)</label>
            <textarea
              id="p-note"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {preview ? (
            <p className="callout" role="status">
              Quedará pagado hasta el <strong>{formatDateUTC(preview)}</strong>.
            </p>
          ) : null}

          {tenant.status === "suspended" ? (
            <label className="check">
              <input
                type="checkbox"
                checked={reactivate}
                onChange={(e) => setReactivate(e.target.checked)}
              />
              <span>
                {tenant.kind === "tenant"
                  ? "Reactivar el servicio de este cliente al registrar el pago."
                  : "Reactivar a este distribuidor (y a sus clientes) al registrar el pago."}
              </span>
            </label>
          ) : null}

          <div role="alert" className="form-error-slot">
            {serverError ? <p className="form-error">{serverError}</p> : null}
          </div>

          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
