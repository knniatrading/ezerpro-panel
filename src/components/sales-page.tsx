"use client";

import { useEffect, useMemo, useState } from "react";
import { Logo } from "./brand";
import { api } from "@/lib/api";

interface Showcase {
  whatsapp: string | null;
  distributorDemoUrl: string | null;
  niches: {
    key: string;
    label: string;
    tagline: string;
    features: string[];
    clientLabel?: string;
    demo: { adminUrl: string; adminLabel?: string; clientUrl: string; roles: { key: string; label: string; url: string }[] } | null;
  }[];
}

function slugOf(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 18);
}

function Frame({ url, children, label }: { url: string; children: React.ReactNode; label: string }) {
  return (
    <figure className="sp-frame" aria-label={label}>
      <div className="sp-frame__bar">
        <span className="sp-frame__dots" aria-hidden="true" />
        <span className="sp-frame__url">{url}</span>
      </div>
      <div className="sp-frame__body">{children}</div>
    </figure>
  );
}

export function SalesPage() {
  const [data, setData] = useState<Showcase | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    api<Showcase>("/demo/showcase").then(setData).catch(() => setData({ whatsapp: null, distributorDemoUrl: null, niches: [] }));
  }, []);

  const brand = name.trim() || "Tu empresa";
  const slug = useMemo(() => slugOf(name) || "tuempresa", [name]);
  const wa = data?.whatsapp
    ? `https://wa.me/${data.whatsapp}?text=${encodeURIComponent("Hola, quiero ser distribuidor de EzerPro.")}`
    : null;

  return (
    <div className="sp">
      <header className="sp-head">
        <Logo tone="light" />
        <nav className="sp-head__nav" aria-label="Principal">
          <a href="#demos">Demos</a>
          {wa ? (
            <a className="sp-btn sp-btn--light" href={wa} target="_blank" rel="noopener noreferrer">
              Hablar por WhatsApp
            </a>
          ) : null}
        </nav>
      </header>

      <section className="sp-hero">
        <div className="sp-hero__text">
          <h1>Vende software para negocios con tu propia marca.</h1>
          <p>
            EzerPro pone la plataforma, los servidores y las actualizaciones. Tú pones tu nombre y tu dirección web, creas a tus clientes y les cobras. No construyes nada.
          </p>
          <div className="sp-hero__cta">
            <a className="sp-btn sp-btn--green" href="#demos">
              Ver los demos
            </a>
            {wa ? (
              <a className="sp-btn sp-btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <div className="sp-sim">
          <label className="sp-sim__label" htmlFor="sp-name">
            Escribe el nombre de tu empresa y mira cómo quedaría
          </label>
          <input id="sp-name" className="sp-sim__input" placeholder="Por ejemplo: Sistemas Andina" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          <div className="sp-sim__stage">
            <Frame url={`panel.${slug}.com`} label="Tu panel de distribuidor">
              <div className="sp-mock sp-mock--panel">
                <div className="sp-mock__side">
                  <span className="sp-mock__brand">{brand}</span>
                  <i /> <i /> <i />
                </div>
                <div className="sp-mock__main">
                  <b>Tus clientes</b>
                  <span className="sp-mock__row">
                    <em>Pizzería Don Luis</em> <small>activo</small>
                  </span>
                  <span className="sp-mock__row">
                    <em>Burger Norte</em> <small>activo</small>
                  </span>
                  <span className="sp-mock__row">
                    <em>Perros El Parque</em> <small>en prueba</small>
                  </span>
                </div>
              </div>
            </Frame>
            <Frame url={`pizzeria.${slug}.com`} label="La página de uno de tus clientes">
              <div className="sp-mock sp-mock--shop">
                <b>Pizzería Don Luis</b>
                <span className="sp-mock__item">
                  <i /> <em>Pizza hawaiana</em> <small>$ 32.000</small>
                </span>
                <span className="sp-mock__item">
                  <i /> <em>Pizza de pollo</em> <small>$ 34.000</small>
                </span>
              </div>
            </Frame>
          </div>
        </div>
      </section>

      <section className="sp-tiers" aria-labelledby="sp-tiers-h">
        <h2 id="sp-tiers-h">Cada quien en su lugar, cada uno con su dirección</h2>
        <ol className="sp-tiers__list">
          <li className="sp-tier sp-tier--0">
            <div>
              <h3>EzerPro</h3>
              <p>Mantiene la plataforma, la seguridad, las copias de respaldo y las mejoras.</p>
            </div>
            <code>ezerpro.com</code>
          </li>
          <li className="sp-tier sp-tier--1">
            <div>
              <h3>{brand}, como distribuidor</h3>
              <p>Creas a tus clientes, registras sus pagos y suspendes cuentas desde tu propio panel.</p>
            </div>
            <code>panel.{slug}.com</code>
          </li>
          <li className="sp-tier sp-tier--2">
            <div>
              <h3>Tus clientes</h3>
              <p>Cada negocio recibe su dirección y su panel, con su logo y sus colores.</p>
            </div>
            <code>negocio.{slug}.com</code>
          </li>
        </ol>
      </section>

      <section className="sp-demos" id="demos" aria-labelledby="sp-demos-h">
        <div className="sp-demos__inner">
          <h2 id="sp-demos-h">Prueba cada nicho tal como lo usaría un cliente</h2>
          <p className="sp-demos__lede">Los demos traen datos de ejemplo y se reinician cada noche. Entras sin contraseña y puedes tocar todo.</p>

          {data === null ? <p className="sp-demos__lede">Cargando…</p> : null}
          {data && data.niches.length === 0 ? <p className="sp-demos__lede">Los demos estarán disponibles muy pronto.</p> : null}

          {data?.niches.map((n) => (
            <article className="sp-niche" key={n.key}>
              <div className="sp-niche__text">
                <h3>{n.label}</h3>
                <p>{n.tagline}</p>
                <ul>
                  {n.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="sp-niche__demo">
                {n.demo ? (
                  <>
                    <a className="sp-btn sp-btn--green" href={n.demo.adminUrl} target="_blank" rel="noopener noreferrer">
                      Entrar como {(n.demo.adminLabel ?? "Administrador").toLowerCase()}
                    </a>
                    <a className="sp-btn sp-btn--ghost" href={n.demo.clientUrl} target="_blank" rel="noopener noreferrer">
                      {n.clientLabel ?? "Ver la tienda del cliente"}
                    </a>
                    {n.demo.roles.some((r) => r.url !== n.demo!.adminUrl) ? (
                    <p className="sp-niche__roles">
                      También como{" "}
                      {n.demo.roles
                        .filter((r) => r.url !== n.demo!.adminUrl)
                        .map((r, i, arr) => (
                          <span key={r.key}>
                            <a href={r.url} target="_blank" rel="noopener noreferrer">
                              {r.label.toLowerCase()}
                            </a>
                            {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " o " : ""}
                          </span>
                        ))}
                      .
                    </p>
                    ) : null}
                  </>
                ) : (
                  <p className="sp-niche__roles">El demo de este nicho se está preparando.</p>
                )}
              </div>
            </article>
          ))}

          {data?.distributorDemoUrl ? (
            <article className="sp-niche sp-niche--dist">
              <div className="sp-niche__text">
                <h3>Y tu panel, como distribuidor</h3>
                <p>Mira cómo administras a tus clientes: quién está activo, quién debe, sus pagos y los tuyos.</p>
              </div>
              <div className="sp-niche__demo">
                <a className="sp-btn sp-btn--light" href={data.distributorDemoUrl} target="_blank" rel="noopener noreferrer">
                  Entrar como distribuidor
                </a>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="sp-end">
        <h2>¿Listo para tener tu propia plataforma?</h2>
        <p>Cuéntanos de tu empresa y te ayudamos a empezar.</p>
        {wa ? (
          <a className="sp-btn sp-btn--green" href={wa} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        ) : null}
      </section>

      <footer className="sp-foot">
        <Logo tone="light" />
        <span>© {new Date().getFullYear()} EzerPro</span>
      </footer>
    </div>
  );
}
