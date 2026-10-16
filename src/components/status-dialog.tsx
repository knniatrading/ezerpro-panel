"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "./modal";

export interface StatusTarget {
  kind: "tenant" | "distributor";
  id: string;
  name: string;
  next: "suspended" | "active";
}

/** Confirma suspender o reactivar un cliente o un distribuidor. */
export function StatusDialog({
  target,
  onClose,
  onDone,
}: {
  target: StatusTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setBusy(false);
    setError(null);
  }, [target?.id, target?.next]);

  if (!target) {
    return <Modal open={false} onClose={onClose}>{null}</Modal>;
  }

  const suspending = target.next === "suspended";
  const isDist = target.kind === "distributor";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !target) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/${target.kind === "tenant" ? "tenants" : "distributors"}/${target.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: target.next,
          reason: suspending && reason.trim() ? reason.trim() : undefined,
        }),
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo salió mal. Inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <h2 id="dlg-title" tabIndex={-1}>
          {suspending ? "Suspender" : "Reactivar"} {isDist ? "distribuidor" : "cliente"}
        </h2>
        <p className="lede">
          {suspending
            ? isDist
              ? `${target.name} y todos sus clientes perderán el acceso de inmediato. Podrás reactivarlo cuando quieras.`
              : `${target.name} perderá el acceso de inmediato: nadie de ese negocio podrá entrar. Podrás reactivarlo cuando quieras.`
            : `${target.name} volverá a tener acceso de inmediato.`}
        </p>

        {suspending ? (
          <div className="field">
            <label htmlFor="s-reason">Motivo (opcional)</label>
            <input
              id="s-reason"
              type="text"
              maxLength={200}
              autoComplete="off"
              placeholder="Falta de pago, a solicitud del cliente…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}

        <div role="alert" className="form-error-slot">
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className={`btn ${suspending ? "btn--danger" : "btn--primary"}`}
            disabled={busy}
          >
            {busy ? "Guardando…" : suspending ? "Suspender" : "Reactivar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
