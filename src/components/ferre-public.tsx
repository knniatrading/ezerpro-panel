"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { brandStyle } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { fmtQty, lineTotal, parseQty } from "@/lib/ferre";
import type { FerreCatalog, PublicFerre, PublicTenant } from "@/lib/types";
import { Modal } from "./modal";

export const FERRE_LS = (host: string) => `ezer-ferre:${host}`;
export function readAccountToken(host: string): string { try { return localStorage.getItem(FERRE_LS(host)) ?? ""; } catch { return ""; } }
export function saveAccountToken(host: string, t: string) { try { localStorage.setItem(FERRE_LS(host), t); } catch { /* sin almacenamiento */ } }

function LookupDialog({ host, onClose }: { host: string; onClose: () => void }) {
  const router = useRouter();
  const [doc, setDoc] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (doc.trim().length < 4) return setErr("Escribe tu cédula o NIT.");
    if (phone.replace(/\D/g, "").length < 7) return setErr("Escribe el celular con el que te registraron.");
    setBusy(true); setErr(null);
    try {
      const r = await api<{ token: string }>("/public/ferre-lookup", { method: "POST", body: JSON.stringify({ host, document: doc, phone }) });
      saveAccountToken(host, r.token);
      router.push(`/mi-cuenta?t=${r.token}`);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Mi cuenta de crédito</h2>
      <p className="lede">Escribe tu cédula o NIT y el celular con el que te registraron en la ferretería.</p>
      <div className="field"><label htmlFor="lk-d">Cédula o NIT</label><input id="lk-d" type="text" value={doc} autoComplete="off" onChange={(e) => { setDoc(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="lk-p">Celular</label><input id="lk-p" type="tel" inputMode="numeric" value={phone} autoComplete="tel" onChange={(e) => { setPhone(e.target.value); setErr(null); }} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Buscando…" : "Ver mi cuenta"}</button></div>
    </form>
  );
}

export function FerrePublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicFerre | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    api<PublicFerre>(`/public/ferre?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
    setToken(readAccountToken(host));
  }, [host]);
  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const phone = d.phone ?? "";
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name, phone, org: d.name, url: window.location.origin }), "text/vcard");
  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🔨</span>
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        <Link className="btn btn--primary tech__big" href="/catalogo">Ver catálogo y hacer pedido<small>{d.products ? `${d.products} productos` : "Precios y disponibilidad"}</small></Link>
        {token ? <Link className="btn btn--secondary tech__big" href={`/mi-cuenta?t=${token}`}>Mi cuenta de crédito</Link> : <button type="button" className="btn btn--secondary tech__big" onClick={() => setLookup(true)}>Mi cuenta de crédito<small>Con tu cédula y tu celular</small></button>}
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      <section className="dcard__sec" aria-label="Cómo funciona"><h2>Tu ferretería en tu celular</h2>
        <ul className="tl-bullets"><li>🧱 Mira los productos y sus precios sin ir a la tienda.</li><li>🛒 Haz tu pedido y recíbelo a domicilio o recógelo en la tienda.</li><li>💳 Maestros y constructores: revisa tu saldo, tus facturas y tus abonos.</li></ul></section>
      {d.demoAccountUrl || d.demoQuoteUrl ? <p className="field__hint" style={{ textAlign: "center" }}>{d.demoQuoteUrl ? <><a href={d.demoQuoteUrl}>Ver una cotización de ejemplo</a><br /></> : null}{d.demoAccountUrl ? <a href={d.demoAccountUrl}>Ver la cuenta de un contratista de ejemplo</a> : null}</p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={lookup} onClose={() => setLookup(false)}>{lookup ? <LookupDialog host={host} onClose={() => setLookup(false)} /> : null}</Modal>
    </div>
  );
}

type CartLine = { id: string; name: string; unit: string; price: number; qty: string };

function RequestDialog({ host, lines, total, onClose, onDone }: { host: string; lines: CartLine[]; total: number; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ number: number; url: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (phone.replace(/\D/g, "").length < 7) return setErr("Escribe tu celular para enviarte la cotización.");
    setBusy(true); setErr(null);
    try {
      const r = await api<{ number: number; url: string }>("/public/ferre-quote-request", { method: "POST", body: JSON.stringify({ host, name: name.trim(), phone: phone.trim(), note: note.trim() || undefined, items: lines.map((l) => ({ productId: l.id, qty: parseQty(l.qty) })) }) });
      setSent(r); onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  if (sent) {
    const path = (() => { try { return new URL(sent.url).search; } catch { return ""; } })();
    return <div><h2 id="dlg-title" tabIndex={-1}>¡Solicitud enviada!</h2><p role="status">La ferretería revisará tu lista y te enviará la cotización #{sent.number} por WhatsApp o llamada.</p><p className="field__hint">Puedes ver tu solicitud aquí:</p><div className="dialog__actions"><a className="btn btn--secondary" href={`/cotizacion${path}`}>Ver mi solicitud</a><button className="btn btn--primary" onClick={onClose}>Listo</button></div></div>;
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pedir cotización</h2>
      <p className="lede">{lines.length} {lines.length === 1 ? "producto" : "productos"} · precio de referencia {formatMoney(total)}</p>
      <div className="field-row">
        <div className="field"><label htmlFor="rq-n">Tu nombre</label><input id="rq-n" type="text" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
        <div className="field"><label htmlFor="rq-p">Tu celular</label><input id="rq-p" type="tel" inputMode="numeric" value={phone} autoComplete="tel" onChange={(e) => { setPhone(e.target.value); setErr(null); }} /></div>
      </div>
      <div className="field"><label htmlFor="rq-no">¿Para qué obra? (opcional)</label><input id="rq-no" type="text" maxLength={300} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button></div>
    </form>
  );
}

function OrderDialog({ host, lines, total, onClose, onDone }: { host: string; lines: CartLine[]; total: number; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<"domicilio" | "recoger">("recoger");
  const [address, setAddress] = useState("");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ number: number; url: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (phone.replace(/\D/g, "").length < 7) return setErr("Escribe tu celular para avisarte cuando esté listo.");
    if (delivery === "domicilio" && address.trim().length < 5) return setErr("Escribe la dirección de entrega.");
    setBusy(true); setErr(null);
    try {
      const r = await api<{ number: number; url: string }>("/public/ferre-order", { method: "POST", body: JSON.stringify({ host, name: name.trim(), phone: phone.trim(), delivery, address: delivery === "domicilio" ? address.trim() : undefined, payMethod, note: note.trim() || undefined, items: lines.map((l) => ({ productId: l.id, qty: parseQty(l.qty) })) }) });
      setSent(r); onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  if (sent) {
    const path = (() => { try { return new URL(sent.url).search; } catch { return ""; } })();
    return <div><h2 id="dlg-title" tabIndex={-1}>¡Pedido enviado!</h2><p role="status">Tu pedido #{sent.number} llegó a la ferretería. {delivery === "domicilio" ? "Te lo llevarán a la dirección indicada." : "Pasa a recogerlo cuando te avisen."}</p><p className="field__hint">Guarda este enlace para ver cómo va tu pedido:</p><div className="dialog__actions"><a className="btn btn--secondary" href={`/pedido${path}`}>Ver mi pedido</a><button className="btn btn--primary" onClick={onClose}>Listo</button></div></div>;
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Hacer pedido</h2>
      <p className="lede">{lines.length} {lines.length === 1 ? "producto" : "productos"} · total {formatMoney(total)}</p>
      <div className="field-row">
        <div className="field"><label htmlFor="od-n">Tu nombre</label><input id="od-n" type="text" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setErr(null); }} /></div>
        <div className="field"><label htmlFor="od-p">Tu celular</label><input id="od-p" type="tel" inputMode="numeric" value={phone} autoComplete="tel" onChange={(e) => { setPhone(e.target.value); setErr(null); }} /></div>
      </div>
      <div className="chips" role="group" aria-label="Entrega"><button type="button" className={delivery === "recoger" ? "is-on" : ""} aria-pressed={delivery === "recoger"} onClick={() => setDelivery("recoger")}>Recoger en la tienda</button><button type="button" className={delivery === "domicilio" ? "is-on" : ""} aria-pressed={delivery === "domicilio"} onClick={() => setDelivery("domicilio")}>Domicilio</button></div>
      {delivery === "domicilio" ? <div className="field"><label htmlFor="od-a">Dirección de entrega</label><input id="od-a" type="text" maxLength={200} value={address} autoComplete="street-address" onChange={(e) => { setAddress(e.target.value); setErr(null); }} /></div> : null}
      <div className="field"><label htmlFor="od-m">¿Cómo pagas?</label><select id="od-m" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option></select></div>
      <div className="field"><label htmlFor="od-no">Nota (opcional)</label><input id="od-no" type="text" maxLength={300} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviar pedido"}</button></div>
    </form>
  );
}

export function FerreCatalogView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<FerreCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState(false);
  const [ord, setOrd] = useState(false);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  useEffect(() => { api<FerreCatalog>(`/public/ferre-catalog?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar el catálogo.")); }, [host]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (d?.products ?? []).filter((p) => (!cat || p.category === cat) && (!t || p.name.toLowerCase().includes(t)));
  }, [d, q, cat]);
  if (error) return <div className="landing"><div className="landing__card"><h1>Catálogo</h1><p className="landing__text" role="alert">{error}</p><p className="field__hint"><Link href="/">← Volver</Link></p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  const total = cart.reduce((s, l) => { const n = parseQty(l.qty); return s + (n > 0 ? lineTotal(n, l.price) : 0); }, 0);
  const valid = cart.length > 0 && cart.every((l) => parseQty(l.qty) > 0);
  function add(p: FerreCatalog["products"][number]) {
    const n = parseQty(qtys[p.id] ?? "1");
    if (!(n > 0) || (p.unitKind === "unidad" && !Number.isInteger(n))) return;
    setCart((c) => { const i = c.findIndex((x) => x.id === p.id); if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], qty: String(parseQty(cp[i].qty) + n).replace(".", ",") }; return cp; } return [...c, { id: p.id, name: p.name, unit: p.unit, price: p.price, qty: String(n).replace(".", ",") }]; });
    setQtys((s) => ({ ...s, [p.id]: "" }));
  }
  return (
    <div className="dcard vetpage fe-catalog">
      <header className="dcard__hero"><h1>{d.shop.name}</h1><p className="dcard__veh">Catálogo de productos</p><p className="field__hint"><Link href="/">← Inicio</Link></p></header>
      <div className="field"><label htmlFor="ct-q" className="sr-only">Buscar</label><input id="ct-q" type="search" value={q} placeholder="Buscar producto…" autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips" role="group" aria-label="Categorías"><button type="button" className={!cat ? "is-on" : ""} onClick={() => setCat("")}>Todo</button>{d.categories.map((c) => <button key={c} type="button" className={cat === c ? "is-on" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
      <ul className="dcard__list fe-catalog__list">
        {rows.map((p) => (
          <li key={p.id}><div><b>{p.name}</b><p>{formatMoney(p.price)} <small>por {p.unit}</small> · <span className={p.available ? "is-ok" : "is-out"}>{p.available ? "Disponible" : "Agotado"}</span></p></div>
            <div className="fe-add"><input type="text" inputMode="decimal" aria-label={`Cantidad de ${p.name}`} placeholder="1" value={qtys[p.id] ?? ""} onChange={(e) => setQtys((s) => ({ ...s, [p.id]: e.target.value }))} /><button type="button" className="btn btn--secondary btn--sm" onClick={() => add(p)} aria-label={`Agregar ${p.name} al pedido`}>Agregar</button></div></li>
        ))}
      </ul>
      {!rows.length ? <p className="field__hint">No encontramos productos con esa búsqueda.</p> : null}
      <p className="landing__foot">Haz tu pedido y la ferretería te lo lleva o lo deja listo para recoger. Los precios pueden cambiar.</p>
      {cart.length ? <div className="fe-cartbar"><button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>Mi lista ({cart.length}) · {formatMoney(total)}</button></div> : null}
      <Modal open={open} onClose={() => setOpen(false)}>{open ? (
        <div>
          <h2 id="dlg-title" tabIndex={-1}>Mi pedido</h2>
          <ul className="dcard__list">{cart.map((l, i) => (
            <li key={l.id}><div><b>{l.name}</b><p>{formatMoney(l.price)} por {l.unit}</p></div>
              <div className="fe-add"><input type="text" inputMode="decimal" aria-label={`Cantidad de ${l.name}`} value={l.qty} onChange={(e) => setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /><span>{l.unit}</span><button type="button" className="btn btn--danger-ghost btn--sm" aria-label={`Quitar ${l.name}`} onClick={() => setCart((c) => c.filter((_, j) => j !== i))}>✕</button></div></li>
          ))}</ul>
          <p className="fe-sum"><span>Total</span> <strong>{formatMoney(total)}</strong></p>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>Seguir buscando</button><button type="button" className="btn btn--primary" disabled={!valid} onClick={() => { setOpen(false); setOrd(true); }}>Hacer pedido</button></div>
          <p className="field__hint" style={{ textAlign: "center" }}>¿Solo quieres saber el precio? <button type="button" className="linklike" disabled={!valid} onClick={() => { setOpen(false); setReq(true); }}>Pedir una cotización</button></p>
        </div>
      ) : null}</Modal>
      <Modal open={ord} onClose={() => setOrd(false)}>{ord ? <OrderDialog host={host} lines={cart} total={total} onClose={() => setOrd(false)} onDone={() => setCart([])} /> : null}</Modal>
      <Modal open={req} onClose={() => setReq(false)}>{req ? <RequestDialog host={host} lines={cart} total={total} onClose={() => setReq(false)} onDone={() => setCart([])} /> : null}</Modal>
      <span hidden>{fmtQty(0)}</span>
    </div>
  );
}
