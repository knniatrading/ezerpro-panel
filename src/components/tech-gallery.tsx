"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { photoToDataUrl } from "@/lib/image";
import type { TechData, TechWorkItem } from "@/lib/types";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { useTechAccess } from "./tech-profile-admin";

type Pick = string | null | undefined; // undefined = sin cambios, null = quitar

function WorkDialog({ item, host, onClose, onDone }: { item: TechWorkItem | null; host: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [before, setBefore] = useState<Pick>(undefined);
  const [after, setAfter] = useState<Pick>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = encodeURIComponent(host);
  const shown = (side: "before" | "after", picked: Pick) => picked === undefined ? (item?.[side] ? `/api/public/tech-work/${item.id}/${side}?host=${q}&v=${item[side]}` : null) : picked;
  const sb = shown("before", before), sa = shown("after", after);

  async function choose(side: "before" | "after", file?: File) {
    if (!file) return;
    setErr(null);
    try { const url = await photoToDataUrl(file); side === "before" ? setBefore(url) : setAfter(url); }
    catch (x) { setErr(x instanceof Error ? x.message : "No se pudo leer la imagen."); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setErr("Escribe un título para el trabajo.");
    if (!sb && !sa) return setErr("Agrega al menos una foto (antes o después).");
    setBusy(true);
    try {
      // Cada petición lleva una sola foto para mantenerlas livianas.
      const base = { title: title.trim(), description: desc.trim() || null };
      let id = item?.id;
      if (id) {
        await api(`/tech/works/${id}`, { method: "PATCH", body: JSON.stringify({ ...base, ...(before !== undefined ? { before } : {}) }) });
      } else {
        const first = before ? { before } : { after };
        const made = await api<TechWorkItem>("/tech/works", { method: "POST", body: JSON.stringify({ ...base, ...first }) });
        id = made.id;
        if (before && after) await api(`/tech/works/${id}`, { method: "PATCH", body: JSON.stringify({ after }) });
      }
      if (item && after !== undefined) await api(`/tech/works/${id}`, { method: "PATCH", body: JSON.stringify({ after }) });
      onDone();
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setBusy(false); }
  }

  const slot = (side: "before" | "after", label: string, src: string | null | undefined) => (
    <div className="ba-slot">
      <label htmlFor={`w-${side}`}>{label}</label>
      {src ? <img src={src} alt={label} /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
      <input id={`w-${side}`} type="file" accept="image/*" onChange={(e) => { void choose(side, e.target.files?.[0]); e.target.value = ""; }} />
      {src ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => side === "before" ? setBefore(null) : setAfter(null)}>Quitar</button> : null}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar trabajo" : "Nuevo trabajo"}</h2>
      <div className="field"><label htmlFor="w-title">Título</label><input id="w-title" type="text" value={title} maxLength={80} placeholder="Fuga en tubería de cocina" autoComplete="off" onChange={(e) => { setTitle(e.target.value); setErr(null); }} /></div>
      <div className="field"><label htmlFor="w-desc">Qué hiciste (opcional)</label><input id="w-desc" type="text" value={desc} maxLength={200} autoComplete="off" onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="ba-slots">{slot("before", "Foto del antes", sb)}{slot("after", "Foto del después", sa)}</div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function TechGalleryView() {
  const { state, allowed } = useTechAccess();
  const { data, error, reload } = useResource<TechData>(allowed ? "/tech/profile" : null);
  const [dlg, setDlg] = useState<{ kind: "edit"; item: TechWorkItem | null } | { kind: "del"; id: string; title: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (state.status === "in" && !allowed) return <NoAccess />;
  const host = data?.host ?? "";
  const q = encodeURIComponent(host);

  async function del() {
    if (dlg?.kind !== "del") return;
    try { await api(`/tech/works/${dlg.id}`, { method: "DELETE" }); setDlg(null); reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Algo salió mal."); setDlg(null); }
  }
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Galería: antes y después</h1><p className="lede">Muestra tus mejores trabajos. Las fotos de resultados reales son lo que más confianza da. Máximo 12.</p></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDlg({ kind: "edit", item: null })} disabled={(data?.works.length ?? 0) >= 12}>Agregar trabajo</button>
      </div>
      {error || err ? <p className="form-error" role="alert">{err ?? error}</p> : null}
      <div className="ba-list">
        {(data?.works ?? []).map((w) => (
          <figure className="ba" key={w.id}>
            <div className="ba__pair">
              {w.before ? <div><img src={`/api/public/tech-work/${w.id}/before?host=${q}&v=${w.before}`} alt={`Antes: ${w.title}`} loading="lazy" /><span>Antes</span></div> : null}
              {w.after ? <div><img src={`/api/public/tech-work/${w.id}/after?host=${q}&v=${w.after}`} alt={`Después: ${w.title}`} loading="lazy" /><span>Después</span></div> : null}
            </div>
            <figcaption>
              <b>{w.title}</b>{w.description ? <p>{w.description}</p> : null}
              <div className="actions-cell"><button className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "edit", item: w })}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", id: w.id, title: w.title })}>Quitar</button></div>
            </figcaption>
          </figure>
        ))}
      </div>
      {data && !data.works.length ? <p className="lede">Aún no has subido trabajos. Agrega el primero con su foto del antes y del después.</p> : null}
      <Modal open={dlg?.kind === "edit"} onClose={() => setDlg(null)}>
        {dlg?.kind === "edit" ? <WorkDialog item={dlg.item} host={host} onClose={() => setDlg(null)} onDone={done} /> : null}
      </Modal>
      <ConfirmDialog open={dlg?.kind === "del"} title="Quitar trabajo" message={dlg?.kind === "del" ? `¿Quitar “${dlg.title}” de tu galería?` : ""} confirmLabel="Sí, quitar" onConfirm={del} onClose={() => setDlg(null)} />
    </div>
  );
}
