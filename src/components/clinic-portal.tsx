"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { dateCO, niceDate, timeCO } from "@/lib/clinic";
import type { ClinicPortal, PublicClinic } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { ApptBadge } from "./clinic-common";
import { ClinicBooking, CLINIC_LS, readPatientToken, savePatientToken } from "./clinic-public";

/** Portal del paciente: citas, recetas, consentimientos y estado de cuenta. */
export function ClinicPortalView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [token, setToken] = useState<string | null>(null);
  const [d, setD] = useState<ClinicPortal | null>(null);
  const [pub, setPub] = useState<PublicClinic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState(false);
  const [cancel, setCancel] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("t") || readPatientToken(host) || ""); }, [host]);
  const load = useCallback(async (t: string) => {
    try {
      const r = await api<ClinicPortal>("/public/clinic-patient", { method: "POST", body: JSON.stringify({ host, token: t }) });
      setD(r);
      if (!r.suspended) {
        savePatientToken(host, t);
        if (window.location.search) window.history.replaceState(null, "", "/mi-portal");
        api<PublicClinic>(`/public/clinic?host=${encodeURIComponent(host)}`).then(setPub).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o fue reemplazado. Pide uno nuevo con tu correo." : e instanceof ApiError ? e.message : "No se pudo cargar tu portal.");
      try { localStorage.removeItem(CLINIC_LS(host)); } catch { /* */ }
    }
  }, [host]);
  useEffect(() => { if (token) void load(token); }, [token, load]);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMsg("Escribe un correo válido.");
    setBusy(true); setMsg(null);
    try { await api("/public/clinic-patient/request-access", { method: "POST", body: JSON.stringify({ host, email: email.trim() }) }); setSent(true); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); } finally { setBusy(false); }
  }
  async function doCancel() {
    if (!cancel) return;
    try { await api("/public/clinic-patient/cancel", { method: "POST", body: JSON.stringify({ host, token, appointmentId: cancel }) }); setCancel(null); if (token) await load(token); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); setCancel(null); }
  }

  if (token === null) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (!token || error || (d && d.suspended)) {
    return (
      <div className="landing"><div className="landing__card">
        <h1>Portal del paciente</h1>
        {d?.suspended ? <p className="landing__text" role="status">Este servicio está suspendido por el momento.</p> : (
          <>
            {error ? <p className="landing__text" role="alert">{error}</p> : <p className="landing__text">Entra con tu enlace personal. Si no lo tienes, escribe tu correo y te lo enviamos.</p>}
            {sent ? <p role="status">Si ese correo está registrado en la clínica, te enviamos tu enlace.</p> : (
              <form onSubmit={requestAccess} noValidate>
                <div className="field"><label htmlFor="pa-mail">Tu correo</label><input id="pa-mail" type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setMsg(null); }} /></div>
                <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : "Enviarme mi enlace"}</button>
              </form>
            )}
            <p className="field__hint"><Link href="/">← Volver a la página de la clínica</Link></p>
          </>
        )}
      </div></div>
    );
  }
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  const first = (d.patient?.name ?? "").split(" ")[0];
  const owing = (d.treatments ?? []).reduce((s, t) => s + (t.status === "cancelado" ? 0 : t.balance), 0);
  return (
    <div className="dcard vetpage">
      <header className="dcard__hero"><span className="dcard__photo dcard__photo--empty" aria-hidden="true">🦷</span><h1>Hola, {first}</h1><p className="dcard__veh">{d.clinic?.name}</p></header>
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
      <section className="tech__cta">{pub?.services?.length && pub.agendas?.length ? <button type="button" className="btn btn--primary tech__big" onClick={() => setBook(true)}>Pedir una cita</button> : null}
        {d.clinic?.phone ? <a className="btn btn--secondary tech__big" href={`tel:${d.clinic.phone}`}>Llamar a la clínica</a> : null}</section>

      <section className="dcard__sec" aria-label="Próximas citas"><h2>Próximas citas</h2>
        {!d.upcoming?.length ? <p className="field__hint">No tienes citas programadas.</p> : null}
        <ul className="dcard__list">{(d.upcoming ?? []).map((a) => (
          <li key={a.id}><div><b>{niceDate(a.start)} · {timeCO(a.start)}</b><p>{a.serviceName} · {a.agendaName}</p></div>
            <div className="actions-cell"><ApptBadge status={a.status} />{a.status === "programada" ? <a className="btn btn--primary btn--sm" href={a.confirmUrl}>Confirmar</a> : null}<button className="btn btn--danger-ghost btn--sm" onClick={() => setCancel(a.id)}>Cancelar</button></div></li>
        ))}</ul></section>

      <section className="dcard__sec" aria-label="Estado de cuenta"><h2>Estado de cuenta</h2>
        {!d.treatments?.length ? <p className="field__hint">No tienes tratamientos con saldo.</p> : null}
        {(d.treatments ?? []).map((t) => (
          <article key={t.id} className="treat"><div className="treat__top"><b>{t.name}</b> <span className={`badge badge--${t.status === "terminado" ? "ok" : "info"}`}>{t.status}</span></div>
            <div className="treat__bar" role="img" aria-label={`Pagado ${formatMoney(t.paid)} de ${formatMoney(t.total)}`}><i style={{ width: `${Math.min(100, Math.round((t.paid / t.total) * 100))}%` }} /></div>
            <p>Total <b>{formatMoney(t.total)}</b> · Pagado <b>{formatMoney(t.paid)}</b> · Saldo <b>{formatMoney(t.balance)}</b></p>
            {t.payments.length ? <ul className="plain-list">{t.payments.map((y) => <li key={y.id}>{dateCO(y.paidAt)} · {formatMoney(y.amount)} · {y.method}</li>)}</ul> : null}</article>
        ))}
        {d.treatments?.length ? <p className="lede">Saldo total pendiente: <b>{formatMoney(owing)}</b></p> : null}</section>

      <section className="dcard__sec" aria-label="Recetas"><h2>Mis recetas</h2>
        {!d.prescriptions?.length ? <p className="field__hint">Aún no tienes recetas.</p> : null}
        <ul className="dcard__list">{(d.prescriptions ?? []).map((r) => <li key={r.id}><div><b>Receta N.º {r.number}</b><p>{niceDate(r.createdAt)} · {r.doctorName}{r.diagnosis ? ` · ${r.diagnosis}` : ""}</p></div><a className="btn btn--secondary btn--sm" href={r.url}>Ver / imprimir</a></li>)}</ul></section>

      {d.consents?.length ? (
        <section className="dcard__sec" aria-label="Consentimientos"><h2>Consentimientos</h2>
          <ul className="dcard__list">{d.consents.map((c) => <li key={c.id}><div><b>{c.title}</b><p>{c.status === "firmado" ? `Firmado ${niceDate(c.signedAt ?? "")}` : "Pendiente de firma"}</p></div><a className={`btn btn--${c.status === "firmado" ? "secondary" : "primary"} btn--sm`} href={c.url}>{c.status === "firmado" ? "Ver" : "Firmar"}</a></li>)}</ul></section>
      ) : null}

      {d.past?.length ? (
        <section className="dcard__sec" aria-label="Historial de citas"><h2>Citas anteriores</h2>
          <ul className="dcard__list">{d.past.map((a) => <li key={a.id}><div><b>{dateCO(a.start)}</b><p>{a.serviceName} · {a.agendaName}</p></div><ApptBadge status={a.status} /></li>)}</ul></section>
      ) : null}
      <p className="field__hint" style={{ textAlign: "center" }}>Este enlace es personal: no lo compartas.</p>
      <p className="landing__foot">Con tecnología de EzerPro</p>
      <Modal open={book} onClose={() => setBook(false)}>{book && pub?.services && pub.agendas ? <ClinicBooking host={host} services={pub.services} agendas={pub.agendas} token={token} onClose={() => setBook(false)} onDone={() => load(token)} /> : null}</Modal>
      <ConfirmDialog open={!!cancel} title="Cancelar cita" message="¿Quieres cancelar esta cita?" confirmLabel="Sí, cancelar" onConfirm={doCancel} onClose={() => setCancel(null)} />
    </div>
  );
}
