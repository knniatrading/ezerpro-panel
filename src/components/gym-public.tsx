"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import { WEEKDAYS, WEEK_ORDER, hhmm } from "@/lib/gym";
import type { PublicGym, PublicTenant } from "@/lib/types";

export const GYM_LS = (host: string) => `ezer-gym:${host}`;
export function readGymToken(host: string): string {
  try { return localStorage.getItem(GYM_LS(host)) ?? ""; } catch { return ""; }
}
export function saveGymToken(host: string, t: string) {
  try { localStorage.setItem(GYM_LS(host), t); } catch { /* sin almacenamiento */ }
}

const ICON_QR = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" /></svg>
);

/** Página pública del gimnasio: planes, clases y entrada al portal del socio. */
export function GymPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicGym | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  useEffect(() => {
    api<PublicGym>(`/public/gym?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
    setToken(readGymToken(host));
  }, [host]);

  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;

  const phone = d.phone ?? "";
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: d.name, phone, org: d.name, url: window.location.origin }), "text/vcard");
  const byDay = WEEK_ORDER.map((w) => ({ w, items: (d.classes ?? []).filter((c) => c.weekday === w).sort((a, b) => a.startMin - b.startMin) })).filter((x) => x.items.length);

  return (
    <div className="dcard vetpage" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        <span className="dcard__photo dcard__photo--empty" aria-hidden="true">🏋️</span>
        <h1>{d.name}</h1>
        {d.address ? <p className="dcard__veh">{d.address}</p> : null}
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>
      <section className="tech__cta" aria-label="Acciones">
        <Link className="btn tech__big vet-cta vet-cta--portal" href={token ? `/socio?t=${token}` : "/socio"}><span className="vet-cta__row">{ICON_QR}Soy socio: mi QR y mi rutina</span><small>{token ? "Entrar a mi portal" : "Entrada con QR, rutinas y clases"}</small></Link>
        {phone ? <a className="btn btn--secondary tech__big" href={`tel:${phone}`}>Llamar<small>{formatPhone(phone)}</small></a> : null}
        {phone ? <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent("Hola, quisiera información sobre las membresías.")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {phone ? <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar contacto en tu celular</button> : null}
      </section>
      {d.plans?.length ? (
        <section className="dcard__sec">
          <h2>Membresías</h2>
          <ul className="dcard__list">{d.plans.map((p) => <li key={p.id}><div><b>{p.name}</b><p>{p.description ? `${p.description} · ` : ""}{p.days} días</p></div><span className="tech__price">{formatMoney(p.price)}</span></li>)}</ul>
        </section>
      ) : null}
      {byDay.length ? (
        <section className="dcard__sec">
          <h2>Clases grupales</h2>
          {byDay.map(({ w, items }) => (
            <div key={w}><h3>{WEEKDAYS[w]}</h3>
              <ul className="dcard__list">{items.map((c) => <li key={c.id}><div><b>{c.name}</b>{c.instructor ? <p>{c.instructor}</p> : null}</div><span className="tech__price">{hhmm(c.startMin)}</span></li>)}</ul></div>
          ))}
          <p className="field__hint">Los socios reservan su cupo desde su portal.</p>
        </section>
      ) : null}
      {d.demoPortalUrl ? <p className="field__hint" style={{ textAlign: "center" }}><a href={d.demoPortalUrl}>Ver el portal de un socio de ejemplo</a></p> : null}
      <p className="landing__foot">Con tecnología de EzerPro</p>
    </div>
  );
}
