"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { STATUS_TEXT, STEPS, dateCO, publicPhoto, timeCO } from "@/lib/taller";
import type { TallerPublicOrder } from "@/lib/types";

/** Seguimiento en vivo de una orden: etapa, fotos, cotización y botón "Aprobar reparación". */
export function TallerOrderPage() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [t, setT] = useState<string | null>(null);
  const [d, setD] = useState<TallerPublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [asking, setAsking] = useState<"aprobar" | "rechazar" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { setT(new URLSearchParams(window.location.search).get("t") ?? ""); }, []);
  const load = useCallback(async (tk: string) => {
    try { setD(await api<TallerPublicOrder>("/public/taller-order", { method: "POST", body: JSON.stringify({ host, t: tk }) })); setError(null); }
    catch (e) { setError(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o ya no está disponible." : e instanceof ApiError ? e.message : "No se pudo cargar el seguimiento."); }
  }, [host]);
  useEffect(() => { if (t) void load(t); }, [t, load]);
  useEffect(() => { if (!t) return; const i = setInterval(() => { if (!document.hidden && !asking) void load(t); }, 20000); return () => clearInterval(i); }, [t, load, asking]);
  async function decide(action: "aprobar" | "rechazar") {
    if (!t) return;
    if (action === "aprobar" && name.trim().length < 3) return setMsg("Escribe tu nombre completo para aprobar.");
    setBusy(true); setMsg(null);
    try { await api("/public/taller-order/decision", { method: "POST", body: JSON.stringify({ host, t, action, name: name.trim(), reason: reason.trim() || undefined }) }); setAsking(null); await load(t); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); } finally { setBusy(false); }
  }
  if (t === null || (!d && !error)) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (error || !d) return <div className="landing"><div className="landing__card"><h1>Seguimiento</h1><p className="landing__text" role="alert">{error}</p><p className="field__hint"><Link href="/">← Ir a la página del taller</Link></p></div></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;
  const q = d.quote;
  const idx = STEPS.indexOf(d.status);
  const phone = d.workshop?.phone ?? "";
  const cancelled = d.status === "cancelado";
  return (
    <div className="dcard vetpage">
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🔧</span>
        <h1>Orden #{d.number}</h1>
        <p className="dcard__veh"><span className="tl-plate">{d.vehicle.plate}</span> {d.vehicle.label}</p>
        <p className="dcard__bio">{d.workshop?.name}</p>
      </header>
      <section className="dcard__sec" aria-label="Estado actual">
        <p className="tl-now" role="status"><strong>{STATUS_TEXT[d.status].label}</strong><span>{STATUS_TEXT[d.status].hint}</span></p>
        {!cancelled ? <ol className="tl-steps tl-steps--pub" aria-label="Avance">{STEPS.map((s, i) => <li key={s} className={i < idx ? "is-done" : i === idx ? "is-now" : ""}><span>{STATUS_TEXT[s].label}</span></li>)}</ol> : null}
        <p className="field__hint">Ingresó el {dateCO(d.createdAt)}{d.mechanicName ? ` · Mecánico: ${d.mechanicName}` : ""}{d.deliveredAt ? ` · Entregado el ${dateCO(d.deliveredAt)}` : ""}</p>
      </section>
      <section className="dcard__sec" aria-label="Motivo y diagnóstico"><h2>Qué se está haciendo</h2>
        <p><b>Motivo:</b> {d.complaint}</p>
        {d.diagnosis ? <p><b>Diagnóstico del mecánico:</b> {d.diagnosis}</p> : <p className="field__hint">El mecánico aún está revisando tu vehículo.</p>}
      </section>
      {d.photos.length ? (
        <section className="dcard__sec" aria-label="Fotos y videos"><h2>Lo que encontró el mecánico</h2>
          <ul className="tl-photos">{d.photos.map((p) => <li key={p.id}>{p.kind === "foto" ? <a href={publicPhoto(host, t!, p.id)} target="_blank" rel="noreferrer"><img src={publicPhoto(host, t!, p.id)} alt={p.caption ?? "Foto del diagnóstico"} loading="lazy" /></a> : <a className="tl-photos__video" href={p.url ?? "#"} target="_blank" rel="noopener noreferrer">▶ Ver video</a>}{p.caption ? <span>{p.caption}</span> : null}</li>)}</ul>
        </section>
      ) : null}
      {q.items.length ? (
        <section className="dcard__sec" aria-label="Cotización"><h2>Cotización</h2>
          <ul className="dcard__list">{q.items.map((i) => <li key={i.id}><div><b>{i.description}</b><p>{i.kind === "mano_obra" ? "Mano de obra" : "Repuesto"}{i.qty > 1 ? ` · ${i.qty} × ${formatMoney(i.unitPrice)}` : ""}</p></div><span className="tech__price">{formatMoney(i.qty * i.unitPrice)}</span></li>)}</ul>
          <p className="lede">Mano de obra {formatMoney(q.labor)} · Repuestos {formatMoney(q.parts)}</p>
          <p className="tl-total">Total <strong>{formatMoney(q.total)}</strong></p>
          {q.note ? <p className="field__hint">{q.note}</p> : null}
          {q.status === "aprobada" ? <p className="note" role="status">✅ Aprobada por {q.approvedName}{q.approvedAt ? ` el ${dateCO(q.approvedAt)} a las ${timeCO(q.approvedAt)}` : ""}.</p> : null}
          {q.status === "rechazada" ? <p className="note" role="status">Esta cotización no fue aprobada. Si quieres cambios, llama al taller.</p> : null}
          {q.canDecide ? (
            asking === null ? (
              <div className="tl-decide"><button className="btn btn--primary tech__big" onClick={() => { setAsking("aprobar"); setMsg(null); }}>Aprobar reparación</button><button className="btn btn--secondary" onClick={() => { setAsking("rechazar"); setMsg(null); }}>No aprobar</button></div>
            ) : (
              <form className="tl-decide-form" onSubmit={(e) => { e.preventDefault(); void decide(asking); }} noValidate>
                {asking === "aprobar" ? <div className="field"><label htmlFor="dc-n">Escribe tu nombre completo para aprobar</label><input id="dc-n" type="text" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setMsg(null); }} /><p className="field__hint">Al aprobar autorizas al taller a realizar los trabajos y repuestos de esta cotización por {formatMoney(q.total)}.</p></div>
                  : <div className="field"><label htmlFor="dc-r">¿Por qué no la apruebas? (opcional)</label><input id="dc-r" type="text" maxLength={200} value={reason} autoComplete="off" onChange={(e) => setReason(e.target.value)} /></div>}
                <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>
                <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setAsking(null)}>Volver</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Enviando…" : asking === "aprobar" ? "Confirmar aprobación" : "Confirmar"}</button></div>
              </form>
            )
          ) : null}
        </section>
      ) : null}
      {d.paid > 0 || d.balance > 0 ? <section className="dcard__sec" aria-label="Pagos"><h2>Pagos</h2><p>Pagado {formatMoney(d.paid)} · Saldo {formatMoney(d.balance)}</p></section> : null}
      <section className="dcard__sec" aria-label="Historial"><h2>Historial de tu orden</h2>
        <ul className="plain-list">{[...d.events].reverse().map((e) => <li key={e.id}><b>{STATUS_TEXT[e.status as keyof typeof STATUS_TEXT]?.label ?? e.status}</b> · {dateCO(e.createdAt)} {timeCO(e.createdAt)}{e.note ? <><br /><span className="field__hint">{e.note}</span></> : null}</li>)}</ul></section>
      <section className="tech__cta">
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar al taller</a> : null}
        <Link className="btn btn--secondary tech__big" href={`/mi-vehiculo?t=${d.portalToken}`}>Ver mi historial y mantenimientos</Link>
      </section>
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}
