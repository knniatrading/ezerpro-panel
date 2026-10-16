"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { Logo } from "./brand";
import { IconEye, IconEyeOff } from "./icons";
import { ApiError } from "@/lib/api";

export function LoginView() {
  const { state, login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status === "in") router.replace("/");
  }, [state.status, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Si el servidor explica un motivo (cuenta suspendida), se muestra tal cual.
        setError(
          err.message && err.message !== "Credenciales inválidas" && err.message !== "Unauthorized"
            ? err.message
            : "El correo o la contraseña no son correctos.",
        );
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Demasiados intentos. Espera un minuto e inténtalo de nuevo.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Algo salió mal. Inténtalo de nuevo.");
      }
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <main className="auth__panel">
        <div className="auth__form">
          <div className="auth__logo-mobile">
            <Logo tone="light" />
          </div>
          <h1>Iniciar sesión</h1>
          <p className="lede">Entra con el correo y la contraseña de tu cuenta.</p>

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <div className="input-group">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  className="input-group__btn"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={show}
                >
                  {show ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <div id="login-error" role="alert" className="form-error-slot">
              {error ? <p className="form-error">{error}</p> : null}
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="auth__help">¿No puedes entrar? Pide ayuda a quien creó tu cuenta.</p>
        </div>
      </main>

      <aside className="auth__brand">
        <Logo tone="dark" />
        <div className="auth__pitch">
          <h2>Distribuidores y clientes, cada uno bajo su propia marca.</h2>
          <div className="tiers" aria-hidden="true">
            <div className="tier tier--0">
              <span className="tier__title">Plataforma EzerPro</span>
            </div>
            <div className="tier tier--1">
              <span className="tier__title">Distribuidores</span>
            </div>
            <div className="tier tier--2">
              <span className="tier__title">Clientes y sus negocios</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
