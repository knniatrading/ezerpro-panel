"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { photoToDataUrl } from "@/lib/image";
import { tenantOrigin } from "@/lib/tenant-url";
import type { DriverData } from "@/lib/types";
import { useSession } from "./session";
import { NoAccess } from "./no-access";

const VEHICLES = ["Carro", "Camioneta", "Van", "Moto", "Camión pequeño", "Otro"];

export function CardAdminView() {
  const { state } = useSession();
  const allowed = state.status === "in" && state.user.role === "TENANT_ADMIN" && !!state.user.tenant?.modules?.includes("tarjeta");
  const { data, error, reload } = useResource<DriverData>(allowed ? "/driver/profile" : null);
  const [f, setF] = useState({ displayName: "", vehicleType: "Carro", vehicleDesc: "", plate: "", phone: "", bio: "" });
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
    setF({ displayName: p.displayName, vehicleType: p.vehicleType, vehicleDesc: p.vehicleDesc ?? "", plate: p.plate ?? "", phone: p.phone ?? "", bio: p.bio ?? "" });
  }, [data]);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 600, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [url]);

  if (state.status === "in" && !allowed) return <NoAccess />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setOk(false); setErr(null); };
  const shownPhoto = photo === undefined ? (data?.profile.img ? `/api/public/driver-photo?host=${encodeURIComponent(data.host ?? "")}&v=${data.profile.img}` : null) : photo;

  async function pick(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setErr(null);
    try {
      setPhoto(await photoToDataUrl(file));
      setOk(false);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "No se pudo leer la imagen.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      await api("/driver/profile", {
        method: "PATCH",
        body: JSON.stringify({ ...f, vehicleDesc: f.vehicleDesc.trim() || null, plate: f.plate.trim() || null, phone: f.phone.trim() || null, bio: f.bio.trim() || null, ...(photo !== undefined ? { image: photo } : {}) }),
      });
      setPhoto(undefined);
      setOk(true);
      reload();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar. Selecciona el enlace y cópialo."); }
  }

  return (
    <div className="page">
      <div className="page-head no-print">
        <div>
          <h1>Mi tarjeta y QR</h1>
          <p className="lede">Así te ven tus pasajeros. Pega el QR en tu vehículo para que te guarden y te pidan servicios.</p>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="card-admin no-print">
        <form onSubmit={save} noValidate className="card-admin__form">
          <div className="field photo-field">
            <label htmlFor="d-photo">Tu foto</label>
            <div className="photo-field__row">
              {shownPhoto ? <img className="photo-field__img" src={shownPhoto} alt="Tu foto" /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
              <div className="photo-field__actions">
                <input id="d-photo" type="file" accept="image/*" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
                {shownPhoto ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setPhoto(null)}>Quitar foto</button> : null}
                <p className="field__hint">{photoBusy ? "Preparando la foto…" : "Una foto de tu cara genera confianza."}</p>
              </div>
            </div>
          </div>
          <div className="field"><label htmlFor="d-name">Tu nombre</label><input id="d-name" type="text" value={f.displayName} autoComplete="off" onChange={set("displayName")} /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="d-type">Tipo de vehículo</label>
              <select id="d-type" value={VEHICLES.includes(f.vehicleType) ? f.vehicleType : "Otro"} onChange={set("vehicleType")}>{VEHICLES.map((v) => <option key={v}>{v}</option>)}</select></div>
            <div className="field"><label htmlFor="d-plate">Placa</label><input id="d-plate" type="text" value={f.plate} maxLength={10} autoComplete="off" onChange={set("plate")} /></div>
          </div>
          <div className="field"><label htmlFor="d-desc">Marca, modelo y color</label><input id="d-desc" type="text" value={f.vehicleDesc} placeholder="Chevrolet Spark GT gris" autoComplete="off" onChange={set("vehicleDesc")} /></div>
          <div className="field"><label htmlFor="d-phone">Celular (WhatsApp)</label><input id="d-phone" type="tel" inputMode="numeric" value={f.phone} autoComplete="off" onChange={set("phone")} /></div>
          <div className="field"><label htmlFor="d-bio">Presentación</label><textarea id="d-bio" rows={3} maxLength={300} value={f.bio} onChange={set("bio")} /></div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          {ok ? <p className="note" role="status">Tarjeta guardada.</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar tarjeta"}</button>
        </form>
        <aside className="card-admin__qr">
          <h2 className="section-title">Tu código QR</h2>
          {qr ? <img src={qr} alt="Código QR de tu tarjeta" width={220} height={220} /> : <p className="lede">Generando…</p>}
          <p className="field__hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="actions-cell">
            <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()} disabled={!qr}>Imprimir QR</button>
          </div>
        </aside>
      </div>
      {qr ? (
        <div className="qr-sheet" aria-hidden="true">
          <div className="qr-card">
            <p className="qr-card__table">{data?.profile.displayName}</p>
            <img src={qr} alt="" />
            <p className="qr-card__hint">Escanea para guardar mi contacto y pedir tu servicio</p>
            {data?.profile.plate ? <p className="qr-card__hint">Placa {data.profile.plate}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
