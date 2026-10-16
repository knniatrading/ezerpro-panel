"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney, PAY_LABEL } from "@/lib/format";
import Link from "next/link";
import { PayDialog } from "./pay-dialog";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import type { Order, OrdersResponse } from "@/lib/types";

const LABEL: Record<Order["status"], string> = {
  nuevo: "Nuevo",
  preparando: "Preparando",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const TONE: Record<Order["status"], string> = {
  nuevo: "info",
  preparando: "warn",
  listo: "ok",
  en_camino: "info",
  entregado: "ok",
  cancelado: "warn",
};
const NEXT_BASE: Partial<Record<Order["status"], { to: Order["status"]; label: string }>> = {
  nuevo: { to: "preparando", label: "Aceptar y preparar" },
  preparando: { to: "listo", label: "Marcar listo" },
  listo: { to: "entregado", label: "Marcar entregado" },
};

function hour(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(iso));
}

export function OrdersView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role !== "DRIVER";
  const [scope, setScope] = useState<"open" | "all">("open");
  const { data, error, reload } = useResource<OrdersResponse>(allowed ? `/orders?scope=${scope}` : null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Order | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const canCharge = state.status === "in" && (state.user.role === "TENANT_ADMIN" || state.user.role === "CASHIER");

  // Se actualiza solo cada 15 segundos para que lleguen los pedidos nuevos.
  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  async function setStatus(o: Order, status: Order["status"]) {
    setBusyId(o.id);
    setErr(null);
    try {
      await api(`/orders/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setBusyId(null);
      reload();
    }
  }

  if (state.status === "in" && !allowed) return <NoAccess />;

  const open = (data?.counts.nuevo ?? 0) + (data?.counts.preparando ?? 0) + (data?.counts.listo ?? 0) + (data?.counts.en_camino ?? 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Pedidos</h1>
          <p className="lede">Se actualiza solo. Los más antiguos aparecen primero.</p>
        </div>
        <div className="seg" role="tablist" aria-label="Ver">
          <button type="button" role="tab" aria-selected={scope === "open"} className={scope === "open" ? "is-on" : ""} onClick={() => setScope("open")}>
            Abiertos{data ? ` (${open})` : ""}
          </button>
          <button type="button" role="tab" aria-selected={scope === "all"} className={scope === "all" ? "is-on" : ""} onClick={() => setScope("all")}>
            Historial
          </button>
        </div>
      </header>

      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {err ? <div className="banner banner--error" role="alert"><span>{err}</span></div> : null}

      {data && data.items.length === 0 ? (
        <section className="note">
          <h2>{scope === "open" ? "No hay pedidos abiertos" : "Todavía no hay pedidos"}</h2>
          <p>Cuando un cliente pida desde tu página, el pedido aparece aquí.</p>
        </section>
      ) : null}

      {note ? <div className="banner" role="status"><span>{note}</span></div> : null}

      <div className="orders">
        {data?.items.map((o) => {
          const isDom = o.type === "domicilio";
          // En un domicilio, después de "listo" el reparto se maneja en Domicilios.
          const next = isDom && (o.status === "listo" || o.status === "en_camino") ? undefined : NEXT_BASE[o.status];
          const canCancel = o.status === "nuevo" || o.status === "preparando" || o.status === "listo";
          return (
            <article className="order" key={o.id} aria-label={`Pedido ${o.number}`}>
              <header className="order__head">
                <strong>#{o.number}</strong>
                <span className={`badge badge--${TONE[o.status]}`}>{LABEL[o.status]}</span>
                <span className="order__time">{hour(o.createdAt)}</span>
              </header>
              <p className="order__who">
                {o.customerName}
                {o.phone ? <> · <a href={`tel:${o.phone.replace(/\s/g, "")}`}>{o.phone}</a></> : null}
              </p>
              <p className="order__type">
                {o.type === "mesa"
                  ? `En mesa: ${o.tableName ?? "—"}`
                  : o.type === "domicilio"
                    ? `A domicilio: ${o.address}`
                    : o.source === "pos"
                      ? "Para llevar"
                      : "Para recoger en el local"}
              </p>
              <ul className="order__lines">
                {o.items.map((l) => (
                  <li key={l.id}>
                    <span>{l.quantity} × {l.name}</span>
                    <span>{formatMoney(l.unitPrice * l.quantity)}</span>
                  </li>
                ))}
              </ul>
              {o.note ? <p className="order__note">Nota: {o.note}</p> : null}
              {o.type === "domicilio" ? (
                <p className="order__note">
                  Domiciliario: {o.driverName ?? "sin asignar"}
                  {o.deliveryFee ? ` · Domicilio ${formatMoney(o.deliveryFee)}` : ""}
                  {isDom && (o.status === "listo" || o.status === "en_camino") && canCharge ? <> · <Link href="/domicilios">Ir a Domicilios</Link></> : null}
                </p>
              ) : null}
              <p className="order__total"><span>Total</span><strong>{formatMoney(o.total)}</strong></p>
              <p className="order__pay">
                {o.paymentStatus === "pagado" ? (
                  <span className="badge badge--ok">Pagado · {PAY_LABEL[o.paymentMethod ?? "otro"] ?? o.paymentMethod}</span>
                ) : o.status === "cancelado" ? null : (
                  <span className="badge badge--warn">Por cobrar</span>
                )}
              </p>
              {next || canCancel || (canCharge && o.paymentStatus === "pendiente" && o.status !== "cancelado") ? (
                <div className="actions-cell">
                  {canCharge && o.paymentStatus === "pendiente" && o.status !== "cancelado" ? (
                    <button type="button" className="btn btn--secondary btn--sm" disabled={busyId === o.id} onClick={() => { setNote(null); setPayFor(o); }}>
                      Cobrar
                    </button>
                  ) : null}
                  {next ? (
                    <button type="button" className="btn btn--primary btn--sm" disabled={busyId === o.id} onClick={() => setStatus(o, next.to)}>
                      {next.label}
                    </button>
                  ) : null}
                  {canCancel && o.paymentStatus !== "pagado" ? (
                    <button type="button" className="btn btn--danger-ghost btn--sm" disabled={busyId === o.id} onClick={() => setStatus(o, "cancelado")}>
                      Cancelar pedido
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <PayDialog
        open={payFor !== null}
        title={payFor ? `Cobrar pedido #${payFor.number}` : "Cobrar"}
        total={payFor?.total ?? 0}
        onClose={() => setPayFor(null)}
        onConfirm={async (method, received) => {
          if (!payFor) return;
          const r = await api<{ change: number }>(`/orders/${payFor.id}/pay`, { method: "POST", body: JSON.stringify({ method, received }) });
          setNote(`Pedido #${payFor.number} cobrado.${r.change ? ` Cambio: ${formatMoney(r.change)}.` : ""}`);
          setPayFor(null);
          reload();
        }}
      />
    </div>
  );
}
