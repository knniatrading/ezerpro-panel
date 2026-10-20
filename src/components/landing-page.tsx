"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import "./landing.css";

interface Demo {
  adminUrl: string;
  adminLabel?: string;
  clientUrl: string;
  roles: { key: string; label: string; url: string }[];
}
interface Niche {
  key: string;
  label: string;
  tagline: string;
  features: string[];
  clientLabel?: string;
  demo: Demo | null;
}
interface Showcase {
  whatsapp: string | null;
  distributorDemoUrl: string | null;
  niches: Niche[];
}


/** Iconos de línea (estilo Lucide) para toda la página. */
const PATHS: Record<string, React.ReactNode> = {
  palette: (<><circle cx="13.5" cy="6.5" r=".6" /><circle cx="17.5" cy="10.5" r=".6" /><circle cx="8.5" cy="7.5" r=".6" /><circle cx="6.5" cy="12.5" r=".6" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" /></>),
  receipt: (<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M14 8H8" /><path d="M16 12H8" /><path d="M13 16H8" /></>),
  card: (<><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /><path d="M6 15h4" /></>),
  chat: (<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />),
  phone: (<><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></>),
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>),
  shield: (<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>),
  check: (<path d="m5 12 5 5L20 7" />),
  utensils: (<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></>),
  car: (<><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>),
  zap: (<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />),
  paw: (<><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></>),
  dumbbell: (<><path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" /><path d="M3 9v6" /><path d="M21 9v6" /><path d="M6.5 12h11" /></>),
  steth: (<><path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></>),
  wrench: (<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />),
  hammer: (<><path d="m15 12-8.37 8.37a1 1 0 1 1-3-3L12 9" /><path d="m18 15 4-4" /><path d="m21.5 11.5-1.91-1.91A2 2 0 0 1 19 8.17V7l-2.26-2.26a6 6 0 0 0-4.2-1.76L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.17a2 2 0 0 1 1.41.59L18.5 14.5" /></>),
  scissors: (<><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></>),
  building: (<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></>),
  sparkle: (<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />),
};
function Ico({ n, size = 22 }: { n: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[n] ?? PATHS.sparkle}
    </svg>
  );
}

/** Iconos y nombres cortos de cada nicho (los textos largos vienen del servidor). */
const META: Record<string, { icon: string; short: string }> = {
  comidas_rapidas: { icon: "utensils", short: "Comidas rápidas" },
  conductores: { icon: "car", short: "Conductores" },
  tecnicos: { icon: "zap", short: "Técnicos del hogar" },
  veterinarias: { icon: "paw", short: "Veterinarias" },
  gimnasios: { icon: "dumbbell", short: "Gimnasios" },
  clinicas: { icon: "steth", short: "Clínicas" },
  talleres: { icon: "wrench", short: "Talleres" },
  ferreterias: { icon: "hammer", short: "Ferreterías" },
  belleza: { icon: "scissors", short: "Belleza y barberías" },
  residencial: { icon: "building", short: "Conjuntos" },
};
const ORDER = ["comidas_rapidas", "belleza", "clinicas", "gimnasios", "ferreterias", "talleres", "veterinarias", "residencial", "conductores", "tecnicos"];
const HERO = ["comidas_rapidas", "belleza", "gimnasios", "ferreterias", "residencial", "clinicas"];

const FAQ: [string, string][] = [
  ["¿Necesito saber de tecnología?", "No. EzerPro pone la plataforma, los servidores, la seguridad y las actualizaciones. Tú solo usas el panel, que está hecho para personas, no para técnicos."],
  ["¿Puedo usar mi logo, mis colores y mi dirección web?", "Sí. Cada negocio queda con su logo, sus colores y su propia dirección, por ejemplo tunegocio.tudominio.com."],
  ["¿Mis clientes tienen que descargar una app?", "No. Abren un enlace o escanean un código QR desde el celular y listo: piden, reservan, ven su cuenta o su turno."],
  ["¿Los demos son reales?", "Son la plataforma de verdad con datos de ejemplo. Entras sin contraseña, tocas todo y cada noche vuelven a su estado inicial."],
  ["¿Cuánto cuesta?", "La activación cuesta US$ 27 (se paga una sola vez) y la mensualidad es de US$ 12. Si quieres revenderlo como distribuidor, escríbenos por WhatsApp y te contamos."],
  ["¿Y si quiero venderlo yo con mi marca?", "Para eso existe el panel de distribuidor: creas a tus clientes, registras sus pagos y los suspendes o reactivas desde tu propio panel."],
];

function slugOf(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);
}

function WaIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16.04 3C8.84 3 3 8.8 3 15.96c0 2.28.6 4.5 1.74 6.46L3 29l6.76-1.7a13.1 13.1 0 0 0 6.28 1.6c7.2 0 13.04-5.8 13.04-12.96S23.24 3 16.04 3Zm0 23.7a10.9 10.9 0 0 1-5.56-1.52l-.4-.24-4.01 1.01 1.07-3.9-.26-.4a10.6 10.6 0 0 1-1.65-5.7c0-5.9 4.84-10.7 10.8-10.7s10.8 4.8 10.8 10.7-4.84 10.75-10.8 10.75Zm5.92-8.04c-.32-.16-1.92-.94-2.22-1.05-.3-.1-.52-.16-.73.16s-.84 1.05-1.03 1.27c-.19.21-.38.24-.7.08a8.8 8.8 0 0 1-2.6-1.6 9.7 9.7 0 0 1-1.8-2.24c-.19-.32 0-.5.14-.66.15-.15.32-.38.48-.57.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.74-1-2.38-.26-.62-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.3.32-1.12 1.1-1.12 2.68s1.15 3.1 1.31 3.32c.16.21 2.26 3.44 5.46 4.82.76.33 1.36.52 1.82.67.77.24 1.46.2 2.01.12.61-.09 1.92-.78 2.18-1.54.27-.75.27-1.4.19-1.54-.08-.13-.3-.21-.62-.37Z" />
    </svg>
  );
}

function Browser({ url, src, alt, priority }: { url: string; src: string; alt: string; priority?: boolean }) {
  return (
    <figure className="lp-browser">
      <div className="lp-browser__bar">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <em>{url}</em>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={1000} height={600} loading={priority ? "eager" : "lazy"} decoding="async" />
    </figure>
  );
}

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="lp-phone">
      <span className="lp-phone__notch" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={420} height={860} loading="lazy" decoding="async" />
    </figure>
  );
}

export function LandingPage() {
  const [data, setData] = useState<Showcase | null>(null);
  const [name, setName] = useState("");
  const [sel, setSel] = useState("comidas_rapidas");
  const [heroI, setHeroI] = useState(0);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    api<Showcase>("/demo/showcase").then(setData).catch(() => setData({ whatsapp: null, distributorDemoUrl: null, niches: [] }));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHeroI((i) => (i + 1) % HERO.length), 4200);
    return () => clearInterval(t);
  }, []);

  const niches = useMemo(() => {
    const list = data?.niches ?? [];
    return [...list].sort((a, b) => (ORDER.indexOf(a.key) + 100) % 100 - (ORDER.indexOf(b.key) + 100) % 100);
  }, [data]);
  const cur = niches.find((n) => n.key === sel) ?? niches[0];
  const brand = name.trim() || "Tu empresa";
  const slug = useMemo(() => slugOf(name) || "tuempresa", [name]);
  const wa = (msg: string) => (data?.whatsapp ? `https://wa.me/${data.whatsapp}?text=${encodeURIComponent(msg)}` : null);
  const waMain = wa("Hola, quiero conocer EzerPro para mi negocio.");
  const waDist = wa("Hola, quiero ser distribuidor de EzerPro.");
  const waNiche = cur ? wa(`Hola, me interesa EzerPro para mi negocio (${cur.label}).`) : waMain;
  const hk = HERO[heroI];

  const WaBtn = ({ href, children, cls = "" }: { href: string | null; children: React.ReactNode; cls?: string }) =>
    href ? (
      <a className={`lp-btn lp-btn--wa ${cls}`} href={href} target="_blank" rel="noopener noreferrer">
        <WaIcon />
        {children}
      </a>
    ) : null;

  return (
    <div className="lp">
      <header className="lp-head">
        <div className="lp-head__in">
          <a href="#inicio" className="lp-brand" aria-label="EzerPro, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/emblem.webp" alt="" width={40} height={38} />
            <span>
              <b>EZER</b>
              <i>PRO</i>
            </span>
          </a>
          <nav className={`lp-nav${menu ? " is-open" : ""}`} aria-label="Principal">
            <a href="#como" onClick={() => setMenu(false)}>Cómo funciona</a>
            <a href="#nichos" onClick={() => setMenu(false)}>Nichos y demos</a>
            <a href="#incluye" onClick={() => setMenu(false)}>Qué incluye</a>
            <a href="#precios" onClick={() => setMenu(false)}>Precios</a>
            <a href="#distribuidores" onClick={() => setMenu(false)}>Distribuidores</a>
            <a href="#preguntas" onClick={() => setMenu(false)}>Preguntas</a>
          </nav>
          <div className="lp-head__cta">
            <a className="lp-btn lp-btn--ghost lp-hide-s" href="#nichos">Ver demos</a>
            {waMain ? (
              <a className="lp-btn lp-btn--wa" href={waMain} target="_blank" rel="noopener noreferrer">
                <WaIcon />
                <span>WhatsApp</span>
              </a>
            ) : null}
            <button type="button" className="lp-burger" aria-label="Menú" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <main id="inicio">
        <section className="lp-hero">
          <div className="lp-hero__glow" aria-hidden="true" />
          <div className="lp-hero__in">
            <div className="lp-hero__text">
              <p className="lp-pill"><i aria-hidden="true" /> Plataforma para negocios · 100% en la nube</p>
              <h1>
                Tu negocio digital, <em>listo para vender</em>
              </h1>
              <p className="lp-lede">
                Pedidos, citas, ventas, cartera y mucho más en un solo lugar. Elige tu tipo de negocio, pruébalo ahora sin registrarte y lo dejamos con <b>tu marca y tu dirección web</b>.
              </p>
              <div className="lp-cta">
                <a className="lp-btn lp-btn--hot lp-btn--lg" href="#nichos">Probar un demo gratis →</a>
                <WaBtn href={waMain} cls="lp-btn--lg">Hablar por WhatsApp</WaBtn>
              </div>
              <ul className="lp-ticks">
                <li>Sin instalar nada</li>
                <li>Con tu logo y colores</li>
                <li>Funciona en el celular</li>
                <li>Demos sin contraseña</li>
              </ul>
            </div>

            <div className="lp-hero__vis" aria-label="Así se ve EzerPro">
              {HERO.map((k, i) => (
                <div key={k} className={`lp-hero__slide${i === heroI ? " is-on" : ""}`} aria-hidden={i !== heroI}>
                  <Browser url={`${slugOf(META[k]?.short ?? k)}.tudominio.com`} src={`/landing/${k}-admin.webp`} alt={`Panel de ${META[k]?.short ?? k}`} priority={i === 0} />
                  <Phone src={`/landing/${k}-cliente.webp`} alt={`Lo que ve el cliente de ${META[k]?.short ?? k}`} />
                </div>
              ))}
              <span className="lp-chip lp-chip--a"><Ico n={META[hk]?.icon ?? "sparkle"} size={18} />{META[hk]?.short}</span>
              <span className="lp-chip lp-chip--b"><Ico n="phone" size={18} />Todo en tu celular</span>
              <div className="lp-dots" role="tablist" aria-label="Ejemplos">
                {HERO.map((k, i) => (
                  <button key={k} type="button" role="tab" aria-selected={i === heroI} aria-label={META[k]?.short} className={i === heroI ? "is-on" : ""} onClick={() => setHeroI(i)} />
                ))}
              </div>
            </div>
          </div>

          <ul className="lp-facts">
            <li><b>{niches.length || 10}</b> tipos de negocio listos</li>
            <li><b>Demos reales</b> sin contraseña</li>
            <li><b>US$ 12 al mes</b> + US$ 27 de activación</li>
            <li><b>Soporte</b> por WhatsApp</li>
          </ul>
        </section>

        <section className="lp-sec" id="como" aria-labelledby="como-h">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Cómo funciona</p>
            <h2 id="como-h">De la idea a vender, en tres pasos</h2>
            <ol className="lp-steps">
              <li>
                <span className="lp-steps__n">1</span>
                <h3>Elige tu nicho y pruébalo</h3>
                <p>Entra a un demo con datos de ejemplo y toca todo: así sabes exactamente qué vas a tener.</p>
              </li>
              <li>
                <span className="lp-steps__n">2</span>
                <h3>Lo dejamos con tu marca</h3>
                <p>Tu logo, tus colores y tu propia dirección web. Tus clientes verán tu negocio, no el nuestro.</p>
              </li>
              <li>
                <span className="lp-steps__n">3</span>
                <h3>Empieza a vender y cobrar</h3>
                <p>Pedidos, citas o ventas desde el primer día. Tus clientes entran desde el celular, sin descargar nada.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="lp-sec lp-sec--tint" id="nichos" aria-labelledby="nichos-h">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Nichos y demos</p>
            <h2 id="nichos-h">Elige tu tipo de negocio y míralo funcionando</h2>
            <p className="lp-sub">Cada demo trae datos de ejemplo y se reinicia cada noche. Entras sin contraseña y puedes tocar todo.</p>

            {data === null ? <p className="lp-sub">Cargando…</p> : null}

            <div className="lp-tabs" role="tablist" aria-label="Tipos de negocio">
              {niches.map((n) => (
                <button key={n.key} type="button" role="tab" aria-selected={cur?.key === n.key} className={cur?.key === n.key ? "is-on" : ""} onClick={() => setSel(n.key)}>
                  <Ico n={META[n.key]?.icon ?? "sparkle"} size={20} />
                  {META[n.key]?.short ?? n.label}
                </button>
              ))}
            </div>

            {cur ? (
              <article className="lp-niche" key={cur.key} role="tabpanel" aria-label={cur.label}>
                <div className="lp-niche__text">
                  <h3>{cur.label}</h3>
                  <p>{cur.tagline}</p>
                  <ul>
                    {cur.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="lp-niche__btns">
                    {cur.demo ? (
                      <>
                        <a className="lp-btn lp-btn--hot" href={cur.demo.adminUrl} target="_blank" rel="noopener noreferrer">
                          Entrar como {(cur.demo.adminLabel ?? "administrador").toLowerCase()}
                        </a>
                        <a className="lp-btn lp-btn--line" href={cur.demo.clientUrl} target="_blank" rel="noopener noreferrer">
                          {cur.clientLabel ?? "Ver lo que ve el cliente"}
                        </a>
                      </>
                    ) : (
                      <p className="lp-muted">El demo de este nicho se está preparando.</p>
                    )}
                    <WaBtn href={waNiche}>Lo quiero para mi negocio</WaBtn>
                  </div>
                  {cur.demo && cur.demo.roles.some((r) => r.url !== cur.demo!.adminUrl) ? (
                    <p className="lp-muted">
                      También puedes entrar como{" "}
                      {cur.demo.roles
                        .filter((r) => r.url !== cur.demo!.adminUrl)
                        .map((r, i, arr) => (
                          <span key={r.key}>
                            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.label.toLowerCase()}</a>
                            {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " o " : ""}
                          </span>
                        ))}
                      .
                    </p>
                  ) : null}
                </div>
                <div className="lp-niche__vis">
                  <Browser url={`${slugOf(META[cur.key]?.short ?? cur.key)}.tudominio.com`} src={`/landing/${cur.key}-admin.webp`} alt={`Panel de ${cur.label}`} />
                  <Phone src={`/landing/${cur.key}-cliente.webp`} alt={`Lo que ve el cliente de ${cur.label}`} />
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className="lp-sec" id="incluye" aria-labelledby="inc-h">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Qué incluye</p>
            <h2 id="inc-h">Todo lo que necesitas en una sola plataforma</h2>
            <ul className="lp-grid">
              {[
                ["palette", "Tu marca, tu dirección", "Logo, colores y una dirección propia para cada negocio: tunegocio.tudominio.com."],
                ["receipt", "Pedidos, citas y ventas", "Según tu nicho: carta y domicilios, agenda, caja, inventario, órdenes de trabajo, asambleas y más."],
                ["card", "Cobros y cartera", "Quién pagó, quién debe y cuánto. Recordatorios para cobrar sin perseguir a nadie."],
                ["chat", "Avisos por WhatsApp", "Citas, vencimientos, paquetes o pedidos listos: un clic y el mensaje sale con los datos."],
                ["phone", "Funciona en el celular", "Tus clientes abren un enlace o escanean un QR. Sin descargar aplicaciones."],
                ["users", "Equipo con permisos", "Cada persona ve solo lo suyo: administrador, caja, profesionales, portería…"],
                ["chart", "Reportes claros", "Ventas, ingresos y métricas del día, de la semana y del mes, sin hojas de cálculo."],
                ["shield", "Seguridad y respaldos", "EzerPro mantiene los servidores, las copias de respaldo y las actualizaciones por ti."],
              ].map(([i, t, d]) => (
                <li key={t}>
                  <span aria-hidden="true"><Ico n={i} size={26} /></span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-sec lp-sec--tint" id="precios" aria-labelledby="pre-h">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Precios</p>
            <h2 id="pre-h">Un precio simple, sin sorpresas</h2>
            <p className="lp-sub">Pagas la activación una sola vez y después una mensualidad. Sin contratos largos ni costos escondidos.</p>
            <div className="lp-price">
              <div className="lp-price__nums">
                <div>
                  <span>Activación</span>
                  <b><small>US$</small>27</b>
                  <em>pago único</em>
                </div>
                <i aria-hidden="true">+</i>
                <div>
                  <span>Mensualidad</span>
                  <b><small>US$</small>12</b>
                  <em>por mes</em>
                </div>
              </div>
              <ul className="lp-price__list">
                {["Todo lo de tu tipo de negocio, listo para usar", "Tu logo, tus colores y tu dirección web", "Funciona en el celular, sin descargar apps", "Servidores, respaldos y actualizaciones incluidos", "Atención por WhatsApp"].map((t) => (
                  <li key={t}><Ico n="check" size={18} />{t}</li>
                ))}
              </ul>
              <div className="lp-price__cta">
                <WaBtn href={wa("Hola, quiero activar EzerPro para mi negocio.")} cls="lp-btn--lg">Quiero activar mi negocio</WaBtn>
                <a className="lp-btn lp-btn--line lp-btn--lg" href="#nichos">Probar un demo primero</a>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-dist" id="distribuidores" aria-labelledby="dist-h">
          <div className="lp-wrap lp-dist__in">
            <div>
              <p className="lp-eyebrow lp-eyebrow--light">Para distribuidores</p>
              <h2 id="dist-h">¿Quieres vender esta plataforma con tu propia marca?</h2>
              <p className="lp-sub lp-sub--light">
                EzerPro pone la plataforma, los servidores y las actualizaciones. Tú pones tu nombre y tu dirección web, creas a tus clientes y les cobras. No construyes nada.
              </p>
              <label className="lp-sim__label" htmlFor="lp-name">Escribe el nombre de tu empresa y mira cómo quedaría</label>
              <input id="lp-name" className="lp-sim__input" placeholder="Por ejemplo: Sistemas Andina" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              <ol className="lp-tiers">
                <li className="t0"><div><b>EzerPro</b><span>Plataforma, seguridad, respaldos y mejoras</span></div><code>ezerpro.com</code></li>
                <li className="t1"><div><b>{brand}, como distribuidor</b><span>Creas clientes, registras pagos y suspendes cuentas</span></div><code>panel.{slug}.com</code></li>
                <li className="t2"><div><b>Tus clientes</b><span>Cada negocio con su logo, sus colores y su dirección</span></div><code>negocio.{slug}.com</code></li>
              </ol>
              <div className="lp-cta">
                {data?.distributorDemoUrl ? (
                  <a className="lp-btn lp-btn--hot" href={data.distributorDemoUrl} target="_blank" rel="noopener noreferrer">Ver el panel de distribuidor</a>
                ) : null}
                <WaBtn href={waDist}>Quiero ser distribuidor</WaBtn>
              </div>
            </div>
            <div className="lp-dist__vis" aria-hidden="true">
              <div className="lp-dist__logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/emblem.webp" alt="" width={220} height={210} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="preguntas" aria-labelledby="faq-h">
          <div className="lp-wrap lp-wrap--narrow">
            <p className="lp-eyebrow">Preguntas frecuentes</p>
            <h2 id="faq-h">Lo que casi todos preguntan</h2>
            <div className="lp-faq">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-end" aria-labelledby="end-h">
          <div className="lp-end__card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/logo-full.webp" alt="EzerPro, tu negocio digital" width={200} height={183} loading="lazy" />
            <div>
              <h2 id="end-h">Tu futuro digital empieza hoy</h2>
              <p>Cuéntanos de tu negocio y te ayudamos a empezar. Respondemos por WhatsApp.</p>
              <div className="lp-cta">
                <WaBtn href={waMain} cls="lp-btn--lg">Escribir por WhatsApp</WaBtn>
                <a className="lp-btn lp-btn--line lp-btn--lg" href="#nichos">Ver los demos</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-foot__in">
          <a href="#inicio" className="lp-brand" aria-label="EzerPro, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/emblem.webp" alt="" width={32} height={30} />
            <span><b>EZER</b><i>PRO</i></span>
          </a>
          <span>Tu negocio digital · © {new Date().getFullYear()} EzerPro</span>
        </div>
      </footer>

      {waMain ? (
        <a className="lp-fab" href={waMain} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp">
          <WaIcon />
          <span>¿Hablamos?</span>
        </a>
      ) : null}
    </div>
  );
}
