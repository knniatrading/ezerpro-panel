"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { METHODS, QUOTE_TEXT, STATUS_TEXT, STEPS, dateCO, resizeImage, staffPhoto, timeCO, waLink } from "@/lib/taller";
import type { TallerItem, TallerMechanic, TallerOrderDetail, TallerPart, TallerProfileData, TallerStatus } from "@/lib/types";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { ALL, Dlg, NumInput, Plate, StatusBadge, errMsg, useMechanics, useTallerAccess } from "./taller-common";

function ItemDialog({ orderId, item, onClose, onDone }: { orderId: string; item: TallerItem | null; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<"mano_obra" | "repuesto">(item?.kind ?? "mano_obra");
  const [parts, setParts] = useState<TallerPart[]>([]);
  const [types, setTypes] = useState<TallerProfileData["types"]>([]);
  const [partId, setPartId] = useState(item?.partId ?? "");
  const [typeId, setTypeId] = useState(item?.serviceTypeId ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [qty, setQty] = useState(String(item?.qty ?? 1));
  const [price, setPrice] = useState(item ? String(item.unitPrice) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<TallerPart[]>("/taller/parts").then((r) => setParts(r.filter((p) => p.active))).catch(() => {});
    api<TallerProfileData>("/taller/profile").then((r) => setTypes(r.types.filter((t) => t.active))).catch(() => {});
  }, []);
  const pickPart = (id: string) => { setPartId(id); const p = parts.find((x) => x.id === id); if (p) { setDesc(p.name); setPrice(String(p.price)); } };
  const pickType = (id: string) => { setTypeId(id); const t = types.find((x) => x.id === id); if (t && !desc) setDesc(t.name); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      if (item) await api(`/taller/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ description: desc.trim(), qty: Number(qty), unitPrice: Number(price) }) });
      else await api(`/taller/orders/${orderId}/items`, { method: "POST", body: JSON.stringify({ kind, description: desc.trim() || undefined, qty: Number(qty), unitPrice: price === "" ? undefined : Number(price), partId: kind === "repuesto" && partId ? partId : undefined, serviceTypeId: kind === "mano_obra" && typeId ? typeId : undefined }) });
      onDone();
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{item ? "Editar ítem" : "Agregar a la cotización"}</h2>
      {!item ? <div className="chips" role="group" aria-label="Tipo"><button type="button" className={`chip${kind === "mano_obra" ? " is-on" : ""}`} aria-pressed={kind === "mano_obra"} onClick={() => setKind("mano_obra")}>Mano de obra</button><button type="button" className={`chip${kind === "repuesto" ? " is-on" : ""}`} aria-pressed={kind === "repuesto"} onClick={() => setKind("repuesto")}>Repuesto</button></div> : null}
      {!item && kind === "repuesto" ? <div className="field"><label htmlFor="it-part">Del inventario</label><select id="it-part" value={partId} onChange={(e) => pickPart(e.target.value)}><option value="">Otro (escribir a mano)</option>{parts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.stock} disp. · {formatMoney(p.price)}</option>)}</select></div> : null}
      {!item && kind === "mano_obra" ? <div className="field"><label htmlFor="it-type">Servicio con recordatorio (opcional)</label><select id="it-type" value={typeId} onChange={(e) => pickType(e.target.value)}><option value="">Ninguno</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name} · cada {t.months} {t.months === 1 ? "mes" : "meses"}</option>)}</select><p className="field__hint">Al entregar, se programa el próximo aviso de mantenimiento.</p></div> : null}
      <div className="field"><label htmlFor="it-d">Descripción</label><input id="it-d" type="text" maxLength={120} value={desc} autoComplete="off" onChange={(e) => { setDesc(e.target.value); setErr(null); }} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="it-q">Cantidad</label><input id="it-q" type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div className="field"><label htmlFor="it-p">Precio unitario (pesos)</label><NumInput id="it-p" value={price} onChange={(v) => { setPrice(v); setErr(null); }} />{price ? <p className="field__hint">{Number(qty) > 1 ? `${qty} × ${formatMoney(Number(price))} = ${formatMoney(Number(price) * Number(qty))}` : formatMoney(Number(price))}</p> : null}</div>
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}

function PayDialog({ orderId, balance, onClose, onDone }: { orderId: string; balance: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("efectivo");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/taller/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(amount), method, note: note.trim() || null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Registrar pago</h2>
      <p className="lede">Saldo pendiente: <b>{formatMoney(balance)}</b></p>
      <div className="field-row">
        <div className="field"><label htmlFor="py-a">Valor</label><NumInput id="py-a" value={amount} onChange={(v) => { setAmount(v); setErr(null); }} /></div>
        <div className="field"><label htmlFor="py-m">Medio</label><select id="py-m" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="py-n">Nota (opcional)</label><input id="py-n" type="text" maxLength={200} value={note} placeholder="Ej.: anticipo" autoComplete="off" onChange={(e) => setNote(e.target.value)} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button></div>
    </form>
  );
}

function DeliverDialog({ orderId, kmIn, onClose, onDone }: { orderId: string; kmIn: number | null; onClose: () => void; onDone: () => void }) {
  const [km, setKm] = useState(kmIn ? String(kmIn) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api(`/taller/orders/${orderId}/status`, { method: "POST", body: JSON.stringify({ status: "entregado", kmOut: km ? Number(km) : null }) }); onDone(); } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Entregar el vehículo</h2>
      <p className="lede">Al entregar se cierra la orden, se programa el próximo mantenimiento y se calcula el pago del mecánico.</p>
      <div className="field"><label htmlFor="dl-km">Kilometraje de salida</label><NumInput id="dl-km" value={km} onChange={setKm} /></div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions"><button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Entregando…" : "Entregar"}</button></div>
    </form>
  );
}

export function TallerOrderView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, allowed, role } = useTallerAccess(ALL);
  const { data: d, error, reload } = useResource<TallerOrderDetail>(allowed ? `/taller/orders/${id}` : null);
  const mechanics = useMechanics(allowed && role !== "EMPLOYEE");
  const [item, setItem] = useState<TallerItem | "new" | null>(null);
  const [pay, setPay] = useState(false);
  const [deliver, setDeliver] = useState(false);
  const [confirm, setConfirm] = useState<null | "cancel" | "delete" | { item: TallerItem } | { pay: string }>(null);
  const [diag, setDiag] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState({ url: "", caption: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (d && diag === null) setDiag(d.order.diagnosis ?? ""); }, [d, diag]);
  if (state.status === "in" && !allowed) return <NoAccess />;
  if (error) return <div className="page"><p className="form-error" role="alert">{error}</p><Link href="/ordenes">← Volver a las órdenes</Link></div>;
  if (!d) return <div className="page"><p className="lede" role="status">Cargando…</p></div>;
  const { order: o, vehicle: v, customer: c } = d;
  const mech = role === "EMPLOYEE", admin = role === "TENANT_ADMIN";
  const closed = o.status === "entregado" || o.status === "cancelado";
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setMsg(null); try { await fn(); reload(); } catch (x) { setMsg(errMsg(x)); } finally { setBusy(false); } };
  const setStatus = (status: string) => act(() => api(`/taller/orders/${o.id}/status`, { method: "POST", body: JSON.stringify({ status }) }));
  const quote = (action: string) => act(() => api(`/taller/orders/${o.id}/quote`, { method: "POST", body: JSON.stringify({ action }) }));
  const assign = (mechanicId: string) => act(() => api(`/taller/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ mechanicId: mechanicId || null }) }));
  const saveDiag = () => act(() => api(`/taller/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ diagnosis: (diag ?? "").trim() || null }) }));
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    await act(async () => { for (const f of Array.from(files).slice(0, 10)) { const data = await resizeImage(f); await api(`/taller/orders/${o.id}/photos`, { method: "POST", body: JSON.stringify({ data }) }); } });
    if (fileRef.current) fileRef.current.value = "";
  }
  const addVideo = () => act(async () => { await api(`/taller/orders/${o.id}/photos`, { method: "POST", body: JSON.stringify({ url: video.url.trim(), caption: video.caption.trim() || null }) }); setVideo({ url: "", caption: "" }); });
  const first = c.name.split(" ")[0];
  const needsApproval = d.items.length > 0 && o.quoteStatus !== "aprobada";
  const quoteMsg = `Hola ${first}, te enviamos la cotización de tu ${v.label} (${v.plate}) por ${formatMoney(o.total)}. Revisa el detalle y las fotos, y aprueba la reparación con un clic aquí: ${o.trackUrl}`;
  /** Marca la cotización como enviada (el cliente ya puede aprobarla) y abre WhatsApp con el enlace. */
  async function sendQuote(resend: boolean) {
    const w = window.open("", "_blank");
    setBusy(true); setMsg(null);
    try {
      if (!resend) await api(`/taller/orders/${o.id}/quote`, { method: "POST", body: JSON.stringify({ action: "enviar" }) });
      reload();
      const url = waLink(c.phone, quoteMsg);
      if (w) w.location.href = url; else setMsg("La cotización ya quedó enviada. Pulsa “Reenviar por WhatsApp” para abrir el mensaje.");
    } catch (x) { w?.close(); setMsg(errMsg(x)); } finally { setBusy(false); }
  }
  async function copyApproval() {
    try { if (o.quoteStatus !== "enviada") await api(`/taller/orders/${o.id}/quote`, { method: "POST", body: JSON.stringify({ action: "enviar" }) }); await navigator.clipboard?.writeText(o.trackUrl); setMsg("Enlace de aprobación copiado. La cotización quedó enviada."); reload(); } catch (x) { setMsg(errMsg(x)); }
  }
  const trackMsg = `Hola ${first}, sigue el estado de tu ${v.label} (${v.plate}) en vivo aquí: ${o.trackUrl}`;
  const stepIdx = STEPS.indexOf(o.status);
  const next: { s: TallerStatus; l: string; off?: boolean }[] = [];
  if (!closed) {
    if (o.status === "recibido") next.push({ s: "diagnostico", l: "Empezar diagnóstico" });
    if (["aprobado", "diagnostico", "recibido", "cotizado"].includes(o.status) ) next.push({ s: "en_reparacion", l: "Iniciar reparación", off: needsApproval });
    if (o.status === "en_reparacion") next.push({ s: "listo", l: "Finalizar orden (trabajo terminado)" });
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1>Orden #{o.number}</h1><p className="lede"><Plate plate={v.plate} kind={v.kind} /> {v.label}{v.color ? ` · ${v.color}` : ""} · ingresó el {dateCO(o.createdAt)}</p></div>
        <div className="actions-cell"><StatusBadge status={o.status} />{!mech ? <Link className="btn btn--secondary btn--sm" href={`/vehiculos/${v.id}`}>Historial de la placa</Link> : <Link className="btn btn--secondary btn--sm" href={`/vehiculos/${v.id}`}>Historial</Link>}</div></div>
      {msg ? <p className="form-error" role="alert">{msg}</p> : null}

      <ol className="tl-steps" aria-label="Avance de la orden">{STEPS.map((s, i) => <li key={s} className={o.status === "cancelado" ? "" : i < stepIdx ? "is-done" : i === stepIdx ? "is-now" : ""}><span>{STATUS_TEXT[s].label}</span></li>)}</ol>

      <div className="cl-stack">
        <section className="card" aria-label="Datos">
          <h2>Cliente y vehículo</h2>
          <dl className="kv"><dt>Cliente</dt><dd>{c.name} · {c.phone}{c.email ? ` · ${c.email}` : ""}</dd>
            <dt>Motivo</dt><dd>{o.complaint}</dd>
            <dt>Kilometraje</dt><dd>Entrada {o.kmIn?.toLocaleString("es-CO") ?? "—"}{o.kmOut ? ` · salida ${o.kmOut.toLocaleString("es-CO")}` : ""}</dd>
            {v.oil ? <><dt>Aceite que usa</dt><dd>{v.oil}</dd></> : null}
            <dt>Mecánico</dt><dd>{!mech && !closed ? <select aria-label="Mecánico" value={o.mechanicId ?? ""} onChange={(e) => assign(e.target.value)}><option value="">Sin asignar</option>{mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select> : o.mechanicName ?? "Sin asignar"}{mech && !closed && !o.mechanicId ? <> <button className="btn btn--secondary btn--sm" onClick={() => assign(state.status === "in" ? state.user.id : "")}>Tomar esta orden</button></> : null}</dd>
            {admin && o.mechanicPay !== null ? <><dt>Pago al mecánico</dt><dd>{formatMoney(o.mechanicPay)} (por mano de obra)</dd></> : null}
          </dl>
          <div className="actions-cell">
            <a className="btn btn--secondary btn--sm" href={waLink(c.phone, trackMsg)} target="_blank" rel="noreferrer">Enviar seguimiento por WhatsApp</a>
            <button className="btn btn--secondary btn--sm" onClick={() => navigator.clipboard?.writeText(o.trackUrl).then(() => setMsg("Enlace de seguimiento copiado."))}>Copiar enlace</button>
          </div>
        </section>

        {!closed ? (
          <section className="card" aria-label="Acciones">
            <h2>Siguiente paso</h2>
            <div className="actions-cell">
              {next.map((n) => <button key={n.s} className="btn btn--primary btn--sm" disabled={busy || n.off} onClick={() => setStatus(n.s)}>{n.l}</button>)}
              {!mech && ["listo", "en_reparacion"].includes(o.status) ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => setDeliver(true)}>Entregar vehículo</button> : null}
              {!mech ? <button className="btn btn--danger-ghost btn--sm" disabled={busy} onClick={() => setConfirm("cancel")}>Cancelar orden</button> : null}
            </div>
            {d.items.length && o.quoteStatus !== "aprobada" ? <p className="field__hint">Para iniciar la reparación el cliente debe aprobar la cotización.</p> : null}
          </section>
        ) : null}

        <section className="card" aria-label="Diagnóstico">
          <h2>Diagnóstico del mecánico</h2>
          {closed ? <p>{o.diagnosis || "Sin diagnóstico."}</p> : (
            <><textarea aria-label="Diagnóstico" rows={3} maxLength={1500} value={diag ?? ""} placeholder="Qué encontró, qué recomienda y por qué" onChange={(e) => setDiag(e.target.value)} />
              <button className="btn btn--secondary btn--sm" disabled={busy || (diag ?? "") === (o.diagnosis ?? "")} onClick={saveDiag}>Guardar diagnóstico</button></>
          )}
        </section>

        <section className="card" aria-label="Cotización">
          <div className="page-head"><h2>Cotización · <span className="field__hint">{QUOTE_TEXT[o.quoteStatus]}{o.quoteStatus === "aprobada" && o.approvedName ? ` por ${o.approvedName}` : ""}</span></h2>
            {!closed ? <button className="btn btn--secondary btn--sm" onClick={() => setItem("new")}>Agregar ítem</button> : null}</div>
          {d.items.length ? (
            <div className="table-wrap"><table className="table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th>{admin ? <th>Costo</th> : null}<th>Subtotal</th><th></th></tr></thead><tbody>
              {d.items.map((i) => (
                <tr key={i.id}><td>{i.description}<br /><span className="field__hint">{i.kind === "mano_obra" ? "Mano de obra" : "Repuesto"}{i.consumed ? " · descontado del inventario" : ""}</span></td><td>{i.qty}</td><td>{formatMoney(i.unitPrice)}</td>{admin ? <td>{i.unitCost !== null ? formatMoney(i.unitCost * i.qty) : "—"}</td> : null}<td><b>{formatMoney(i.qty * i.unitPrice)}</b></td>
                  <td className="actions-cell">{!closed ? <><button className="btn btn--secondary btn--sm" onClick={() => setItem(i)}>Editar</button><button className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm({ item: i })}>Quitar</button></> : null}</td></tr>
              ))}
            </tbody></table></div>
          ) : <p className="field__hint">Aún no hay ítems. Agrega la mano de obra y los repuestos para cotizar.</p>}
          <p className="lede">Mano de obra <b>{formatMoney(o.laborTotal)}</b> · Repuestos <b>{formatMoney(o.partsTotal)}</b> · Total <b>{formatMoney(o.total)}</b></p>
          {d.items.length && !closed ? (
            o.quoteStatus === "aprobada" ? <p className="note" role="status">✅ El cliente aprobó esta cotización. Ya se puede reparar.</p>
              : o.quoteStatus === "enviada" ? <p className="note" role="status">⏳ Cotización enviada: esperando que el cliente la apruebe desde su celular.</p>
              : <p className="note note--warn" role="status">⚠️ Esta cotización todavía <b>no se ha enviado</b> al cliente. Él no puede aprobarla hasta que la envíes.{o.quoteStatus === "rechazada" ? " (El cliente la rechazó: corrígela y vuelve a enviarla.)" : ""}</p>
          ) : null}
          {!closed && d.items.length && o.quoteStatus !== "aprobada" ? (
            <div className="actions-cell">
              {o.quoteStatus === "enviada"
                ? <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => sendQuote(true)}>Reenviar por WhatsApp</button>
                : <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => sendQuote(false)}>Enviar cotización al cliente por WhatsApp</button>}
              <button className="btn btn--secondary btn--sm" disabled={busy} onClick={copyApproval}>Copiar enlace de aprobación</button>
              {!mech ? <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => quote("aprobar_taller")}>El cliente aprobó en el taller</button> : null}
              {!mech && o.quoteStatus === "enviada" ? <button className="btn btn--danger-ghost btn--sm" disabled={busy} onClick={() => quote("rechazar_taller")}>El cliente la rechazó</button> : null}
            </div>
          ) : null}
          {!mech && o.quoteStatus !== "ninguna" ? <p className="field__hint">El cliente la ve en {o.trackUrl.replace(/^https?:\/\//, "")} con un botón “Aprobar reparación”.</p> : null}
        </section>

        <section className="card" aria-label="Fotos y videos">
          <h2>Fotos y videos del diagnóstico</h2>
          <p className="field__hint">El cliente ve estas fotos junto a la cotización: así entiende por qué se necesita cada repuesto.</p>
          {d.photos.length ? <ul className="tl-photos">{d.photos.map((p) => (
            <li key={p.id}>{p.kind === "foto" ? <a href={staffPhoto(p.id)} target="_blank" rel="noreferrer"><img src={staffPhoto(p.id)} alt={p.caption ?? "Foto de la orden"} loading="lazy" /></a> : <a className="tl-photos__video" href={p.url ?? "#"} target="_blank" rel="noopener noreferrer">▶ Ver video</a>}
              {p.caption ? <span>{p.caption}</span> : null}
              {!closed ? <button className="btn btn--danger-ghost btn--sm" onClick={() => act(() => api(`/taller/photos/${p.id}`, { method: "DELETE" }))}>Quitar</button> : null}</li>
          ))}</ul> : <p className="field__hint">Todavía no hay fotos.</p>}
          {o.status !== "cancelado" ? (
            <>
              <div className="field"><label htmlFor="ph-f">Subir fotos (se reducen solas)</label><input id="ph-f" ref={fileRef} type="file" accept="image/*" multiple capture="environment" disabled={busy} onChange={(e) => void upload(e.target.files)} /></div>
              <div className="field-row">
                <div className="field"><label htmlFor="vd-u">O pega el enlace de un video</label><input id="vd-u" type="url" value={video.url} placeholder="https://…" autoComplete="off" onChange={(e) => setVideo({ ...video, url: e.target.value })} /></div>
                <div className="field"><label htmlFor="vd-c">Comentario</label><input id="vd-c" type="text" maxLength={140} value={video.caption} autoComplete="off" onChange={(e) => setVideo({ ...video, caption: e.target.value })} /></div>
              </div>
              <button className="btn btn--secondary btn--sm" disabled={busy || !video.url.trim()} onClick={addVideo}>Agregar video</button>
            </>
          ) : null}
        </section>

        {!mech ? (
          <section className="card" aria-label="Pagos">
            <div className="page-head"><h2>Pagos</h2>{o.status !== "cancelado" && (o.balance ?? 0) > 0 ? <button className="btn btn--primary btn--sm" onClick={() => setPay(true)}>Registrar pago</button> : null}</div>
            <p className="lede">Total <b>{formatMoney(o.total)}</b> · Pagado <b>{formatMoney(o.paid ?? 0)}</b> · Saldo <b>{formatMoney(o.balance ?? 0)}</b></p>
            {d.payments.length ? <ul className="plain-list">{d.payments.map((p) => <li key={p.id}>{dateCO(p.paidAt)} · {formatMoney(p.amount)} · {METHODS.find((m) => m.v === p.method)?.l ?? p.method}{p.note ? ` · ${p.note}` : ""}{admin ? <> <button className="btn btn--danger-ghost btn--sm" onClick={() => setConfirm({ pay: p.id })}>Anular</button></> : null}</li>)}</ul> : <p className="field__hint">Sin pagos registrados.</p>}
          </section>
        ) : null}

        <section className="card" aria-label="Historial de la orden">
          <h2>Línea de tiempo</h2>
          <ul className="plain-list">{d.events.map((e) => <li key={e.id}><b>{STATUS_TEXT[e.status as TallerStatus]?.label ?? (e.status === "pago" ? "Pago" : e.status === "asignado" ? "Asignación" : e.status)}</b> · {dateCO(e.createdAt)} {timeCO(e.createdAt)}{e.byName ? ` · ${e.byName}` : ""}{e.note ? <><br /><span className="field__hint">{e.note}</span></> : null}</li>)}</ul>
        </section>
        {admin && !closed ? <button className="btn btn--danger-ghost btn--sm" style={{ justifySelf: "start" }} onClick={() => setConfirm("delete")}>Eliminar orden</button> : null}
      </div>

      <Dlg open={item !== null} onClose={() => setItem(null)}>{item !== null ? <ItemDialog orderId={o.id} item={item === "new" ? null : item} onClose={() => setItem(null)} onDone={() => { setItem(null); reload(); }} /> : null}</Dlg>
      <Dlg open={pay} onClose={() => setPay(false)}>{pay ? <PayDialog orderId={o.id} balance={o.balance ?? 0} onClose={() => setPay(false)} onDone={() => { setPay(false); reload(); }} /> : null}</Dlg>
      <Dlg open={deliver} onClose={() => setDeliver(false)}>{deliver ? <DeliverDialog orderId={o.id} kmIn={o.kmIn} onClose={() => setDeliver(false)} onDone={() => { setDeliver(false); reload(); }} /> : null}</Dlg>
      <ConfirmDialog open={confirm === "cancel"} title="Cancelar la orden" message="Se devuelven al inventario los repuestos descontados. Esta acción no se puede deshacer." confirmLabel="Sí, cancelar" onConfirm={async () => { setConfirm(null); await setStatus("cancelado"); }} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === "delete"} title="Eliminar la orden" message="Se borra por completo. Solo es posible si no tiene pagos." confirmLabel="Eliminar" onConfirm={async () => { setConfirm(null); try { await api(`/taller/orders/${o.id}`, { method: "DELETE" }); router.push("/ordenes"); } catch (x) { setMsg(errMsg(x)); } }} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={!!confirm && typeof confirm === "object" && "item" in confirm} title="Quitar ítem" message="Si el cliente ya aprobó, tendrá que aprobar de nuevo la cotización." confirmLabel="Quitar" onConfirm={async () => { const it = (confirm as { item: TallerItem }).item; setConfirm(null); await act(() => api(`/taller/items/${it.id}`, { method: "DELETE" })); }} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={!!confirm && typeof confirm === "object" && "pay" in confirm} title="Anular pago" message="El pago se elimina del registro." confirmLabel="Anular" onConfirm={async () => { const pid = (confirm as { pay: string }).pay; setConfirm(null); await act(() => api(`/taller/payments/${pid}`, { method: "DELETE" })); }} onClose={() => setConfirm(null)} />
    </div>
  );
}
export type { TallerMechanic };
