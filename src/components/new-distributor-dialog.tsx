"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import {
  DOMAIN_RE,
  EMAIL_RE,
  generatePassword,
  normalizeDomain,
} from "@/lib/format";
import { IconClose, IconCopy, IconEye, IconEyeOff } from "./icons";

interface Created {
  companyName: string;
  domain: string;
  email: string;
  password: string;
}

interface Errors {
  companyName?: string;
  domain?: string;
  email?: string;
  password?: string;
}

export function NewDistributorDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copyNote, setCopyNote] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setCompanyName("");
      setDomain("");
      setEmail("");
      setPassword("");
      setShowPw(false);
      setErrors({});
      setServerError(null);
      setBusy(false);
      setCreated(null);
      setCopyNote("");
      dialog.showModal();
      // Que el cursor quede en el primer campo y no en el botón de cerrar.
      dialog.querySelector<HTMLElement>("input")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (created) ref.current?.querySelector<HTMLElement>("#dlg-title")?.focus();
  }, [created]);

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

    const name = companyName.trim();
    const dom = normalizeDomain(domain);
    const mail = email.trim().toLowerCase();
    const next: Errors = {};
    if (name.length < 2 || name.length > 80) next.companyName = "Escribe el nombre de la empresa.";
    if (!DOMAIN_RE.test(dom)) next.domain = "Escribe un dominio válido, por ejemplo midistribuidor.com.";
    if (!EMAIL_RE.test(mail)) next.email = "Escribe un correo válido.";
    if (password.length < 10) next.password = "La contraseña debe tener al menos 10 caracteres.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await api("/distributors", {
        method: "POST",
        body: JSON.stringify({ companyName: name, domain: dom, email: mail, password }),
      });
      setCreated({ companyName: name, domain: dom, email: mail, password });
      onCreated();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Algo salió mal. Inténtalo de nuevo.");
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
                Distribuidor creado
              </h2>
              <p className="lede">
                {created.companyName} ya puede iniciar sesión. Guarda estos datos ahora: la
                contraseña no se vuelve a mostrar.
              </p>
              <dl className="cred">
                <div>
                  <dt>Empresa</dt>
                  <dd>{created.companyName}</dd>
                </div>
                <div>
                  <dt>Dominio</dt>
                  <dd>{created.domain}</dd>
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
                      `Empresa: ${created.companyName}\nDominio: ${created.domain}\nCorreo: ${created.email}\nContraseña: ${created.password}`,
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
                Nuevo distribuidor
              </h2>
              <p className="lede">
                Define su empresa, su dominio y la cuenta con la que entrará a su panel.
              </p>

              <div className="field">
                <label htmlFor="d-name">Nombre de la empresa</label>
                <input
                  id="d-name"
                  type="text"
                  autoComplete="off"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  aria-invalid={errors.companyName ? true : undefined}
                  aria-describedby={errors.companyName ? "d-name-err" : undefined}
                />
                {errors.companyName ? (
                  <p id="d-name-err" className="field__error">
                    {errors.companyName}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="d-domain">Dominio</label>
                <input
                  id="d-domain"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="midistribuidor.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  aria-invalid={errors.domain ? true : undefined}
                  aria-describedby={errors.domain ? "d-domain-err" : "d-domain-hint"}
                />
                {errors.domain ? (
                  <p id="d-domain-err" className="field__error">
                    {errors.domain}
                  </p>
                ) : (
                  <p id="d-domain-hint" className="field__hint">
                    Su dominio propio, sin https:// ni www. Sus clientes vivirán en subdominios de
                    este.
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="d-email">Correo del administrador</label>
                <input
                  id="d-email"
                  type="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "d-email-err" : undefined}
                />
                {errors.email ? (
                  <p id="d-email-err" className="field__error">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="d-pass">Contraseña inicial</label>
                <div className="input-group">
                  <input
                    id="d-pass"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "d-pass-err d-pass-hint" : "d-pass-hint"}
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
                  <p id="d-pass-err" className="field__error">
                    {errors.password}
                  </p>
                ) : null}
                <p id="d-pass-hint" className="field__hint">
                  Mínimo 10 caracteres.{" "}
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => {
                      setPassword(generatePassword());
                      setShowPw(true);
                      setErrors((e) => ({ ...e, password: undefined }));
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
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? "Creando…" : "Crear distribuidor"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
