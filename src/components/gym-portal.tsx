"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { STATE_LABEL, dueText, hhmm, niceDate, todayCO, youtubeEmbed } from "@/lib/gym";
import { dateCO } from "@/lib/vet";
import type { GymPortal, GymSession } from "@/lib/types";
import { readGymToken, saveGymToken } from "./gym-public";

/** Portal del socio: QR de entrada que se renueva solo, membresía, rutinas y reserva de clases. */
export function GymPortalView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [token, setToken] = useState<string | null>(null);
  const [d, setD] = useState<GymPortal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [day, setDay] = useState(todayCO());

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") || readGymToken(host);
    setToken(t || "");
  }, [host]);

  const loadSessions = useCallback(async (t: string) => {
    try { setSessions(await api<GymSession[]>("/public/gym-member/sessions", { method: "POST", body: JSON.stringify({ host, token: t }) })); } catch { /* sin clases */ }
  }, [host]);

  const load = useCallback(async (t: string) => {
    try {
      const r = await api<GymPortal>("/public/gym-member", { method: "POST", body: JSON.stringify({ host, token: t }) });
      setD(r);
      if (!r.suspended) {
        saveGymToken(host, t);
        if (window.location.search) window.history.replaceState(null, "", "/socio");
        void loadSessions(t);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o fue reemplazado. Pide uno nuevo con tu correo." : e instanceof ApiError ? e.message : "No se pudo cargar tu portal.");
      try { localStorage.removeItem(`ezer-gym:${host}`); } catch { /* */ }
    }
  }, [host, loadSessions]);
  useEffect(() => { if (token) void load(token); }, [token, load]);

  // QR dinámico: se renueva antes de que caduque.
  const active = !!d && !d.suspended && !!token;
  useEffect(() => {
    if (!active || !token) return;
    let off = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      let wait = 20;
      try {
        const r = await api<{ pass: string; expiresIn: number }>("/public/gym-member/pass", { method: "POST", body: JSON.stringify({ host, token }) });
        const url = await QRCode.toDataURL(r.pass, { width: 520, margin: 1, errorCorrectionLevel: "M" });
        if (!off) setQr(url);
        wait = Math.max(5, Math.min(40, r.expiresIn - 3));
      } catch { /* reintenta */ }
      if (!off) timer = setTimeout(run, wait * 1000);
    };
    void run();
    return () => { off = true; clearTimeout(timer); };
  }, [active, token, host]);

  // Foto del socio (se pide con POST para no exponer el token en la URL).
  useEffect(() => {
    if (!active || !token || !d?.member?.img) { setPhoto(null); return; }
    let url = "";
    let off = false;
    fetch("/api/public/gym-member/photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, token }) })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => { if (b && !off) { url = URL.createObjectURL(b); setPhoto(url); } })
      .catch(() => {});
    return () => { off = true; if (url) URL.revokeObjectURL(url); };
  }, [active, token, host, d?.member?.img]);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMsg("Escribe un correo válido.");
    setBusy(true); setMsg(null);
    try { await api("/public/gym-member/request-access", { method: "POST", body: JSON.stringify({ host, email: email.trim() }) }); setSent(true); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
    finally { setBusy(false); }
  }
  async function book(s: GymSession) {
    setMsg(null);
    try { await api("/public/gym-member/book", { method: "POST", body: JSON.stringify({ host, token, classId: s.classId, date: s.date }) }); if (token) { await load(token); } }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }
  async function cancel(bookingId: string) {
    setMsg(null);
    try { await api("/public/gym-member/cancel", { method: "POST", body: JSON.stringify({ host, token, bookingId }) }); if (token) await load(token); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }

  if (token === null) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (!token || error) {
    return (
      <main className="landing" id="contenido">
        <div className="landing__card">
          <h1>Portal del socio</h1>
          {error ? <p className="form-error" role="alert">{error}</p> : <p className="landing__text">Aquí ves tu QR de entrada, tu membresía, tus rutinas y reservas clases.</p>}
          {sent ? <p className="note" role="status">Si ese correo está registrado en el gimnasio, te enviamos tu acceso. Revisa también la carpeta de spam.</p> : (
            <form onSubmit={requestAccess} noValidate>
              <div className="field"><label htmlFor="gp-email">Tu correo registrado en el gimnasio</label><input id="gp-email" type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setMsg(null); }} /></div>
              <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>
              <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviarme mi acceso"}</button>
            </form>
          )}
          <p><Link href="/">Volver al gimnasio</Link></p>
        </div>
      </main>
    );
  }
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended || !d.member) return <main className="landing"><div className="landing__card"><h1>{d.name ?? "Gimnasio"}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></main>;

  const m = d.member;
  const st = STATE_LABEL[m.state] ?? STATE_LABEL.sin_plan;
  const today = todayCO();
  const days = Array.from(new Set(sessions.map((s) => s.date)));
  const list = sessions.filter((s) => s.date === day);
  return (
    <main className="dcard vetpage" id="contenido">
      <header className="dcard__hero">
        {photo ? <img className="dcard__photo" src={photo} alt="" /> : <span className="dcard__photo dcard__photo--empty" aria-hidden="true">{m.name.charAt(0)}</span>}
        <h1>{m.name}</h1>
        <p className="dcard__veh">{d.gym?.name}</p>
      </header>

      <section className={`passcard passcard--${st.tone}`} aria-label="Mi entrada">
        <p className="passcard__state"><span className={`badge badge--${st.tone === "danger" ? "warn" : st.tone === "muted" ? "info" : st.tone}${st.tone === "danger" ? " badge--danger" : ""}`}>{st.label}</span> {m.planName ?? "Sin plan"}</p>
        <p><b>{dueText(m.daysLeft, m.paidUntil)}</b>{m.paidUntil ? ` · ${niceDate(m.paidUntil)}` : ""}</p>
        {qr ? <img className="passcard__qr" src={qr} alt="Código QR para entrar al gimnasio" width={260} height={260} /> : <p className="field__hint" role="status">Generando tu QR…</p>}
        <p className="field__hint">Muestra este QR en recepción. Se renueva solo, no hace falta capturarlo. Código: <b>{m.code}</b></p>
        {m.state === "vencido" || m.state === "sin_plan" ? <p className="note">Pasa por recepción para ponerte al día con tu membresía.</p> : null}
        {d.visits30 !== undefined ? <p className="field__hint">{d.visits30} visita{d.visits30 === 1 ? "" : "s"} en los últimos 30 días.</p> : null}
      </section>
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}

      <section className="dcard__sec" aria-label="Mis rutinas">
        <h2>Mis rutinas</h2>
        {!d.routines?.length ? <p className="field__hint">Tu entrenador aún no te ha asignado una rutina.</p> : null}
        {(d.routines ?? []).map((r) => {
          const emb = youtubeEmbed(r.videoUrl);
          return (
            <article key={r.id} className="routine routine--portal">
              <h3>{r.title}</h3>
              <p className="field__hint">{niceDate(dateCO(r.createdAt))}{r.trainerName ? ` · ${r.trainerName}` : ""}</p>
              <pre>{r.body}</pre>
              {emb ? <iframe className="routine__video" src={emb} title={`Video: ${r.title}`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : r.videoUrl ? <a className="btn btn--secondary btn--sm" href={r.videoUrl} target="_blank" rel="noreferrer noopener">Ver video</a> : null}
            </article>
          );
        })}
      </section>

      <section className="dcard__sec" aria-label="Clases">
        <h2>Clases grupales</h2>
        {d.bookings?.length ? (
          <>
            <h3>Mis reservas</h3>
            <ul className="dcard__list">{d.bookings.map((b) => <li key={b.id}><div><b>{b.name}</b><p>{niceDate(b.date)} · {hhmm(b.startMin)}{b.instructor ? ` · ${b.instructor}` : ""}</p></div><button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => cancel(b.id)}>Cancelar</button></li>)}</ul>
          </>
        ) : null}
        {days.length ? <div className="chips" role="group" aria-label="Día">{days.map((x) => <button type="button" key={x} className={day === x ? "is-on" : ""} aria-pressed={day === x} onClick={() => setDay(x)}>{x === today ? "Hoy" : niceDate(x)}</button>)}</div> : <p className="field__hint">No hay clases programadas esta semana.</p>}
        <ul className="dcard__list">
          {list.map((s) => (
            <li key={s.classId + s.date}><div><b>{hhmm(s.startMin)} · {s.name}</b><p>{s.instructor ?? ""} {s.booked}/{s.capacity} cupos</p></div>
              {s.mineId ? <span className="badge badge--ok">Reservada</span> : s.started ? <span className="badge badge--info">En curso</span> : s.full ? <span className="badge badge--warn">Lleno</span> : <button type="button" className="btn btn--primary btn--sm" onClick={() => book(s)}>Reservar</button>}</li>
          ))}
        </ul>
      </section>

      {d.payments?.length ? (
        <section className="dcard__sec" aria-label="Mis pagos">
          <h2>Mis pagos</h2>
          <ul className="dcard__list">{d.payments.map((p) => <li key={p.id}><div><b>{p.planName}</b><p>{niceDate(dateCO(p.paidAt))} · cubre hasta {niceDate(p.periodEnd)}</p></div><span className="tech__price">{formatMoney(p.amount)}</span></li>)}</ul>
        </section>
      ) : null}
      {d.gym?.phone ? <p className="actions-cell" style={{ justifyContent: "center" }}><a className="btn btn--secondary" href={`tel:${d.gym.phone}`}>Llamar al gimnasio</a></p> : null}
      <p style={{ textAlign: "center" }}><Link href="/">Volver al gimnasio</Link></p>
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </main>
  );
}
