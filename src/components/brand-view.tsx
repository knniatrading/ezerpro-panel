"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { brandStyle, contrastWithWhite, isValidBrandColor, MIN_CONTRAST, shrinkLogo } from "@/lib/brand";
import type { Brand } from "@/lib/types";
import { useSession } from "./session";
import { TenantBrand } from "./tenant-brand";
import { NoAccess } from "./no-access";

const DEFAULT_COLOR = "#087a56";

export function BrandView() {
  const { state, reloadUser } = useSession();
  const isAdmin = state.status === "in" && state.user.role === "TENANT_ADMIN";
  const { data, error } = useResource<Brand>(isAdmin ? "/brand" : null);
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [logo, setLogo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setColor(data.brandColor ?? DEFAULT_COLOR);
      setLogo(data.logo);
    }
  }, [data]);

  if (state.status !== "in" || !state.user.tenant) return null;
  if (!isAdmin) return <NoAccess />;
  const name = state.user.tenant.name;
  const valid = isValidBrandColor(color);
  const contrast = valid ? contrastWithWhite(color) : 0;
  const tooLight = valid && contrast < MIN_CONTRAST;

  async function pick(f: File | undefined) {
    if (!f) return;
    setMsg(null);
    try {
      setLogo(await shrinkLogo(f));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "No se pudo leer la imagen." });
    }
    if (file.current) file.current.value = "";
  }

  async function save() {
    if (!valid) return setMsg({ ok: false, text: "Escribe el color como #RRGGBB, por ejemplo #c2410c." });
    if (tooLight) return setMsg({ ok: false, text: "Ese color es muy claro: el texto blanco de los botones no se leería. Elige uno más oscuro." });
    setBusy(true);
    setMsg(null);
    try {
      await api("/brand", { method: "PUT", body: JSON.stringify({ brandColor: color.toLowerCase(), logo }) });
      await reloadUser();
      setMsg({ ok: true, text: "Marca guardada. Ya se ve en tu panel y en tu carta." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : "No se pudo guardar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Marca</h1>
          <p className="lede">Tu logo y tu color en el panel, en tu carta y en el inicio de sesión de tu equipo.</p>
        </div>
      </header>
      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}

      <div className="account-grid">
        <section className="account-card" aria-labelledby="b-h">
          <h2 id="b-h">Identidad</h2>
          <div className="field">
            <label htmlFor="b-file">Logo</label>
            <div className="logo-pick">
              {logo ? <img src={logo} alt="Logo actual" className="logo-pick__img" /> : <span className="logo-pick__none">Sin logo</span>}
              <div className="actions-cell">
                <input ref={file} id="b-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0])} />
                {logo ? <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setLogo(null)}>Quitar logo</button> : null}
              </div>
            </div>
            <p className="field__hint">PNG, JPG o WEBP. Se ajusta solo a un tamaño liviano.</p>
          </div>
          <div className="field">
            <label htmlFor="b-color">Color principal</label>
            <div className="color-pick">
              <input id="b-color-picker" type="color" aria-label="Elegir color" value={valid ? color : DEFAULT_COLOR} onChange={(e) => setColor(e.target.value)} />
              <input id="b-color" type="text" value={color} spellCheck={false} autoCapitalize="none" onChange={(e) => setColor(e.target.value.trim())} aria-invalid={!valid || tooLight ? true : undefined} />
            </div>
            {tooLight ? <p className="field__error">Muy claro: el texto blanco no se leería. Elige uno más oscuro.</p> : <p className="field__hint">Se usa en botones y acentos.</p>}
          </div>
          <div role="alert">{msg && !msg.ok ? <p className="form-error">{msg.text}</p> : null}</div>
          <div role="status">{msg?.ok ? <p className="form-ok">{msg.text}</p> : null}</div>
          <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar marca"}</button>
        </section>

        <section className="account-card" aria-labelledby="b-prev" style={!tooLight ? brandStyle(valid ? color : undefined) : undefined}>
          <h2 id="b-prev">Así se ve</h2>
          <div className="brand-preview">
            <div className="brand-preview__bar"><TenantBrand name={name} logo={logo} tone="dark" /></div>
            <div className="brand-preview__body">
              <p className="strong-t">Hamburguesa clásica</p>
              <p className="sub">Carne, queso y papas</p>
              <button type="button" className="btn btn--primary btn--sm" tabIndex={-1}>Agregar</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
