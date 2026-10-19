"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ageText } from "@/lib/vet";
import { waNumber, formatPhone } from "@/lib/rides";
import { petPhotoUrl } from "./vet-patients";
import type { PublicPetId } from "@/lib/types";

/** Pet ID: lo que ve quien escanea el QR de la mascota. Solo datos básicos; el celular del dueño aparece si está perdida. */
export function VetPetIdView() {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const [code, setCode] = useState<string | null>(null);
  const [d, setD] = useState<PublicPetId | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const c = (new URLSearchParams(window.location.search).get("c") ?? "").toUpperCase();
    setCode(c);
    if (!c) { setError("Falta el código de la mascota."); return; }
    api<PublicPetId>(`/public/vet-pet?host=${encodeURIComponent(host)}&c=${encodeURIComponent(c)}`).then(setD).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "No encontramos esta mascota. Revisa el código." : e instanceof ApiError ? e.message : "No se pudo cargar."));
  }, [host]);

  if (error) return <main className="landing"><div className="landing__card"><h1>Pet ID</h1><p className="landing__text" role="alert">{error}</p><Link href="/">Ir a la clínica</Link></div></main>;
  if (!d || !code) return <div className="boot" role="status"><span className="boot__text">Cargando…</span></div>;
  if (d.suspended) return <main className="landing"><div className="landing__card"><h1>{d.name}</h1><p className="landing__text" role="status">Este servicio está suspendido por el momento.</p></div></main>;
  const photo = petPhotoUrl(host, code, d.img ?? null);
  const age = ageText(d.birthDate);
  const phone = d.owner?.phone ?? "";
  return (
    <main className="dcard vetpage" id="contenido">
      <header className="dcard__hero">
        {photo ? <img className="dcard__photo" src={photo} alt={`Foto de ${d.name}`} /> : <span className="dcard__photo dcard__photo--empty" aria-hidden="true">{d.name.charAt(0)}</span>}
        <h1>{d.name}</h1>
        <p className="dcard__veh">{d.species}{d.breed ? ` · ${d.breed}` : ""}{d.sex ? ` · ${d.sex}` : ""}{age ? ` · ${age}` : ""}</p>
        {d.lost ? <p className="banner" role="status"><b>¡{d.name} está perdida!</b> Si la encontraste, avisa a su familia. Gracias por ayudar.</p> : null}
      </header>
      {d.lost && phone ? (
        <section className="tech__cta" aria-label="Contactar a la familia">
          <a className="btn btn--primary tech__big tech__big--urgent" href={`tel:${phone}`}>Llamar a {d.owner?.name}<small>{formatPhone(phone)}</small></a>
          <a className="btn btn--secondary tech__big tech__big--wa" href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(`Hola, encontré a ${d.name}.`)}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
        </section>
      ) : null}
      {d.allergies ? <section className="dcard__sec"><h2>Alergias</h2><p className="text-danger">{d.allergies}</p></section> : null}
      <section className="dcard__sec">
        <h2>Su clínica</h2>
        <p><b>{d.clinic?.name}</b>{d.clinic?.address ? <><br />{d.clinic.address}</> : null}</p>
        {d.clinic?.phone ? <a className="btn btn--secondary" href={`tel:${d.clinic.phone}`}>Llamar a la clínica</a> : null}
        {!d.lost ? <p className="field__hint">Si encontraste a {d.name}, llama a la clínica y ellos avisan a su familia.</p> : null}
      </section>
    </main>
  );
}
