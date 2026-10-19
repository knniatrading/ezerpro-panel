"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { addDays, niceDate, timeCO, todayCO } from "@/lib/clinic";
import type { PublicClinic, PublicTenant } from "@/lib/types";
import { Modal } from "./modal";

type Svc = NonNullable<PublicClinic["services"]>[number];
type Slot = { start: string; label: string; agendaId: string; agendaName: string };

export const CLINIC_LS = (host: string) => `ezer-clinic:${host}`;
export function readPatientToken(host: string): string { try { return localStorage.getItem(CLINIC_LS(host)) ?? ""; } catch { return ""; } }
export function savePatientToken(host: string, t: string) { try { localStorage.setItem(CLINIC_LS(host), t); } catch { /* sin almacenamiento */ } }

/** Pedir cita: servicio → día → hora → datos. Sirve para invitados y para pacientes con su portal (token). */
export function ClinicBooking({ host, services, agendas, token, onClose, onDone }: {
  host: string; services: Svc[]; agendas: NonNullable<PublicClinic["agendas"]>; token?: string; onClose: () => void; onDone?: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [agendaId, setAgendaId] = useState("");
  const [date, setDate] = useState(todayCO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; serviceName: string; agendaName: string } | null>(null);
  const docs = agendas.filter((a) => a.kind === "especialista");

  useEffect(() => {
    if (!serviceId || !date) return;
    let off = false;
    setSlots(null); setSlot(null);
    api<{ slots: Slot[] }>(`/public/clinic-slots?host=${encodeURIComponent(host)}&serviceId=${serviceId}&date=${date}${agendaId ? `&agendaId=${agendaId}` : ""}`)
      .then((r) => { if (!off) setSlots(r.slots); })
      .catch((e) => { if (!off) { setSlots([]); setErr(e instanceof ApiError ? e.message : "No se pudieron cargar los horarios."); } });
    return () => { off = true; };
  }, [host, serviceId, agendaId, date]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return setErr("Elige el servicio.");
    if (!slot) return setErr("Elige un horario.");
    const body: Record<string, unknown> = { host, serviceId, agendaId: slot.agendaId, start: slot.start, notes: f.notes.trim() || null };
    if (token) body.token = token;
    else {
      if (f.name.trim().length < 2) return setErr("Escribe tu nombre completo.");
      if (!f.phone.trim()) return setErr("Escribe tu celular para confirmarte la cita.");
      Object.assign(body, { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null });
    }
    setBusy(true);
    try {
      const r = await api<{ start: string; serviceName: string; agendaName: string }>("/public/clinic-appointments", { method: "POST", body: JSON.stringify(body) });
      setDone(r); onDone?.();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  if (done) {
    return (
      <div>
        <h2 id="dlg-title" tabIndex={-1}>¡Cita solicitada!</h2>
        <p role="status">{done.serviceName} con {done.agendaName} · {niceDate(done.start)} a las {timeCO(done.start)}.</p>
        <p className="lede">Te enviaremos recordatorios{!token && f.email ? " al correo que dejaste" : ""} y podrás confirmar o cancelar desde el enlace.</p>
        <div className="dialog__actions"><button type="button" className="btn btn--primary" onClick={onClose}>Listo</button></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pedir una cita</h2>
      <div className="field"><label htmlFor="cb-svc">Servicio</label><select id="cb-svc" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setErr(null); }}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.price ? ` · ${formatMoney(s.price)}` : ""}</option>)}</select></div>
      {docs.length > 1 ? <div className="field"><label htmlFor="cb-ag">Con quién</label><select id="cb-ag" value={agendaId} onChange={(e) => setAgendaId(e.target.value)}><option value="">Cualquiera disponible</option>{docs.map((a) => <option key={a.id} value={a.id}>{a.name}{a.specialty ? ` · ${a.specialty}` : ""}</option>)}</select></div> : null}
      <div className="field"><label htmlFor="cb-date">Día</label><input id="cb-date" type="date" min={todayCO()} max={addDays(todayCO(), 90)} value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setErr(null); } }} /></div>
      <fieldset className="field"><legend>Hora</legend>
        {slots === null ? <p className="field__hint" role="status">Buscando horarios…</p> : slots.length === 0 ? <p className="field__hint">No hay horarios libres ese día. Prueba con otro.</p> : (
          <div className="chips">{slots.map((s) => <button type="button" key={s.start} className={slot?.start === s.start ? "is-on" : ""} aria-pressed={slot?.start === s.start} onClick={() => { setSlot(s); setErr(null); }}>{s.label}</button>)}</div>
        )}
      </fieldset>
      {!token ? (
        <>
          <div className="field"><label htmlFor="cb-name">Tu nombre completo</label><input id="cb-name" type="text" value={f.name} autoComplete="name" onChange={set("name")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="cb-phone">Tu celular</label><input id="cb-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="tel" onChange={set("phone")} /></div>
            <div className="field"><label htmlFor="cb-email">Correo (para recordatorios)</label><input id="cb-email" type="email" value={f.email} autoComplete="email" onChange={set("email")} /></div>
          </div>
        </>
      ) : null}
      <div className="field"><label htmlFor="cb-notes">¿Algo que debamos saber? (opcional)</label><input id="cb-notes" type="text" maxLength={300} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Pedir cita"}</button></div>
    </form>
  );
}

const ICON_TOOTH = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3c-2.5 0-4 2-4 4.5 0 2 1 3.2 1.5 5C5 14.5 5 21 7.5 21c1.8 0 1.5-5 4.5-5s2.7 5 4.5 5c2.5 0 2.5-6.5 3-8.5.5-1.8 1.500-3 1.500-5C21 5 19.500 3 17 3c-2 0-3 1-5 1S9 3 7 3z" /></svg>
);

/** Página pública de la clínica: pedir cita, portal del paciente, llamar. */
export function ClinicPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicClinic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    api<PublicClinic>(`/public/clinic?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
    setToken(readPatientToken(host));
  }, [host]);
  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const phone = d.phone ?? "";
  const hasSvc = !!d.services?.length && !!d.agendas?.length;
  const docs = (d.agendas ?? []).filter((a) => a.kind === "especialista");
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name, phone, org: d.name, url: window.location.origin }), "text/vcard");
  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🦷</span>
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        {hasSvc ? <button type="button" className="btn btn--primary tech__big" onClick={() => setBook(true)}>Pedir una cita</button> : null}
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        <Link className="btn tech__big vet-cta vet-cta--portal" href={token ? `/mi-portal?t=${token}` : "/mi-portal"}><span className="vet-cta__row">{ICON_TOOTH}Portal del paciente</span><small>{token ? "Mis citas, recetas y estado de cuenta" : "Ya soy paciente: entrar a mi portal"}</small></Link>
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      {docs.length ? (
        <section className="dcard__sec"><h2>Nuestro equipo</h2>
          <ul className="dcard__list">{docs.map((a) => <li key={a.id}><div><b>{a.name}</b>{a.specialty ? <p>{a.specialty}</p> : null}</div></li>)}</ul></section>
      ) : null}
      {d.services?.length ? (
        <section className="dcard__sec"><h2>Servicios</h2>
          <ul className="dcard__list">{d.services.map((s) => <li key={s.id}><div><b>{s.name}</b>{s.description ? <p>{s.description}</p> : null}</div><span className="tech__price">{s.price ? formatMoney(s.price) : "A cotizar"}</span></li>)}</ul></section>
      ) : null}
      {d.demoPortalUrl ? <p className="field__hint" style={{ textAlign: "center" }}><a href={d.demoPortalUrl}>Ver el portal de un paciente de ejemplo</a></p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={book} onClose={() => setBook(false)}>{book && d.services && d.agendas ? <ClinicBooking host={host} services={d.services} agendas={d.agendas} token={token || undefined} onClose={() => setBook(false)} /> : null}</Modal>
    </div>
  );
}
