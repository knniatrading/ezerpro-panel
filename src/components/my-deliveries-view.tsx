"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { MyDelivery } from "@/lib/types";

export function MyDeliveriesView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "DRIVER";
  const { data, error, reload } = useResource<{ items: MyDelivery[]; deliveredToday: number }>(allowed ? "/my/deliveries" : null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  if (state.status === "in" && !allowed) return <NoAccess />;

  async function move(o: MyDelivery, status: "en_camino" | "entregado") {
    setBusy(o.id);
    setErr(null);
    try {
      await api(`/my/deliveries/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo actualizar.");
    } finally {
      setBusy(null);
      reload();
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Mis entregas</h1>
          <p className="lede">Entregadas hoy: {data?.deliveredToday ?? 0}</p>
        </div>
      </header>
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}
      {data && data.items.length === 0 ? (
        <section className="note">
          <h2>No tienes entregas por ahora</h2>
          <p>Cuando te asignen un domicilio, aparece aquí.</p>
        </section>
      ) : null}
      <div className="orders">
        {data?.items.map((o) => (
          <article className="order" key={o.id} aria-label={`Entrega ${o.number}`}>
            <header className="order__head">
              <strong>#{o.number}</strong>
              <span className={`badge badge--${o.status === "en_camino" ? "info" : o.status === "listo" ? "ok" : "warn"}`}>
                {o.status === "en_camino" ? "En camino" : o.status === "listo" ? "Listo para recoger" : "En cocina"}
              </span>
            </header>
            <p className="order__who">
              {o.customerName}
              {o.phone ? <> · <a href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a></> : null}
            </p>
            <p className="order__type">{o.address}</p>
            <ul className="order__lines">
              {o.items.map((l) => (
                <li key={l.id}><span>{l.quantity} × {l.name}</span></li>
              ))}
            </ul>
            {o.note ? <p className="order__note">Nota: {o.note}</p> : null}
            <p className="order__pay">
              {o.paymentStatus === "pagado" ? (
                <span className="badge badge--ok">Ya pagado</span>
              ) : (
                <span className="badge badge--warn">Cobrar al entregar: {formatMoney(o.total)}</span>
              )}
            </p>
            <div className="actions-cell">
              {o.status === "listo" ? (
                <button type="button" className="btn btn--primary btn--sm" disabled={busy === o.id} onClick={() => move(o, "en_camino")}>
                  Salí con el pedido
                </button>
              ) : null}
              {o.status === "en_camino" ? (
                <button type="button" className="btn btn--primary btn--sm" disabled={busy === o.id} onClick={() => move(o, "entregado")}>
                  Entregado
                </button>
              ) : null}
            </div>
            {o.status === "nuevo" || o.status === "preparando" ? <p className="field__hint">Espera a que la cocina lo marque listo.</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
