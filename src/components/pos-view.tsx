"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { productImageUrl } from "@/lib/image";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import type { CashCurrent, DiningTable, MenuItem, MenuResponse } from "@/lib/types";
import { useSession } from "./session";
import { PayDialog } from "./pay-dialog";
import { NoAccess } from "./no-access";

type Kind = "mesa" | "recoger" | "domicilio";
const KINDS: { v: Kind; label: string }[] = [
  { v: "mesa", label: "En mesa" },
  { v: "recoger", label: "Para llevar" },
  { v: "domicilio", label: "Domicilio" },
];

export function PosView() {
  const { state } = useSession();
  const role = state.status === "in" ? state.user.role : null;
  const allowed = role === "TENANT_ADMIN" || role === "CASHIER" || role === "WAITER";
  const canCharge = role === "TENANT_ADMIN" || role === "CASHIER";
  const menu = useResource<MenuResponse>(allowed ? "/menu" : null);
  const tables = useResource<DiningTable[]>(allowed ? "/tables" : null);
  const cash = useResource<CashCurrent>(canCharge ? "/cash/current" : null);

  const [catId, setCatId] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [kind, setKind] = useState<Kind>("mesa");
  const [tableId, setTableId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const fee = kind === "domicilio" ? menu.data?.deliveryFee ?? 0 : 0;
  const total = lines.reduce((s, l) => s + l.qty * l.item.price, 0) + fee;

  const activeCats = useMemo(() => new Set((menu.data?.categories ?? []).filter((c) => c.active).map((c) => c.id)), [menu.data]);
  const items = useMemo(
    () =>
      (menu.data?.items ?? []).filter(
        (i) => i.active && (!i.categoryId || activeCats.has(i.categoryId)) && (catId === "all" || (catId === "otros" ? !i.categoryId : i.categoryId === catId)),
      ),
    [menu.data, activeCats, catId],
  );

  if (state.status === "in" && !allowed) return <NoAccess />;

  const activeTables = (tables.data ?? []).filter((t) => t.active);
  const shiftOpen = cash.data?.open === true;

  function add(item: MenuItem, d: number) {
    setMsg(null);
    setCart((c) => {
      const qty = (c[item.id]?.qty ?? 0) + d;
      const next = { ...c };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = { item, qty: Math.min(qty, 50) };
      return next;
    });
  }

  function body(pay?: { method: string; received?: number }) {
    return JSON.stringify({
      type: kind,
      tableId: kind === "mesa" ? tableId : undefined,
      customerName: name.trim() || undefined,
      phone: kind === "domicilio" ? phone : undefined,
      address: kind === "domicilio" ? address : undefined,
      note: note.trim() || undefined,
      items: lines.map((l) => ({ itemId: l.item.id, quantity: l.qty })),
      pay,
    });
  }

  function check(): string | null {
    if (lines.length === 0) return "Agrega productos al pedido.";
    if (kind === "mesa" && !tableId) return "Elige la mesa.";
    if (kind === "domicilio" && (phone.replace(/\D/g, "").length < 7 || address.trim().length < 5)) return "Escribe el teléfono y la dirección.";
    return null;
  }

  function reset() {
    setCart({});
    setName("");
    setPhone("");
    setAddress("");
    setNote("");
  }

  async function send() {
    const problem = check();
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(true);
    setMsg(null);
    try {
      const o = await api<{ number: number }>("/orders", { method: "POST", body: body() });
      setMsg({ ok: true, text: `Pedido #${o.number} enviado. Queda por cobrar.` });
      reset();
      tables.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "No se pudo enviar el pedido." });
    } finally {
      setBusy(false);
    }
  }

  function startCharge() {
    const problem = check();
    if (problem) return setMsg({ ok: false, text: problem });
    setMsg(null);
    setPaying(true);
  }

  async function charge(method: string, received?: number) {
    const o = await api<{ number: number; change: number }>("/orders", { method: "POST", body: body({ method, received }) });
    setPaying(false);
    setMsg({ ok: true, text: `Pedido #${o.number} cobrado.${o.change ? ` Cambio: ${formatMoney(o.change)}.` : ""}` });
    reset();
    cash.reload();
    tables.reload();
  }

  const cats = menu.data?.categories.filter((c) => c.active) ?? [];
  const hasLoose = (menu.data?.items ?? []).some((i) => i.active && !i.categoryId);

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1>Vender</h1>
          <p className="lede">Toca los productos para armar el pedido.</p>
        </div>
        {canCharge && cash.data ? (
          shiftOpen ? <span className="badge badge--ok">Caja abierta</span> : <Link href="/caja" className="btn btn--secondary btn--sm">Caja cerrada: ábrela para cobrar</Link>
        ) : null}
      </header>

      {menu.error ? <div className="banner banner--error" role="alert"><span>{menu.error}</span></div> : null}

      <div className="pos">
        <section className="pos__menu" aria-label="Productos">
          <div className="chips" role="tablist" aria-label="Categorías">
            <button type="button" role="tab" aria-selected={catId === "all"} className={catId === "all" ? "is-on" : ""} onClick={() => setCatId("all")}>Todo</button>
            {cats.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={catId === c.id} className={catId === c.id ? "is-on" : ""} onClick={() => setCatId(c.id)}>{c.name}</button>
            ))}
            {hasLoose ? <button type="button" role="tab" aria-selected={catId === "otros"} className={catId === "otros" ? "is-on" : ""} onClick={() => setCatId("otros")}>Otros</button> : null}
          </div>
          <div className="pos__grid">
            {items.map((i) => {
              const q = cart[i.id]?.qty ?? 0;
              return (
                <button key={i.id} type="button" className={`pos__item${q ? " is-in" : ""}`} onClick={() => add(i, 1)} aria-label={`Agregar ${i.name}`}>
                  {i.img ? <img className="pos__img" src={productImageUrl(i.id, i.img) ?? ""} alt="" loading="lazy" /> : null}
                  <span className="pos__iname">{i.name}</span>
                  <span className="pos__iprice">{formatMoney(i.price)}</span>
                  {q ? <span className="pos__qty" aria-hidden="true">{q}</span> : null}
                </button>
              );
            })}
            {menu.data && items.length === 0 ? <p className="field__hint">No hay productos en esta categoría.</p> : null}
          </div>
        </section>

        <aside className="pos__ticket" aria-label="Pedido actual">
          <div className="seg seg--full" role="group" aria-label="Tipo de pedido">
            {KINDS.map((k) => (
              <button key={k.v} type="button" className={kind === k.v ? "is-on" : ""} aria-pressed={kind === k.v} onClick={() => { setKind(k.v); setMsg(null); }}>{k.label}</button>
            ))}
          </div>

          {kind === "mesa" ? (
            <div className="field">
              <label htmlFor="pos-table">Mesa</label>
              <select id="pos-table" value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Elige la mesa</option>
                {activeTables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.openOrders ? ` (${t.openOrders} abierto${t.openOrders > 1 ? "s" : ""})` : ""}</option>
                ))}
              </select>
              {tables.data && activeTables.length === 0 ? <p className="field__hint">No hay mesas. {role === "TENANT_ADMIN" ? <Link href="/mesas">Crea las mesas</Link> : "Pídele al administrador que las cree."}</p> : null}
            </div>
          ) : null}
          {kind === "domicilio" ? (
            <>
              <div className="field"><label htmlFor="pos-phone">Teléfono</label><input id="pos-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="field"><label htmlFor="pos-addr">Dirección</label><input id="pos-addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </>
          ) : null}
          <div className="field"><label htmlFor="pos-name">Nombre (opcional)</label><input id="pos-name" type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>

          <ul className="ticket__lines" aria-live="polite">
            {lines.length === 0 ? <li className="field__hint">Todavía no hay productos.</li> : null}
            {lines.map((l) => (
              <li key={l.item.id}>
                <span className="ticket__n">{l.item.name}</span>
                <span className="stepper" role="group" aria-label={`Cantidad de ${l.item.name}`}>
                  <button type="button" onClick={() => add(l.item, -1)} aria-label={`Quitar uno de ${l.item.name}`}>−</button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => add(l.item, 1)} aria-label={`Agregar uno de ${l.item.name}`}>+</button>
                </span>
                <span className="ticket__p">{formatMoney(l.qty * l.item.price)}</span>
              </li>
            ))}
          </ul>
          <div className="field"><label htmlFor="pos-note">Nota (opcional)</label><input id="pos-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {fee > 0 ? <p className="order__note" style={{ display: "flex", justifyContent: "space-between" }}><span>Domicilio</span><span>{formatMoney(fee)}</span></p> : null}
          <p className="order__total"><span>Total</span><strong>{formatMoney(total)}</strong></p>

          <div role="alert">{msg && !msg.ok ? <p className="form-error">{msg.text}</p> : null}</div>
          <div role="status">{msg?.ok ? <p className="form-ok">{msg.text}</p> : null}</div>

          <div className="ticket__actions">
            <button type="button" className="btn btn--secondary" onClick={send} disabled={busy}>Enviar a cocina</button>
            {canCharge ? (
              <button type="button" className="btn btn--primary" onClick={startCharge} disabled={busy || !shiftOpen} title={shiftOpen ? undefined : "Abre la caja para cobrar"}>
                Cobrar
              </button>
            ) : null}
          </div>
          {canCharge && !shiftOpen && cash.data ? <p className="field__hint">Para cobrar, primero <Link href="/caja">abre la caja</Link>.</p> : null}
          {lines.length > 0 ? <button type="button" className="linklike" onClick={reset}>Vaciar pedido</button> : null}
        </aside>
      </div>

      <PayDialog open={paying} title="Cobrar pedido" total={total} onClose={() => setPaying(false)} onConfirm={charge} />
    </div>
  );
}
