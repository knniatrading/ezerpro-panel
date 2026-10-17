"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney, parsePesos } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { RIDE_STATUS, downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import type { PublicDriver, PublicRide, PublicTenant, RideSummaryRow } from "@/lib/types";
import { Modal } from "./modal";

const LS = (host: string) => `ezer-rides:${host}`;
function readTokens(host: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(LS(host)) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function saveToken(host: string, token: string) {
  try { localStorage.setItem(LS(host), JSON.stringify([token, ...readTokens(host).filter((t) => t !== token)].slice(0, 50))); } catch { /* sin almacenamiento */ }
}
const PHONE_KEY = "ezer-rides:me";
function readMe(): { name: string; phone: string } {
  try { const v = JSON.parse(localStorage.getItem(PHONE_KEY) ?? "{}"); return { name: String(v.name ?? ""), phone: String(v.phone ?? "") }; } catch { return { name: "", phone: "" }; }
}

function RequestForm({ host, d, serviceId, onClose }: { host: string; d: PublicDriver; serviceId: string; onClose: () => void }) {
  const me = readMe();
  const [svc, setSvc] = useState(serviceId);
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [notes, setNotes] = useState("");
  const [offerTxt, setOfferTxt] = useState("");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const offer = parsePesos(offerTxt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (!/^\d{7,15}$/.test(phone.replace(/\D/g, ""))) return setErr("Escribe tu número de celular.");
    if (pickup.trim().length < 3) return setErr("Escribe dónde te recoge.");
    if (dropoff.trim().length < 3) return setErr("Escribe a dónde vas.");
    setBusy(true);
    try {
      const r = await api<{ token: string; number: number }>("/public/rides", {
        method: "POST",
        body: JSON.stringify({ host, serviceId: svc || null, name: name.trim(), phone: phone.replace(/\D/g, ""), pickup: pickup.trim(), dropoff: dropoff.trim(), notes: notes.trim() || null, extraIds, offer: offer || null }),
      });
      saveToken(host, r.token);
      try { localStorage.setItem(PHONE_KEY, JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, "") })); } catch { /* sin almacenamiento */ }
      window.location.href = `/viaje?t=${r.token}`;
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  const clear = () => setErr(null);
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pedir un servicio</h2>
      <p className="lede">{d.name} te responderá con un precio. Tú decides si lo aceptas o propones otro.</p>
      {d.services?.length ? (
        <div className="field"><label htmlFor="q-svc">Servicio</label>
          <select id="q-svc" value={svc} onChange={(e) => setSvc(e.target.value)}>
            <option value="">Viaje normal</option>
            {d.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
      ) : null}
      <div className="field"><label htmlFor="q-pick">¿Dónde te recoge?</label><input id="q-pick" type="text" value={pickup} autoComplete="off" onChange={(e) => { setPickup(e.target.value); clear(); }} /></div>
      <div className="field"><label htmlFor="q-drop">¿A dónde vas?</label><input id="q-drop" type="text" value={dropoff} autoComplete="off" onChange={(e) => { setDropoff(e.target.value); clear(); }} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="q-name">Tu nombre</label><input id="q-name" type="text" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); clear(); }} /></div>
        <div className="field"><label htmlFor="q-phone">Tu celular</label><input id="q-phone" type="tel" inputMode="numeric" value={phone} autoComplete="tel" onChange={(e) => { setPhone(e.target.value); clear(); }} /></div>
      </div>
      {d.extras?.length ? (
        <fieldset className="field"><legend>Extras</legend>
          {d.extras.map((x) => (
            <label key={x.id} className="check"><input type="checkbox" checked={extraIds.includes(x.id)} onChange={(e) => setExtraIds(e.target.checked ? [...extraIds, x.id] : extraIds.filter((i) => i !== x.id))} /> {x.name} (+{formatMoney(x.amount)})</label>
          ))}
        </fieldset>
      ) : null}
      <div className="field"><label htmlFor="q-notes">Nota (opcional)</label><input id="q-notes" type="text" maxLength={300} value={notes} autoComplete="off" onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="field"><label htmlFor="q-offer">¿Cuánto ofreces? (opcional)</label><input id="q-offer" type="text" inputMode="numeric" value={offerTxt} autoComplete="off" onChange={(e) => setOfferTxt(e.target.value)} />
        <p className="field__hint">{offer ? formatMoney(offer) : "Si lo dejas vacío, el conductor te cotiza."}</p></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
      </div>
    </form>
  );
}

export function DriverCardPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicDriver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ serviceId: string } | null>(null);
  const [mine, setMine] = useState<RideSummaryRow[]>([]);

  useEffect(() => {
    api<PublicDriver>(`/public/driver?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la tarjeta."));
    const tokens = readTokens(host);
    if (tokens.length) api<RideSummaryRow[]>("/public/rides/lookup", { method: "POST", body: JSON.stringify({ host, tokens }) }).then(setMine).catch(() => setMine([]));
  }, [host]);

  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la tarjeta</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;

  const photo = d.img ? `/api/public/driver-photo?host=${encodeURIComponent(host)}&v=${d.img}` : null;
  const saveContact = () => d.phone && downloadText(`${d.name}.vcf`, vcard({ name: `${d.name} (${d.vehicleType}${d.plate ? " " + d.plate : ""})`, phone: d.phone, org: tenant.name, url: window.location.origin }), "text/vcard");

  return (
    <div className="dcard" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        {photo ? <img className="dcard__photo" src={photo} alt={`Foto de ${d.name}`} /> : <span className="dcard__photo dcard__photo--empty" aria-hidden="true">{d.name.charAt(0)}</span>}
        <h1>{d.name}</h1>
        <p className="dcard__veh">{d.vehicleType}{d.vehicleDesc ? ` · ${d.vehicleDesc}` : ""}</p>
        {d.plate ? <span className="dcard__plate">{d.plate}</span> : null}
        <span className={`badge badge--${d.available ? "ok" : "warn"}`}>{d.available ? "Disponible" : "No disponible por ahora"}</span>
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
        {d.phone ? (
          <div className="dcard__contact">
            <a className="btn btn--secondary btn--sm" href={`tel:${d.phone}`}>Llamar</a>
            <a className="btn btn--secondary btn--sm" href={`https://wa.me/${waNumber(d.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <button type="button" className="btn btn--secondary btn--sm" onClick={saveContact}>Guardar contacto</button>
          </div>
        ) : null}
      </header>

      <section className="dcard__sec">
        <button type="button" className="btn btn--primary dcard__cta" disabled={!d.available} onClick={() => setForm({ serviceId: "" })}>Pedir un servicio ahora</button>
        {!d.available ? <p className="field__hint">El conductor no recibe solicitudes en este momento.</p> : null}
      </section>

      {d.services?.length ? (
        <section className="dcard__sec">
          <h2>Servicios</h2>
          <ul className="dcard__list">
            {d.services.map((s) => (
              <li key={s.id}>
                <div><b>{s.name}</b>{s.description ? <p>{s.description}</p> : null}<span className="field__hint">{s.price ? formatMoney(s.price) : "Se cotiza según el recorrido"}</span></div>
                <button type="button" className="btn btn--secondary btn--sm" disabled={!d.available} onClick={() => setForm({ serviceId: s.id })}>Pedir</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dcard__sec">
        <h2>Tarifas</h2>
        <p>Base {formatMoney(d.baseFee ?? 0)} + {formatMoney(d.perKm ?? 0)} por kilómetro · mínimo {formatMoney(d.minFare ?? 0)}.</p>
        {d.extras?.length ? <p className="field__hint">Extras: {d.extras.map((x) => `${x.name} (+${formatMoney(x.amount)})`).join(", ")}</p> : null}
      </section>

      {mine.length ? (
        <section className="dcard__sec">
          <h2>Mis viajes con {d.name}</h2>
          <ul className="dcard__list">
            {mine.map((r) => (
              <li key={r.token}>
                <div><b>#{r.number} · {r.serviceName ?? "Viaje"}</b><p>{r.pickup} → {r.dropoff}</p><span className="field__hint">{RIDE_STATUS[r.status]?.label ?? r.status}{r.finalPrice ?? r.price ? ` · ${formatMoney((r.finalPrice ?? r.price) as number)}` : ""}</span></div>
                <Link className="btn btn--secondary btn--sm" href={`/viaje?t=${r.token}`}>Ver</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="dcard__foot"><Link href="/login">Soy el conductor</Link><span>Con tecnología de EzerPro</span></footer>

      <Modal open={form !== null} onClose={() => setForm(null)}>
        {form ? <RequestForm host={host} d={d} serviceId={form.serviceId} onClose={() => setForm(null)} /> : null}
      </Modal>
    </div>
  );
}

export function TripView() {
  const [token, setToken] = useState<string | null>(null);
  const [host, setHost] = useState("");
  const [r, setR] = useState<PublicRide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(false);
  const [offerTxt, setOfferTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setHost(window.location.hostname);
    setToken(new URLSearchParams(window.location.search).get("t") ?? "");
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try { setR(await api<PublicRide>(`/public/rides/${token}?host=${encodeURIComponent(host)}`)); setError(null); }
    catch (x) { setError(x instanceof ApiError ? x.message : "No se pudo cargar el servicio."); }
  }, [token, host]);

  useEffect(() => {
    if (!token || !host) return;
    void load();
    const t = setInterval(() => { if (!document.hidden) void load(); }, 6000);
    return () => clearInterval(t);
  }, [token, host, load]);

  async function post(action: "offer" | "accept" | "cancel", body: object = {}) {
    setBusy(true);
    setError(null);
    try { setR(await api<PublicRide>(`/public/rides/${token}/${action}`, { method: "POST", body: JSON.stringify({ host, ...body }) })); setCounter(false); setConfirmCancel(false); }
    catch (x) { setError(x instanceof ApiError ? x.message : "Algo salió mal."); void load(); }
    finally { setBusy(false); }
  }

  if (token === "") return <div className="landing"><div className="landing__card"><h1>Enlace no válido</h1><Link href="/">Volver</Link></div></div>;
  if (!r) return <div className="boot" role="status"><span className="boot__text">{error ?? "Cargando…"}</span></div>;
  const st = RIDE_STATUS[r.status] ?? { label: r.status, tone: "info" as const };
  const negotiating = r.status === "solicitado" || r.status === "negociando";
  const offer = parsePesos(offerTxt);
  const msg: Record<string, string> = {
    solicitado: r.price && r.offeredBy === "pasajero" ? "Esperando que el conductor responda a tu oferta." : "Solicitud enviada. El conductor te dará un precio en un momento.",
    negociando: r.offeredBy === "conductor" ? "El conductor te propone un precio." : "Esperando que el conductor responda a tu oferta.",
    aceptado: "¡Precio acordado! El conductor irá por ti.",
    en_curso: "Tu servicio está en curso.",
    completado: "Servicio terminado. ¡Gracias!",
    cancelado: r.cancelledBy === "conductor" ? "El conductor canceló este servicio." : "Cancelaste este servicio.",
  };

  return (
    <div className="dcard trip">
      <header className="dcard__hero">
        <p className="landing__eyebrow">Servicio #{r.number}{r.serviceName ? ` · ${r.serviceName}` : ""}</p>
        <span className={`badge badge--${st.tone === "muted" ? "info" : st.tone}`}>{st.label}</span>
        <p className="trip__msg" role="status">{msg[r.status] ?? ""}</p>
      </header>
      <section className="dcard__sec">
        <p><b>De:</b> {r.pickup}<br /><b>A:</b> {r.dropoff}</p>
        {r.notes ? <p className="field__hint">“{r.notes}”</p> : null}
        {r.extras.length ? <p className="field__hint">Extras: {r.extras.map((e) => e.name).join(", ")}</p> : null}
        {r.price || r.finalPrice ? <p className="trip__price">{r.status === "completado" ? "Total" : r.status === "aceptado" || r.status === "en_curso" ? "Precio acordado" : r.offeredBy === "conductor" ? "Precio del conductor" : "Tu oferta"}: <b>{formatMoney((r.status === "completado" ? r.finalPrice ?? r.price : r.price) ?? 0)}</b>{r.km ? ` · ${r.km} km` : ""}</p> : null}
      </section>
      {negotiating && r.price && r.offeredBy === "conductor" ? (
        <section className="dcard__sec">
          <button type="button" className="btn btn--primary dcard__cta" disabled={busy} onClick={() => post("accept")}>Aceptar {formatMoney(r.price)}</button>
        </section>
      ) : null}
      {negotiating ? (
        <section className="dcard__sec">
          {counter ? (
            <form onSubmit={(e) => { e.preventDefault(); if (offer) void post("offer", { amount: offer }); }} noValidate>
              <div className="field"><label htmlFor="t-offer">Tu oferta (pesos)</label><input id="t-offer" type="text" inputMode="numeric" value={offerTxt} autoComplete="off" onChange={(e) => setOfferTxt(e.target.value)} /><p className="field__hint">{offer ? formatMoney(offer) : "Sin puntos ni comas"}</p></div>
              <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setCounter(false)}>Volver</button><button type="submit" className="btn btn--primary" disabled={busy || !offer}>Enviar oferta</button></div>
            </form>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={() => setCounter(true)}>{r.price ? "Proponer otro precio" : "Ofrecer un precio"}</button>
          )}
        </section>
      ) : null}
      {r.offers.length > 1 ? (
        <section className="dcard__sec"><h2>Negociación</h2><ul className="dcard__list">{r.offers.map((o, i) => <li key={i}><span>{o.by === "conductor" ? r.driver.name : "Tú"}: <b>{formatMoney(o.amount)}</b>{o.note ? ` — ${o.note}` : ""}</span></li>)}</ul></section>
      ) : null}
      <section className="dcard__sec">
        <h2>Tu conductor</h2>
        <p><b>{r.driver.name}</b> · {r.driver.vehicleType}{r.driver.vehicleDesc ? ` ${r.driver.vehicleDesc}` : ""}{r.driver.plate ? <> · <span className="dcard__plate dcard__plate--sm">{r.driver.plate}</span></> : null}</p>
        {r.driver.phone ? <div className="dcard__contact"><a className="btn btn--secondary btn--sm" href={`tel:${r.driver.phone}`}>Llamar {formatPhone(r.driver.phone)}</a><a className="btn btn--secondary btn--sm" href={`https://wa.me/${waNumber(r.driver.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a></div> : null}
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {r.status !== "en_curso" && r.status !== "completado" && r.status !== "cancelado" ? (
        <section className="dcard__sec">
          {confirmCancel ? (
            <div className="dialog__actions"><button className="btn btn--secondary" onClick={() => setConfirmCancel(false)}>No, volver</button><button className="btn btn--danger-ghost" disabled={busy} onClick={() => post("cancel")}>Sí, cancelar</button></div>
          ) : <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setConfirmCancel(true)}>Cancelar servicio</button>}
        </section>
      ) : null}
      <footer className="dcard__foot"><Link href="/">← Volver a la tarjeta</Link><span>Con tecnología de EzerPro</span></footer>
    </div>
  );
}
