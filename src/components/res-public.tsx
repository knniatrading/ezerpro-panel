"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney, todayISO } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { BOOKING_STATUS, CHARGE_TEXT, METHOD_TEXT, MODE_TEXT, NOTICE_LEVELS, NOTICE_TONE, PET_SPECIES, PET_TEXT, TICKET_KINDS, TICKET_KIND_TEXT, TICKET_STATE_TEXT, VEH_KINDS, VISIT_KINDS, VISIT_KIND_TEXT, VISIT_STATUS, addDays, coIso, dateLongCO, dtCO, hourCO, minLabel, niceDate, pct } from "@/lib/residential";
import type { ResPortal, ResPublicAssembly, ResStatement, ResVisit } from "@/lib/residential";
import type { PublicTenant } from "@/lib/types";
import { Pill, QrImg, Tabs } from "./res-common";

const host = () => (typeof window === "undefined" ? "" : window.location.hostname);
const msg = (e: unknown, d = "No se pudo cargar. Intenta de nuevo.") => (e instanceof ApiError ? e.message : d);
const KEY = "res_t";
function Boot() { return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>; }
function Card({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="landing"><div className="landing__card"><h1>{title}</h1>{children}</div></div>; }
const res = <T,>(op: string, body: Record<string, unknown> = {}) => api<T>(`/public/res/${op}`, { method: "POST", body: JSON.stringify({ host: host(), ...body }) });

function useBrand() {
  const [brand, setBrand] = useState<string | null>(null);
  useEffect(() => { api<PublicTenant>(`/public/tenant?host=${encodeURIComponent(host())}`).then((t) => setBrand(t.brandColor ?? null)).catch(() => {}); }, []);
  return brand;
}
const tokenOf = (name = "t") => { try { return new URLSearchParams(window.location.search).get(name) ?? ""; } catch { return ""; } };

// ---------- Página principal del conjunto (sin sesión) ----------
export function ResPublic({ tenant }: { tenant: PublicTenant }) {
  const [d, setD] = useState<{ suspended: boolean; name?: string; address?: string | null; phone?: string | null; demoPortalUrl?: string | null; demoVisitUrl?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [perr, setPerr] = useState<string | null>(null);
  useEffect(() => { res<NonNullable<typeof d>>("landing").then(setD).catch((e) => setError(msg(e, "No se pudo cargar la página."))); try { setSaved(localStorage.getItem(KEY)); } catch { /* sin almacenamiento */ } }, []);
  if (error) return <Card title="No pudimos cargar la página"><p className="landing__text" role="alert">{error}</p></Card>;
  if (!d) return <Boot />;
  if (d.suspended) return <Card title={d.name ?? "Conjunto"}><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></Card>;
  function go(e: React.FormEvent) {
    e.preventDefault();
    const m = paste.match(/[?&]t=([A-Za-z0-9_-]+)/) ?? (/^[A-Za-z0-9_-]{16,}$/.test(paste.trim()) ? [null, paste.trim()] : null);
    if (!m) return setPerr("No reconocemos ese enlace. Pega el enlace completo que te envió la administración.");
    window.location.href = `/residente?t=${m[1]}`;
  }
  const phone = d.phone ?? "";
  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero"><span className="dcard__photo dcard__photo--empty" aria-hidden="true">🏢</span><h1>{d.name}</h1>{d.address ? <p className="dcard__veh">{d.address}</p> : null}<p className="dcard__bio">Tu edificio inteligente: visitas con código QR, paquetes, reservas, estado de cuenta y asambleas desde tu celular.</p></header>
      <section className="tech__cta" aria-label="Acciones">
        {saved ? <Link className="btn btn--primary tech__big" href={`/residente?t=${saved}`}>Entrar a mi portal</Link> : null}
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar a la administración<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <button type="button" className="btn btn--secondary" onClick={() => downloadText(`${d.name}.vcf`, vcard({ name: d.name ?? "", phone, org: d.name, url: window.location.origin }), "text/vcard")}>Guardar contacto</button> : null}
      </section>
      {!saved ? (
        <section className="dcard__sec"><h2>Entrar a mi portal</h2>
          <p className="field__hint">La administración te envió por WhatsApp o correo un enlace personal. Ábrelo y listo; este navegador lo recordará. Si lo tienes a la mano, también puedes pegarlo aquí:</p>
          <form onSubmit={go} noValidate><div className="field"><label htmlFor="rp-l">Tu enlace personal</label><input id="rp-l" type="text" value={paste} placeholder="https://…/residente?t=…" autoComplete="off" onChange={(e) => { setPaste(e.target.value); setPerr(null); }} /></div>
            {perr ? <p className="form-error" role="alert">{perr}</p> : null}<button type="submit" className="btn btn--primary">Entrar</button></form>
          <p className="field__hint">¿No tienes tu enlace? Pídelo en la administración o en portería.</p>
        </section>
      ) : null}
      <section className="dcard__sec"><h2>Para el personal</h2><p><Link className="btn btn--secondary btn--sm" href="/login">Ingreso de administración y portería</Link></p></section>
      {d.demoPortalUrl || d.demoVisitUrl ? (
        <section className="dcard__sec" aria-label="Ejemplos del demo"><h2>Ejemplos de esta demostración</h2><ul className="dcard__list">
          {d.demoPortalUrl ? <li><div><b>Portal de un residente</b><p>Visitas con QR, paquetes, reservas, estado de cuenta, PQRS y asamblea.</p></div><a className="btn btn--secondary btn--sm" href={d.demoPortalUrl}>Ver</a></li> : null}
          {d.demoVisitUrl ? <li><div><b>Pase de un visitante</b><p>Lo que recibe el invitado: su código QR para la portería.</p></div><a className="btn btn--secondary btn--sm" href={d.demoVisitUrl}>Ver</a></li> : null}
        </ul></section>
      ) : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}

// ---------- Pase de visita (lo abre el invitado) ----------
export function ResVisitPage() {
  const [c, setC] = useState<string | null>(null);
  const [d, setD] = useState<{ conjunto: { name: string; address: string | null; phone: string | null }; visit: { name: string; kind: string; unit: string; code: string; plate: string | null; validFrom: string; validUntil: string; status: string } } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const brand = useBrand();
  useEffect(() => { setC(tokenOf("c")); }, []);
  useEffect(() => {
    if (c === null) return;
    if (!c) { setErr("Este enlace no es válido."); return; }
    res<NonNullable<typeof d>>("visit", { code: c }).then(setD).catch((e) => setErr(e instanceof ApiError && e.status === 404 ? "Este pase no existe o ya no está disponible." : msg(e)));
  }, [c]);
  if (err) return <Card title="No pudimos abrir tu pase"><p className="landing__text" role="alert">{err}</p></Card>;
  if (!d) return <Boot />;
  const v = d.visit;
  const st = VISIT_STATUS[v.status];
  const ok = v.status === "esperada" || v.status === "dentro";
  return (
    <div className="dcard vetpage" style={brandStyle(brand)}>
      <header className="dcard__hero"><h1>Pase de visita</h1><p className="dcard__veh">{d.conjunto.name}</p></header>
      <section className="dcard__sec" style={{ textAlign: "center" }}>
        <p className="landing__text">Hola <b>{v.name}</b>. Muestra este código en la portería.</p>
        {ok ? <div style={{ display: "grid", justifyItems: "center", gap: 8 }}><QrImg value={typeof window !== "undefined" ? window.location.href : ""} size={240} label="Código QR de tu visita" /><p style={{ fontFamily: "monospace", fontSize: 24, letterSpacing: 3, margin: 0 }}><b>{v.code}</b></p><p className="field__hint">Si no se puede leer el QR, dile este código al portero.</p></div> : <p className="note note--warn" role="status">Este pase ya no sirve ({st?.label.toLowerCase() ?? v.status}).</p>}
        <p><Pill tone={st?.tone ?? "info"}>{st?.label ?? v.status}</Pill></p>
        <p>Visitas a <b>{v.unit}</b> · {VISIT_KIND_TEXT[v.kind] ?? v.kind}{v.plate ? ` · placa ${v.plate}` : ""}</p>
        <p className="field__hint">Válido desde {dtCO(v.validFrom)} hasta {dtCO(v.validUntil)}</p>
        {d.conjunto.address ? <p className="field__hint">{d.conjunto.address}</p> : null}
      </section>
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}

// ---------- Portal del residente ----------
type Unit = ResPortal["units"][number];
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="dcard__sec"><h2>{title}</h2>{children}</section>; }

function VisitsTab({ p, t, reload }: { p: ResPortal; t: string; reload: () => void }) {
  const [f, setF] = useState({ unitId: p.units[0]?.id ?? "", name: "", kind: "visita", plate: "", date: todayISO(), from: "", until: "23:59" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const hhmmNow = () => { const d = new Date(Date.now() - 5 * 3600000).toISOString(); return d.slice(11, 16); };
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr("Escribe el nombre de tu invitado.");
    setBusy(true); setErr(null);
    const from = f.date === todayISO() && !f.from ? hhmmNow() : f.from || "06:00";
    try {
      await res("visit-create", { t, unitId: f.unitId, name: f.name.trim(), kind: f.kind, plate: f.plate.trim() || null, validFrom: coIso(f.date, from), validUntil: coIso(f.date, f.until || "23:59") });
      setF({ ...f, name: "", plate: "" }); reload();
    } catch (x) { setErr(msg(x, "No se pudo crear la visita.")); } finally { setBusy(false); }
  }
  async function cancel(v: { id: string }) { try { await res("visit-cancel", { t, id: v.id }); reload(); } catch (x) { setErr(msg(x)); } }
  const share = (v: { name: string; url: string }) => {
    const text = `Hola ${v.name.split(" ")[0]}, este es tu pase para entrar a ${p.conjunto.name}. Muéstralo en portería: ${v.url}`;
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share) { void nav.share({ text }).catch(() => {}); } else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const active = p.visits.filter((v) => v.status === "esperada" || v.status === "dentro");
  return (
    <>
      <Section title="Autorizar una visita">
        <form onSubmit={create} noValidate>
          {p.units.length > 1 ? <div className="field"><label htmlFor="rv-u">Unidad</label><select id="rv-u" value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>{p.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div> : null}
          <div className="field-row">
            <div className="field"><label htmlFor="rv-n">Nombre de tu invitado</label><input id="rv-n" type="text" value={f.name} autoComplete="off" onChange={(e) => { setF({ ...f, name: e.target.value }); setErr(null); }} /></div>
            <div className="field"><label htmlFor="rv-k">Tipo</label><select id="rv-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{VISIT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="rv-d">Día</label><input id="rv-d" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="field"><label htmlFor="rv-f">Desde</label><input id="rv-f" type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
            <div className="field"><label htmlFor="rv-h">Hasta</label><input id="rv-h" type="time" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="rv-p">Placa del vehículo (opcional)</label><input id="rv-p" type="text" value={f.plate} autoComplete="off" onChange={(e) => setF({ ...f, plate: e.target.value.toUpperCase() })} /></div>
          {err ? <p className="form-error" role="alert">{err}</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Creando…" : "Crear pase con QR"}</button>
        </form>
      </Section>
      <Section title={`Mis visitas (${active.length})`}>
        {!active.length ? <p className="field__hint">No tienes visitas activas.</p> : null}
        <ul className="dcard__list">{active.map((v) => (
          <li key={v.id} style={{ alignItems: "flex-start" }}><div><b>{v.name}</b><p>{v.unit} · {VISIT_KIND_TEXT[v.kind] ?? v.kind}{v.plate ? ` · ${v.plate}` : ""}</p><p>{dtCO(v.validFrom)} → {dtCO(v.validUntil)} <Pill tone={VISIT_STATUS[v.status]?.tone ?? "info"}>{VISIT_STATUS[v.status]?.label ?? v.status}</Pill></p>
            {shown === v.id ? <div style={{ display: "grid", gap: 6, justifyItems: "start" }}><QrImg value={v.url} size={200} label={`QR de ${v.name}`} /><b style={{ fontFamily: "monospace", letterSpacing: 2 }}>{v.code}</b></div> : null}</div>
            <div className="actions-cell" style={{ flexDirection: "column", alignItems: "stretch" }}><button className="btn btn--primary btn--sm" onClick={() => share(v)}>Enviar al invitado</button><button className="btn btn--secondary btn--sm" onClick={() => setShown(shown === v.id ? null : v.id)}>{shown === v.id ? "Ocultar QR" : "Ver QR"}</button>{v.status === "esperada" ? <button className="btn btn--danger-ghost btn--sm" onClick={() => cancel(v)}>Cancelar</button> : null}</div></li>
        ))}</ul>
      </Section>
    </>
  );
}

function AreasTab({ p, t, reload }: { p: ResPortal; t: string; reload: () => void }) {
  const [f, setF] = useState({ unitId: p.units[0]?.id ?? "", areaId: p.areas[0]?.id ?? "", date: addDays(todayISO(), 1), startMin: -1, hours: "2", guests: "" });
  const [busy, setBusy] = useState<Array<{ start: string; end: string; status: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const area = p.areas.find((a) => a.id === f.areaId);
  useEffect(() => {
    if (!f.areaId || !f.date) return;
    res<{ busy: Array<{ start: string; end: string; status: string }> }>("area-availability", { t, areaId: f.areaId, date: f.date }).then((r) => setBusy(r.busy)).catch(() => setBusy([]));
  }, [f.areaId, f.date, t, p.bookings]);
  const starts: number[] = []; if (area) for (let m = area.openMin; m <= area.closeMin - 30; m += 30) starts.push(m);
  const start = starts.includes(f.startMin) ? f.startMin : starts[0] ?? 0;
  async function book(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    if (!area) return setErr("Elige el área.");
    try { const r = await res<{ status: string }>("booking-create", { t, unitId: f.unitId, areaId: f.areaId, date: f.date, startMin: start, hours: Number(f.hours) || 1, guests: f.guests ? Number(f.guests) : null }); setOk(r.status === "pendiente" ? "Solicitud enviada. La administración la aprobará pronto." : "¡Reserva confirmada!"); reload(); } catch (x) { setErr(msg(x, "No se pudo reservar.")); }
  }
  async function cancel(id: string) { try { await res("booking-cancel", { t, id }); reload(); } catch (x) { setErr(msg(x)); } }
  const mine = p.bookings.filter((b) => b.status === "aprobada" || b.status === "pendiente");
  return (
    <>
      <Section title="Reservar un área común">
        {!p.areas.length ? <p className="field__hint">Por ahora no hay áreas para reservar.</p> : (
          <form onSubmit={book} noValidate>
            <div className="field-row">
              <div className="field"><label htmlFor="ra-a">Área</label><select id="ra-a" value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value })}>{p.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div className="field"><label htmlFor="ra-d">Día</label><input id="ra-d" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            </div>
            {area ? <p className="field__hint">{area.description ? `${area.description} · ` : ""}Horario {minLabel(area.openMin)}–{minLabel(area.closeMin >= 1440 ? 1439 : area.closeMin)} · máx. {area.maxHours} h · {area.fee ? `cuesta ${formatMoney(area.fee)}` : "sin costo"}{area.requiresApproval ? " · requiere aprobación" : ""}</p> : null}
            {area?.rules ? <p className="field__hint">Normas: {area.rules}</p> : null}
            {busy.length ? <p className="note">Ya reservado ese día: {busy.map((b) => `${hourCO(b.start)}–${hourCO(b.end)}`).join(", ")}</p> : <p className="field__hint">Ese día está libre.</p>}
            <div className="field-row">
              {p.units.length > 1 ? <div className="field"><label htmlFor="ra-u">Unidad</label><select id="ra-u" value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>{p.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div> : null}
              <div className="field"><label htmlFor="ra-s">Desde</label><select id="ra-s" value={start} onChange={(e) => setF({ ...f, startMin: Number(e.target.value) })}>{starts.map((m) => <option key={m} value={m}>{minLabel(m)}</option>)}</select></div>
              <div className="field"><label htmlFor="ra-h">Horas</label><input id="ra-h" type="text" inputMode="numeric" value={f.hours} autoComplete="off" onChange={(e) => setF({ ...f, hours: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></div>
              <div className="field"><label htmlFor="ra-g">Invitados</label><input id="ra-g" type="text" inputMode="numeric" value={f.guests} autoComplete="off" onChange={(e) => setF({ ...f, guests: e.target.value.replace(/\D/g, "") })} /></div>
            </div>
            {err ? <p className="form-error" role="alert">{err}</p> : null}{ok ? <p className="note" role="status">{ok}</p> : null}
            <button type="submit" className="btn btn--primary">Reservar</button>
          </form>
        )}
      </Section>
      <Section title="Mis reservas">
        {!mine.length ? <p className="field__hint">No tienes reservas próximas.</p> : null}
        <ul className="dcard__list">{mine.map((b) => <li key={b.id}><div><b>{b.area}</b><p>{niceDate(b.start)} · {b.startLabel}–{b.endLabel} <Pill tone={BOOKING_STATUS[b.status]?.tone ?? "info"}>{BOOKING_STATUS[b.status]?.label ?? b.status}</Pill></p></div><button className="btn btn--danger-ghost btn--sm" onClick={() => cancel(b.id)}>Cancelar</button></li>)}</ul>
      </Section>
    </>
  );
}

function AccountTab({ p, t }: { p: ResPortal; t: string }) {
  const [uid, setUid] = useState(p.units[0]?.id ?? "");
  const [st, setSt] = useState<ResStatement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!uid) return; setSt(null); res<ResStatement>("statement", { t, unitId: uid }).then(setSt).catch((e) => setErr(msg(e))); }, [uid, t]);
  return (
    <>
      {p.units.length > 1 ? <div className="chips" role="group" aria-label="Unidad">{p.units.map((u) => <button key={u.id} type="button" className={uid === u.id ? "is-on" : ""} aria-pressed={uid === u.id} onClick={() => setUid(u.id)}>{u.label}</button>)}</div> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {!st ? <p className="lede">Cargando…</p> : (
        <>
          <div className="kpis"><div className="kpi"><span>Saldo</span><strong>{formatMoney(st.balance)}</strong></div><div className={`kpi${st.overdue ? " kpi--warn" : ""}`}><span>Vencido</span><strong>{formatMoney(st.overdue)}</strong></div>{st.credit ? <div className="kpi"><span>A favor</span><strong>{formatMoney(st.credit)}</strong></div> : null}</div>
          {st.overdue ? <p className="note note--warn">Tienes {formatMoney(st.overdue)} vencidos. Si ya pagaste, la administración lo verá reflejado cuando registre tu pago.</p> : <p className="note">✔ Estás al día.</p>}
          <Section title="Cobros">
            <ul className="dcard__list">{st.charges.map((c) => <li key={c.id}><div><b>{c.concept}</b><p>{CHARGE_TEXT[c.kind] ?? c.kind} · vence {niceDate(c.dueYmd)}</p></div><div style={{ textAlign: "right" }}>{formatMoney(c.amount)}<br />{c.pending > 0 ? <Pill tone={c.overdue ? "warn" : "info"}>debes {formatMoney(c.pending)}</Pill> : <Pill tone="ok">Pagado</Pill>}</div></li>)}</ul>
            {!st.charges.length ? <p className="field__hint">Sin cobros.</p> : null}
          </Section>
          <Section title="Pagos">
            <ul className="dcard__list">{st.payments.filter((x) => !x.voided).map((x) => <li key={x.id}><div><b>{niceDate(x.paidYmd)}</b><p>{METHOD_TEXT[x.method] ?? x.method}{x.reference ? ` · ${x.reference}` : ""}</p></div><span>{formatMoney(x.amount)}</span></li>)}</ul>
            {!st.payments.length ? <p className="field__hint">Sin pagos registrados.</p> : null}
          </Section>
        </>
      )}
    </>
  );
}

function TicketsTab({ p, t, reload }: { p: ResPortal; t: string; reload: () => void }) {
  const [f, setF] = useState({ unitId: p.units[0]?.id ?? "", kind: "queja", place: "", title: "", body: "" });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    if (f.title.trim().length < 3) return setErr("Escribe el asunto.");
    if (f.body.trim().length < 5) return setErr("Cuéntanos qué pasó.");
    try { const r = await res<{ number: number }>("ticket-create", { t, unitId: f.unitId, kind: f.kind, place: f.place.trim() || null, title: f.title.trim(), body: f.body.trim() }); setOk(`Radicamos tu solicitud con el número ${r.number}. Aquí mismo verás la respuesta.`); setF({ ...f, title: "", body: "", place: "" }); reload(); } catch (x) { setErr(msg(x, "No se pudo enviar.")); }
  }
  return (
    <>
      <Section title="Nueva petición, queja o reclamo">
        <form onSubmit={send} noValidate>
          <div className="field-row">
            <div className="field"><label htmlFor="rt-k">Tipo</label><select id="rt-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{TICKET_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
            <div className="field"><label htmlFor="rt-p">Lugar (opcional)</label><input id="rt-p" type="text" value={f.place} placeholder="Pasillo piso 3, parqueadero…" autoComplete="off" onChange={(e) => setF({ ...f, place: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="rt-t">Asunto</label><input id="rt-t" type="text" value={f.title} autoComplete="off" onChange={(e) => { setF({ ...f, title: e.target.value }); setErr(null); }} /></div>
          <div className="field"><label htmlFor="rt-b">¿Qué pasó?</label><textarea id="rt-b" rows={4} maxLength={2000} value={f.body} onChange={(e) => { setF({ ...f, body: e.target.value }); setErr(null); }} /></div>
          {err ? <p className="form-error" role="alert">{err}</p> : null}{ok ? <p className="note" role="status">{ok}</p> : null}
          <button type="submit" className="btn btn--primary">Enviar</button>
        </form>
      </Section>
      <Section title="Mis solicitudes">
        {!p.tickets.length ? <p className="field__hint">Aún no has enviado ninguna.</p> : null}
        <ul className="dcard__list">{p.tickets.map((x) => <li key={x.id} style={{ alignItems: "flex-start" }}><div><b>#{x.number} · {x.title}</b><p>{TICKET_KIND_TEXT[x.kind] ?? x.kind} · {niceDate(x.createdAt)}</p>{x.response ? <p className="note"><b>Respuesta:</b> {x.response}</p> : null}</div><Pill tone={x.status === "radicada" ? "warn" : x.status === "en_proceso" ? "info" : "ok"}>{TICKET_STATE_TEXT[x.status] ?? x.status}</Pill></li>)}</ul>
      </Section>
    </>
  );
}

function DataTab({ p, t, reload }: { p: ResPortal; t: string; reload: () => void }) {
  const [v, setV] = useState({ unitId: p.units[0]?.id ?? "", plate: "", kind: "carro", brand: "", color: "" });
  const [pt, setPt] = useState({ unitId: p.units[0]?.id ?? "", name: "", species: "perro", breed: "", color: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const label = (id: string) => p.units.find((u) => u.id === id)?.label ?? "";
  async function run(op: string, body: Record<string, unknown>, after?: () => void) { setErr(null); try { await res(op, { t, ...body }); after?.(); reload(); } catch (x) { setErr(msg(x, "No se pudo guardar.")); } }
  return (
    <>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      <Section title="Mis vehículos">
        <ul className="dcard__list">{p.vehicles.map((x) => <li key={x.id}><div><span className="dcard__plate dcard__plate--sm">{x.plate}</span><p>{[x.kind, x.brand, x.color].filter(Boolean).join(" · ")} · {label(x.unitId)}</p></div><button className="btn btn--danger-ghost btn--sm" onClick={() => run("vehicle-delete", { id: x.id })}>Quitar</button></li>)}</ul>
        {!p.vehicles.length ? <p className="field__hint">No has registrado vehículos.</p> : null}
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (v.plate.replace(/[^A-Za-z0-9]/g, "").length < 3) return setErr("Escribe la placa."); void run("vehicle-save", { unitId: v.unitId, plate: v.plate, kind: v.kind, brand: v.brand.trim() || null, color: v.color.trim() || null }, () => setV({ ...v, plate: "", brand: "", color: "" })); }}>
          <div className="field-row">
            {p.units.length > 1 ? <div className="field"><label htmlFor="rd-vu">Unidad</label><select id="rd-vu" value={v.unitId} onChange={(e) => setV({ ...v, unitId: e.target.value })}>{p.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div> : null}
            <div className="field"><label htmlFor="rd-vp">Placa</label><input id="rd-vp" type="text" value={v.plate} autoComplete="off" onChange={(e) => setV({ ...v, plate: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label htmlFor="rd-vk">Tipo</label><select id="rd-vk" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{VEH_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
          </div>
          <div className="field-row"><div className="field"><label htmlFor="rd-vb">Marca</label><input id="rd-vb" type="text" value={v.brand} autoComplete="off" onChange={(e) => setV({ ...v, brand: e.target.value })} /></div><div className="field"><label htmlFor="rd-vc">Color</label><input id="rd-vc" type="text" value={v.color} autoComplete="off" onChange={(e) => setV({ ...v, color: e.target.value })} /></div></div>
          <button type="submit" className="btn btn--secondary btn--sm">Agregar vehículo</button>
        </form>
      </Section>
      <Section title="Mis mascotas">
        <ul className="dcard__list">{p.pets.map((x) => <li key={x.id}><div><b>{x.name}</b><p>{[PET_TEXT[x.species] ?? x.species, x.breed, x.color, x.notes].filter(Boolean).join(" · ")}</p></div><button className="btn btn--danger-ghost btn--sm" onClick={() => run("pet-delete", { id: x.id })}>Quitar</button></li>)}</ul>
        {!p.pets.length ? <p className="field__hint">No has registrado mascotas. Si se pierde, la portería sabrá de quién es.</p> : null}
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (pt.name.trim().length < 1) return setErr("Escribe el nombre de la mascota."); void run("pet-save", { unitId: pt.unitId, name: pt.name.trim(), species: pt.species, breed: pt.breed.trim() || null, color: pt.color.trim() || null, notes: pt.notes.trim() || null }, () => setPt({ ...pt, name: "", breed: "", color: "", notes: "" })); }}>
          <div className="field-row">
            {p.units.length > 1 ? <div className="field"><label htmlFor="rd-pu">Unidad</label><select id="rd-pu" value={pt.unitId} onChange={(e) => setPt({ ...pt, unitId: e.target.value })}>{p.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div> : null}
            <div className="field"><label htmlFor="rd-pn">Nombre</label><input id="rd-pn" type="text" value={pt.name} autoComplete="off" onChange={(e) => setPt({ ...pt, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="rd-ps">Especie</label><select id="rd-ps" value={pt.species} onChange={(e) => setPt({ ...pt, species: e.target.value })}>{PET_SPECIES.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></div>
          </div>
          <div className="field-row"><div className="field"><label htmlFor="rd-pb">Raza</label><input id="rd-pb" type="text" value={pt.breed} autoComplete="off" onChange={(e) => setPt({ ...pt, breed: e.target.value })} /></div><div className="field"><label htmlFor="rd-pno">Señas</label><input id="rd-pno" type="text" value={pt.notes} placeholder="Collar azul…" autoComplete="off" onChange={(e) => setPt({ ...pt, notes: e.target.value })} /></div></div>
          <button type="submit" className="btn btn--secondary btn--sm">Agregar mascota</button>
        </form>
      </Section>
    </>
  );
}

export function ResidentPage() {
  const [t, setT] = useState<string | null>(null);
  const [p, setP] = useState<ResPortal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"home" | "visits" | "areas" | "account" | "tickets" | "data">("home");
  const brand = useBrand();
  useEffect(() => { let tk = tokenOf("t"); try { if (tk) localStorage.setItem(KEY, tk); else tk = localStorage.getItem(KEY) ?? ""; } catch { /* sin almacenamiento */ } setT(tk); }, []);
  const load = useCallback(() => { if (!t) return; res<ResPortal>("portal", { t }).then((r) => { setP(r); setErr(null); }).catch((e) => { setErr(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o fue reemplazado. Pídele uno nuevo a la administración." : msg(e)); }); }, [t]);
  useEffect(() => { if (t === "") setErr("Falta tu enlace personal. Pídelo en la administración."); else load(); }, [t, load]);
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) load(); }, 60000); return () => clearInterval(i); }, [load]);
  if (err && !p) return <Card title="No pudimos abrir tu portal"><p className="landing__text" role="alert">{err}</p><p className="field__hint"><Link href="/">Ir a la página del conjunto</Link></p></Card>;
  if (!p || !t) return <Boot />;
  if (p.suspended) return <Card title={p.conjunto.name}><p className="landing__text">Este servicio está suspendido por el momento.</p></Card>;
  const debt = p.units.reduce((s, u) => s + u.overdue, 0);
  const first = p.person.name.split(" ")[0];
  const tabs: [typeof tab, string][] = [["home", "Inicio"], ["visits", "Visitas"], ["areas", "Reservas"], ["account", "Mi cuenta"], ["tickets", "PQRS"], ["data", "Vehículos y mascotas"]];
  return (
    <div className="dcard vetpage res-portal" style={brandStyle(brand)}>
      <header className="dcard__hero"><h1>Hola, {first}</h1><p className="dcard__veh">{p.conjunto.name} · {p.units.map((u) => u.label).join(", ")}</p></header>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {tab === "home" ? (
        <>
          {p.parcels.length ? <p className="note note--warn" role="status">📦 <b>Tienes {p.parcels.length === 1 ? "un paquete esperando" : `${p.parcels.length} paquetes esperando`} en portería.</b>{p.parcels.map((x) => <span key={x.id} className="field__hint"><br />{x.carrier ?? "Paquete"}{x.description ? ` · ${x.description}` : ""} · {x.unit}, llegó {dtCO(x.receivedAt)}</span>)}</p> : null}
          {debt > 0 ? <p className="note note--warn">Tienes {formatMoney(debt)} vencidos de administración. <button className="btn btn--secondary btn--sm" onClick={() => setTab("account")}>Ver mi cuenta</button></p> : null}
          {p.assemblies.filter((a) => a.status !== "cerrada").map((a) => <Section key={a.id} title={a.status === "en_curso" ? "🔴 Asamblea en curso" : "Asamblea convocada"}><p><b>{a.title}</b></p><p className="field__hint">{dateLongCO(a.startsAt)}</p><Link className="btn btn--primary" href={`/asamblea?t=${a.token}`}>{a.status === "en_curso" ? "Entrar a la asamblea" : "Ver convocatoria y registrar asistencia"}</Link></Section>)}
          <Section title="Cartelera">
            {!p.notices.length ? <p className="field__hint">No hay avisos por ahora.</p> : null}
            <ul className="dcard__list">{p.notices.map((n) => <li key={n.id} style={{ alignItems: "flex-start" }}><div><b>{n.pinned ? "📌 " : ""}{n.title}</b><p style={{ whiteSpace: "pre-wrap", color: "inherit" }}>{n.body}</p><p>{niceDate(n.publishedAt)}{n.authorName ? ` · ${n.authorName}` : ""}</p></div>{n.level !== "info" ? <Pill tone={NOTICE_TONE[n.level] ?? "info"}>{NOTICE_LEVELS.find((l) => l.v === n.level)?.l}</Pill> : null}</li>)}</ul>
          </Section>
          {p.conjunto.phone ? <p className="dcard__contact"><a className="btn btn--secondary btn--sm" href={`tel:${p.conjunto.phone}`}>Llamar a la administración</a><a className="btn btn--secondary btn--sm" href={`https://wa.me/${waNumber(p.conjunto.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a></p> : null}
        </>
      ) : null}
      {tab === "visits" ? <VisitsTab p={p} t={t} reload={load} /> : null}
      {tab === "areas" ? <AreasTab p={p} t={t} reload={load} /> : null}
      {tab === "account" ? <AccountTab p={p} t={t} /> : null}
      {tab === "tickets" ? <TicketsTab p={p} t={t} reload={load} /> : null}
      {tab === "data" ? <DataTab p={p} t={t} reload={load} /> : null}
      <p className="landing__foot">Este es tu enlace personal: no lo compartas. Con tecnología de EzerPro</p>
    </div>
  );
}

// ---------- Asamblea (enlace del propietario) ----------
export function ResAssemblyPage() {
  const [t, setT] = useState<string | null>(null);
  const [d, setD] = useState<ResPublicAssembly | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const brand = useBrand();
  useEffect(() => { setT(tokenOf("t")); }, []);
  const load = useCallback(() => { if (!t) return; res<ResPublicAssembly>("assembly", { t }).then((r) => { setD(r); setFatal(null); }).catch((e) => setFatal(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o ya no está disponible." : msg(e))); }, [t]);
  useEffect(() => { if (t === "") setFatal("Este enlace no es válido."); else load(); }, [t, load]);
  const st = d?.assembly.status;
  useEffect(() => { if (st !== "en_curso" && st !== "convocada") return; const i = setInterval(() => { if (!document.hidden) load(); }, 5000); return () => clearInterval(i); }, [st, load]);
  if (fatal && !d) return <Card title="No pudimos abrir la asamblea"><p className="landing__text" role="alert">{fatal}</p></Card>;
  if (!d || !t) return <Boot />;
  const a = d.assembly;
  const absent = d.units.filter((u) => !u.present);
  const mine = d.units.filter((u) => u.byMe);
  async function post(op: string, body: Record<string, unknown> = {}, ok = "") { setBusy(true); setErr(null); setOkMsg(null); try { await res(op, { t, ...body }); if (ok) setOkMsg(ok); load(); } catch (x) { setErr(msg(x, "No se pudo completar.")); } finally { setBusy(false); } }
  const open = d.open;
  async function sendVote() {
    if (!open) return;
    const votes = open.units.filter((u) => u.canVote && picks[`${open.id}:${u.unitId}`]).map((u) => ({ unitId: u.unitId, option: picks[`${open.id}:${u.unitId}`] }));
    if (!votes.length) return setErr("Elige tu voto para al menos una unidad.");
    await post("assembly-vote", { motionId: open.id, votes }, "¡Tu voto quedó registrado!");
    setPicks({});
  }
  return (
    <div className="dcard vetpage" style={brandStyle(brand)}>
      <header className="dcard__hero"><h1>{a.title}</h1><p className="dcard__veh">{d.conjunto.name}</p><p><Pill tone={a.status === "en_curso" ? "ok" : "info"}>{a.status === "en_curso" ? "En curso" : a.status === "cerrada" ? "Terminada" : "Convocada"}</Pill></p></header>
      <Section title="Convocatoria">
        <p>Hola <b>{d.person}</b>, estás convocado a esta asamblea.</p>
        <p><b>{dateLongCO(a.startsAt)}</b></p>
        <p>{MODE_TEXT[a.mode] ?? a.mode}{a.place ? ` · ${a.place}` : ""}</p>
        {a.link ? <p><a className="btn btn--secondary btn--sm" href={a.link} target="_blank" rel="noopener noreferrer">Abrir la reunión virtual</a></p> : null}
        <h3>Orden del día</h3><ol>{a.agenda.map((x) => <li key={x.n}>{x.title}</li>)}</ol>
      </Section>
      {d.docs.length ? <Section title="Documentos para leer antes"><ul className="dcard__list">{d.docs.map((x) => <li key={x.id}><div><b>{x.title}</b>{x.note ? <p>{x.note}</p> : null}</div><a className="btn btn--secondary btn--sm" href={x.url} target="_blank" rel="noopener noreferrer">Abrir</a></li>)}</ul></Section> : null}
      <Section title="Quórum y asistencia">
        <p><b>{d.quorum.hasQuorum ? "✔ Hay quórum" : "Aún sin quórum"}</b> · {pct(d.quorum.pct)} (se necesita {pct(d.quorum.required, 0)}) · {d.quorum.unitsPresent} unidades presentes</p>
        <ul className="dcard__list">{d.units.map((u) => <li key={u.unitId}><div><b>{u.label}</b><p>{pct(u.coefficient, 4)}{u.proxy ? " · por poder" : ""}{u.present ? (u.byMe ? " · presente (tú)" : ` · representada por ${u.representedBy}`) : ""}</p></div>{u.present ? <Pill tone="ok">Presente</Pill> : <Pill tone="warn">Ausente</Pill>}</li>)}</ul>
        {a.status !== "cerrada" ? <div className="actions-cell">
          {absent.length ? <button className="btn btn--primary" disabled={busy} onClick={() => post("assembly-checkin", {}, "Tu asistencia quedó registrada.")}>Registrar mi asistencia</button> : null}
          {mine.length ? <button className="btn btn--secondary" disabled={busy} onClick={() => post("assembly-leave", {}, "Registramos tu retiro de la reunión.")}>Me retiro de la reunión</button> : null}
        </div> : null}
        {a.status === "convocada" ? <p className="field__hint">Puedes registrar tu asistencia desde ya. Las votaciones se abren cuando la asamblea esté en curso.</p> : null}
      </Section>
      {err ? <p className="form-error" role="alert">{err}</p> : null}{okMsg ? <p className="note" role="status">{okMsg}</p> : null}
      {open ? (
        <section className="dcard__sec res-vote" aria-label="Votación abierta" aria-live="polite"><h2>🗳️ Votación abierta</h2>
          <p><b>{open.number}. {open.title}</b></p>{open.description ? <p>{open.description}</p> : null}
          <p className="field__hint">{open.type === "eleccion" ? "Elige una opción." : open.majority === "calificada" ? `Mayoría calificada ${open.majorityPct} %.` : "Mayoría simple."} Tu voto vale según el coeficiente de cada unidad.</p>
          {!open.units.length ? <p className="note">Para votar, primero registra tu asistencia arriba.</p> : null}
          {open.units.map((u) => (
            <div key={u.unitId} className="res-vote__unit"><b>{u.label}</b>
              {u.voted ? <p><Pill tone="ok">Ya votaste por esta unidad</Pill></p> : !u.canVote ? <p className="note note--warn">{u.reason ?? "Esta unidad no puede votar."}</p> : (
                <div className="chips" role="radiogroup" aria-label={`Voto de ${u.label}`}>{open.options.map((o) => { const on = picks[`${open.id}:${u.unitId}`] === o.key; return <button key={o.key} type="button" role="radio" aria-checked={on} className={on ? "is-on" : ""} onClick={() => setPicks({ ...picks, [`${open.id}:${u.unitId}`]: o.key })}>{o.label}</button>; })}</div>
              )}
            </div>
          ))}
          {open.units.some((u) => u.canVote) ? <button className="btn btn--primary tech__big" disabled={busy} onClick={sendVote}>Enviar mi voto</button> : null}
          <p className="field__hint">Una vez enviado, el voto no se puede cambiar. Queda registrado con una huella que permite verificar que nadie lo alteró.</p>
        </section>
      ) : a.status === "en_curso" ? <p className="note">No hay una votación abierta en este momento. Esta pantalla se actualiza sola.</p> : null}
      {d.closed.length ? (
        <Section title="Resultados">
          {d.closed.map((m) => (
            <div key={m.number}><p><b>{m.number}. {m.title}</b></p>
              {m.result ? <>{m.result.tallies.map((x) => <div className="res-tally" key={x.key}><span>{x.label}</span><div className="res-bar"><i style={{ width: `${Math.min(100, x.pct)}%` }} /></div><b>{pct(x.coef, 2)}</b></div>)}
                <p>{m.result.passed === true ? <Pill tone="ok">APROBADO</Pill> : m.result.passed === false ? <Pill tone="warn">NO APROBADO</Pill> : m.result.winner ? <Pill tone="ok">Elegido: {m.result.winner.label}</Pill> : null}</p></> : null}
            </div>
          ))}
        </Section>
      ) : null}
      {a.status === "cerrada" ? <p className="note">La asamblea terminó. El acta firmada la entrega la administración.</p> : null}
      <p className="landing__foot">Este enlace es personal: no lo compartas. Con tecnología de EzerPro</p>
    </div>
  );
}
