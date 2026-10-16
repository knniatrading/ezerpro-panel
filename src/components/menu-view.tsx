"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatMoney } from "@/lib/format";
import { photoToDataUrl, productImageUrl } from "@/lib/image";
import type { MenuCategory, MenuItem, MenuResponse } from "@/lib/types";
import { Modal } from "./modal";
import { useSession } from "./session";
import { NoAccess } from "./no-access";
import { ConfirmDialog } from "./confirm-dialog";
import { IconPlus } from "./icons";

type Dlg =
  | { kind: "cat"; cat: MenuCategory | null }
  | { kind: "item"; item: MenuItem | null; categoryId: string | null }
  | { kind: "del-cat"; cat: MenuCategory }
  | { kind: "del-item"; item: MenuItem }
  | null;

function CategoryForm({ cat, onDone, onClose }: { cat: MenuCategory | null; onDone: () => void; onClose: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setErr("Escribe el nombre de la categoría.");
    setBusy(true);
    try {
      if (cat) await api(`/menu/categories/${cat.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      else await api("/menu/categories", { method: "POST", body: JSON.stringify({ name }) });
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>
        {cat ? "Cambiar nombre" : "Nueva categoría"}
      </h2>
      <p className="lede">Agrupa tus productos, por ejemplo: Hamburguesas, Bebidas, Combos.</p>
      <div className="field">
        <label htmlFor="c-name">Nombre</label>
        <input
          id="c-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr(null);
          }}
          autoComplete="off"
        />
      </div>
      <div role="alert" className="form-error-slot">
        {err ? <p className="form-error">{err}</p> : null}
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function ItemForm({
  item,
  categoryId,
  categories,
  onDone,
  onClose,
}: {
  item: MenuItem | null;
  categoryId: string | null;
  categories: MenuCategory[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [priceTxt, setPriceTxt] = useState(item ? String(item.price) : "");
  const [cat, setCat] = useState(item ? (item.categoryId ?? "") : (categoryId ?? ""));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // undefined = la foto no cambia; null = se quita; texto = foto nueva
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const currentPhoto = photo === undefined ? (item ? productImageUrl(item.id, item.img) : null) : photo;

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setPhotoBusy(true);
    try {
      setPhoto(await photoToDataUrl(file));
    } catch (x) {
      setErr(x instanceof Error ? x.message : "No se pudo preparar la foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const digits = priceTxt.replace(/[^0-9]/g, "");
  const price = digits ? Number(digits) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setErr("Escribe el nombre del producto.");
    if (!price || price < 1) return setErr("Escribe el precio en pesos.");
    setBusy(true);
    const body = JSON.stringify({
      name,
      description: desc.trim() || null,
      price,
      categoryId: cat || null,
      ...(photo !== undefined ? { image: photo } : {}),
    });
    try {
      if (item) await api(`/menu/items/${item.id}`, { method: "PATCH", body });
      else await api("/menu/items", { method: "POST", body });
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }

  const clear = () => setErr(null);

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>
        {item ? "Editar producto" : "Nuevo producto"}
      </h2>
      <div className="field">
        <label htmlFor="i-name">Nombre</label>
        <input id="i-name" type="text" value={name} autoComplete="off" onChange={(e) => { setName(e.target.value); clear(); }} />
      </div>
      <div className="field">
        <label htmlFor="i-desc">Descripción (opcional)</label>
        <input id="i-desc" type="text" value={desc} autoComplete="off" onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="field photo-field">
        <label htmlFor="i-photo">Foto (opcional)</label>
        <div className="photo-field__row">
          {currentPhoto ? <img className="photo-field__img" src={currentPhoto} alt="Foto del producto" /> : <span className="photo-field__empty" aria-hidden="true">Sin foto</span>}
          <div className="photo-field__actions">
            <input id="i-photo" type="file" accept="image/*" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            {currentPhoto ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setPhoto(null)}>Quitar foto</button> : null}
            <p className="field__hint">{photoBusy ? "Preparando la foto…" : "Se ajusta sola para que cargue rápido."}</p>
          </div>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="i-price">Precio (pesos)</label>
          <input id="i-price" type="text" inputMode="numeric" value={priceTxt} autoComplete="off" onChange={(e) => { setPriceTxt(e.target.value); clear(); }} />
          <p className="field__hint" id="i-price-hint">{price ? formatMoney(price) : "Sin puntos ni comas"}</p>
        </div>
        <div className="field">
          <label htmlFor="i-cat">Categoría</label>
          <select id="i-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div role="alert" className="form-error-slot">
        {err ? <p className="form-error">{err}</p> : null}
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export function MenuView() {
  const { state } = useSession();
  const isAdmin = state.status === "in" && state.user.role === "TENANT_ADMIN";
  const { data, error, loading, reload } = useResource<MenuResponse>(isAdmin ? "/menu" : null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const close = () => setDlg(null);
  const done = () => {
    close();
    reload();
  };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionErr(null);
    try {
      await fn();
      close();
      reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Algo salió mal.");
      close();
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "in" && !isAdmin) return <NoAccess />;

  const patch = (path: string, body: object) => run(() => api(path, { method: "PATCH", body: JSON.stringify(body) }));

  if (!data) {
    return (
      <div className="page">
        <header className="page-head"><div><h1>Menú</h1></div></header>
        {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : <p className="lede">{loading ? "Cargando…" : ""}</p>}
      </div>
    );
  }

  const groups: { cat: MenuCategory | null; items: MenuItem[] }[] = data.categories.map((c) => ({
    cat: c,
    items: data.items.filter((i) => i.categoryId === c.id),
  }));
  const loose = data.items.filter((i) => !i.categoryId);
  if (loose.length > 0) groups.push({ cat: null, items: loose });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Menú</h1>
          <p className="lede">Lo que tus clientes ven y piden en tu página.</p>
        </div>
        <div className="actions-cell">
          <button type="button" className="btn btn--secondary" onClick={() => setDlg({ kind: "cat", cat: null })}>
            <IconPlus /><span>Nueva categoría</span>
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setDlg({ kind: "item", item: null, categoryId: null })}>
            <IconPlus /><span>Nuevo producto</span>
          </button>
        </div>
      </header>

      {actionErr ? <div className="banner banner--error" role="alert"><span>{actionErr}</span></div> : null}

      {groups.length === 0 ? (
        <section className="note">
          <h2>Tu menú está vacío</h2>
          <p>Crea una categoría y agrega tus primeros productos. Apenas los guardes, aparecen en tu página.</p>
        </section>
      ) : null}

      {groups.map(({ cat, items }) => (
        <section className="menu-group" key={cat?.id ?? "loose"} aria-label={cat?.name ?? "Sin categoría"}>
          <div className="menu-group__head">
            <h2>
              {cat?.name ?? "Sin categoría"}
              {cat && !cat.active ? <span className="badge badge--warn" style={{ marginLeft: 10 }}>Oculta</span> : null}
            </h2>
            <div className="actions-cell">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "item", item: null, categoryId: cat?.id ?? null })}>
                Agregar producto
              </button>
              {cat ? (
                <>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "cat", cat })}>Renombrar</button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => patch(`/menu/categories/${cat.id}`, { active: !cat.active })}>
                    {cat.active ? "Ocultar" : "Mostrar"}
                  </button>
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del-cat", cat })}>Eliminar</button>
                </>
              ) : null}
            </div>
          </div>
          {items.length === 0 ? (
            <p className="field__hint">Esta categoría no tiene productos todavía.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Producto</th><th className="num-r">Precio</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="prod-cell">
                          {i.img ? <img className="thumb" src={productImageUrl(i.id, i.img) ?? ""} alt="" loading="lazy" /> : null}
                          <div>
                            <div className="strong-t">{i.name}</div>
                            {i.description ? <div className="sub">{i.description}</div> : null}
                          </div>
                        </div>
                      </td>
                      <td className="num-r">{formatMoney(i.price)}</td>
                      <td>{i.active ? <span className="badge badge--ok">Disponible</span> : <span className="badge badge--warn">Agotado</span>}</td>
                      <td>
                        <div className="actions-cell">
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => patch(`/menu/items/${i.id}`, { active: !i.active })}>
                            {i.active ? "Marcar agotado" : "Disponible"}
                          </button>
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "item", item: i, categoryId: i.categoryId })}>Editar</button>
                          <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setDlg({ kind: "del-item", item: i })}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <Modal open={dlg?.kind === "cat"} onClose={close}>
        {dlg?.kind === "cat" ? <CategoryForm cat={dlg.cat} onDone={done} onClose={close} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "item"} onClose={close}>
        {dlg?.kind === "item" ? (
          <ItemForm item={dlg.item} categoryId={dlg.categoryId} categories={data.categories} onDone={done} onClose={close} />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={dlg?.kind === "del-cat"}
        title="Eliminar categoría"
        message={dlg?.kind === "del-cat" ? `Vas a eliminar "${dlg.cat.name}". Sus productos no se borran: quedan sin categoría.` : ""}
        confirmLabel="Eliminar"
        busy={busy}
        onClose={close}
        onConfirm={() => dlg?.kind === "del-cat" && run(() => api(`/menu/categories/${dlg.cat.id}`, { method: "DELETE" }))}
      />
      <ConfirmDialog
        open={dlg?.kind === "del-item"}
        title="Eliminar producto"
        message={dlg?.kind === "del-item" ? `Vas a eliminar "${dlg.item.name}". Los pedidos anteriores conservan su registro. Si solo se acabó, mejor márcalo como agotado.` : ""}
        confirmLabel="Eliminar"
        busy={busy}
        onClose={close}
        onConfirm={() => dlg?.kind === "del-item" && run(() => api(`/menu/items/${dlg.item.id}`, { method: "DELETE" }))}
      />
    </div>
  );
}
