"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { ASM_KINDS, ASM_STATUS, BASES, DOC_KINDS, DOC_TEXT, EVENT_TEXT, MAJORITIES, MINUTES_STATUS, MODE_TEXT, dateLongCO, dtCO, hourCO, pct } from "@/lib/residential";
import type { ResEvidence, ResInvite, ResLive, ResMinutes, ResMotion } from "@/lib/residential";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { AssemblyForm } from "./res-assemblies";
import { Scanner } from "./res-gate";
import { ADMIN_BOARD, ALL, CopyBtn, Dlg, Empty, Err, Pill, Tabs, errMsg, useResAccess } from "./res-common";

// ---------- Quórum ----------
function QuorumCard({ q, status }: { q: ResLive["quorum"]; status: string }) {
  const tone = q.hasQuorum ? "var(--ok, #1a7f4b)" : "var(--warn, #b45309)";
  return (
    <section className="dcard__sec res-quorum" aria-label="Quórum" aria-live="polite">
      <h2>Quórum</h2>
      <p className="res-big" style={{ color: tone }}>{pct(q.pct, 2)}</p>
      <div className="res-bar" role="img" aria-label={`Participación ${pct(q.pct)} de ${pct(q.required, 0)} requerido`}><i style={{ width: `${Math.min(100, q.pct)}%`, background: tone }} /><b style={{ left: `${Math.min(100, q.required)}%` }} title={`Mínimo ${q.required} %`} /></div>
      <p><b>{q.hasQuorum ? "✔ Hay quórum" : "✖ Sin quórum"}</b> <span className="field__hint">(se necesita {pct(q.required, 0)} del total de coeficientes)</span></p>
      <div className="kpis"><div className="kpi"><span>Unidades presentes</span><strong>{q.unitsPresent} / {q.unitsTotal}</strong></div><div className="kpi"><span>Coeficiente presente</span><strong>{pct(q.coefPresent, 4)}</strong></div><div className="kpi"><span>Por poder</span><strong>{q.proxies}</strong></div>{q.unverified ? <div className="kpi kpi--warn"><span>Sin verificar</span><strong>{q.unverified}</strong></div> : null}</div>
      {status === "convocada" ? <p className="field__hint">La asamblea todavía no ha iniciado; la asistencia ya se puede ir registrando.</p> : null}
    </section>
  );
}

// ---------- Asistencia ----------
function Attendance({ id, live, canAct, reload }: { id: string; live: ResLive; canAct: boolean; reload: () => void }) {
  const open = live.assembly.status === "convocada" || live.assembly.status === "en_curso";
  const invites = useResource<ResInvite[]>(open && canAct ? `/residential/assemblies/${id}/invites` : null);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const post = useCallback(async (path: string, body: unknown, ok?: (r: { added?: string[]; skipped?: unknown[]; person?: string; quorum?: { changed?: string | null } }) => string) => {
    setErr(null); setMsg(null);
    try { const r = await api<{ added?: string[]; skipped?: unknown[]; person?: string; quorum?: { changed?: string | null } }>(`/residential/assemblies/${id}/${path}`, { method: "POST", body: JSON.stringify(body) }); if (ok) setMsg(ok(r)); reload(); } catch (x) { setErr(errMsg(x)); }
  }, [id, reload]);
  const checkIn = (body: Record<string, unknown>) => post("attendance", body, (r) => `${r.person ?? "Persona"} registrada${r.added?.length ? `: ${r.added.join(", ")}` : ""}${r.skipped?.length ? ` (${r.skipped.length} unidad(es) ya estaban representadas)` : ""}.${r.quorum?.changed === "alcanzado" ? " ¡Se alcanzó el quórum!" : ""}`);
  const t = q.trim().toLowerCase();
  const found = t.length >= 2 ? (invites.data ?? []).filter((i) => `${i.name} ${i.units.join(" ")}`.toLowerCase().includes(t)).slice(0, 8) : [];
  const closed = live.assembly.status === "cerrada";
  const present = closed ? live.attendance : live.attendance.filter((a) => !a.leftAt);
  const away = closed ? [] : live.attendance.filter((a) => a.leftAt);
  const pendingProxies = live.proxies.filter((p) => !p.used && !p.holderPersonId && !live.attendance.some((a) => a.unitId === p.unitId && !a.leftAt));
  return (
    <div>
      {open && canAct ? (
        <section className="dcard__sec" aria-label="Registrar asistencia no-print"><h2>Registrar ingreso</h2>
          <Scanner onCode={(c) => checkIn({ code: c, verified })} />
          <div className="agenda-bar"><label>Buscar propietario <input type="search" value={q} placeholder="Nombre o unidad" onChange={(e) => setQ(e.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Ya verifiqué su documento</label></div>
          {found.length ? <ul className="dcard__list">{found.map((i) => <li key={i.id}><div><b>{i.name}</b><p>{i.units.join(", ")} · {pct(i.coefficient, 4)}</p></div><button className="btn btn--primary btn--sm" onClick={() => { void checkIn({ personId: i.personId, verified }); setQ(""); }}>Registrar ingreso</button></li>)}</ul> : t.length >= 2 ? <p className="field__hint">Sin resultados entre los convocados.</p> : null}
          {pendingProxies.length ? <><h3>Apoderados por registrar</h3><ul className="dcard__list">{pendingProxies.map((p) => <li key={p.id}><div><b>{p.holderName}</b><p>Poder de {p.unit}</p></div><button className="btn btn--secondary btn--sm" onClick={() => post("attendance/proxy", { proxyId: p.id, verified }, () => `${p.holderName} registrado como apoderado de ${p.unit}.`)}>Registrar apoderado</button></li>)}</ul></> : null}
          {msg ? <p className="note" role="status">{msg}</p> : null}<Err msg={err} />
        </section>
      ) : null}
      <h3>{closed ? `Asistencia registrada (${present.length})` : `Presentes (${present.length})`}</h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Unidad</th><th className="num-r">Coef.</th><th>Representante</th><th>Ingreso</th><th></th></tr></thead><tbody>
        {present.map((a) => <tr key={a.id}><td><b>{a.unit}</b></td><td className="num-r">{pct(a.coefficient, 4)}</td><td>{a.name}{a.proxy ? <> <Pill tone="info">Poder</Pill></> : null}{a.verified ? <> <Pill tone="ok">Verificado</Pill></> : <> <Pill tone="warn">Sin verificar</Pill></>}<br /><span className="field__hint">{a.method === "qr" ? "QR" : a.method === "link" ? "Enlace" : "Manual"}</span></td><td>{hourCO(a.enteredAt)}{closed && a.leftAt ? ` → ${hourCO(a.leftAt)}` : ""}</td>
          <td className="actions-cell">{canAct && live.assembly.status !== "cerrada" ? <>{!a.verified ? <button className="btn btn--secondary btn--sm" onClick={() => post(`attendance/${a.id}/verify`, {}, () => "Identidad verificada.")}>Verificar</button> : null}<button className="btn btn--danger-ghost btn--sm" onClick={() => post("attendance/leave", a.personId ? { personId: a.personId } : { attendanceId: a.id }, (r) => `Retiro registrado.${r.quorum?.changed === "perdido" ? " Se perdió el quórum." : ""}`)}>Se retira</button></> : null}</td></tr>)}
      </tbody></table></div>
      {!present.length ? <Empty>Todavía no hay nadie presente.</Empty> : null}
      {away.length ? <details><summary>Se retiraron ({away.length})</summary><ul className="dcard__list">{away.map((a) => <li key={a.id}><div><b>{a.unit}</b><p>{a.name} · {hourCO(a.enteredAt)} → {a.leftAt ? hourCO(a.leftAt) : ""}</p></div></li>)}</ul></details> : null}
    </div>
  );
}

// ---------- Convocatoria ----------
function DocForm({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", kind: "informe", url: "", note: "" });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.title.trim().length < 3) return setErr("Escribe el título del documento.");
    if (!/^https?:\/\//i.test(f.url.trim())) return setErr("Pega el enlace del documento (empieza por https://).");
    try { await api(`/residential/assemblies/${id}/docs`, { method: "POST", body: JSON.stringify({ title: f.title.trim(), kind: f.kind, url: f.url.trim(), note: f.note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Documento previo</h2>
      <div className="field"><label htmlFor="dc-t">Título</label><input id="dc-t" type="text" value={f.title} placeholder="Estados financieros 2025" autoComplete="off" onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(null); }} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="dc-k">Tipo</label><select id="dc-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{DOC_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
        <div className="field"><label htmlFor="dc-u">Enlace (Drive, Dropbox, etc.)</label><input id="dc-u" type="url" value={f.url} placeholder="https://…" autoComplete="off" onChange={(e) => { setF({ ...f, url: e.target.value }); setErr(null); }} /></div>
      </div>
      <div className="field"><label htmlFor="dc-n">Nota (opcional)</label><input id="dc-n" type="text" value={f.note} autoComplete="off" onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary">Agregar</button></div>
    </form>
  );
}

function ProxyForm({ id, invites, onClose, onDone }: { id: string; invites: ResInvite[]; onClose: () => void; onDone: () => void }) {
  const units = useResource<{ id: string; label: string }[]>("/residential/unit-options");
  const [f, setF] = useState({ unitId: "", holder: "", holderName: "", holderDocument: "", note: "" });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unitId) return setErr("Elige la unidad que otorga el poder.");
    if (!f.holder && f.holderName.trim().length < 2) return setErr("Elige o escribe quién recibe el poder.");
    const body = { unitId: f.unitId, ...(f.holder ? { holderPersonId: f.holder } : { holderName: f.holderName.trim(), holderDocument: f.holderDocument.trim() || null }), note: f.note.trim() || null };
    try { await api(`/residential/assemblies/${id}/proxies`, { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Registrar poder</h2>
      <div className="field"><label htmlFor="px-u">Unidad que da el poder</label><select id="px-u" value={f.unitId} onChange={(e) => { setF({ ...f, unitId: e.target.value }); setErr(null); }}><option value="">Elige la unidad…</option>{(units.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div>
      <div className="field"><label htmlFor="px-h">Apoderado (otro propietario)</label><select id="px-h" value={f.holder} onChange={(e) => { setF({ ...f, holder: e.target.value }); setErr(null); }}><option value="">Otra persona (escribir el nombre abajo)</option>{invites.map((i) => <option key={i.personId} value={i.personId}>{i.name}</option>)}</select></div>
      {!f.holder ? <div className="field-row"><div className="field"><label htmlFor="px-n">Nombre del apoderado</label><input id="px-n" type="text" value={f.holderName} autoComplete="off" onChange={(e) => { setF({ ...f, holderName: e.target.value }); setErr(null); }} /></div><div className="field"><label htmlFor="px-d">Documento</label><input id="px-d" type="text" value={f.holderDocument} autoComplete="off" onChange={(e) => setF({ ...f, holderDocument: e.target.value })} /></div></div> : null}
      <div className="field"><label htmlFor="px-no">Nota (ej. poder firmado y recibido por correo)</label><input id="px-no" type="text" value={f.note} autoComplete="off" onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      <p className="field__hint">Una unidad solo puede dar un poder por asamblea. El apoderado vota por la unidad además de la suya.</p>
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary">Registrar poder</button></div>
    </form>
  );
}

function Convocation({ id, live, canEdit, reload }: { id: string; live: ResLive; canEdit: boolean; reload: () => void }) {
  const inv = useResource<ResInvite[]>(`/residential/assemblies/${id}/invites`);
  const [dlg, setDlg] = useState<null | "doc" | "proxy" | { delDoc: string } | { delProxy: string }>(null);
  const [err, setErr] = useState<string | null>(null);
  const a = live.assembly;
  const locked = a.status === "cerrada";
  const close = () => setDlg(null);
  async function del(path: string) { try { await api(`/residential/assemblies/${id}/${path}`, { method: "DELETE" }); close(); reload(); } catch (x) { setErr(errMsg(x)); close(); } }
  async function wa(i: ResInvite) { try { await api(`/residential/assemblies/${id}/invites/${i.id}/wa`, { method: "POST", body: JSON.stringify({}) }); inv.reload(); } catch { /* no es crítico */ } }
  return (
    <div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <div className="vet-grid">
        <section className="dcard__sec"><h2>Datos de la reunión</h2>
          <p><b>{dateLongCO(a.startsAt)}</b></p>
          <p>{MODE_TEXT[a.mode] ?? a.mode}{a.place ? ` · ${a.place}` : ""}</p>
          {a.link ? <p><a href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a></p> : null}
          <h3>Orden del día</h3><ol>{a.agenda.map((p) => <li key={p.n}>{p.title}</li>)}</ol>
        </section>
        <section className="dcard__sec"><h2>Documentos previos</h2>
          {live.docs.length ? <ul className="dcard__list">{live.docs.map((d) => <li key={d.id}><div><b><a href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a></b><p>{DOC_TEXT[d.kind] ?? d.kind}{d.note ? ` · ${d.note}` : ""}</p></div>{canEdit && !locked ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ delDoc: d.id })}>Quitar</button> : null}</li>)}</ul> : <p className="field__hint">Sin documentos. Agrega los estados financieros, el presupuesto o las propuestas.</p>}
          {canEdit && !locked ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg("doc")}>Agregar documento</button> : null}
        </section>
        <section className="dcard__sec"><h2>Poderes ({live.proxies.length})</h2>
          {live.proxies.length ? <ul className="dcard__list">{live.proxies.map((p) => <li key={p.id}><div><b>{p.unit}</b><p>→ {p.holderName}{p.note ? ` · ${p.note}` : ""}{p.used ? " · ya usado" : ""}</p></div>{canEdit && !locked && !p.used ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ delProxy: p.id })}>Quitar</button> : null}</li>)}</ul> : <p className="field__hint">Ninguna unidad ha dado poder.</p>}
          {canEdit && !locked ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg("proxy")}>Registrar poder</button> : null}
        </section>
      </div>
      <h3>Registro de convocatoria {live.invites.total ? <span className="field__hint">· {live.invites.total} convocados, {live.invites.emailed} por correo, {live.invites.wa} por WhatsApp, {live.invites.viewed} la abrieron</span> : null}</h3>
      {!inv.data?.length ? <Empty>Todavía no se ha enviado la convocatoria. Usa el botón «Convocar» de arriba: se crea el enlace personal de cada propietario y se envía por correo a quienes lo tienen.</Empty> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Propietario</th><th>Unidades</th><th>Entrega</th><th></th></tr></thead><tbody>
          {inv.data.map((i) => <tr key={i.id}><td><b>{i.name}</b></td><td>{i.units.join(", ")}<br /><span className="field__hint">{pct(i.coefficient, 4)}</span></td>
            <td>{i.emailAt ? <Pill tone="ok">Correo {dtCO(i.emailAt)}</Pill> : <Pill tone="info">Sin correo</Pill>} {i.waAt ? <Pill tone="ok">WhatsApp</Pill> : null} {i.viewedAt ? <Pill tone="ok">La abrió</Pill> : <Pill tone="warn">No la ha abierto</Pill>}</td>
            <td className="actions-cell">{i.wa ? <a className="btn btn--secondary btn--sm" href={i.wa} target="_blank" rel="noopener noreferrer" onClick={() => wa(i)}>WhatsApp</a> : null}<CopyBtn text={i.url} label="Copiar enlace" /></td></tr>)}
        </tbody></table></div>
      )}
      <Dlg open={dlg === "doc"} onClose={close}>{dlg === "doc" ? <DocForm id={id} onClose={close} onDone={() => { close(); reload(); }} /> : null}</Dlg>
      <Dlg open={dlg === "proxy"} onClose={close}>{dlg === "proxy" ? <ProxyForm id={id} invites={inv.data ?? []} onClose={close} onDone={() => { close(); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "delDoc" in dlg} title="Quitar documento" message="¿Quitar este documento de la convocatoria?" confirmLabel="Sí, quitar" onConfirm={() => (typeof dlg === "object" && dlg && "delDoc" in dlg ? del(`docs/${dlg.delDoc}`) : undefined)} onClose={close} />
      <ConfirmDialog open={typeof dlg === "object" && dlg !== null && "delProxy" in dlg} title="Quitar poder" message="¿Quitar este poder?" confirmLabel="Sí, quitar" onConfirm={() => (typeof dlg === "object" && dlg && "delProxy" in dlg ? del(`proxies/${dlg.delProxy}`) : undefined)} onClose={close} />
    </div>
  );
}

// ---------- Votaciones ----------
function MotionForm({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", description: "", type: "aprobacion", options: "", majority: "simple", majorityPct: "70", base: "presentes" });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.title.trim().length < 4) return setErr("Escribe la pregunta o proposición.");
    const options = f.options.split("\n").map((x) => x.trim()).filter(Boolean);
    if (f.type === "eleccion" && options.length < 2) return setErr("Una elección necesita al menos 2 opciones (una por línea).");
    const body = { title: f.title.trim(), description: f.description.trim() || null, type: f.type, ...(f.type === "eleccion" ? { options } : {}), majority: f.type === "eleccion" ? "simple" : f.majority, majorityPct: Number(f.majorityPct) || 70, base: f.base };
    try { await api(`/residential/assemblies/${id}/motions`, { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr(errMsg(x)); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva votación</h2>
      <div className="field"><label htmlFor="mo-t">Pregunta o proposición</label><input id="mo-t" type="text" value={f.title} placeholder="¿Aprueba la cuota extraordinaria para la fachada?" autoComplete="off" onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(null); }} /></div>
      <div className="field"><label htmlFor="mo-d">Detalle (opcional)</label><textarea id="mo-d" rows={2} maxLength={600} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="chips" role="group" aria-label="Tipo">{([["aprobacion", "Sí / No / Abstención"], ["eleccion", "Elegir entre opciones"]] as const).map(([v, l]) => <button type="button" key={v} className={f.type === v ? "is-on" : ""} aria-pressed={f.type === v} onClick={() => setF({ ...f, type: v })}>{l}</button>)}</div>
      {f.type === "eleccion" ? <div className="field"><label htmlFor="mo-o">Opciones (una por línea)</label><textarea id="mo-o" rows={4} value={f.options} placeholder={"Candidato A\nCandidato B"} onChange={(e) => { setF({ ...f, options: e.target.value }); setErr(null); }} /></div> : (
        <>
          <div className="field"><label htmlFor="mo-m">Mayoría necesaria</label><select id="mo-m" value={f.majority} onChange={(e) => setF({ ...f, majority: e.target.value })}>{MAJORITIES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
          {f.majority === "calificada" ? <div className="field"><label htmlFor="mo-p">Porcentaje exigido (%)</label><input id="mo-p" type="text" inputMode="numeric" value={f.majorityPct} autoComplete="off" onChange={(e) => setF({ ...f, majorityPct: e.target.value.replace(/\D/g, "").slice(0, 3) })} /><p className="field__hint">Por ejemplo 70 % para las decisiones que la ley o el reglamento exigen reforzadas.</p></div> : null}
          <div className="field"><label htmlFor="mo-b">¿Sobre qué base se cuenta?</label><select id="mo-b" value={f.base} onChange={(e) => setF({ ...f, base: e.target.value })}>{BASES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
        </>
      )}
      <Err msg={err} />
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary">Crear votación</button></div>
    </form>
  );
}

function Results({ m }: { m: ResMotion }) {
  const r = m.result;
  if (!r) return null;
  return (
    <div className="res-results">
      {r.tallies.map((t) => <div key={t.key} className="res-tally"><span>{t.label}</span><div className="res-bar"><i style={{ width: `${Math.min(100, t.pct)}%` }} /></div><b>{pct(t.coef, 4)} · {t.units} un.</b></div>)}
      <p className="field__hint">Votaron {r.voted.units} unidades ({pct(r.voted.coef, 4)}). Base: {r.baseKind === "total" ? "total de coeficientes" : "coeficientes presentes y habilitados"} = {pct(r.baseCoef, 4)}. Mayoría: {r.majority === "calificada" ? `calificada ${r.majorityPct} %` : "simple"}.</p>
      {r.passed === true ? <p><Pill tone="ok">APROBADO</Pill></p> : r.passed === false ? <p><Pill tone="warn">NO APROBADO</Pill></p> : r.winner ? <p><Pill tone="ok">Elegido: {r.winner.label}</Pill></p> : null}
      {r.blocked.length ? <p className="field__hint">Sin voto por mora: {r.blocked.map((b) => b.unit).join(", ")}</p> : null}
    </div>
  );
}

function MotionCard({ id, m, live, canOpen, reload, setErr }: { id: string; m: ResMotion; live: ResLive; canOpen: boolean; reload: () => void; setErr: (s: string | null) => void }) {
  const status = useResource<{ unitId: string; label: string; coef: number; rep: string; blocked: boolean; reason?: string; voted: boolean }[]>(m.status === "abierta" ? `/residential/assemblies/${id}/motions/${m.id}/status` : null);
  const [evid, setEvid] = useState<null | { ev: ResEvidence; chain: boolean; digest: boolean }>(null);
  const [vote, setVote] = useState({ unitId: "", option: "" });
  const [confirm, setConfirm] = useState<null | "close" | "del">(null);
  useEffect(() => { if (m.status !== "abierta") return; const t = setInterval(() => status.reload(), 5000); return () => clearInterval(t); }, [m.status, status]);
  async function call(path: string, method = "POST", body: unknown = {}) { setErr(null); try { await api(`/residential/assemblies/${id}/motions/${m.id}${path}`, { method, body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body) }); reload(); status.reload(); } catch (x) { setErr(errMsg(x)); } }
  async function showEvidence() {
    setErr(null);
    try { const [ev, v] = await Promise.all([api<ResEvidence>(`/residential/assemblies/${id}/motions/${m.id}/evidence`), api<{ chain: boolean; digest: boolean }>(`/residential/assemblies/${id}/motions/${m.id}/verify`)]); setEvid({ ev, chain: v.chain, digest: v.digest }); } catch (x) { setErr(errMsg(x)); }
  }
  const openOne = live.motions.some((x) => x.status === "abierta");
  const pendingUnits = (status.data ?? []).filter((e) => !e.blocked && !e.voted);
  return (
    <section className="dcard__sec" aria-label={`Votación ${m.number}`}>
      <h2>{m.number}. {m.title} <Pill tone={m.status === "abierta" ? "ok" : "info"}>{m.status === "pendiente" ? "Pendiente" : m.status === "abierta" ? "Abierta" : "Cerrada"}</Pill></h2>
      {m.description ? <p>{m.description}</p> : null}
      <p className="field__hint">{m.type === "eleccion" ? `Elección: ${m.options.map((o) => o.label).join(" / ")}` : `${m.majority === "calificada" ? `Mayoría calificada ${m.majorityPct} %` : "Mayoría simple"} · ${m.base === "total" ? "sobre el total de coeficientes" : "sobre los presentes habilitados"}`}</p>
      {m.status === "pendiente" && canOpen ? <div className="actions-cell"><button className="btn btn--primary btn--sm" disabled={openOne || live.assembly.status !== "en_curso"} onClick={() => call("/open")}>Abrir votación</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm("del")}>Quitar</button>{live.assembly.status !== "en_curso" ? <span className="field__hint">Se abre cuando la asamblea esté en curso.</span> : openOne ? <span className="field__hint">Cierra primero la votación abierta.</span> : null}</div> : null}
      {m.status === "abierta" ? (
        <div>
          <p><b>{(status.data ?? []).filter((e) => e.voted).length} de {(status.data ?? []).filter((e) => !e.blocked).length}</b> unidades habilitadas ya votaron.</p>
          {(status.data ?? []).some((e) => e.blocked) ? <p className="field__hint">Sin voto por mora: {(status.data ?? []).filter((e) => e.blocked).map((e) => e.label).join(", ")}</p> : null}
          {canOpen ? (
            <form className="field-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!vote.unitId || !vote.option) return setErr("Elige la unidad y su voto."); void call("/vote", "POST", { votes: [{ unitId: vote.unitId, option: vote.option }] }).then(() => setVote({ unitId: "", option: "" })); }}>
              <div className="field"><label htmlFor={`vu-${m.id}`}>Votar a nombre de una unidad presente</label><select id={`vu-${m.id}`} value={vote.unitId} onChange={(e) => setVote({ ...vote, unitId: e.target.value })}><option value="">Unidad…</option>{pendingUnits.map((e) => <option key={e.unitId} value={e.unitId}>{e.label} · {e.rep}</option>)}</select></div>
              <div className="field"><label htmlFor={`vo-${m.id}`}>Voto</label><select id={`vo-${m.id}`} value={vote.option} onChange={(e) => setVote({ ...vote, option: e.target.value })}><option value="">Voto…</option>{m.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select></div>
              <button type="submit" className="btn btn--secondary btn--sm">Registrar voto</button>
            </form>
          ) : null}
          {canOpen ? <div className="actions-cell"><button className="btn btn--primary btn--sm" onClick={() => setConfirm("close")}>Cerrar votación y ver resultado</button></div> : null}
        </div>
      ) : null}
      {m.status === "cerrada" ? <><Results m={m} /><div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={showEvidence}>Evidencia y verificación</button></div>{m.digest ? <p className="field__hint" style={{ wordBreak: "break-all" }}>Huella del resultado: {m.digest}</p> : null}</> : null}
      <Dlg open={!!evid} onClose={() => setEvid(null)} wide>{evid ? (
        <div><h2 id="dlg-title" tabIndex={-1}>Evidencia · {evid.ev.motion.number}. {evid.ev.motion.title}</h2>
          <p>{evid.chain && evid.digest ? <Pill tone="ok">✔ Verificada: ningún voto ni resultado fue alterado</Pill> : <Pill tone="warn">✖ La verificación falló</Pill>}</p>
          <h3>Quién estaba habilitado ({evid.ev.eligible.length})</h3>
          <div className="table-wrap"><table className="table"><thead><tr><th>Unidad</th><th>Representante</th><th className="num-r">Coef.</th><th>Voto</th></tr></thead><tbody>{evid.ev.eligible.map((e) => { const b = evid.ev.ballots.find((x) => x.unit === e.label); return <tr key={e.unitId}><td>{e.label}</td><td>{e.rep}</td><td className="num-r">{pct(e.coef, 4)}</td><td>{e.blocked ? <Pill tone="warn">Sin voto (mora)</Pill> : b ? b.option : <span className="field__hint">No votó</span>}</td></tr>; })}</tbody></table></div>
          <h3>Votos y huellas</h3>
          <div className="table-wrap"><table className="table"><thead><tr><th>Hora</th><th>Unidad</th><th>Voto</th><th>Huella</th></tr></thead><tbody>{evid.ev.ballots.map((b) => <tr key={b.hash}><td>{hourCO(b.at)}</td><td>{b.unit}<br /><span className="field__hint">{b.voter} · {b.via === "link" ? "enlace" : "manual"}</span></td><td>{b.option}</td><td style={{ fontFamily: "monospace", fontSize: 11 }}>{b.hash.slice(0, 16)}…</td></tr>)}</tbody></table></div>
          <div className="dialog__actions"><button className="btn btn--primary" onClick={() => setEvid(null)}>Cerrar</button></div></div>
      ) : null}</Dlg>
      <ConfirmDialog open={confirm === "close"} title="Cerrar la votación" message="Se calculará el resultado y ya nadie podrá votar. ¿Cerrar?" confirmLabel="Sí, cerrar" onConfirm={() => { setConfirm(null); void call("/close"); }} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === "del"} title="Quitar votación" message="¿Quitar esta votación pendiente?" confirmLabel="Sí, quitar" onConfirm={() => { setConfirm(null); void call("", "DELETE"); }} onClose={() => setConfirm(null)} />
    </section>
  );
}

function Motions({ id, live, canEdit, reload }: { id: string; live: ResLive; canEdit: boolean; reload: () => void }) {
  const [dlg, setDlg] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <div className="actions-cell">{canEdit && live.assembly.status !== "cerrada" ? <button className="btn btn--primary btn--sm" onClick={() => setDlg(true)}>Nueva votación</button> : null}</div>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <div className="vet-grid">{live.motions.map((m) => <MotionCard key={m.id} id={id} m={m} live={live} canOpen={canEdit} reload={reload} setErr={setErr} />)}</div>
      {!live.motions.length ? <Empty>Aún no hay votaciones. Prepáralas con anticipación y ábrelas una por una durante la asamblea.</Empty> : null}
      <Dlg open={dlg} onClose={() => setDlg(false)}>{dlg ? <MotionForm id={id} onClose={() => setDlg(false)} onDone={() => { setDlg(false); reload(); }} /> : null}</Dlg>
    </div>
  );
}

// ---------- Acta ----------
function Minutes({ id, live, canEdit, reload }: { id: string; live: ResLive; canEdit: boolean; reload: () => void }) {
  const mn = useResource<ResMinutes>(live.assembly.status === "cerrada" ? `/residential/assemblies/${id}/minutes` : null);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sign, setSign] = useState<null | { role: "presidente" | "secretario" }>(null);
  const [signName, setSignName] = useState("");
  const [ver, setVer] = useState<null | { version: number; body: string }>(null);
  const d = mn.data;
  useEffect(() => { if (d) setText(null); }, [d]);
  if (live.assembly.status !== "cerrada") return <Empty>El acta se redacta cuando la asamblea termina. Al terminarla, el sistema arma el borrador con asistentes, poderes, votaciones y resultados.</Empty>;
  if (!d) return <p className="lede">{mn.error ?? "Cargando el acta…"}</p>;
  const st = d.assembly.minutesStatus;
  const editable = canEdit && (st === "borrador" || st === "revision");
  async function act(fn: () => Promise<unknown>, ok: string) { setErr(null); setMsg(null); try { await fn(); setMsg(ok); mn.reload(); reload(); } catch (x) { setErr(errMsg(x)); } }
  const flow = (action: string, extra: Record<string, unknown> = {}) => api(`/residential/assemblies/${id}/minutes/flow`, { method: "POST", body: JSON.stringify({ action, ...extra }) });
  const signed = (role: string) => d.assembly.signatures.some((s) => s.role === role);
  return (
    <div>
      <p><Pill tone={st === "firmada" ? "ok" : st === "aprobada" ? "ok" : "info"}>{MINUTES_STATUS[st] ?? st}</Pill> <span className="field__hint">Borrador → revisión → aprobada → firmada por presidente y secretario.</span></p>
      {msg ? <p className="note" role="status">{msg}</p> : null}<Err msg={err} />
      {canEdit ? (
        <div className="actions-cell no-print">
          {st === "borrador" ? <><button className="btn btn--secondary btn--sm" onClick={() => act(() => api(`/residential/assemblies/${id}/minutes/regenerate`, { method: "POST", body: JSON.stringify({}) }), "Borrador regenerado desde los datos de la asamblea.")}>Regenerar borrador</button><button className="btn btn--primary btn--sm" onClick={() => act(() => flow("revision"), "El acta pasó a revisión.")}>Enviar a revisión</button></> : null}
          {st === "revision" ? <><button className="btn btn--secondary btn--sm" onClick={() => act(() => flow("devolver"), "El acta volvió a borrador.")}>Devolver a borrador</button><button className="btn btn--primary btn--sm" onClick={() => act(() => flow("aprobar"), "Acta aprobada.")}>Aprobar acta</button></> : null}
          {st === "aprobada" || st === "firmada" ? <>{!signed("presidente") ? <button className="btn btn--primary btn--sm" onClick={() => setSign({ role: "presidente" })}>Firmar como presidente</button> : null}{!signed("secretario") ? <button className="btn btn--primary btn--sm" onClick={() => setSign({ role: "secretario" })}>Firmar como secretario</button> : null}</> : null}
          <button className="btn btn--secondary btn--sm" onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>
      ) : <div className="actions-cell no-print"><button className="btn btn--secondary btn--sm" onClick={() => window.print()}>Imprimir / guardar PDF</button></div>}
      {editable ? (
        <div className="field no-print"><label htmlFor="mn-t">Texto del acta (puedes editarlo; cada cambio guarda una versión)</label>
          <textarea id="mn-t" rows={22} value={text ?? d.minutes} onChange={(e) => setText(e.target.value)} style={{ fontFamily: "Georgia, serif" }} />
          <div className="actions-cell"><button className="btn btn--primary btn--sm" disabled={text === null || text === d.minutes} onClick={() => act(() => api(`/residential/assemblies/${id}/minutes`, { method: "PUT", body: JSON.stringify({ body: text }) }), "Cambios guardados como una versión nueva.")}>Guardar cambios</button></div></div>
      ) : null}
      <article className={`res-doc${editable ? " res-doc--print-only" : ""}`}>
        <h1>{d.conjunto.name}</h1>
        <p className="res-doc__sub">{d.conjunto.nit ? `NIT ${d.conjunto.nit}` : ""}{d.conjunto.address ? ` · ${d.conjunto.address}` : ""}</p>
        <pre>{text ?? d.minutes}</pre>
        {d.assembly.signatures.length ? <div className="res-sign">{d.assembly.signatures.map((s) => <div key={s.role}><div className="res-sign__line" /><b>{s.name}</b><br />{s.role === "presidente" ? "Presidente de la asamblea" : "Secretario(a)"}<br /><small>Firmado electrónicamente el {dtCO(s.at)}</small></div>)}</div> : null}
      </article>
      <div className="no-print">
        <h3>Versiones del acta</h3>
        <ul className="dcard__list">{d.versions.map((v) => <li key={v.id}><div><b>Versión {v.version}</b><p>{dtCO(v.createdAt)}{v.byName ? ` · ${v.byName}` : ""}</p></div><button className="btn btn--secondary btn--sm" onClick={async () => { try { setVer(await api<{ version: number; body: string }>(`/residential/assemblies/${id}/minutes/versions/${v.id}`)); } catch (x) { setErr(errMsg(x)); } }}>Ver</button></li>)}</ul>
        <h3>Trazabilidad</h3>
        <ul className="dcard__list">{d.events.filter((e) => e.type.startsWith("acta")).map((e, i) => <li key={i}><div><b>{EVENT_TEXT[e.type] ?? e.type.replace("acta_", "Acta: ")}</b><p>{dtCO(e.at)}{e.byName ? ` · ${e.byName}` : ""}{e.detail ? ` · ${e.detail}` : ""}</p></div></li>)}</ul>
      </div>
      <Dlg open={!!ver} onClose={() => setVer(null)} wide>{ver ? <div><h2 id="dlg-title" tabIndex={-1}>Versión {ver.version}</h2><pre style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{ver.body}</pre><div className="dialog__actions"><button className="btn btn--primary" onClick={() => setVer(null)}>Cerrar</button></div></div> : null}</Dlg>
      <Dlg open={!!sign} onClose={() => setSign(null)}>{sign ? (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (signName.trim().length < 3) return setErr("Escribe el nombre completo de quien firma."); const r = sign.role; setSign(null); void act(() => flow("firmar", { role: r, name: signName.trim() }), "Firma registrada."); }}>
          <h2 id="dlg-title" tabIndex={-1}>Firmar como {sign.role}</h2>
          <p className="lede">La firma electrónica queda registrada con tu nombre, la fecha y la hora, sobre esta versión exacta del acta.</p>
          <div className="field"><label htmlFor="sg-n">Nombre completo de quien firma</label><input id="sg-n" type="text" value={signName} autoComplete="off" onChange={(e) => setSignName(e.target.value)} /></div>
          <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={() => setSign(null)}>Cancelar</button><button type="submit" className="btn btn--primary">Firmar</button></div>
        </form>
      ) : null}</Dlg>
    </div>
  );
}

// ---------- Pantalla principal ----------
export function ResAssemblyView({ id }: { id: string }) {
  const { state, allowed, role } = useResAccess(ALL);
  const canEdit = role === "TENANT_ADMIN" || role === "EMPLOYEE";
  const live = useResource<ResLive>(allowed ? `/residential/assemblies/${id}/live` : null);
  const [tab, setTab] = useState<"live" | "conv" | "votes" | "minutes">("live");
  const [dlg, setDlg] = useState<null | "edit" | "convoke" | "start" | "finish" | "del">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { reload } = live;
  const status = live.data?.assembly.status;
  useEffect(() => { if (status !== "en_curso" && status !== "convocada") return; const t = setInterval(() => { if (!document.hidden) reload(); }, 5000); return () => clearInterval(t); }, [status, reload]);
  const tabs = useMemo<[typeof tab, string][]>(() => (canEdit ? [["live", "En vivo"], ["conv", "Convocatoria"], ["votes", "Votaciones"], ["minutes", "Acta"]] : [["live", "En vivo"]]), [canEdit]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (live.error) return <div className="page"><p className="form-error" role="alert">{live.error}</p><Link href="/cj-asambleas">← Volver a asambleas</Link></div>;
  const d = live.data;
  if (!d) return <div className="page"><p className="lede">Cargando…</p></div>;
  const a = d.assembly;
  const close = () => setDlg(null);
  async function run(path: string, ok: string, method = "POST") { setErr(null); setMsg(null); try { const r = await api<{ invited?: number; emailed?: number }>(`/residential/assemblies/${id}${path ? `/${path}` : ""}`, { method, body: method === "POST" ? JSON.stringify({}) : undefined }); setMsg(path === "convoke" ? `Convocatoria lista: ${r.invited ?? 0} propietarios convocados, ${r.emailed ?? 0} correos enviados. Los demás se envían por WhatsApp desde la pestaña «Convocatoria».` : ok); close(); reload(); if (path === "finish") setTab("minutes"); if (path === "convoke") setTab("conv"); if (method === "DELETE") window.location.href = "/cj-asambleas"; } catch (x) { setErr(errMsg(x)); close(); } }
  return (
    <div className="page">
      <p className="field__hint no-print"><Link href="/cj-asambleas">← Asambleas</Link></p>
      <div className="page-head no-print"><div><h1>{a.title}</h1><p className="lede">{ASM_KINDS.find((k) => k.v === a.kind)?.l} · {dateLongCO(a.startsAt)} · {MODE_TEXT[a.mode] ?? a.mode}{a.place ? ` · ${a.place}` : ""} <Pill tone={ASM_STATUS[a.status]?.tone ?? "info"}>{ASM_STATUS[a.status]?.label ?? a.status}</Pill></p></div>
        {canEdit ? <div className="actions-cell">
          {a.status === "borrador" ? <button className="btn btn--primary btn--sm" onClick={() => setDlg("convoke")}>Convocar</button> : null}
          {a.status === "convocada" ? <><button className="btn btn--primary btn--sm" onClick={() => setDlg("start")}>Iniciar asamblea</button><button className="btn btn--secondary btn--sm" onClick={() => setDlg("convoke")}>Reenviar convocatoria</button></> : null}
          {a.status === "en_curso" ? <button className="btn btn--primary btn--sm" onClick={() => setDlg("finish")}>Terminar asamblea</button> : null}
          {a.status === "borrador" || a.status === "convocada" ? <button className="btn btn--secondary btn--sm" onClick={() => setDlg("edit")}>Editar</button> : null}
          {a.status === "borrador" ? <button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg("del")}>Borrar</button> : null}
        </div> : null}</div>
      {msg ? <p className="note no-print" role="status">{msg}</p> : null}{err ? <p className="form-error no-print" role="alert">{err}</p> : null}
      {tabs.length > 1 ? <div className="no-print"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div> : null}
      {tab === "live" ? (
        <div className="no-print">
          <QuorumCard q={d.quorum} status={a.status} />
          {a.status === "borrador" ? <p className="note">Esta asamblea es un borrador. Primero «Convocar» para enviar el enlace a los propietarios.</p> : <Attendance id={id} live={d} canAct={a.status !== "cerrada"} reload={reload} />}
          <h3>Bitácora</h3>
          <ul className="dcard__list">{d.events.slice(-30).reverse().map((e) => <li key={e.id}><div><b>{EVENT_TEXT[e.type] ?? e.type}</b>{e.detail ? <p>{e.detail}</p> : null}<p className="field__hint">{dtCO(e.at)}{e.byName ? ` · ${e.byName}` : ""}</p></div></li>)}</ul>
        </div>
      ) : null}
      {tab === "conv" && canEdit ? <div className="no-print"><Convocation id={id} live={d} canEdit={canEdit} reload={reload} /></div> : null}
      {tab === "votes" && canEdit ? <div className="no-print"><Motions id={id} live={d} canEdit={canEdit} reload={reload} /></div> : null}
      {tab === "minutes" && canEdit ? <Minutes id={id} live={d} canEdit={canEdit} reload={reload} /> : null}
      <Dlg open={dlg === "edit"} onClose={close} wide>{dlg === "edit" ? <AssemblyForm item={a} onClose={close} onDone={() => { close(); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={dlg === "convoke"} title="Enviar la convocatoria" message="Se crea el enlace personal de cada propietario y se envía por correo a quienes tienen correo. Por WhatsApp se envía con un clic desde «Convocatoria». ¿Continuar?" confirmLabel="Sí, convocar" onConfirm={() => run("convoke", "")} onClose={close} />
      <ConfirmDialog open={dlg === "start"} title="Iniciar la asamblea" message="Desde este momento se pueden abrir las votaciones. ¿Iniciar?" confirmLabel="Sí, iniciar" onConfirm={() => run("start", "La asamblea está en curso.")} onClose={close} />
      <ConfirmDialog open={dlg === "finish"} title="Terminar la asamblea" message="Se cierra la asistencia y se arma el borrador del acta. Las votaciones abiertas deben estar cerradas. ¿Terminar?" confirmLabel="Sí, terminar" onConfirm={() => run("finish", "Asamblea terminada. Revisa el borrador del acta.")} onClose={close} />
      <ConfirmDialog open={dlg === "del"} title="Borrar asamblea" message="¿Borrar esta asamblea en borrador?" confirmLabel="Sí, borrar" onConfirm={() => run("", "", "DELETE")} onClose={close} />
    </div>
  );
}
void ADMIN_BOARD;
void CopyBtn;
