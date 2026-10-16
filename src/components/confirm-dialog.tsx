"use client";

import { Modal } from "./modal";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 id="dlg-title" tabIndex={-1}>
        {title}
      </h2>
      <p className="lede">{message}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={busy}>
          {busy ? "Un momento…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
