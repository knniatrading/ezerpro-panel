"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { photoToDataUrl } from "@/lib/image";
import { tenantOrigin } from "@/lib/tenant-url";
import type { TechData } from "@/lib/types";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

export function useTechAccess() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("tecnico");
  return { state, allowed };
}

export function TechProfileView() {
  const { state, allowed } = useTechAccess();
  const { data, error, reload } = useResource<TechData>(allowed ? "/tech/profile" : null);
  const [f, setF] = useState({ displayName: "", trade: "", phone: "", years: "", coverage: "", certifications: "", bio: "" });
  const [flags, setFlags] = useState({ emergency: false, available: true });
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = data?.host ? tenantOrigin(data.host) : "";

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setF({ displayName: p.displayName, trade: p.trade, phone: p.phone ?? "", years: p.years === null ? "" : String(p.years), coverage: p.coverage ?? "", certifications: p.certifications ?? "", bio: p.bio ?? "" });
    setFlags({ emergency: p.emergency, available: p.available });
  }, [data]);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [url]);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setOk(false); setErr(null); };
  const shownPhoto = photo === undefined ? (data?.profile.img ? `/api/public/tech-photo?host=${encodeURIComponent(data.host ?? "")}&v=${data.profile.img}` : null) : photo;

  async function pick(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setErr(null);
    try { setPhoto(await photoToDataUrl(file)); setOk(false); }
    catch (x) { setErr(x instanceof Error ? x.message : "No se pudo leer la imagen."); }
    finally { setPhotoBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    const years = f.years.trim() === "" ? null : Number(f.years);
    try {
      await api("/tech/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: f.displayName, trade: f.trade, years,
          phone: f.phone.trim() || null, coverage: f.coverage.trim() || null, certifications: f.certifications.trim() || null, bio: f.bio.trim() || null,
          ...flags, ...(photo !== undefined ? { image: photo } : {}),
        }),
      });
      setPhoto(undefined); setOk(true); reload();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); }
  }

  return (
    <div className="page">
      <div className="page-head no-print">
        <div>
          <h1>Mi página y QR</h1>
          <p className="lede">Así te ven tus clientes. Una buena foto y tus certificaciones generan confianza.</p>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field photo-field">
            <label htmlFor="t-photo">Tu foto profesional</label>
            <div className="photo-field__row">
              {shownPhoto ? <img className="photo-field__img" src={shownPhoto} alt="Tu foto" /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
              <div className="photo-field__actions">
                <input id="t-photo" type="file" accept="image/*" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
                {shownPhoto ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setPhoto(null)}>Quitar foto</button> : null}
                <p className="field__hint">{photoBusy ? "Preparando la foto…" : "Una foto de tu cara, con buena luz."}</p>
              </div>
            </div>
          </div>
          <div className="field"><label htmlFor="t-name">Tu nombre</label><input id="t-name" type="text" value={f.displayName} autoComplete="off" onChange={set("displayName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="t-trade">Tu oficio</label><input id="t-trade" type="text" value={f.trade} placeholder="Plomero, electricista…" autoComplete="off" onChange={set("trade")} /></div>
            <div className="field"><label htmlFor="t-years">Años de experiencia</label><input id="t-years" type="text" inputMode="numeric" value={f.years} autoComplete="off" onChange={set("years")} /></div>
          </div>
          <div className="field"><label htmlFor="t-phone">Celular (llamadas y WhatsApp)</label><input id="t-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
          <div className="field"><label htmlFor="t-cov">Zonas donde trabajas</label><input id="t-cov" type="text" value={f.coverage} maxLength={200} placeholder="Norte, centro y oriente" autoComplete="off" onChange={set("coverage")} /></div>
          <div className="field"><label htmlFor="t-cert">Certificaciones (una por línea)</label><textarea id="t-cert" rows={3} maxLength={400} value={f.certifications} onChange={set("certifications")} /></div>
          <div className="field"><label htmlFor="t-bio">Presentación</label><textarea id="t-bio" rows={3} maxLength={400} value={f.bio} onChange={set("bio")} /></div>
          <label className="check"><input type="checkbox" checked={flags.emergency} onChange={(e) => { setFlags({ ...flags, emergency: e.target.checked }); setOk(false); }} /> Atiendo emergencias (el botón de llamada se destaca)</label>
          <label className="check"><input type="checkbox" checked={flags.available} onChange={(e) => { setFlags({ ...flags, available: e.target.checked }); setOk(false); }} /> Estoy disponible para nuevos trabajos</label>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Página guardada.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar página"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">Tu código QR</h2>
          {qr ? <img src={qr} alt="Código QR de tu página" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell">
            <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button>
          </div>
          <p className="field__hint">Pégalo en un imán o sticker para dejar en la nevera, el tablero de la lavadora o la puerta. Así, la próxima vez que se dañe algo, te tienen a un toque.</p>
        </aside>
      </div>
      {qr ? (
        <div className="qr-sheet" aria-hidden="true">
          <div className="qr-card">
            <p className="qr-card__table">{data?.profile.displayName}</p>
            <p className="qr-card__hint">{data?.profile.trade}</p>
            <img src={qr} alt="" />
            <p className="qr-card__hint">¿Se dañó algo? Escanea, guarda mi contacto y llámame.</p>
            {data?.profile.phone ? <p className="qr-card__hint">{data.profile.phone}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
