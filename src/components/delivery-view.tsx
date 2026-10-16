"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { Driver, Order } from "@/lib/types";

function mins(from: string | null, to?: string | null) {
  if (!from) return null;
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(from).getTime()) / 60000));
}
const STATE_TEXT: Record<string, string> = {
  nuevo: "Nuevo",
  preparando: "En cocina",
  listo: "Listo para salir",
  en_camino: "En camino",
  entregado: "Entregado",
};

export function DeliveryView() {
  const { state } = useSession();
  const allowed = state.status === "in" && (state.user.role === "TENANT_ADMIN" || state.user.role === "CASHIER");
  const board = useResource<{ items: Order[] }>(allowed ? "/delivery/board" : null);
  const drivers = useResource<Driver[]>(allowed ? "/delivery/drivers" : null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);

  const reloadBoard = board.reload;
  const reloadDrivers = drivers.reload;
  useEffect(() => {
    const t = setInterval(() => {
      reloadBoard();
      reloadDrivers();
      tick((n) => n + 1);
    }, 15000);
    return () => clearInterval(t);
  }, [reloadBoard, reloadDrivers]);

  if (state.status === "in" && !allowed) return <NoAccess />;

  async function run(o: Order, fn: () => Promise<unknown>) {
    setBusy(o.id);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusy(null);
      reloadBoard();
      reloadDrivers();
    }
  }
  const assign = (o: Order, driverId: string | null) =>
    run(o, () => api(`/delivery/${o.id}/assign`, { method: "POST", body: JSON.stringify({ driverId }) }));
  const dispatch = (o: Order) =>
    run(o, () => api(`/orders/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "en_camino" }) }));
  const deliver = (o: Order) =>
    run(o, () => api(`/orders/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "entregado" }) }));

  const items = board.data?.items ?? [];
  const pending = items.filter((o) => ["nuevo", "preparando", "listo"].includes(o.status));
  const onWay = items.filter((o) => o.status === "en_camino");
  const done = items.filter((o) => o.status === "entregado");
  const noDrivers = drivers.data && drivers.data.length === 0;

  function card(o: Order) {
    const waiting = mins(o.createdAt, o.dispatchedAt ?? o.deliveredAt);
    return (
      <article className="order" key={o.id} aria-label={`Domicilio ${o.number}`}>
        <header className="order__head">
          <strong>#{o.number}</strong>
          <span className={`badge badge--${o.status === "en_camino" ? "info" : o.status === "listo" || o.status === "entregado" ? "ok" : "warn"}`}>
            {STATE_TEXT[o.status]}
          </span>
          {waiting !== null ? <span className="order__time">{waiting} min</span> : null}
        </header>
        <p className="order__who">
          {o.customerName}
          {o.phone ? <> · <a href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a></> : null}
        </p>
        <p className="order__type">{o.address}</p>
        <p className="order__note">
          {o.items.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
        </p>
        <p className="order__total"><span>Total</span><strong>{formatMoney(o.total)}</strong></p>
        <p className="order__pay">
          {o.paymentStatus === "pagado" ? <span className="badge badge--ok">Pagado</span> : <span className="badge badge--warn">Por cobrar</span>}
        </p>
        {o.status === "entregado" ? (
          <p className="order__note">
            Entregó: {o.driverName ?? "—"}
            {o.dispatchedAt && o.deliveredAt ? ` · trayecto ${mins(o.dispatchedAt, o.deliveredAt)} min` : ""}
          </p>
        ) : o.status === "en_camino" ? (
          <>
            <p className="order__note">
              Domiciliario: <strong>{o.driverName}</strong> · salió hace {mins(o.dispatchedAt) ?? 0} min
            </p>
            <div className="actions-cell">
              <button type="button" className="btn btn--secondary btn--sm" disabled={busy === o.id} onClick={() => deliver(o)}>
                Marcar entregado
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor={`drv-${o.id}`}>Domiciliario</label>
              <select
                id={`drv-${o.id}`}
                value={o.driverId ?? ""}
                disabled={busy === o.id}
                onChange={(e) => assign(o, e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {drivers.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(d.name ?? d.email)} ({d.openDeliveries} en curso)
                  </option>
                ))}
              </select>
            </div>
            <div className="actions-cell">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={busy === o.id || o.status !== "listo" || !o.driverId}
                onClick={() => dispatch(o)}
              >
                Despachar
              </button>
            </div>
            {o.status !== "listo" ? <p className="field__hint">Se puede despachar cuando la cocina lo marque listo.</p> : !o.driverId ? <p className="field__hint">Asigna un domiciliario para despachar.</p> : null}
          </>
        )}
      </article>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Domicilios</h1>
          <p className="lede">Asigna el domiciliario, despacha y sigue cada entrega. Se actualiza solo.</p>
        </div>
      </header>
      {board.error ? <div className="banner banner--error" role="alert"><span>{board.error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}
      {noDrivers ? (
        <div className="banner" role="status">
          <span>Aún no tienes domiciliarios. Créalos en Equipo con el rol Domiciliario.</span>
        </div>
      ) : null}

      <h2 className="section-title">Por despachar ({pending.length})</h2>
      {board.data && pending.length === 0 ? <p className="field__hint">No hay domicilios por despachar.</p> : null}
      <div className="orders">{pending.map(card)}</div>

      <h2 className="section-title" style={{ marginTop: 28 }}>En camino ({onWay.length})</h2>
      {board.data && onWay.length === 0 ? <p className="field__hint">Nadie está en la calle ahora.</p> : null}
      <div className="orders">{onWay.map(card)}</div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Entregados hoy ({done.length})</h2>
      <div className="orders">{done.map(card)}</div>
    </div>
  );
}
