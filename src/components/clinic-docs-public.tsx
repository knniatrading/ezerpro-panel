"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dateCO, niceDate, timeCO } from "@/lib/clinic";
import type { ClinicHeader, PublicApptInfo, PublicConsent, PublicRx } from "@/lib/types";

function useToken() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => { setT(new URLSearchParams(window.location.search).get("t") ?? ""); }, []);
  return { t, host: typeof window === "undefined" ? "" : window.location.hostname };
}
const failMsg = (e: unknown) => (e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o ya no está disponible." : e instanceof ApiError ? e.message : "No se pudo cargar. Intenta de nuevo.");
function Boot() { return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>; }
function Fail({ msg }: { msg: string }) { return <div className="landing"><div className="landing__card"><h1>No pudimos abrir el documento</h1><p className="landing__text" role="alert">{msg}</p></div></div>; }

function Letterhead({ c }: { c: ClinicHeader }) {
  return <header className="doc__head">{c.logo ? <img src={c.logo} alt="" className="doc__logo" /> : <span className="doc__logo doc__logo--empty" aria-hidden="true">🦷</span>}
    <div><h1>{c.name}</h1><p>{[c.address, c.phone].filter(Boolean).join(" · ")}</p></div></header>;
}

// ---------- Receta ----------
export function ClinicRxPage() {
  const { t, host } = useToken();
  const [d, setD] = useState<PublicRx | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (t) api<PublicRx>("/public/clinic-rx", { method: "POST", body: JSON.stringify({ host, t }) }).then(setD).catch((e) => setErr(failMsg(e))); else if (t === "") setErr(failMsg(new ApiError(404, ""))); }, [t, host]);
  if (err) return <Fail msg={err} />;
  if (!d) return <Boot />;
  return (
    <div className="doc-wrap">
      <div className="doc-bar no-print"><button className="btn btn--primary" onClick={() => window.print()}>Imprimir o guardar como PDF</button>
        <a className="btn btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(`Receta médica N.º ${d.number} de ${d.clinic.name}: ${window.location.href}`)}`} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a></div>
      <article className="doc">
        <Letterhead c={d.clinic} />
        <div className="doc__title"><h2>Fórmula médica</h2><span>N.º {String(d.number).padStart(5, "0")} · {dateCO(d.createdAt)}</span></div>
        <dl className="kv doc__patient"><dt>Paciente</dt><dd>{d.patient.name}</dd>{d.patient.document ? <><dt>Documento</dt><dd>{d.patient.document}</dd></> : null}{d.patient.birthDate ? <><dt>Nacimiento</dt><dd>{d.patient.birthDate}</dd></> : null}{d.diagnosis ? <><dt>Diagnóstico</dt><dd>{d.diagnosis}</dd></> : null}</dl>
        <h3>Prescripción</h3>
        <ol className="doc__items">{d.items.map((i, k) => <li key={k}><b>{i.drug}</b>{i.dose ? <div>{i.dose}</div> : null}{i.instructions ? <div className="doc__muted">{i.instructions}</div> : null}</li>)}</ol>
        {d.notes ? <><h3>Indicaciones generales</h3><p className="prewrap">{d.notes}</p></> : null}
        <footer className="doc__sign">{d.doctor.signature ? <img src={d.doctor.signature} alt="Firma del doctor" /> : <span className="doc__line" />}
          <b>{d.doctor.name}</b><span>{[d.doctor.specialty, d.doctor.license ? `Reg. profesional ${d.doctor.license}` : ""].filter(Boolean).join(" · ")}</span></footer>
      </article>
    </div>
  );
}

// ---------- Consentimiento ----------
function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  }, []);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) * ref.current!.width) / r.width, y: ((e.clientY - r.top) * ref.current!.height) / r.height }; };
  const down = (e: React.PointerEvent) => { e.preventDefault(); ref.current!.setPointerCapture(e.pointerId); drawing.current = true; const p = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke(); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const p = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.lineTo(p.x, p.y); ctx.stroke(); dirty.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current!.toDataURL("image/png")); };
  function clear() { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); dirty.current = false; onChange(null); }
  return (
    <div className="sigpad"><canvas ref={ref} width={600} height={200} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Recuadro para dibujar tu firma con el dedo o el mouse" />
      <button type="button" className="btn btn--secondary btn--sm" onClick={clear}>Borrar firma</button></div>
  );
}

export function ClinicConsentPage() {
  const { t, host } = useToken();
  const [d, setD] = useState<PublicConsent | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<PublicConsent>("/public/clinic-consent", { method: "POST", body: JSON.stringify({ host, t }) }).then(setD).catch((e) => setErr(failMsg(e)));
  useEffect(() => { if (t) void load(); else if (t === "") setErr(failMsg(new ApiError(404, ""))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [t, host]);
  if (err) return <Fail msg={err} />;
  if (!d) return <Boot />;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) return setMsg("Marca la casilla para aceptar el consentimiento.");
    if (name.trim().length < 3) return setMsg("Escribe tu nombre completo.");
    if (!sig) return setMsg("Dibuja tu firma en el recuadro.");
    setBusy(true); setMsg(null);
    try { await api("/public/clinic-consent/sign", { method: "POST", body: JSON.stringify({ host, t, accept: true, name: name.trim(), signature: sig }) }); await load(); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "Algo salió mal."); } finally { setBusy(false); }
  }
  const signed = d.status === "firmado";
  return (
    <div className="doc-wrap">
      {signed ? <div className="doc-bar no-print"><button className="btn btn--primary" onClick={() => window.print()}>Imprimir o guardar como PDF</button></div> : null}
      <article className="doc">
        <Letterhead c={d.clinic} />
        <div className="doc__title"><h2>{d.title}</h2><span>{dateCO(d.createdAt)}</span></div>
        <dl className="kv doc__patient"><dt>Paciente</dt><dd>{d.patient.name}</dd>{d.patient.document ? <><dt>Documento</dt><dd>{d.patient.document}</dd></> : null}{d.doctorName ? <><dt>Profesional</dt><dd>{d.doctorName}</dd></> : null}</dl>
        <div className="doc__body prewrap">{d.body}</div>
        {signed ? (
          <footer className="doc__sign">{d.signature ? <img src={d.signature} alt="Firma del paciente" /> : null}<b>{d.signedName}</b><span>Firmado el {niceDate(d.signedAt ?? d.createdAt)} a las {timeCO(d.signedAt ?? d.createdAt)}</span></footer>
        ) : (
          <form onSubmit={submit} noValidate className="no-print doc__form">
            <label className="check"><input type="checkbox" checked={accept} onChange={(e) => { setAccept(e.target.checked); setMsg(null); }} /> He leído este documento, entiendo su contenido y doy mi consentimiento.</label>
            <div className="field"><label htmlFor="cn-name">Nombre completo</label><input id="cn-name" type="text" value={name} autoComplete="name" onChange={(e) => { setName(e.target.value); setMsg(null); }} /></div>
            <div className="field"><span className="label">Tu firma</span><SignaturePad onChange={(p) => { setSig(p); setMsg(null); }} /></div>
            <div role="alert" className="form-error-slot">{msg ? <p className="form-error">{msg}</p> : null}</div>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Firmando…" : "Firmar consentimiento"}</button>
          </form>
        )}
      </article>
    </div>
  );
}

// ---------- Confirmar / cancelar cita ----------
export function ClinicApptPage() {
  const { t, host } = useToken();
  const [d, setD] = useState<PublicApptInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<PublicApptInfo>("/public/clinic-appt", { method: "POST", body: JSON.stringify({ host, t }) }).then(setD).catch((e) => setErr(failMsg(e)));
  useEffect(() => { if (t) void load(); else if (t === "") setErr(failMsg(new ApiError(404, ""))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [t, host]);
  async function act(action: "confirmar" | "cancelar") {
    setBusy(true); setErr(null);
    try { const r = await api<{ status: string }>("/public/clinic-appt/action", { method: "POST", body: JSON.stringify({ host, t, action }) }); setRes(r.status); await load(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); } finally { setBusy(false); }
  }
  if (!d) return err ? <Fail msg={err} /> : <Boot />;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text">Este servicio está suspendido por el momento.</p></div></div>;
  const st = d.status;
  return (
    <div className="landing"><div className="landing__card">
      <h1>{d.clinic?.name}</h1>
      <p className="landing__text">Hola {d.patientName?.split(" ")[0]}, esta es tu cita de <b>{d.serviceName}</b> con {d.agendaName}:</p>
      <p className="tech__price" style={{ fontSize: "1.25rem" }}>{niceDate(d.start ?? "")} · {timeCO(d.start ?? "")}</p>
      {res === "confirmada" || (!res && st === "confirmada") ? <p role="status" className="note">✔ Tu cita está confirmada. ¡Te esperamos!</p> : null}
      {st === "cancelada" ? <p role="status" className="note">Esta cita fue cancelada. Si quieres otra, escríbenos o pídela en la página de la clínica.</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {d.open ? <div className="actions-cell">{st === "programada" ? <button className="btn btn--primary" disabled={busy} onClick={() => act("confirmar")}>Confirmar asistencia</button> : null}<button className="btn btn--danger-ghost" disabled={busy} onClick={() => act("cancelar")}>Cancelar cita</button></div> : null}
      {d.clinic?.phone ? <p className="field__hint">¿Necesitas cambiarla? Llama al <a href={`tel:${d.clinic.phone}`}>{d.clinic.phone}</a>{d.clinic.address ? ` · ${d.clinic.address}` : ""}</p> : null}
    </div></div>
  );
}
