"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { PublicMenu, PublicTenant } from "@/lib/types";
import { Modal } from "./modal";
import { TenantBrand } from "./tenant-brand";
import { brandStyle } from "@/lib/brand";

type Item = PublicMenu["categories"][number]["items"][number];
type Placed = { id: string; number: number; total: number; status: string };

const STATUS_TEXT: Record<string, string> = {
  nuevo: "Recibido. Esperando confirmación del negocio.",
  preparando: "Lo están preparando.",
  listo: "¡Listo! Ya puedes recogerlo o está por salir.",
  en_camino: "Tu pedido va en camino.",
  entregado: "Entregado. ¡Gracias por tu pedido!",
  cancelado: "El negocio canceló este pedido. Llámalos para más información.",
};

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: se sigue funcionando */
  }
  return null;
}

export function Storefront({ tenant, tableCode, tableName }: { tenant: PublicTenant; tableCode?: string; tableName?: string }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const lsKey = `ezer_order_${host}${tableCode ? `_${tableCode}` : ""}`;
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, { item: Item; qty: number }>>({});
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"recoger" | "domicilio">("recoger");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMenu = useCallback(() => {
    api<PublicMenu>(`/public/menu?host=${encodeURIComponent(host)}`)
      .then((m) => {
        setMenu(m);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la carta."));
  }, [host]);

  useEffect(loadMenu, [loadMenu]);

  // Recupera el último pedido de este navegador para mostrar su estado.
  useEffect(() => {
    const id = store(lsKey);
    if (!id) return;
    api<Placed>(`/public/orders/${id}?host=${encodeURIComponent(host)}`)
      .then((o) => setPlaced({ ...o, id }))
      .catch(() => store(lsKey, ""));
  }, [host, lsKey]);

  // Mientras el pedido siga abierto, consulta su estado cada 10 segundos.
  useEffect(() => {
    if (!placed || placed.status === "entregado" || placed.status === "cancelado") return;
    const t = setInterval(() => {
      api<Placed>(`/public/orders/${placed.id}?host=${encodeURIComponent(host)}`)
        .then((o) => setPlaced((p) => (p ? { ...p, ...o } : p)))
        .catch(() => undefined);
    }, 10000);
    return () => clearInterval(t);
  }, [placed, host]);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.item.price, 0);
  const fee = !tableCode && type === "domicilio" ? menu?.deliveryFee ?? 0 : 0;
  const total = subtotal + fee;
  const canOrder = !!menu?.available && menu.acceptingOrders;

  function add(item: Item, delta: number) {
    setCart((c) => {
      const qty = (c[item.id]?.qty ?? 0) + delta;
      const next = { ...c };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = { item, qty: Math.min(qty, 50) };
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!tableCode) {
      if (name.trim().length < 2) return setFormErr("Escribe tu nombre.");
      if (!/^\+?[0-9 ]{7,16}$/.test(phone.trim())) return setFormErr("Escribe un teléfono válido, solo números.");
      if (type === "domicilio" && address.trim().length < 5) return setFormErr("Escribe la dirección de entrega.");
    }
    setFormErr(null);
    setBusy(true);
    try {
      const o = await api<Placed>("/public/orders", {
        method: "POST",
        body: JSON.stringify({
          host,
          tableCode,
          customerName: name.trim() || undefined,
          phone: tableCode ? undefined : phone,
          type: tableCode ? undefined : type,
          address: !tableCode && type === "domicilio" ? address : undefined,
          note: note.trim() || undefined,
          items: lines.map((l) => ({ itemId: l.item.id, quantity: l.qty })),
        }),
      });
      store(lsKey, o.id);
      setPlaced(o);
      setCart({});
      setNote("");
      setOpen(false);
    } catch (x) {
      setFormErr(x instanceof ApiError ? x.message : "No se pudo enviar el pedido.");
      if (x instanceof ApiError && x.status === 409) loadMenu();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop" style={brandStyle(tenant.brandColor)}>
      <header className="shop__head">
        <div>
          {tenant.logo ? <TenantBrand name={tenant.name} logo={tenant.logo} tone="light" /> : <h1>{tenant.name}</h1>}
        </div>
        {tableCode ? (
          <span className="badge badge--info">{tableName}</span>
        ) : (
          <Link href="/login" className="shop__login">
            Soy el dueño
          </Link>
        )}
      </header>

      {placed ? (
        <div className="shop__order" role="status">
          <strong>Tu pedido #{placed.number}</strong>
          <span>{STATUS_TEXT[placed.status] ?? placed.status}</span>
          <span>Total: {formatMoney(placed.total)}</span>
        </div>
      ) : null}

      {error ? (
        <p className="shop__msg" role="alert">{error}</p>
      ) : !menu ? (
        <p className="shop__msg">Cargando la carta…</p>
      ) : !menu.available ? (
        <p className="shop__msg">Este negocio no está disponible por el momento.</p>
      ) : (
        <>
          {!menu.acceptingOrders ? (
            <p className="shop__msg shop__msg--warn" role="status">
              Por ahora no estamos recibiendo pedidos por internet. Puedes ver la carta.
            </p>
          ) : null}
          {menu.categories.length === 0 ? <p className="shop__msg">La carta se está preparando.</p> : null}
          {menu.categories.map((c) => (
            <section key={c.id} className="shop__cat" aria-label={c.name}>
              <h2>{c.name}</h2>
              <ul className="shop__items">
                {c.items.map((i) => {
                  const qty = cart[i.id]?.qty ?? 0;
                  return (
                    <li key={i.id} className="shop__item">
                      <div className="shop__info">
                        <span className="shop__name">{i.name}</span>
                        {i.description ? <span className="shop__desc">{i.description}</span> : null}
                        <span className="shop__price">{formatMoney(i.price)}</span>
                      </div>
                      {canOrder ? (
                        qty === 0 ? (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => add(i, 1)}>
                            Agregar
                          </button>
                        ) : (
                          <div className="stepper" role="group" aria-label={`Cantidad de ${i.name}`}>
                            <button type="button" onClick={() => add(i, -1)} aria-label={`Quitar uno de ${i.name}`}>−</button>
                            <span aria-live="polite">{qty}</span>
                            <button type="button" onClick={() => add(i, 1)} aria-label={`Agregar uno de ${i.name}`}>+</button>
                          </div>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {count > 0 ? (
        <div className="shop__bar">
          <button type="button" className="btn btn--primary btn--block" onClick={() => setOpen(true)}>
            Ver mi pedido · {count} {count === 1 ? "producto" : "productos"} · {formatMoney(total)}
          </button>
        </div>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} noValidate>
          <h2 id="dlg-title" tabIndex={-1}>Tu pedido</h2>
          <ul className="order__lines">
            {lines.map((l) => (
              <li key={l.item.id}>
                <span>{l.qty} × {l.item.name}</span>
                <span>{formatMoney(l.qty * l.item.price)}</span>
              </li>
            ))}
          </ul>
          {fee > 0 ? <p className="order__note" style={{ display: "flex", justifyContent: "space-between" }}><span>Domicilio</span><span>{formatMoney(fee)}</span></p> : null}
          <p className="order__total"><span>Total</span><strong>{formatMoney(total)}</strong></p>

          {tableCode ? (
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="o-name">Tu nombre (opcional)</label>
              <input id="o-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="field__hint">Tu pedido llega directo a la cocina, para la {tableName}.</p>
            </div>
          ) : (
            <>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="o-name">Tu nombre</label>
            <input id="o-name" type="text" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setFormErr(null); }} />
          </div>
          <div className="field">
            <label htmlFor="o-phone">Teléfono</label>
            <input id="o-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setFormErr(null); }} />
          </div>
          <fieldset className="shop__type">
            <legend>¿Cómo lo quieres?</legend>
            <label><input type="radio" name="o-type" checked={type === "recoger"} onChange={() => setType("recoger")} /> Lo recojo</label>
            <label><input type="radio" name="o-type" checked={type === "domicilio"} onChange={() => setType("domicilio")} /> A domicilio</label>
          </fieldset>
          {type === "domicilio" ? (
            <div className="field">
              <label htmlFor="o-addr">Dirección de entrega</label>
              <input id="o-addr" type="text" autoComplete="street-address" value={address} onChange={(e) => { setAddress(e.target.value); setFormErr(null); }} />
            </div>
          ) : null}
            </>
          )}
          <div className="field">
            <label htmlFor="o-note">Nota (opcional)</label>
            <input id="o-note" type="text" placeholder="Sin cebolla, bien cocido…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="field__hint">{tableCode ? "El pago lo haces en la caja." : "El pago se acuerda directamente con el negocio."}</p>
          <div role="alert" className="form-error-slot">
            {formErr ? <p className="form-error">{formErr}</p> : null}
          </div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>Seguir pidiendo</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviar pedido"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
