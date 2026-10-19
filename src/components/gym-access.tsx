"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { dueText, niceDate } from "@/lib/gym";
import { timeCO } from "@/lib/vet";
import type { GymAccessResult, GymCheckinRow, GymMember } from "@/lib/types";
import { Modal } from "./modal";
import { NoAccess } from "./no-access";
import { MemberAvatar, useGymAccess } from "./gym-common";
import { PayDialog } from "./gym-members";

/** Recepción: escanea el QR del socio (o búscalo) y muestra verde si está al día y rojo si no. */
export function GymAccessView() {
  const { state, allowed } = useGymAccess(["TENANT_ADMIN", "CASHIER"]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ code: "", at: 0 });
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [res, setRes] = useState<GymAccessResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pay, setPay] = useState(false);
  const checkins = useResource<GymCheckinRow[]>(allowed ? "/gym/checkins" : null);
  const found = useResource<GymMember[]>(allowed && q.trim().length >= 2 ? `/gym/members?q=${encodeURIComponent(q.trim())}` : null);

  const send = useCallback(async (body: Record<string, string>) => {
    setErr(null);
    try {
      const r = await api<GymAccessResult>("/gym/access", { method: "POST", body: JSON.stringify(body) });
      setRes(r);
      checkins.reload();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
  }, [checkins]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);
  useEffect(() => stop, [stop]);

  async function start() {
    setCamErr(null);
    if (!navigator.mediaDevices?.getUserMedia) return setCamErr("Este navegador no permite usar la cámara. Busca al socio por nombre.");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = s;
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = s;
      await v.play();
      setScanning(true);
    } catch {
      setCamErr("No pudimos abrir la cámara. Permite el acceso a la cámara en tu navegador, o busca al socio por nombre.");
    }
  }

  useEffect(() => {
    if (!scanning) return;
    let raf = 0;
    let off = false;
    const tick = () => {
      if (off) return;
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.readyState >= 2 && v.videoWidth && !busyRef.current) {
        const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w);
        c.width = w; c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          const t = code?.data?.trim() ?? "";
          if (/^G1\./.test(t) && !(lastRef.current.code === t && Date.now() - lastRef.current.at < 4000)) {
            lastRef.current = { code: t, at: Date.now() };
            busyRef.current = true;
            send({ pass: t }).finally(() => { setTimeout(() => { busyRef.current = false; }, 1500); });
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { off = true; cancelAnimationFrame(raf); };
  }, [scanning, send]);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const m = res?.member;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Acceso</h1><p className="lede">Escanea el QR del socio desde su celular. Verde: puede entrar. Rojo: debe ponerse al día.</p></div></div>

      {res ? (
        <section className={`access access--${res.color}`} role="alert" aria-live="assertive">
          <div className="access__who">
            {m ? <MemberAvatar m={m} size={88} /> : null}
            <div>
              <p className="access__msg">{res.color === "green" ? "✔ " : "✖ "}{res.message}</p>
              {m ? <><h2>{m.name}</h2><p>{m.planName ?? "Sin plan"} · {dueText(m.daysLeft, m.paidUntil)}{m.paidUntil ? ` (${niceDate(m.paidUntil)})` : ""}</p>{res.repeated ? <p><b>Ya había entrado hace un momento.</b></p> : null}{m.routines ? <p>Tiene {m.routines} rutina{m.routines === 1 ? "" : "s"} asignada{m.routines === 1 ? "" : "s"}.</p> : null}</> : null}
            </div>
          </div>
          <div className="actions-cell">
            {m && res.color === "red" ? <button type="button" className="btn btn--primary" onClick={() => setPay(true)}>Cobrar membresía</button> : null}
            <button type="button" className="btn btn--secondary" onClick={() => setRes(null)}>Siguiente</button>
          </div>
        </section>
      ) : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}

      <div className="scanner">
        <div className={`scanner__box${scanning ? " is-on" : ""}`}>
          <video ref={videoRef} playsInline muted aria-label="Cámara para escanear el QR" />
          <canvas ref={canvasRef} hidden />
          {!scanning ? <p className="scanner__hint">La cámara está apagada</p> : null}
        </div>
        <div className="actions-cell">
          {!scanning ? <button type="button" className="btn btn--primary" onClick={start}>Encender cámara y escanear</button> : <button type="button" className="btn btn--secondary" onClick={stop}>Apagar cámara</button>}
        </div>
        {camErr ? <p className="form-error" role="alert">{camErr}</p> : null}
      </div>

      <h2 className="section-title">Buscar socio</h2>
      <div className="field"><label htmlFor="ac-q">Nombre, celular, documento o código</label><input id="ac-q" type="search" value={q} autoComplete="off" onChange={(e) => setQ(e.target.value)} /></div>
      {q.trim().length >= 2 && found.data && !found.data.length ? <p className="field__hint">No encontramos a nadie con ese dato.</p> : null}
      <ul className="dcard__list">
        {(q.trim().length >= 2 ? found.data ?? [] : []).slice(0, 8).map((x) => (
          <li key={x.id}><div className="pet-cell"><MemberAvatar m={x} size={36} /><div><b>{x.name}</b><p>{x.planName ?? "Sin plan"} · {dueText(x.daysLeft, x.paidUntil)}</p></div></div>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => { send({ memberId: x.id }); setQ(""); }}>Dejar entrar</button></li>
        ))}
      </ul>

      <h2 className="section-title">Entradas de hoy</h2>
      {checkins.data && !checkins.data.length ? <p className="field__hint">Aún no hay entradas hoy.</p> : null}
      <ul className="dcard__list">
        {(checkins.data ?? []).slice(0, 30).map((c) => <li key={c.id}><div><b>{c.member.name}</b><p>{timeCO(c.at)} · {c.member.planName ?? "Sin plan"}</p></div><span className={`badge ${c.ok ? "badge--ok" : "badge--warn"}`}>{c.ok ? "Entró" : "Rechazado"}</span></li>)}
      </ul>

      <Modal open={pay} onClose={() => setPay(false)}>
        {pay && m ? <PayDialog member={{ id: m.id, name: m.name, planId: null, planName: m.planName, paidUntil: m.paidUntil }} onClose={() => setPay(false)} onDone={() => { setPay(false); setRes(null); checkins.reload(); }} /> : null}
      </Modal>
    </div>
  );
}
