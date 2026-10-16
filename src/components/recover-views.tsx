"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./brand";
import { TenantBrand } from "./tenant-brand";
import { IconEye, IconEyeOff } from "./icons";
import { api, ApiError } from "@/lib/api";
import { brandStyle } from "@/lib/brand";
import type { PublicTenant } from "@/lib/types";

/** Marco común: la misma pantalla del inicio de sesión, con la marca del negocio si la dirección es de uno. */
function Frame({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("panel.")) return;
    api<PublicTenant>(`/public/tenant?host=${encodeURIComponent(host)}`).then(setTenant).catch(() => undefined);
  }, []);
  return (
    <div className="auth" style={brandStyle(tenant?.brandColor)}>
      <main className="auth__panel">
        <div className="auth__form">
          <div className="auth__logo-mobile">
            {tenant ? <TenantBrand name={tenant.name} logo={tenant.logo} tone="light" /> : <Logo tone="light" />}
          </div>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
          {children}
          <p className="auth__help">
            <Link href="/login">Volver a iniciar sesión</Link>
          </p>
        </div>
      </main>
      <aside className="auth__brand">
        {tenant ? <TenantBrand name={tenant.name} logo={tenant.logo} tone="dark" /> : <Logo tone="dark" />}
      </aside>
    </div>
  );
}

export function ForgotView() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim()) {
      setError("Escribe tu correo.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? "Demasiados intentos. Espera un minuto e inténtalo de nuevo." : "No se pudo enviar. Inténtalo de nuevo.");
    }
    setBusy(false);
  }

  return (
    <Frame title="Recuperar contraseña" lede="Escribe el correo de tu cuenta y te enviamos un enlace para elegir una nueva.">
      {sent ? (
        <div className="notice" role="status">
          <p>
            Si <strong>{email.trim()}</strong> tiene una cuenta, en unos minutos le llegará un correo con el enlace. Vale por 1 hora.
          </p>
          <p className="field__hint">Revisa también la carpeta de correo no deseado (spam).</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input id="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div role="alert" className="form-error-slot">
            {error ? <p className="form-error">{error}</p> : null}
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Enviando…" : "Enviarme el enlace"}
          </button>
        </form>
      )}
    </Frame>
  );
}

export function ResetView() {
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (pw.length < 10) return setError("La contraseña debe tener al menos 10 caracteres.");
    if (pw !== pw2) return setError("Las dos contraseñas no son iguales.");
    setBusy(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword: pw }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    }
    setBusy(false);
  }

  if (token === null) return <Frame title="Nueva contraseña" lede=" ">{null}</Frame>;

  return (
    <Frame title="Nueva contraseña" lede={done ? " " : "Elige una contraseña nueva para tu cuenta."}>
      {done ? (
        <div className="notice" role="status">
          <p>Listo, cambiaste tu contraseña. Ya puedes iniciar sesión con la nueva.</p>
          <Link href="/login" className="btn btn--primary btn--block">
            Iniciar sesión
          </Link>
        </div>
      ) : !token ? (
        <div className="form-error-slot">
          <p className="form-error">
            El enlace está incompleto. <Link href="/recuperar">Pide uno nuevo</Link>.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="pw">Contraseña nueva</label>
            <div className="input-group">
              <input id="pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="input-group__btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
                {show ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            <p className="field__hint">Mínimo 10 caracteres.</p>
          </div>
          <div className="field">
            <label htmlFor="pw2">Repite la contraseña</label>
            <input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <div role="alert" className="form-error-slot">
            {error ? (
              <p className="form-error">
                {error}
                {error.includes("enlace") ? (
                  <>
                    {" "}
                    <Link href="/recuperar">Pedir otro</Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
    </Frame>
  );
}
