"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ageText, KIND_LABEL, niceDate, timeCO, dateCO, todayCO } from "@/lib/vet";
import { APPT_LABEL } from "@/lib/vet";
import { petPhotoUrl } from "./vet-patients";
import type { PublicVet, VetPortal } from "@/lib/types";
import { Modal } from "./modal";
import { BookingForm, readOwnerToken, saveOwnerToken } from "./vet-public";

/** Portal del dueño: entra con su enlace personal (guardado en el celular) o lo pide por correo. */
export function VetPortalView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [token, setToken] = useState<string | null>(null);
  const [d, setD] = useState<VetPortal | null>(null);
  const [svcs, setSvcs] = useState<NonNullable<PublicVet["services"]>>([]);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") || readOwnerToken(host);
    setToken(t || "");
  }, [host]);

  const load = useCallback(async (t: string) => {
    try {
      const r = await api<VetPortal>("/public/vet-owner", { method: "POST", body: JSON.stringify({ host, token: t }) });
      setD(r);
      if (!r.suspended) {
        saveOwnerToken(host, t);
        if (window.location.search) window.history.replaceState(null, "", "/portal");
        api<PublicVet>(`/public/vet?host=${encodeURIComponent(host)}`).then((v) => setSvcs(v.services ?? [])).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o fue reemplazado. Pide uno nuevo con tu correo." : e instanceof ApiError ? e.message : "No se pudo cargar tu portal.");
      try { localStorage.removeItem(`ezer-vet:${host}`); } catch { /* */ }
    }
  }, [host]);
  useEffect(() => { if (token) void load(token); }, [token, load]);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMsg("Escribe un correo válido.");
    setBusy(true); setMsg(null);
    try { await api("/public/vet-owner/request-access", { method: "POST", body: JSON.stringify({ host, email: email.trim() }) }); setSent(true); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
    finally { setBusy(false); }
  }
  async function toggleLost(petId: string, lost: boolean) {
    try { await api("/public/vet-owner/lost", { method: "POST", body: JSON.stringify({ host, token, petId, lost }) }); if (token) await load(token); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function cancel(id: string) {
    try { await api(`/public/vet-appointments/${id}/cancel`, { method: "POST", body: JSON.stringify({ host, token }) }); if (token) await load(token); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }

  if (token === null) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (!token || error) {
    return (
      <main className="landing" id="contenido">
        <div className="landing__card">
          <h1>Portal de mascotas</h1>
          {error ? <p className="form-error" role="alert">{error}</p> : <p className="landing__text">Aquí ves el carnet de vacunas y el historial de tus mascotas.</p>}
          {sent ? <p className="note" role="status">Si ese correo está registrado en la clínica, te enviamos tu acceso. Revisa también la carpeta de spam.</p> : (
            <form onSubmit={requestAccess} noValidate>
              <div className="field"><label htmlFor="pr-email">Tu correo registrado en la clínica</label><input id="pr-email" type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setMsg(null); }} /></div>
              <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>
              <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviarme mi acceso"}</button>
            </form>
          )}
          <p><Link href="/">Volver a la clínica</Link></p>
        </div>
      </main>
    );
  }
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <main className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></main>;

  const today = todayCO();
  const upcoming = (d.appointments ?? []).filter((a) => a.start >= new Date().toISOString() && (a.status === "pendiente" || a.status === "confirmada"));
  return (
    <main className="dcard vetpage" id="contenido">
      <header className="dcard__hero">
        <h1>Hola, {d.owner?.name.split(" ")[0]}</h1>
        <p className="dcard__veh">{d.clinic?.name}</p>
        <div className="actions-cell">
          {svcs.length && d.pets?.length ? <button type="button" className="btn btn--primary" onClick={() => setBook(true)}>Pedir una cita</button> : null}
          {d.clinic?.phone ? <a className="btn btn--secondary" href={`tel:${d.clinic.phone}`}>Llamar a la clínica</a> : null}
          <Link className="btn btn--secondary" href="/">Inicio</Link>
        </div>
        {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      </header>

      {upcoming.length ? (
        <section className="dcard__sec" aria-label="Próximas citas">
          <h2>Próximas citas</h2>
          <ul className="dcard__list">{upcoming.map((a) => (
            <li key={a.id}><div><b>{a.serviceName}{a.petName ? ` · ${a.petName}` : ""}</b><p>{niceDate(dateCO(a.start))} · {timeCO(a.start)} · {APPT_LABEL[a.status]?.label}</p></div><button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => cancel(a.id)}>Cancelar</button></li>
          ))}</ul>
        </section>
      ) : null}

      {(d.pets ?? []).map((p) => {
        const photo = petPhotoUrl(host, p.code, p.img);
        const age = ageText(p.birthDate);
        const due = p.records.filter((r) => r.nextDue).sort((a, b) => (a.nextDue! < b.nextDue! ? -1 : 1));
        const pending = due.filter((r) => !p.records.some((o) => o.id !== r.id && o.title === r.title && o.date > r.date));
        return (
          <section className="dcard__sec" key={p.id} aria-label={`Mascota ${p.name}`}>
            <div className="pet-head">
              {photo ? <img className="pet-av" src={photo} alt={`Foto de ${p.name}`} width={72} height={72} /> : <span className="pet-av pet-av--empty" style={{ width: 72, height: 72 }} aria-hidden="true">{p.name.charAt(0)}</span>}
              <div><h2>{p.name} {p.lost ? <span className="badge badge--warn">Marcada como perdida</span> : null}</h2>
                <p className="lede">{p.species}{p.breed ? ` · ${p.breed}` : ""}{age ? ` · ${age}` : ""}{p.weightKg ? ` · ${p.weightKg} kg` : ""}</p></div>
            </div>
            {p.allergies ? <p><b>Alergias:</b> <span className="text-danger">{p.allergies}</span></p> : null}
            {pending.length ? <p className="note">Próximos cuidados: {pending.slice(0, 3).map((r) => `${r.title} (${r.nextDue! < today ? "vencido " : ""}${niceDate(r.nextDue)})`).join(" · ")}</p> : null}
            <h3>Carnet y historial</h3>
            {!p.records.length ? <p className="field__hint">Aún no hay registros.</p> : (
              <ul className="timeline">{p.records.map((r) => (
                <li key={r.id}><div><b>{r.title}</b> <span className="badge badge--info">{KIND_LABEL[r.kind] ?? r.kind}</span><p>{niceDate(r.date)}{r.weightKg ? ` · ${r.weightKg} kg` : ""}</p>{r.notes ? <p>{r.notes}</p> : null}{r.nextDue ? <p>Próxima: {niceDate(r.nextDue)}</p> : null}</div></li>
              ))}</ul>
            )}
            <div className="actions-cell">
              <Link className="btn btn--secondary btn--sm" href={`/mascota?c=${p.code}`}>Ver su Pet ID</Link>
              <button type="button" className={`btn btn--sm ${p.lost ? "btn--primary" : "btn--secondary"}`} onClick={() => toggleLost(p.id, !p.lost)}>{p.lost ? "Ya apareció" : "Marcar como perdida"}</button>
            </div>
          </section>
        );
      })}
      <Modal open={book} onClose={() => setBook(false)}>{book ? <BookingForm host={host} services={svcs} ownerToken={token} pets={(d.pets ?? []).map((p) => ({ id: p.id, name: p.name }))} onClose={() => setBook(false)} onDone={() => void load(token)} /> : null}</Modal>
    </main>
  );
}
