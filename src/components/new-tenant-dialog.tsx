"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { EMAIL_RE, SLUG_RE, generatePassword, slugify } from "@/lib/format";
import type { Tenant } from "@/lib/types";
import { IconClose, IconCopy, IconEye, IconEyeOff } from "./icons";

interface Created {
  name: string;
  address: string;
  email: string;
  password: string;
}

interface Errors {
  name?: string;
  slug?: string;
  email?: string;
  password?: string;
}

/**
 * Dos usos:
 *  - sin `tenant`: crea el cliente y su administrador en un solo formulario.
 *  - con `tenant`: solo añade el administrador a un cliente que aún no lo tiene.
 * Si el cliente se crea pero falla el administrador, el formulario sigue abierto en modo
 * "solo administrador" para reintentar sin duplicar el cliente.
 */
export function NewTenantDialog({
  open,
  tenant,
  domain,
  onClose,
  onChanged,
}: {
  open: boolean;
  tenant: Tenant | null;
  domain: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState("");
  const [niche, setNiche] = useState("comidas_rapidas");
  const [niches, setNiches] = useState<{ key: string; label: string }[]>([]);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copyNote, setCopyNote] = useState("");
  // Cliente ya creado en este formulario cuando falló el administrador.
  const [pending, setPending] = useState<{ id: string; name: string; address: string } | null>(
    null,
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName("");
      setNiche("comidas_rapidas");
      api<{ key: string; label: string }[]>("/tenants/niches").then(setNiches).catch(() => setNiches([]));
      setSlug("");
      setSlugTouched(false);
      setEmail("");
      setPassword("");
      setShowPw(false);
      setErrors({});
      setServerError(null);
      setBusy(false);
      setCreated(null);
      setCopyNote("");
      setPending(null);
      dialog.showModal();
      dialog.querySelector<HTMLElement>("input")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (created) ref.current?.querySelector<HTMLElement>("#dlg-title")?.focus();
  }, [created]);

  // Cliente sobre el que se trabaja: el existente, o el recién creado si falló el admin.
  const target = tenant
    ? { id: tenant.id, name: tenant.name, address: tenant.address }
    : pending;
  const adminOnly = target !== null;
  const finalSlug = slug.trim().toLowerCase();
  const preview = `${finalSlug || "nombre"}.${domain}`;

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote(message);
    } catch {
      setCopyNote("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setServerError(null);

    const cleanName = name.trim();
    const mail = email.trim().toLowerCase();
    const next: Errors = {};
    if (!adminOnly) {
      if (cleanName.length < 2 || cleanName.length > 80) next.name = "Escribe el nombre del negocio.";
      if (!SLUG_RE.test(finalSlug))
        next.slug = "Usa de 3 a 40 letras minúsculas, números o guiones (sin espacios ni tildes).";
    }
    if (!EMAIL_RE.test(mail)) next.email = "Escribe un correo válido.";
    if (password.length < 10) next.password = "La contraseña debe tener al menos 10 caracteres.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    let step: "tenant" | "admin" = adminOnly ? "admin" : "tenant";
    try {
      let tid = target?.id ?? "";
      let tname = target?.name ?? cleanName;
      let taddr = target?.address ?? "";
      if (!adminOnly) {
        const t = await api<Tenant>("/tenants", {
          method: "POST",
          body: JSON.stringify({ name: cleanName, slug: finalSlug, niche }),
        });
        tid = t.id;
        tname = t.name;
        taddr = t.address;
        setPending({ id: tid, name: tname, address: taddr });
        onChanged();
      }
      step = "admin";
      await api(`/tenants/${tid}/admin`, {
        method: "POST",
        body: JSON.stringify({ email: mail, password }),
      });
      setPending(null);
      setCreated({ name: tname, address: taddr, email: mail, password });
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Algo salió mal. Inténtalo de nuevo.";
      setServerError(
        step === "admin" && !tenant
          ? `El cliente quedó creado, pero no se pudo crear su administrador: ${msg}`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dlg-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="dialog__body">
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>

          {created ? (
            <div>
              <h2 id="dlg-title" tabIndex={-1}>
                {tenant ? "Administrador creado" : "Cliente creado"}
              </h2>
              <p className="lede">
                Entrégale estos datos a {created.name}. Guárdalos ahora: la contraseña no se
                vuelve a mostrar.
              </p>
              <dl className="cred">
                <div>
                  <dt>Negocio</dt>
                  <dd>{created.name}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{created.address}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{created.email}</dd>
                </div>
                <div>
                  <dt>Contraseña</dt>
                  <dd className="mono">{created.password}</dd>
                </div>
              </dl>
              <p className="field__hint" role="status" style={{ minHeight: "1.4em", marginTop: 0 }}>
                {copyNote}
              </p>
              <div className="dialog__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() =>
                    copy(
                      `Negocio: ${created.name}\nDirección: ${created.address}\nCorreo: ${created.email}\nContraseña: ${created.password}`,
                      "Datos copiados",
                    )
                  }
                >
                  <IconCopy />
                  <span>Copiar datos</span>
                </button>
                <button type="button" className="btn btn--primary" onClick={onClose}>
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h2 id="dlg-title" tabIndex={-1}>
                {adminOnly ? "Administrador del cliente" : "Nuevo cliente"}
              </h2>
              <p className="lede">
                {adminOnly
                  ? `Crea la cuenta con la que ${target!.name} entrará a administrar su negocio.`
                  : "Define el negocio y la cuenta con la que entrará a administrarlo."}
              </p>

              {!adminOnly ? (
                <>
                  <div className="field">
                    <label htmlFor="t-name">Nombre del negocio</label>
                    <input
                      id="t-name"
                      type="text"
                      autoComplete="off"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!slugTouched) setSlug(slugify(e.target.value));
                      }}
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? "t-name-err" : undefined}
                    />
                    {errors.name ? (
                      <p id="t-name-err" className="field__error">
                        {errors.name}
                      </p>
                    ) : null}
                  </div>

                  {niches.length > 1 ? (
                    <div className="field">
                      <label htmlFor="t-niche">Tipo de negocio</label>
                      <select id="t-niche" value={niche} onChange={(e) => setNiche(e.target.value)}>
                        {niches.map((n) => (
                          <option key={n.key} value={n.key}>{n.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="field">
                    <label htmlFor="t-slug">Dirección del cliente</label>
                    <input
                      id="t-slug"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      aria-invalid={errors.slug ? true : undefined}
                      aria-describedby={errors.slug ? "t-slug-err" : "t-slug-hint"}
                    />
                    {errors.slug ? (
                      <p id="t-slug-err" className="field__error">
                        {errors.slug}
                      </p>
                    ) : null}
                    <p id="t-slug-hint" className="field__hint">
                      Su dirección será: <strong data-testid="addr-preview">{preview}</strong>
                    </p>
                  </div>
                </>
              ) : (
                <p className="field__hint" style={{ marginTop: 0 }}>
                  Dirección: <strong>{target!.address}</strong>
                </p>
              )}

              <div className="field">
                <label htmlFor="t-email">Correo del administrador</label>
                <input
                  id="t-email"
                  type="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "t-email-err" : undefined}
                />
                {errors.email ? (
                  <p id="t-email-err" className="field__error">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="t-pass">Contraseña inicial</label>
                <div className="input-group">
                  <input
                    id="t-pass"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "t-pass-err t-pass-hint" : "t-pass-hint"}
                  />
                  <button
                    type="button"
                    className="input-group__btn"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPw}
                  >
                    {showPw ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="t-pass-err" className="field__error">
                    {errors.password}
                  </p>
                ) : null}
                <p id="t-pass-hint" className="field__hint">
                  Mínimo 10 caracteres.{" "}
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => {
                      setPassword(generatePassword());
                      setShowPw(true);
                      setErrors((er) => ({ ...er, password: undefined }));
                    }}
                  >
                    Generar una segura
                  </button>
                </p>
              </div>

              <div role="alert" className="form-error-slot">
                {serverError ? <p className="form-error">{serverError}</p> : null}
              </div>

              <div className="dialog__actions">
                <button type="button" className="btn btn--secondary" onClick={onClose}>
                  {pending ? "Cerrar" : "Cancelar"}
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? "Creando…" : adminOnly ? "Crear administrador" : "Crear cliente"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
