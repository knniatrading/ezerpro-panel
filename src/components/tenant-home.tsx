"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useSession } from "./session";
import { formatMoney, parsePesos } from "@/lib/format";
import { tenantOrigin } from "@/lib/tenant-url";
import type { MenuResponse, OrdersResponse } from "@/lib/types";

export function TenantHome() {
  const { state } = useSession();
  const orders = useResource<OrdersResponse>(state.status === "in" && state.user.role !== "DRIVER" ? "/orders" : null);
  const menu = useResource<MenuResponse>(state.status === "in" && state.user.role === "TENANT_ADMIN" ? "/menu" : null);
  const [origin, setOrigin] = useState("");
  const [note, setNote] = useState("");
  const [accepting, setAccepting] = useState<boolean | null>(null);
  const [fee, setFee] = useState("");
  const [feeMsg, setFeeMsg] = useState("");

  const tenantHost = state.status === "in" ? state.user.tenant?.host : undefined;
  useEffect(() => setOrigin(tenantOrigin(tenantHost)), [tenantHost]);
  useEffect(() => {
    if (menu.data) {
      setAccepting(menu.data.acceptingOrders);
      setFee(String(menu.data.deliveryFee ?? 0));
    }
  }, [menu.data]);
  useEffect(() => {
    const t = setInterval(orders.reload, 20000);
    return () => clearInterval(t);
  }, [orders.reload]);

  if (state.status !== "in") return null;
  if (state.user.role === "DRIVER") {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <h1>Hola, {state.user.name ?? state.user.email}</h1>
            <p className="lede">Aquí verás tus entregas asignadas.</p>
            <p><Link href="/entregas" className="btn btn--primary btn--sm">Ver mis entregas</Link></p>
          </div>
        </header>
      </div>
    );
  }
  const c = orders.data?.counts ?? {};

  async function toggle(next: boolean) {
    setNote("");
    setAccepting(next); // se ve el cambio al instante; si falla, se devuelve
    try {
      await api("/menu/settings", { method: "PATCH", body: JSON.stringify({ acceptingOrders: next }) });
    } catch (e) {
      setAccepting(!next);
      setNote(e instanceof ApiError ? e.message : "No se pudo guardar.");
    }
  }

  async function saveFee() {
    setFeeMsg("");
    const n = parsePesos(fee);
    if (n > 100000) return setFeeMsg("Escribe un valor entre $0 y $100.000.");
    try {
      await api("/menu/settings", { method: "PATCH", body: JSON.stringify({ deliveryFee: n }) });
      setFee(String(n));
      setFeeMsg(n === 0 ? "Listo: domicilio sin costo." : `Listo: el domicilio cuesta ${formatMoney(n)}.`);
    } catch (e) {
      setFeeMsg(e instanceof ApiError ? e.message : "No se pudo guardar.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(origin);
      setNote("Enlace copiado");
    } catch {
      setNote("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Hola, {state.user.tenant?.name}</h1>
          <p className="lede">Así va tu negocio hoy.</p>
        </div>
      </header>

      <div className="kpis" role="group" aria-label="Pedidos">
        <Link href="/pedidos" className="kpi kpi--link">
          <span className="kpi__value">{c.nuevo ?? 0}</span>
          <span className="kpi__label">{(c.nuevo ?? 0) === 1 ? "pedido nuevo" : "pedidos nuevos"}</span>
        </Link>
        <Link href="/pedidos" className="kpi kpi--link">
          <span className="kpi__value">{(c.preparando ?? 0) + (c.listo ?? 0) + (c.en_camino ?? 0)}</span>
          <span className="kpi__label">en preparación, listos o en camino</span>
        </Link>
        <div className="kpi">
          <span className="kpi__value">{c.entregado ?? 0}</span>
          <span className="kpi__label">entregados en total</span>
        </div>
      </div>

      {state.user.role === "TENANT_ADMIN" ? (
        <section className="account-card" style={{ marginBottom: 20 }}>
          <h2>Pedidos por internet</h2>
          <label className="switch">
            <input
              type="checkbox"
              checked={accepting ?? true}
              disabled={accepting === null}
              onChange={(e) => toggle(e.target.checked)}
            />
            <span>{accepting === false ? "Pausado: tus clientes no pueden pedir" : "Recibiendo pedidos"}</span>
          </label>
          <p className="field__hint" style={{ marginTop: 14 }}>
            Esta es la dirección de tu carta. Compártela con tus clientes:
          </p>
          <p className="mono" style={{ margin: "6px 0 10px" }}>
            {origin}
          </p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>
            Copiar enlace
          </button>
          <p role="status" className="field__hint" style={{ marginTop: 8, minHeight: "1.4em" }}>
            {note}
          </p>
        </section>
      ) : null}

      {state.user.role === "TENANT_ADMIN" ? (
        <section className="account-card" style={{ marginBottom: 20 }}>
          <h2>Costo de domicilio</h2>
          <p className="field__hint">Se suma al total de los pedidos a domicilio. Pon 0 si no lo cobras.</p>
          <div className="field" style={{ maxWidth: 240, marginTop: 10 }}>
            <label htmlFor="fee">Valor en pesos</label>
            <input id="fee" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={saveFee}>Guardar costo</button>
          <p role="status" className="field__hint" style={{ marginTop: 8, minHeight: "1.4em" }}>{feeMsg}</p>
        </section>
      ) : null}
    </div>
  );
}
