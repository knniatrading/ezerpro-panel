"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "./icons";

/** Ventana emergente accesible: Esc la cierra, el foco queda dentro, clic afuera la cierra. */
export function Modal({
  open,
  onClose,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const first = dialog.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
      (first ?? dialog.querySelector<HTMLElement>("#dlg-title"))?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? " dialog--wide" : ""}`}
      aria-labelledby="dlg-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="dialog__body">
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
