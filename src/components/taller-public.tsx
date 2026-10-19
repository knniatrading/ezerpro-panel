"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { addDays, todayCO } from "@/lib/taller";
import type { PublicTaller, PublicTenant } from "@/lib/types";
import { Modal } from "./modal";

export const TALLER_LS = (host: string) => `ezer-taller:${host}`;
export function readCustomerToken(host: string): string { try { return localStorage.getItem(TALLER_LS(host)) ?? ""; } catch { return ""; } }
export function saveCustomerToken(host: string, t: string) { try { localStorage.setItem(TALLER_LS(host), t); } catch { /* sin almacenamiento */ } }

function TrackDialog({ host, onClose }: { host: string; onClose: () => void }) {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (plate.replace(/[^a-z0-9]/gi, "").length < 4) return setErr("Escribe la placa de tu vehículo.");
    if (phone.replace(/\D/g, "").length < 7) return setErr("Escribe el celular con el que te registraron.");
    setBusy(true); setErr(null);
    try {
      const r = await api<{ token: string }>("/public/taller-track", { method: "POST", body: JSON.stringify({ host, plate, phone }) });
      saveCustomerToken(host, r.token);
      router.push(`/mi-vehiculo?t=${r.token}`);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Sigue tu vehículo</h2>
      <p className="lede">Escribe tu placa y el celular que dejaste en el taller.</p>
      <div className="field"><label htmlFor="tk-p">Placa</label><input id="tk-p" type="text" maxLength={10} value={plate} placeholder="ABC123" autoCapitalize="characters" autoComplete="off" onChange={(e) => { setPlate(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="tk-c">Celular</label><input id="tk-c" type="tel" inputMode="numeric" value={phone} autoComplete="tel" onChange={(e) => { setPhone(e.target.value); setErr(null); }} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Buscando…" : "Ver mi vehículo"}</button></div>
    </form>
  );
}

export function BookDialog({ host, services, prefill, onClose }: { host: string; services: { id: string; name: string }[]; prefill?: { name?: string; phone?: string; plate?: string }; onClose: () => void }) {
  const [f, setF] = useState({ name: prefill?.name ?? "", phone: prefill?.phone ?? "", plate: prefill?.plate ?? "", service: services[0]?.name ?? "", other: "", date: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const service = f.service === "__otro" || !f.service ? f.other.trim() : f.service;
    if (f.name.trim().length < 2) return setErr("Escribe tu nombre.");
    if (f.phone.replace(/\D/g, "").length < 7) return setErr("Escribe tu celular para confirmarte la cita.");
    if (service.length < 3) return setErr("Cuéntanos qué necesitas.");
    setBusy(true);
    try {
      await api("/public/taller-booking", { method: "POST", body: JSON.stringify({ host, name: f.name.trim(), phone: f.phone.trim(), plate: f.plate.trim() || undefined, service, date: f.date || undefined, notes: f.notes.trim() || undefined }) });
      setDone(true);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }
  if (done) return <div><h2 id="dlg-title" tabIndex={-1}>¡Solicitud enviada!</h2><p role="status">El taller te escribirá o llamará para confirmar tu cita.</p><div className="dialog__actions"><button className="btn btn--primary" onClick={onClose}>Listo</button></div></div>;
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Pedir una cita</h2>
      <div className="field"><label htmlFor="bk-s">¿Qué necesitas?</label><select id="bk-s" value={f.service} onChange={set("service")}>{services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}<option value="__otro">Otro servicio</option></select></div>
      {f.service === "__otro" || !services.length ? <div className="field"><label htmlFor="bk-o">Cuéntanos</label><input id="bk-o" type="text" maxLength={160} value={f.other} autoComplete="off" onChange={set("other")} /></div> : null}
      <div className="field-row">
        <div className="field"><label htmlFor="bk-n">Tu nombre</label><input id="bk-n" type="text" value={f.name} autoComplete="name" onChange={set("name")} /></div>
        <div className="field"><label htmlFor="bk-p">Tu celular</label><input id="bk-p" type="tel" inputMode="numeric" value={f.phone} autoComplete="tel" onChange={set("phone")} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="bk-pl">Placa (opcional)</label><input id="bk-pl" type="text" maxLength={10} value={f.plate} autoCapitalize="characters" autoComplete="off" onChange={set("plate")} /></div>
        <div className="field"><label htmlFor="bk-d">Día que prefieres</label><input id="bk-d" type="date" min={todayCO()} max={addDays(todayCO(), 90)} value={f.date} onChange={set("date")} /></div>
      </div>
      <div className="field"><label htmlFor="bk-no">Algo más (opcional)</label><input id="bk-no" type="text" maxLength={300} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Pedir cita"}</button></div>
    </form>
  );
  void host;
}

export function TallerPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicTaller | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState(false);
  const [book, setBook] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    api<PublicTaller>(`/public/taller?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
    setToken(readCustomerToken(host));
  }, [host]);
  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const phone = d.phone ?? "";
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name, phone, org: d.name, url: window.location.origin }), "text/vcard");
  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🔧</span>
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        <button type="button" className="btn btn--primary tech__big" onClick={() => setTrack(true)}>Seguir mi vehículo<small>Con tu placa y tu celular</small></button>
        {token ? <Link className="btn btn--secondary tech__big" href={`/mi-vehiculo?t=${token}`}>Mi historial y mantenimientos</Link> : null}
        <button type="button" className="btn btn--secondary tech__big" onClick={() => setBook(true)}>Pedir una cita</button>
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      <section className="dcard__sec" aria-label="Cómo funciona"><h2>Tu taller en tu celular</h2>
        <ul className="tl-bullets"><li>📍 Mira en qué etapa va tu vehículo, en vivo.</li><li>📸 Ve las fotos y videos de lo que encontró el mecánico.</li><li>✅ Aprueba la cotización con un clic, sin llamadas.</li><li>🛢️ Te avisamos cuándo toca el cambio de aceite y otros mantenimientos.</li></ul></section>
      {d.services?.length ? <section className="dcard__sec"><h2>Servicios</h2><ul className="dcard__list">{d.services.map((s) => <li key={s.id}><div><b>{s.name}</b><p>Recomendado cada {s.months} {s.months === 1 ? "mes" : "meses"}</p></div></li>)}</ul></section> : null}
      {d.demoPortalUrl || d.demoOrderUrl ? <p className="field__hint" style={{ textAlign: "center" }}>{d.demoOrderUrl ? <><a href={d.demoOrderUrl}>Ver el seguimiento y la cotización de una orden de ejemplo</a><br /></> : null}{d.demoPortalUrl ? <a href={d.demoPortalUrl}>Ver el portal de un cliente de ejemplo</a> : null}</p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={track} onClose={() => setTrack(false)}>{track ? <TrackDialog host={host} onClose={() => setTrack(false)} /> : null}</Modal>
      <Modal open={book} onClose={() => setBook(false)}>{book ? <BookDialog host={host} services={d.services ?? []} onClose={() => setBook(false)} /> : null}</Modal>
    </div>
  );
}
