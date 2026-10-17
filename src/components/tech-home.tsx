"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import { tenantOrigin } from "@/lib/tenant-url";
import type { TechData } from "@/lib/types";
import { useSession } from "./session";

export function TechHome() {
  const { state } = useSession();
  const { data } = useResource<TechData>("/tech/profile");
  const [copied, setCopied] = useState(false);
  const name = state.status === "in" ? state.user.tenant?.name ?? "" : "";
  const url = data?.host ? tenantOrigin(data.host) : "";
  const p = data?.profile;
  const steps = [
    { done: !!p?.img, label: "Sube tu foto profesional", href: "/mi-pagina" },
    { done: !!p?.phone, label: "Escribe tu celular para las llamadas y WhatsApp", href: "/mi-pagina" },
    { done: !!(p?.bio && p?.years !== null), label: "Cuenta quién eres y tus años de experiencia", href: "/mi-pagina" },
    { done: (data?.services.length ?? 0) > 0, label: "Agrega tus servicios", href: "/servicios" },
    { done: (data?.works.length ?? 0) > 0, label: "Sube trabajos de antes y después", href: "/galeria" },
  ];
  const left = steps.filter((s) => !s.done);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sin portapapeles */ }
  }

  return (
    <div className="page">
      <div className="page-head"><div><h1>Hola, {name}</h1><p className="lede">Tu página de confianza para conseguir más clientes.</p></div></div>
      {url ? (
        <div className="banner" role="status">
          Tu página: <a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, "")}</a>{" "}
          <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
        </div>
      ) : null}
      {p ? (
        <section className="dcard__sec" aria-label="Pasos para completar tu página">
          <h2>{left.length ? `Te faltan ${left.length} ${left.length === 1 ? "paso" : "pasos"}` : "Tu página está completa"}</h2>
          <ul className="dcard__list">
            {steps.map((s) => (
              <li key={s.label}><span>{s.done ? "✔ " : "○ "}{s.label}</span>{s.done ? null : <Link className="btn btn--secondary btn--sm" href={s.href}>Hacerlo</Link>}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="kpis" role="group" aria-label="Resumen">
        <div className="kpi"><span>Servicios en tu página</span><strong>{data?.services.filter((s) => s.active).length ?? 0}</strong></div>
        <div className="kpi"><span>Trabajos en la galería</span><strong>{data?.works.length ?? 0}</strong></div>
      </div>
      <div className="chips">
        <Link className="chip" href="/mi-pagina">Mi página y QR</Link>
        <Link className="chip" href="/servicios">Servicios</Link>
        <Link className="chip" href="/galeria">Galería</Link>
      </div>
    </div>
  );
}
