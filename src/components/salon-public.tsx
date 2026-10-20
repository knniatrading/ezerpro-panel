"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { addDays, durationLabel, niceDate, timeCO, todayCO } from "@/lib/salon";
import type { PublicSalon, PublicSalonAppt, PublicSalonCatalog, PublicTenant } from "@/lib/types";

const host = () => (typeof window === "undefined" ? "" : window.location.hostname);
const msg = (e: unknown, d = "No se pudo cargar. Intenta de nuevo.") => (e instanceof ApiError ? e.message : d);
function Boot() { return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>; }
function Card({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="landing"><div className="landing__card"><h1>{title}</h1>{children}</div></div>; }

function usePublic<T>(path: string) {
  const [d, setD] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  useEffect(() => {
    const h = encodeURIComponent(host());
    api<T>(`${path}?host=${h}`).then(setD).catch((e) => setErr(msg(e)));
    api<PublicTenant>(`/public/tenant?host=${h}`).then((t) => setBrand(t.brandColor ?? null)).catch(() => {});
  }, [path]);
  return { d, err, brand };
}

type Svc = NonNullable<PublicSalon["services"]>[number];
type Slot = { start: string; label: string; staffId: string; staffName: string };

/** Reservar: servicios (uno o varios) → profesional → día → hora → datos. */
export function SalonBookingPage() {
  const { d, err, brand } = usePublic<PublicSalon>("/public/salon");
  const [picked, setPicked] = useState<string[]>([]);
  const [staffId, setStaffId] = useState("any");
  const [date, setDate] = useState(todayCO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" });
  const [e2, setE2] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; services: string[]; staffName: string; url: string } | null>(null);
  const services = d?.services ?? [];
  const chosen = services.filter((s) => picked.includes(s.id));
  const minutes = chosen.reduce((t, s) => t + s.minutes, 0);
  const total = chosen.reduce((t, s) => t + s.price, 0);
  const staff = useMemo(() => (d?.staff ?? []).filter((s) => chosen.every((c) => !c.staffIds.length || c.staffIds.includes(s.id))), [d, chosen]);
  const cats = [...new Set(services.map((s) => s.category ?? "Servicios"))];
  const key = picked.join(",");
  useEffect(() => { if (staffId !== "any" && !staff.some((s) => s.id === staffId)) setStaffId("any"); }, [staff, staffId]);
  useEffect(() => {
    if (!key || !date) { setSlots(null); return; }
    let off = false;
    setSlots(null); setSlot(null);
    api<{ slots: Slot[] }>(`/public/salon-slots?host=${encodeURIComponent(host())}&serviceIds=${key}&staffId=${staffId}&date=${date}`)
      .then((r) => { if (!off) setSlots(r.slots); })
      .catch((x) => { if (!off) { setSlots([]); setE2(msg(x, "No se pudieron cargar los horarios.")); } });
    return () => { off = true; };
  }, [key, staffId, date]);
  if (err) return <Card title="No pudimos cargar la página"><p className="landing__text" role="alert">{err}</p></Card>;
  if (!d) return <Boot />;
  if (d.suspended) return <Card title={d.name ?? "Salón"}><p className="landing__text" role="status">Las reservas están suspendidas por el momento.</p></Card>;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setE2(null); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked.length) return setE2("Elige al menos un servicio.");
    if (!slot) return setE2("Elige un horario.");
    if (f.name.trim().length < 2) return setE2("Escribe tu nombre completo.");
    if (!f.phone.trim()) return setE2("Escribe tu celular para confirmarte la cita.");
    setBusy(true);
    try {
      const r = await api<{ start: string; services: string[]; staffName: string; url: string }>("/public/salon-appointments", { method: "POST", body: JSON.stringify({ host: host(), serviceIds: picked, staffId: slot!.staffId, start: slot!.start, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, notes: f.notes.trim() || null }) });
      setDone(r);
    } catch (x) { setE2(msg(x, "Algo salió mal.")); setBusy(false); }
  }
  if (done) {
    const link = new URL(done.url, window.location.origin);
    return (
      <div style={brandStyle(brand)}><Card title="¡Cita reservada!">
        <p className="landing__text" role="status">{done.services.join(" + ")} con {done.staffName}<br /><b>{niceDate(done.start)} a las {timeCO(done.start)}</b></p>
        <p className="landing__text">Guarda este enlace: desde él puedes confirmar o cancelar tu cita.</p>
        <div className="actions-cell"><Link className="btn btn--primary" href={`${link.pathname}${link.search}`}>Ver mi cita</Link><Link className="btn btn--secondary" href="/">Volver</Link></div>
      </Card></div>
    );
  }
  return (
    <div className="dcard vetpage" style={brandStyle(brand)}>
      <header className="dcard__hero"><h1>Reserva tu cita</h1><p className="dcard__veh">{d.name}</p></header>
      <form onSubmit={submit} noValidate>
        <section className="dcard__sec"><h2>1. Elige tus servicios</h2>
          {cats.map((c) => (
            <div key={c}><h3 className="field__hint">{c}</h3>
              <ul className="dcard__list">{services.filter((s) => (s.category ?? "Servicios") === c).map((s: Svc) => {
                const on = picked.includes(s.id);
                return <li key={s.id}><div><b>{s.name}</b><p>{durationLabel(s.minutes)}{s.description ? ` · ${s.description}` : ""}</p></div>
                  <button type="button" className={`btn btn--sm ${on ? "btn--primary" : "btn--secondary"}`} aria-pressed={on} onClick={() => { setPicked((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id])); setE2(null); }}>{on ? "✓ " : ""}{formatMoney(s.price)}</button></li>;
              })}</ul></div>
          ))}
          {chosen.length ? <p className="note" role="status">{chosen.length} servicio{chosen.length > 1 ? "s" : ""} · {durationLabel(minutes)} · {formatMoney(total)}</p> : null}
        </section>
        {chosen.length ? (
          <section className="dcard__sec"><h2>2. ¿Con quién y cuándo?</h2>
            <div className="field"><label htmlFor="sb-st">Profesional</label><select id="sb-st" value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="any">Cualquiera disponible</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.title ? ` · ${s.title}` : ""}</option>)}</select></div>
            <div className="field"><label htmlFor="sb-date">Día</label><input id="sb-date" type="date" min={todayCO()} max={addDays(todayCO(), 90)} value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setE2(null); } }} /></div>
            <fieldset className="field"><legend>Hora</legend>
              {slots === null ? <p className="field__hint" role="status">Buscando horarios…</p> : slots.length === 0 ? <p className="field__hint">No hay horarios libres ese día. Prueba con otro día.</p> : <div className="chips">{slots.map((s) => <button type="button" key={s.start} className={slot?.start === s.start ? "is-on" : ""} aria-pressed={slot?.start === s.start} onClick={() => { setSlot(s); setE2(null); }}>{s.label}</button>)}</div>}
              {slot ? <p className="field__hint">Te atiende {slot.staffName}.</p> : null}
            </fieldset>
          </section>
        ) : null}
        {chosen.length ? (
          <section className="dcard__sec"><h2>3. Tus datos</h2>
            <div className="field"><label htmlFor="sb-name">Tu nombre completo</label><input id="sb-name" type="text" value={f.name} autoComplete="name" onChange={set("name")} /></div>
            <div className="field-row">
              <div className="field"><label htmlFor="sb-phone">Tu celular</label><input id="sb-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="tel" onChange={set("phone")} /></div>
              <div className="field"><label htmlFor="sb-email">Correo (para recordatorios)</label><input id="sb-email" type="email" value={f.email} autoComplete="email" onChange={set("email")} /></div>
            </div>
            <div className="field"><label htmlFor="sb-notes">¿Alergias o algo que debamos saber? (opcional)</label><input id="sb-notes" type="text" maxLength={300} value={f.notes} autoComplete="off" onChange={set("notes")} /></div>
            <div role="alert" className="form-error-slot">{e2 ? <p className="form-error">{e2}</p> : null}</div>
            <button type="submit" className="btn btn--primary tech__big" disabled={busy}>{busy ? "Reservando…" : "Reservar mi cita"}</button>
          </section>
        ) : <div role="alert" className="form-error-slot">{e2 ? <p className="form-error">{e2}</p> : null}</div>}
      </form>
      <p className="landing__foot"><Link href="/">← Volver a {d.name}</Link></p>
    </div>
  );
}

/** Página principal pública del salón. */
export function SalonPublic({ tenant }: { tenant: PublicTenant }) {
  const [d, setD] = useState<PublicSalon | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<PublicSalon>(`/public/salon?host=${encodeURIComponent(host())}`).then(setD).catch((e) => setError(msg(e, "No se pudo cargar la página."))); }, []);
  if (error) return <Card title="No pudimos cargar la página"><p className="landing__text" role="alert">{error}</p></Card>;
  if (!d) return <Boot />;
  if (d.suspended) return <Card title={d.name ?? "Salón"}><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></Card>;
  const phone = d.phone ?? "";
  const cats = [...new Set((d.services ?? []).map((s) => s.category ?? "Servicios"))];
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name ?? "", phone, org: d.name, url: window.location.origin }), "text/vcard");
  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        {d.logo ? <img className="dcard__photo" src={d.logo} alt="" /> : <span className="dcard__photo dcard__photo--empty" aria-hidden="true">✂️</span>}
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        {d.services?.length ? <Link className="btn btn--primary tech__big" href="/reservar">Reservar mi cita</Link> : null}
        {d.products ? <Link className="btn btn--secondary tech__big" href="/tienda-salon">Ver productos</Link> : null}
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      {d.staff?.length ? (
        <section className="dcard__sec"><h2>Nuestro equipo</h2>
          <ul className="dcard__list">{d.staff.map((a) => <li key={a.id}><div><b><i className="dot" style={{ background: a.color, display: "inline-block", width: 10, height: 10, borderRadius: 5, marginRight: 6 }} aria-hidden="true" />{a.name}</b>{a.title ? <p>{a.title}</p> : null}</div></li>)}</ul></section>
      ) : null}
      {cats.map((c) => (
        <section className="dcard__sec" key={c}><h2>{c}</h2>
          <ul className="dcard__list">{(d.services ?? []).filter((s) => (s.category ?? "Servicios") === c).map((s) => <li key={s.id}><div><b>{s.name}</b><p>{durationLabel(s.minutes)}{s.description ? ` · ${s.description}` : ""}</p></div><span className="tech__price">{s.price ? formatMoney(s.price) : "A cotizar"}</span></li>)}</ul></section>
      ))}
      {d.demoApptUrl ? <p className="field__hint" style={{ textAlign: "center" }}><a href={d.demoApptUrl}>Ver cómo le llega la cita al cliente (ejemplo)</a></p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}

/** Catálogo de productos: el cliente arma su lista y la envía por WhatsApp. */
export function SalonShopPage() {
  const { d, err, brand } = usePublic<PublicSalonCatalog>("/public/salon-catalog");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [who, setWho] = useState("");
  if (err) return <Card title="No pudimos cargar la tienda"><p className="landing__text" role="alert">{err}</p></Card>;
  if (!d) return <Boot />;
  if (d.suspended) return <Card title={d.name ?? "Salón"}><p className="landing__text" role="status">La tienda está suspendida por el momento.</p></Card>;
  const products = (d.products ?? []).filter((p) => !cat || p.category === cat);
  const all = d.products ?? [];
  const lines = all.filter((p) => cart[p.id] > 0);
  const total = lines.reduce((t, p) => t + p.price * cart[p.id], 0);
  const bump = (id: string, n: number) => setCart((c) => { const v = Math.max(0, (c[id] ?? 0) + n); const x = { ...c }; if (v) x[id] = v; else delete x[id]; return x; });
  const text = `Hola ${d.name}, quisiera pedir:\n${lines.map((p) => `• ${cart[p.id]} × ${p.name}${p.brand ? ` (${p.brand})` : ""} — ${formatMoney(p.price * cart[p.id])}`).join("\n")}\nTotal: ${formatMoney(total)}${who.trim() ? `\nA nombre de: ${who.trim()}` : ""}`;
  return (
    <div className="dcard vetpage" style={brandStyle(brand)}>
      <header className="dcard__hero"><h1>Productos</h1><p className="dcard__veh">{d.name}</p></header>
      {d.categories?.length ? <div className="chips" aria-label="Categorías"><button type="button" className={!cat ? "is-on" : ""} onClick={() => setCat("")}>Todos</button>{d.categories.map((c) => <button type="button" key={c} className={cat === c ? "is-on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div> : null}
      <section className="dcard__sec">
        <ul className="dcard__list">{products.map((p) => (
          <li key={p.id}><div><b>{p.name}</b><p>{[p.brand, p.category].filter(Boolean).join(" · ")} {p.available ? "" : "· Agotado"}</p><span className="tech__price">{formatMoney(p.price)}</span></div>
            {p.available ? (cart[p.id] ? <div className="actions-cell"><button type="button" className="btn btn--secondary btn--sm" aria-label={`Quitar uno de ${p.name}`} onClick={() => bump(p.id, -1)}>−</button><b aria-live="polite">{cart[p.id]}</b><button type="button" className="btn btn--secondary btn--sm" aria-label={`Agregar uno más de ${p.name}`} onClick={() => bump(p.id, 1)}>+</button></div>
              : <button type="button" className="btn btn--primary btn--sm" onClick={() => bump(p.id, 1)}>Agregar</button>) : <span className="badge badge--info">Agotado</span>}</li>
        ))}</ul>
        {!products.length ? <p className="field__hint">No hay productos en esta categoría.</p> : null}
      </section>
      {lines.length ? (
        <section className="dcard__sec" aria-label="Tu pedido"><h2>Tu pedido · {formatMoney(total)}</h2>
          <div className="field"><label htmlFor="sh-who">Tu nombre</label><input id="sh-who" type="text" value={who} autoComplete="name" onChange={(e) => setWho(e.target.value)} /></div>
          {d.phone ? <a className="btn btn--primary tech__big tech__big--wa" href={`https://wa.me/${waNumber(d.phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Enviar pedido por WhatsApp</a> : <p className="field__hint">Muéstrale esta lista a la recepción en el salón.</p>}
          <p className="field__hint">Te confirmamos disponibilidad y cómo recogerlo o recibirlo. El pago se hace con el salón.</p>
        </section>
      ) : null}
      <p className="landing__foot"><Link href="/">← Volver a {d.name}</Link></p>
    </div>
  );
}

/** Mi cita: confirmar o cancelar desde el enlace del recordatorio. */
export function SalonApptPage() {
  const [t, setT] = useState<string | null>(null);
  const [d, setD] = useState<PublicSalonAppt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const h = host();
  useEffect(() => { setT(new URLSearchParams(window.location.search).get("t") ?? ""); }, []);
  const load = () => api<PublicSalonAppt>("/public/salon-appt", { method: "POST", body: JSON.stringify({ host: h, t }) }).then(setD).catch((e) => setErr(e instanceof ApiError && e.status === 404 ? "Este enlace no es válido o ya no está disponible." : msg(e)));
  useEffect(() => { if (t) void load(); else if (t === "") setErr("Este enlace no es válido o ya no está disponible."); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [t]);
  async function act(action: "confirmar" | "cancelar") {
    setBusy(true); setErr(null);
    try { const r = await api<{ status: string }>("/public/salon-appt/action", { method: "POST", body: JSON.stringify({ host: h, t, action }) }); setRes(r.status); await load(); } catch (x) { setErr(msg(x, "Algo salió mal.")); } finally { setBusy(false); }
  }
  if (!d) return err ? <Card title="No pudimos abrir tu cita"><p className="landing__text" role="alert">{err}</p></Card> : <Boot />;
  if (d.suspended) return <Card title={d.name ?? "Salón"}><p className="landing__text">Este servicio está suspendido por el momento.</p></Card>;
  const st = res ?? d.status;
  return (
    <Card title={d.salon?.name ?? "Tu cita"}>
      <p className="landing__text">Hola {d.clientName?.split(" ")[0]}, esta es tu cita:</p>
      <p className="landing__text"><b>{(d.services ?? []).join(" + ")}</b><br />con {d.staffName} · {durationLabel(d.minutes ?? 0)} · {formatMoney(d.total ?? 0)}</p>
      <p className="tech__price" style={{ fontSize: "1.25rem" }}>{niceDate(d.start ?? "")} · {timeCO(d.start ?? "")}</p>
      {st === "confirmada" ? <p role="status" className="note">✔ Tu cita está confirmada. ¡Te esperamos!</p> : null}
      {st === "cancelada" ? <p role="status" className="note">Esta cita fue cancelada. Si quieres otra, puedes <Link href="/reservar">reservar de nuevo</Link>.</p> : null}
      {st === "atendida" ? <p role="status" className="note">Esta cita ya fue atendida. ¡Gracias por venir!</p> : null}
      {err ? <p className="form-error" role="alert">{err}</p> : null}
      {d.open ? <div className="actions-cell">{st === "programada" ? <button className="btn btn--primary" disabled={busy} onClick={() => act("confirmar")}>Confirmar asistencia</button> : null}<button className="btn btn--danger-ghost" disabled={busy} onClick={() => act("cancelar")}>Cancelar cita</button></div> : null}
      {d.salon?.phone ? <p className="field__hint">¿Necesitas cambiarla? Llama al <a href={`tel:${d.salon.phone}`}>{d.salon.phone}</a>{d.salon.address ? ` · ${d.salon.address}` : ""}</p> : null}
    </Card>
  );
}
