"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { addDays, hourLabel, niceDate, timeCO, todayCO, weekdayName } from "@/lib/vet";
import type { PublicTenant, PublicVet } from "@/lib/types";
import { Modal } from "./modal";

type Svc = NonNullable<PublicVet["services"]>[number];
type Slot = { start: string; end?: string };

export const VET_LS = (host: string) => `ezer-vet:${host}`;
export function readOwnerToken(host: string): string {
  try { return localStorage.getItem(VET_LS(host)) ?? ""; } catch { return ""; }
}
export function saveOwnerToken(host: string, t: string) {
  try { localStorage.setItem(VET_LS(host), t); } catch { /* sin almacenamiento */ }
}

/** Pedir cita: servicio → día → hora → datos. Sirve para invitados y para dueños con portal (con su token y mascota). */
export function BookingForm({ host, services, ownerToken, pets, onClose, onDone }: {
  host: string; services: Svc[]; ownerToken?: string; pets?: { id: string; name: string }[]; onClose: () => void; onDone?: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(todayCO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState("");
  const [petId, setPetId] = useState(pets?.[0]?.id ?? "");
  const [f, setF] = useState({ name: "", phone: "", email: "", petName: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; serviceName: string } | null>(null);

  useEffect(() => {
    if (!serviceId || !date) return;
    let off = false;
    setSlots(null); setSlot("");
    api<{ slots: Slot[] }>(`/public/vet-slots?host=${encodeURIComponent(host)}&serviceId=${serviceId}&date=${date}`)
      .then((r) => { if (!off) setSlots(r.slots); })
      .catch((e) => { if (!off) { setSlots([]); setErr(e instanceof ApiError ? e.message : "No se pudieron cargar los horarios."); } });
    return () => { off = true; };
  }, [host, serviceId, date]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return setErr("Elige el servicio.");
    if (!slot) return setErr("Elige un horario.");
    const body: Record<string, unknown> = { host, serviceId, start: slot, notes: f.notes.trim() || null };
    if (ownerToken) { if (!petId) return setErr("Elige la mascota."); body.ownerToken = ownerToken; body.petId = petId; }
    else {
      if (f.name.trim().length < 2) return setErr("Escribe tu nombre.");
      if (!f.phone.trim()) return setErr("Escribe tu celular para confirmarte la cita.");
      if (!f.petName.trim()) return setErr("Escribe el nombre de tu mascota.");
      Object.assign(body, { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, petName: f.petName.trim() });
    }
    setBusy(true);
    try {
      const r = await api<{ start: string; serviceName: string }>("/public/vet-appointments", { method: "POST", body: JSON.stringify(body) });
      setDone(r);
      onDone?.();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }

  if (done) {
    return (
      <div>
        <h2 id="dlg-title" tabIndex={-1}>¡Cita solicitada!</h2>
        <p role="status">{done.serviceName} · {niceDate(date)} a las {timeCO(done.start)}.</p>
        <p className="lede">La clínica la confirmará pronto{!ownerToken ? " y te contactará al celular que dejaste" : ""}.</p>
        <div className="dialog__actions"><button type="button" className="btn btn--primary" onClick={onClose}>Listo</button></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pedir una cita</h2>
      <div className="field"><label htmlFor="bk-svc">Servicio</label><select id="bk-svc" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setErr(null); }}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.price ? ` · ${formatMoney(s.price)}` : ""}</option>)}</select></div>
      <div className="field"><label htmlFor="bk-date">Día</label><input id="bk-date" type="date" min={todayCO()} max={addDays(todayCO(), 90)} value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setErr(null); } }} /></div>
      <fieldset className="field"><legend>Hora</legend>
        {slots === null ? <p className="field__hint" role="status">Buscando horarios…</p> : slots.length === 0 ? <p className="field__hint">No hay horarios libres ese día. Prueba con otro.</p> : (
          <div className="chips">{slots.map((s) => <button type="button" key={s.start} className={slot === s.start ? "is-on" : ""} aria-pressed={slot === s.start} onClick={() => { setSlot(s.start); setErr(null); }}>{timeCO(s.start)}</button>)}</div>
        )}
      </fieldset>
      {ownerToken ? (
        <div className="field"><label htmlFor="bk-pet">Mascota</label><select id="bk-pet" value={petId} onChange={(e) => setPetId(e.target.value)}>{(pets ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      ) : (
        <>
          <div className="field"><label htmlFor="bk-name">Tu nombre</label><input id="bk-name" type="text" value={f.name} autoComplete="name" onChange={set("name")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="bk-phone">Tu celular</label><input id="bk-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="tel" onChange={set("phone")} /></div>
            <div className="field"><label htmlFor="bk-email">Correo (opcional)</label><input id="bk-email" type="email" value={f.email} autoComplete="email" onChange={set("email")} /></div>
          </div>
          <div className="field"><label htmlFor="bk-pet2">Nombre de tu mascota</label><input id="bk-pet2" type="text" value={f.petName} autoComplete="off" onChange={set("petName")} /></div>
        </>
      )}
      <div className="field"><label htmlFor="bk-notes">¿Algo que debamos saber? (opcional)</label><input id="bk-notes" type="text" maxLength={300} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Pedir cita"}</button></div>
    </form>
  );
}

/** Página pública de la clínica: llamar, pedir cita, tienda, portal del dueño. */
export function VetPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicVet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    api<PublicVet>(`/public/vet?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
    setToken(readOwnerToken(host));
  }, [host]);

  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;

  const phone = d.phone ?? "";
  const days = (d.workDays ?? "").split(",").filter(Boolean).map(Number);
  const names = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const hasSvc = !!d.services?.length;
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name, phone, org: d.name, url: window.location.origin }), "text/vcard");

  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🐾</span>
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
        {d.openHour !== undefined && d.closeHour !== undefined ? <p className="field__hint">{days.map((n) => names[n]).join(", ")} · {hourLabel(d.openHour)} a {hourLabel(d.closeHour)}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        {hasSvc ? <button type="button" className="btn btn--primary tech__big" onClick={() => setBook(true)}>Pedir una cita</button> : null}
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {d.shop ? <Link className="btn btn--secondary tech__big" href="/tienda">Tienda y domicilios</Link> : null}
        {token ? <Link className="btn btn--secondary tech__big" href={`/portal?t=${token}`}>Mis mascotas y su carnet</Link> : <Link className="btn btn--secondary" href="/portal">Ya soy cliente: entrar a mi portal</Link>}
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      {hasSvc ? (
        <section className="dcard__sec">
          <h2>Servicios</h2>
          <ul className="dcard__list">{d.services!.map((s) => <li key={s.id}><div><b>{s.name}</b>{s.description ? <p>{s.description}</p> : null}</div><span className="tech__price">{s.price ? formatMoney(s.price) : "A cotizar"}</span></li>)}</ul>
        </section>
      ) : null}
      {d.demoPortalUrl ? <p className="field__hint" style={{ textAlign: "center" }}><a href={d.demoPortalUrl}>Ver el portal de un dueño de ejemplo</a></p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={book} onClose={() => setBook(false)}>{book && d.services ? <BookingForm host={host} services={d.services} onClose={() => setBook(false)} /> : null}</Modal>
    </div>
  );
}
