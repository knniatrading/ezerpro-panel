"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { PET_TEXT, VISIT_KINDS, VISIT_KIND_TEXT, VISIT_STATUS, dtCO, hourCO, waLink } from "@/lib/residential";
import type { ResDirRow, ResParcel, ResScan, ResVisit } from "@/lib/residential";
import { NoAccess } from "./no-access";
import { ADMIN_GATE, Dlg, Empty, Err, Pill, Tabs, UnitSelect, errMsg, useResAccess, useUnitOptions } from "./res-common";

type BD = { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Cámara para leer el código QR (si el navegador lo permite) o escribir el código a mano. */
export function Scanner({ onCode }: { onCode: (c: string) => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
  useEffect(() => {
    if (!on) return;
    let stop = false; let stream: MediaStream | null = null; let timer: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (vid.current) { vid.current.srcObject = stream; await vid.current.play(); }
        const Det = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => BD }).BarcodeDetector;
        const det = new Det({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (stop || !vid.current) return;
          try { const r = await det.detect(vid.current); if (r[0]?.rawValue) { const v = r[0].rawValue; const m = v.match(/[?&]c=([A-Za-z0-9]+)/); stop = true; setOn(false); onCode((m ? m[1] : v).trim()); } } catch { /* sigue intentando */ }
        }, 400);
      } catch { setMsg("No se pudo abrir la cámara. Escribe el código a mano."); setOn(false); }
    })();
    return () => { stop = true; if (timer) clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [on, onCode]);
  return (
    <div>
      {supported ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setMsg(null); setOn(!on); }}>{on ? "Cerrar cámara" : "Escanear QR con la cámara"}</button> : <p className="field__hint">Este navegador no lee QR con la cámara: escribe el código de 10 letras o usa la cámara del celular para abrir el enlace.</p>}
      {on ? <video ref={vid} muted playsInline style={{ width: "100%", maxWidth: 360, borderRadius: 12, marginTop: 8 }} aria-label="Cámara para escanear el QR" /> : null}
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}
    </div>
  );
}

function ScanBox({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<ResScan | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (c: string) => {
    setErr(null); setRes(null);
    if (c.trim().length < 4) return setErr("Escribe el código completo.");
    setBusy(true);
    try { setRes(await api<ResScan>("/residential/visitors/scan", { method: "POST", body: JSON.stringify({ code: c.trim() }) })); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }, []);
  async function act(kind: "enter" | "exit") {
    if (!res) return;
    setBusy(true); setErr(null);
    try { const v = await api<ResVisit>(`/residential/visitors/${res.visit.id}/${kind}`, { method: "POST", body: JSON.stringify({}) }); setRes({ ...res, visit: v, canEnter: false, canExit: kind === "enter", reason: kind === "enter" ? "Ya está adentro." : "Ya salió." }); onDone(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  const v = res?.visit;
  return (
    <section className="dcard__sec" aria-label="Escanear visita"><h2>Escanear código de visita</h2>
      <form onSubmit={(e) => { e.preventDefault(); void run(code); }} className="field-row" noValidate>
        <div className="field"><label htmlFor="sc-c">Código</label><input id="sc-c" type="text" value={code} maxLength={16} autoComplete="off" autoCapitalize="characters" placeholder="Ej. K7M2Q9XA4B" onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(null); }} /></div>
        <button type="submit" className="btn btn--primary" disabled={busy}>Revisar</button>
      </form>
      <Scanner onCode={(c) => { setCode(c.toUpperCase()); void run(c); }} />
      <Err msg={err} />
      {v && res ? (
        <div className={`note${res.canEnter || res.canExit ? "" : " note--warn"}`} role="status" style={{ marginTop: 12 }}>
          <p><b style={{ fontSize: 20 }}>{v.name}</b> <Pill tone={VISIT_STATUS[v.status]?.tone ?? "info"}>{VISIT_STATUS[v.status]?.label ?? v.status}</Pill></p>
          <p>Visita a <b>{v.unit}</b> · {VISIT_KIND_TEXT[v.kind] ?? v.kind}{v.plate ? ` · placa ${v.plate}` : ""}</p>
          <p className="field__hint">Válida de {dtCO(v.validFrom)} a {dtCO(v.validUntil)}</p>
          {res.people.length ? <p className="field__hint">Residentes: {res.people.map((p) => p.name).join(", ")}</p> : null}
          {!res.canEnter && !res.canExit ? <p className="form-error">{res.reason}</p> : null}
          <div className="actions-cell">
            {res.canEnter ? <button className="btn btn--primary" disabled={busy} onClick={() => act("enter")}>Registrar entrada</button> : null}
            {res.canExit ? <button className="btn btn--secondary" disabled={busy} onClick={() => act("exit")}>Registrar salida</button> : null}
            {res.people.filter((p) => p.phone).slice(0, 1).map((p) => <a key={p.name} className="btn btn--secondary btn--sm" href={`tel:${p.phone}`}>Llamar a {p.name.split(" ")[0]}</a>)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WalkInForm({ units, onClose, onDone }: { units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ unitId: "", name: "", document: "", plate: "", kind: "visita" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad que visita.");
    if (f.name.trim().length < 2) return setErr("Escribe el nombre del visitante.");
    setBusy(true);
    try { await api("/residential/visitors/walk-in", { method: "POST", body: JSON.stringify({ unitId: f.unitId, name: f.name.trim(), document: f.document.trim() || null, plate: f.plate.trim() || null, kind: f.kind }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Visita sin código</h2>
      <p className="lede">Para quien llega sin QR: confirma con el residente y regístralo. Entra de una vez.</p>
      <UnitSelect id="wi-u" value={f.unitId} onChange={(v) => { setF({ ...f, unitId: v }); setErr(null); }} opts={units} label="¿A qué unidad va?" />
      <div className="field-row">
        <div className="field"><label htmlFor="wi-n">Nombre</label><input id="wi-n" type="text" value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
        <div className="field"><label htmlFor="wi-d">Documento</label><input id="wi-d" type="text" value={f.document} autoComplete="off" onChange={(e) => setF({ ...f, document: e.target.value })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="wi-p">Placa (si trae vehículo)</label><input id="wi-p" type="text" value={f.plate} autoComplete="off" onChange={(e) => setF({ ...f, plate: e.target.value.toUpperCase() })} /></div>
        <div className="field"><label htmlFor="wi-k">Tipo</label><select id="wi-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{VISIT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
      </div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar y dejar entrar"}</button></div>
    </form>
  );
}

function ParcelForm({ units, onClose, onDone }: { units: ReturnType<typeof useUnitOptions>; onClose: () => void; onDone: (p: ResParcel) => void }) {
  const [f, setF] = useState({ unitId: "", carrier: "", description: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad.");
    setBusy(true);
    try { const p = await api<ResParcel>("/residential/parcels", { method: "POST", body: JSON.stringify({ unitId: f.unitId, carrier: f.carrier.trim() || null, description: f.description.trim() || null }) }); onDone(p); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Registrar paquete</h2>
      <UnitSelect id="pc-u" value={f.unitId} onChange={(v) => { setF({ ...f, unitId: v }); setErr(null); }} opts={units} label="Unidad destino" />
      <div className="field-row">
        <div className="field"><label htmlFor="pc-c">Empresa</label><input id="pc-c" type="text" value={f.carrier} placeholder="Amazon, Mercado Libre, Servientrega…" autoComplete="off" onChange={(e) => setF({ ...f, carrier: e.target.value })} /></div>
        <div className="field"><label htmlFor="pc-d">Descripción</label><input id="pc-d" type="text" value={f.description} placeholder="Caja mediana" autoComplete="off" onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <p className="field__hint">Al guardar, el residente recibe el aviso «Tienes un paquete esperando en portería».</p>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar y avisar"}</button></div>
    </form>
  );
}

function DeliverForm({ p, onClose, onDone }: { p: ResParcel; onClose: () => void; onDone: () => void }) {
  const [who, setWho] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (who.trim().length < 2) return setErr("Escribe quién lo recibe."); try { await api(`/residential/parcels/${p.id}/deliver`, { method: "POST", body: JSON.stringify({ deliveredTo: who.trim() }) }); onDone(); } catch (x) { setErr(errMsg(x)); } }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Entregar paquete</h2>
      <p className="lede">{p.unit}{p.carrier ? ` · ${p.carrier}` : ""}{p.description ? ` · ${p.description}` : ""}</p>
      <div className="field"><label htmlFor="dl-w">¿Quién lo recibe?</label><input id="dl-w" type="text" value={who} autoComplete="off" onChange={(e) => { setWho(e.target.value); setErr(null); }} /></div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary">Marcar entregado</button></div>
    </form>
  );
}

function Directory() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ResDirRow[] | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRows(null); return; }
    const h = setTimeout(() => { api<ResDirRow[]>(`/residential/directory?q=${encodeURIComponent(q.trim())}`).then(setRows).catch(() => setRows([])); }, 250);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <div>
      <div className="agenda-bar"><label>Buscar <input type="search" value={q} placeholder="Placa, unidad, nombre o mascota" onChange={(e) => setQ(e.target.value)} /></label></div>
      {rows && !rows.length ? <Empty>No encontramos nada con esa búsqueda.</Empty> : null}
      <div className="vet-grid">
        {(rows ?? []).map((r) => (
          <section key={r.id} className="dcard__sec"><h2>{r.label}</h2>
            {r.parcels ? <p><Pill tone="warn">{r.parcels} paquete(s) en portería</Pill></p> : null}
            <ul className="dcard__list">{r.people.map((p, i) => <li key={i}><div><b>{p.name}</b><p>{p.role}{p.phone ? ` · ${p.phone}` : ""}</p></div>{p.phone ? <a className="btn btn--secondary btn--sm" href={`tel:${p.phone}`}>Llamar</a> : null}</li>)}</ul>
            {r.vehicles.length ? <p>{r.vehicles.map((v) => <span key={v.plate} className="dcard__plate dcard__plate--sm" style={{ marginRight: 6 }}>{v.plate}</span>)}<span className="field__hint"> {r.vehicles.map((v) => [v.brand, v.color].filter(Boolean).join(" ")).filter(Boolean).join(" · ")}</span></p> : null}
            {r.pets.length ? <p className="field__hint">🐾 {r.pets.map((p) => `${p.name} (${PET_TEXT[p.species] ?? p.species}${p.notes ? `, ${p.notes}` : ""})`).join(" · ")}</p> : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export function ResGateView() {
  const { state, allowed } = useResAccess(ADMIN_GATE);
  const [tab, setTab] = useState<"visits" | "parcels" | "search">("visits");
  const [view, setView] = useState<"dentro" | "esperadas" | "recientes">("dentro");
  const [pview, setPview] = useState<"esperando" | "entregado">("esperando");
  const visits = useResource<ResVisit[]>(allowed ? `/residential/visitors?view=${view}` : null);
  const parcels = useResource<ResParcel[]>(allowed ? `/residential/parcels?status=${pview}` : null);
  const units = useUnitOptions(allowed);
  const [dlg, setDlg] = useState<null | "walk" | "parcel" | { deliver: ResParcel } | { sent: ResParcel }>(null);
  const [err, setErr] = useState<string | null>(null);
  const vReload = visits.reload, pReload = parcels.reload;
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) { vReload(); pReload(); } }, 20000); return () => clearInterval(t); }, [vReload, pReload]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const close = () => setDlg(null);
  async function exit(v: ResVisit) { try { await api(`/residential/visitors/${v.id}/exit`, { method: "POST", body: JSON.stringify({}) }); visits.reload(); } catch (x) { setErr(errMsg(x)); } }
  async function enter(v: ResVisit) { try { await api(`/residential/visitors/${v.id}/enter`, { method: "POST", body: JSON.stringify({}) }); visits.reload(); } catch (x) { setErr(errMsg(x)); } }
  async function markWa(p: ResParcel) { try { await api(`/residential/parcels/${p.id}/wa`, { method: "POST", body: JSON.stringify({}) }); parcels.reload(); } catch { /* no es crítico */ } }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Portería</h1><p className="lede">Visitas con código QR, paquetes y consulta de residentes.</p></div>
        <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setDlg("parcel")}>Registrar paquete</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("walk")}>Visita sin código</button></div></div>
      <Tabs tabs={[["visits", "Visitas"], ["parcels", "Paquetes"], ["search", "Buscar residente o placa"]]} value={tab} onChange={setTab} />
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {tab === "visits" ? (
        <>
          <ScanBox onDone={visits.reload} />
          <div className="chips" role="group" aria-label="Ver">{([["dentro", "Adentro ahora"], ["esperadas", "Esperadas"], ["recientes", "Últimos 3 días"]] as const).map(([v, l]) => <button key={v} type="button" className={view === v ? "is-on" : ""} aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>)}</div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Visitante</th><th>Unidad</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>
            {(visits.data ?? []).map((v) => (
              <tr key={v.id}><td><b>{v.name}</b>{v.plate ? <><br /><span className="dcard__plate dcard__plate--sm">{v.plate}</span></> : null}</td><td>{v.unit}</td><td>{VISIT_KIND_TEXT[v.kind] ?? v.kind}</td>
                <td><Pill tone={VISIT_STATUS[v.status]?.tone ?? "info"}>{VISIT_STATUS[v.status]?.label ?? v.status}</Pill><br /><span className="field__hint">{v.enteredAt ? `Entró ${hourCO(v.enteredAt)}` : `Hasta ${dtCO(v.validUntil)}`}{v.exitedAt ? ` · salió ${hourCO(v.exitedAt)}` : ""}</span></td>
                <td className="actions-cell">{v.status === "dentro" ? <button className="btn btn--secondary btn--sm" onClick={() => exit(v)}>Registrar salida</button> : v.status === "esperada" ? <button className="btn btn--secondary btn--sm" onClick={() => enter(v)}>Dejar entrar</button> : null}</td></tr>
            ))}
          </tbody></table></div>
          {visits.data && !visits.data.length ? <Empty>{view === "dentro" ? "No hay nadie adentro ahora." : view === "esperadas" ? "No hay visitas esperadas." : "Sin movimientos recientes."}</Empty> : null}
        </>
      ) : null}
      {tab === "parcels" ? (
        <>
          <div className="chips" role="group" aria-label="Ver">{([["esperando", "Esperando en portería"], ["entregado", "Entregados"]] as const).map(([v, l]) => <button key={v} type="button" className={pview === v ? "is-on" : ""} aria-pressed={pview === v} onClick={() => setPview(v)}>{l}</button>)}</div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Unidad</th><th>Paquete</th><th>Llegó</th><th></th></tr></thead><tbody>
            {(parcels.data ?? []).map((p) => (
              <tr key={p.id}><td><b>{p.unit}</b></td><td>{p.carrier ?? "Paquete"}{p.description ? ` · ${p.description}` : ""}</td>
                <td>{dtCO(p.receivedAt)}{p.deliveredAt ? <><br /><span className="field__hint">Entregado {dtCO(p.deliveredAt)}{p.deliveredTo ? ` a ${p.deliveredTo}` : ""}</span></> : null}</td>
                <td className="actions-cell">{p.status === "esperando" ? <>{p.wa.slice(0, 2).map((w) => <a key={w.link} className="btn btn--secondary btn--sm" href={w.link} target="_blank" rel="noopener noreferrer" onClick={() => markWa(p)}>WhatsApp a {w.name.split(" ")[0]}</a>)}<button className="btn btn--primary btn--sm" onClick={() => setDlg({ deliver: p })}>Entregar</button></> : null}</td></tr>
            ))}
          </tbody></table></div>
          {parcels.data && !parcels.data.length ? <Empty>{pview === "esperando" ? "No hay paquetes esperando." : "Aún no hay entregas."}</Empty> : null}
        </>
      ) : null}
      {tab === "search" ? <Directory /> : null}
      <Dlg open={dlg === "walk"} onClose={close}>{dlg === "walk" ? <WalkInForm units={units} onClose={close} onDone={() => { close(); visits.reload(); }} /> : null}</Dlg>
      <Dlg open={dlg === "parcel"} onClose={close}>{dlg === "parcel" ? <ParcelForm units={units} onClose={close} onDone={(p) => { parcels.reload(); setDlg({ sent: p }); }} /> : null}</Dlg>
      <Dlg open={typeof dlg === "object" && dlg !== null && "deliver" in dlg} onClose={close}>{typeof dlg === "object" && dlg && "deliver" in dlg ? <DeliverForm p={dlg.deliver} onClose={close} onDone={() => { close(); parcels.reload(); }} /> : null}</Dlg>
      <Dlg open={typeof dlg === "object" && dlg !== null && "sent" in dlg} onClose={close}>{typeof dlg === "object" && dlg && "sent" in dlg ? (
        <div><h2 id="dlg-title" tabIndex={-1}>Paquete registrado</h2>
          <p className="lede">Se avisó a {dlg.sent.unit} por el portal. Si quieres avisar también por WhatsApp, un clic:</p>
          <div className="actions-cell">{dlg.sent.wa.map((w) => <a key={w.link} className="btn btn--secondary btn--sm" href={w.link} target="_blank" rel="noopener noreferrer">WhatsApp a {w.name}</a>)}{!dlg.sent.wa.length ? <span className="field__hint">Esta unidad no tiene celular registrado.</span> : null}</div>
          <div className="dialog__actions"><button className="btn btn--primary" onClick={close}>Listo</button></div></div>
      ) : null}</Dlg>
    </div>
  );
}
void waLink;
