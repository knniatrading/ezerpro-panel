"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { formatMoney, PAY_LABEL, parsePesos } from "@/lib/format";
import { Modal } from "./modal";

const METHODS = ["efectivo", "tarjeta", "transferencia", "otro"] as const;

/** Cobro: forma de pago y, en efectivo, cuánto entrega el cliente y cuánto se le devuelve. */
export function PayDialog({
  open,
  title,
  total,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  total: number;
  onClose: () => void;
  onConfirm: (method: string, received?: number) => Promise<void>;
}) {
  const [method, setMethod] = useState<string>("efectivo");
  const [receivedTxt, setReceivedTxt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const received = parsePesos(receivedTxt);
  const change = method === "efectivo" && received >= total ? received - total : 0;

  async function go() {
    if (busy) return;
    if (method === "efectivo" && receivedTxt && received < total) {
      return setErr("El valor recibido es menor que el total.");
    }
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(method, method === "efectivo" && receivedTxt ? received : undefined);
      setReceivedTxt("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo cobrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 id="dlg-title" tabIndex={-1}>{title}</h2>
      <p className="paytotal"><span>Total a cobrar</span><strong>{formatMoney(total)}</strong></p>
      <fieldset className="shop__type">
        <legend>Forma de pago</legend>
        <div className="pay-methods">
          {METHODS.map((m) => (
            <label key={m} className={method === m ? "is-on" : ""}>
              <input type="radio" name="pay-method" checked={method === m} onChange={() => { setMethod(m); setErr(null); }} />
              {PAY_LABEL[m]}
            </label>
          ))}
        </div>
      </fieldset>
      {method === "efectivo" ? (
        <div className="field">
          <label htmlFor="pay-received">¿Cuánto entrega el cliente? (opcional)</label>
          <input id="pay-received" type="text" inputMode="numeric" autoComplete="off" value={receivedTxt} onChange={(e) => { setReceivedTxt(e.target.value); setErr(null); }} />
          <p className="field__hint" role="status">
            {receivedTxt && received >= total ? `Devuelve ${formatMoney(change)}` : receivedTxt ? "Falta para completar el total" : "Si lo escribes, calculo el cambio."}
          </p>
        </div>
      ) : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn--primary" onClick={go} disabled={busy}>{busy ? "Cobrando…" : "Confirmar cobro"}</button>
      </div>
    </Modal>
  );
}
