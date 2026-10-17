"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { brandStyle } from "@/lib/brand";
import { downloadText, formatPhone, vcard, waNumber } from "@/lib/rides";
import type { PublicTech, PublicTenant } from "@/lib/types";

/** Mini-web pública del técnico: pensada para generar confianza y que llamen o escriban al instante. */
export function TechPublic({ tenant }: { tenant: PublicTenant }) {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [d, setD] = useState<PublicTech | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PublicTech>(`/public/tech?host=${encodeURIComponent(host)}`).then(setD).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo cargar la página."));
  }, [host]);

  if (error) return <div className="landing"><div className="landing__card"><h1>No pudimos cargar la página</h1><p className="landing__text" role="alert">{error}</p></div></div>;
  if (!d) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <div className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></div>;

  const q = encodeURIComponent(host);
  const photo = d.img ? `/api/public/tech-photo?host=${q}&v=${d.img}` : null;
  const phone = d.phone ?? "";
  const saveContact = () => phone && downloadText(`${d.name}.vcf`, vcard({ name: `${d.name} - ${d.trade ?? "Técnico"} de confianza`, phone, org: tenant.name, note: d.trade ?? undefined, url: window.location.origin }), "text/vcard");
  const wa = `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(`Hola ${d.name}, vi tu página y necesito un servicio.`)}`;

  return (
    <div className="dcard tech" style={brandStyle(tenant.brandColor)}>
      <header className="dcard__hero">
        {photo ? <img className="dcard__photo" src={photo} alt={`Foto de ${d.name}`} /> : <span className="dcard__photo dcard__photo--empty" aria-hidden="true">{d.name.charAt(0)}</span>}
        <h1>{d.name}</h1>
        <p className="dcard__veh">{d.trade}</p>
        <div className="tech__badges">
          {d.years ? <span className="badge badge--info">{d.years} {d.years === 1 ? "año" : "años"} de experiencia</span> : null}
          {d.emergency ? <span className="badge badge--warn">Atiende emergencias</span> : null}
          <span className={`badge badge--${d.available ? "ok" : "muted"}`}>{d.available ? "Disponible" : "No disponible por ahora"}</span>
        </div>
        {d.bio ? <p className="dcard__bio">{d.bio}</p> : null}
      </header>

      {phone ? (
        <section className="tech__cta" aria-label="Contacto inmediato">
          <a className={`btn btn--primary tech__big${d.emergency ? " tech__big--urgent" : ""}`} href={`tel:${phone}`}>{d.emergency ? "Llamar ahora · Emergencia" : "Llamar ahora"}<small>{formatPhone(phone)}</small></a>
          <a className="btn btn--secondary tech__big tech__big--wa" href={wa} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
          <button type="button" className="btn btn--secondary" onClick={saveContact}>Guardar mi contacto en tu celular</button>
        </section>
      ) : null}

      {d.services?.length ? (
        <section className="dcard__sec">
          <h2>Servicios</h2>
          <ul className="dcard__list">
            {d.services.map((s) => (
              <li key={s.id}>
                <div><b>{s.name}</b>{s.description ? <p>{s.description}</p> : null}</div>
                <span className="tech__price">{s.price ? `Desde ${formatMoney(s.price)}` : "A cotizar"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {d.works?.length ? (
        <section className="dcard__sec">
          <h2>Mis trabajos: antes y después</h2>
          <div className="ba-list">
            {d.works.map((w) => (
              <figure className="ba" key={w.id}>
                <div className="ba__pair">
                  {w.before ? <div><img src={`/api/public/tech-work/${w.id}/before?host=${q}&v=${w.before}`} alt={`Antes: ${w.title}`} loading="lazy" /><span>Antes</span></div> : null}
                  {w.after ? <div><img src={`/api/public/tech-work/${w.id}/after?host=${q}&v=${w.after}`} alt={`Después: ${w.title}`} loading="lazy" /><span>Después</span></div> : null}
                </div>
                <figcaption><b>{w.title}</b>{w.description ? <p>{w.description}</p> : null}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {d.coverage || d.certifications?.length ? (
        <section className="dcard__sec">
          {d.coverage ? <><h2>Zonas de cobertura</h2><p>{d.coverage}</p></> : null}
          {d.certifications?.length ? <><h2 style={{ marginTop: d.coverage ? 14 : 0 }}>Certificaciones</h2><ul className="tech__certs">{d.certifications.map((c) => <li key={c}>{c}</li>)}</ul></> : null}
        </section>
      ) : null}

      <footer className="dcard__foot"><Link href="/login">Soy el técnico</Link><span>Con tecnología de EzerPro</span></footer>
    </div>
  );
}
