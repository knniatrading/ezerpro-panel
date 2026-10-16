"use client";

import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import type { DiningTable } from "@/lib/types";
import { useSession } from "./session";
import { Modal } from "./modal";
import { ConfirmDialog } from "./confirm-dialog";
import { NoAccess } from "./no-access";
import { tenantOrigin } from "@/lib/tenant-url";
import { TenantBrand } from "./tenant-brand";
import { IconPlus } from "./icons";

type Dlg =
  | { kind: "new" }
  | { kind: "bulk" }
  | { kind: "rename"; t: DiningTable }
  | { kind: "del"; t: DiningTable }
  | null;

function useQr(origin: string, tables: DiningTable[]) {
  const [qr, setQr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const t of tables) {
        out[t.id] = await QRCode.toDataURL(`${origin}/mesa/${t.code}`, { margin: 1, width: 360, errorCorrectionLevel: "M" });
      }
      if (!cancelled) setQr(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, tables]);
  return qr;
}

export function TablesView() {
  const { state } = useSession();
  const isAdmin = state.status === "in" && state.user.role === "TENANT_ADMIN";
  const { data, error, reload } = useResource<DiningTable[]>(isAdmin ? "/tables" : null);
  const [origin, setOrigin] = useState("");
  const [dlg, setDlg] = useState<Dlg>(null);
  const [text, setText] = useState("");
  const [count, setCount] = useState("5");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printIds, setPrintIds] = useState<string[] | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const tenantHost = state.status === "in" ? state.user.tenant?.host : undefined;
  useEffect(() => setOrigin(tenantOrigin(tenantHost)), [tenantHost]);
  const qr = useQr(origin, data ?? []);

  // Imprime cuando ya están dibujadas las tarjetas elegidas.
  useEffect(() => {
    if (!printIds) return;
    const t = setTimeout(() => {
      window.print();
      setPrintIds(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printIds]);

  if (state.status === "in" && !isAdmin) return <NoAccess />;
  if (state.status !== "in") return null;
  const tenant = state.user.tenant;
  const close = () => { setDlg(null); setErr(null); setText(""); };

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      close();
      after?.();
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  }

  async function submitName(e: FormEvent) {
    e.preventDefault();
    if (dlg?.kind === "new") await run(() => api("/tables", { method: "POST", body: JSON.stringify({ name: text }) }));
    if (dlg?.kind === "rename") await run(() => api(`/tables/${dlg.t.id}`, { method: "PATCH", body: JSON.stringify({ name: text }) }));
  }

  async function toggle(t: DiningTable) {
    setActionErr(null);
    try {
      await api(`/tables/${t.id}`, { method: "PATCH", body: JSON.stringify({ active: !t.active }) });
      reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "No se pudo cambiar.");
    }
  }

  const toPrint = (data ?? []).filter((t) => (printIds ? printIds.includes(t.id) : false));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Mesas</h1>
          <p className="lede">Cada mesa tiene su código QR. El cliente lo escanea y pide desde su celular, sin instalar nada.</p>
        </div>
        <div className="actions-cell">
          <button type="button" className="btn btn--secondary" onClick={() => { setCount("5"); setDlg({ kind: "bulk" }); }}><IconPlus /><span>Crear varias</span></button>
          <button type="button" className="btn btn--primary" onClick={() => { setText(""); setDlg({ kind: "new" }); }}><IconPlus /><span>Nueva mesa</span></button>
          {data && data.some((t) => t.active) ? (
            <button type="button" className="btn btn--secondary" onClick={() => setPrintIds(data.filter((t) => t.active).map((t) => t.id))}>Imprimir todos los QR</button>
          ) : null}
        </div>
      </header>

      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {actionErr ? <div className="banner banner--error" role="alert"><span>{actionErr}</span></div> : null}

      {data && data.length === 0 ? (
        <section className="note">
          <h2>Todavía no tienes mesas</h2>
          <p>Crea tus mesas (por ejemplo, 10 de una vez) y luego imprime sus códigos QR.</p>
        </section>
      ) : null}

      <div className="tables-grid">
        {data?.map((t) => (
          <article key={t.id} className={`tcard${t.active ? "" : " is-off"}`} aria-label={t.name}>
            <div className="tcard__head">
              <strong>{t.name}</strong>
              {!t.active ? <span className="badge badge--warn">Desactivada</span> : t.openOrders ? <span className="badge badge--info">{t.openOrders} abierto{t.openOrders > 1 ? "s" : ""}</span> : null}
            </div>
            {qr[t.id] ? <img src={qr[t.id]} alt={`Código QR de ${t.name}`} className="tcard__qr" /> : <div className="tcard__qr" />}
            <div className="actions-cell">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setPrintIds([t.id])}>Imprimir</button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setText(t.name); setDlg({ kind: "rename", t }); }}>Renombrar</button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => toggle(t)}>{t.active ? "Desactivar" : "Activar"}</button>
              <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del", t })}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      {/* Hoja que solo se ve al imprimir */}
      <div className="qr-sheet" aria-hidden="true">
        {toPrint.map((t) => (
          <div className="qr-card" key={t.id}>
            {tenant ? <TenantBrand name={tenant.name} logo={tenant.logo} tone="light" /> : null}
            <p className="qr-card__table">{t.name}</p>
            {qr[t.id] ? <img src={qr[t.id]} alt="" /> : null}
            <p className="qr-card__hint">Escanea para ver la carta y pedir</p>
          </div>
        ))}
      </div>

      <Modal open={dlg?.kind === "new" || dlg?.kind === "rename"} onClose={close}>
        <form onSubmit={submitName} noValidate>
          <h2 id="dlg-title" tabIndex={-1}>{dlg?.kind === "rename" ? "Renombrar mesa" : "Nueva mesa"}</h2>
          <div className="field">
            <label htmlFor="t-name">Nombre</label>
            <input id="t-name" type="text" autoComplete="off" placeholder="Mesa 1, Terraza 2, Barra…" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} />
          </div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={close}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </Modal>
      <Modal open={dlg?.kind === "bulk"} onClose={close}>
        <form onSubmit={(e) => { e.preventDefault(); const n = Number(count); if (!Number.isInteger(n) || n < 1 || n > 50) return setErr("Escribe un número entre 1 y 50."); run(() => api("/tables/bulk", { method: "POST", body: JSON.stringify({ count: n }) })); }} noValidate>
          <h2 id="dlg-title" tabIndex={-1}>Crear varias mesas</h2>
          <p className="lede">Se crean como Mesa 1, Mesa 2… sin repetir las que ya tienes.</p>
          <div className="field">
            <label htmlFor="t-count">¿Cuántas?</label>
            <input id="t-count" type="text" inputMode="numeric" value={count} onChange={(e) => { setCount(e.target.value); setErr(null); }} />
          </div>
          <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={close}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Creando…" : "Crear mesas"}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={dlg?.kind === "del"}
        title="Eliminar mesa"
        message={dlg?.kind === "del" ? `Vas a eliminar "${dlg.t.name}". Su código QR dejará de funcionar. Los pedidos anteriores se conservan.` : ""}
        confirmLabel="Eliminar"
        busy={busy}
        onClose={close}
        onConfirm={() => dlg?.kind === "del" && run(() => api(`/tables/${dlg.t.id}`, { method: "DELETE" }))}
      />
    </div>
  );
}
