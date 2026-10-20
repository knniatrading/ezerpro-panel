"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "./modal";
import type { Tenant } from "@/lib/types";

type Council = { presidentId: string | null; members: { id: string; name: string | null; email: string; status: string }[] };

/** El distribuidor nombra otro presidente cuando el actual no está disponible. */
export function PresidentDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const [data, setData] = useState<Council | null>(null);
  const [to, setTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(null); setErr(null); setDone(false);
    if (!tenant) return;
    api<Council>(`/tenants/${tenant.id}/council`)
      .then((d) => { setData(d); setTo(d.members.find((m) => m.status === "active" && m.id !== d.presidentId)?.id ?? ""); })
      .catch((x) => setErr(x instanceof ApiError ? x.message : "No se pudo cargar el consejo."));
  }, [tenant]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!tenant || !to || busy) return;
    setBusy(true);
    try {
      await api(`/tenants/${tenant.id}/president`, { method: "POST", body: JSON.stringify({ userId: to }) });
      setDone(true);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
    }
    setBusy(false);
  }

  const current = data?.members.find((m) => m.id === data.presidentId);
  const options = (data?.members ?? []).filter((m) => m.status === "active" && m.id !== data?.presidentId);

  return (
    <Modal open={!!tenant} onClose={onClose}>
      {tenant ? (
        <form onSubmit={submit} noValidate>
          <h2 id="dlg-title" tabIndex={-1}>Presidente del consejo</h2>
          <p className="lede">{tenant.name}. Úsalo solo si el presidente actual no puede delegar la presidencia por sí mismo.</p>
          {data ? (
            <>
              <p>Presidente actual: <b>{current ? current.name ?? current.email : "Ninguno"}</b></p>
              {options.length === 0 ? (
                <p className="field__hint">No hay otros miembros activos del consejo. Pide al presidente (o al administrador, si aún no hay presidente) que cree uno primero.</p>
              ) : (
                <div className="field">
                  <label htmlFor="pr-to">Nuevo presidente</label>
                  <select id="pr-to" value={to} onChange={(e) => { setTo(e.target.value); setErr(null); setDone(false); }}>
                    {options.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                  </select>
                </div>
              )}
            </>
          ) : null}
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {done ? <p className="field__hint" role="status">Listo. El nuevo presidente ya puede manejar el equipo.</p> : null}
          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>{done ? "Cerrar" : "Cancelar"}</button>
            {options.length > 0 && !done ? <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Nombrar presidente"}</button> : null}
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
