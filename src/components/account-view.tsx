"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { EMAIL_RE, generatePassword } from "@/lib/format";
import { useSession } from "./session";
import { IconEye, IconEyeOff } from "./icons";

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  return (
    <div className="input-group">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid ? true : undefined}
      />
      <button
        type="button"
        className="input-group__btn"
        onClick={onToggle}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

function EmailForm({ current, onDone }: { current: string; onDone: () => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setOk(null);
    const mail = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setErr("Escribe un correo válido.");
    if (mail === current) return setErr("Ese ya es tu correo.");
    if (!pw) return setErr("Escribe tu contraseña actual para confirmar.");
    setErr(null);
    setBusy(true);
    try {
      await api("/auth/change-email", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pw, newEmail: mail }),
      });
      setOk(`Listo. Desde ahora entras con ${mail}.`);
      setNewEmail("");
      setPw("");
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-card" onSubmit={submit} noValidate aria-labelledby="acc-email-h">
      <h2 id="acc-email-h">Correo de acceso</h2>
      <p className="lede">
        Tu correo actual es <strong>{current}</strong>. Es el que usas para entrar.
      </p>
      <div className="field">
        <label htmlFor="acc-new-email">Correo nuevo</label>
        <input
          id="acc-new-email"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            setErr(null);
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="acc-email-pw">Tu contraseña actual</label>
        <PasswordInput
          id="acc-email-pw"
          value={pw}
          onChange={(v) => {
            setPw(v);
            setErr(null);
          }}
          show={show}
          onToggle={() => setShow((s) => !s)}
          autoComplete="current-password"
        />
      </div>
      <div role="alert" className="form-error-slot">
        {err ? <p className="form-error">{err}</p> : null}
      </div>
      <div role="status">{ok ? <p className="form-ok">{ok}</p> : null}</div>
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar correo"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setOk(null);
    if (!cur) return setErr("Escribe tu contraseña actual.");
    if (next.length < 10) return setErr("La contraseña nueva debe tener al menos 10 caracteres.");
    if (next === cur) return setErr("La contraseña nueva debe ser distinta a la actual.");
    if (next !== again) return setErr("Las dos contraseñas nuevas no son iguales.");
    setErr(null);
    setBusy(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      setOk("Contraseña cambiada. Las demás sesiones abiertas se cerraron.");
      setCur("");
      setNext("");
      setAgain("");
      setShowNew(false);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const clear = () => setErr(null);

  return (
    <form className="account-card" onSubmit={submit} noValidate aria-labelledby="acc-pw-h">
      <h2 id="acc-pw-h">Contraseña</h2>
      <p className="lede">Al cambiarla, se cierran tus sesiones en otros dispositivos.</p>
      <div className="field">
        <label htmlFor="acc-cur">Contraseña actual</label>
        <PasswordInput
          id="acc-cur"
          value={cur}
          onChange={(v) => {
            setCur(v);
            clear();
          }}
          show={showCur}
          onToggle={() => setShowCur((s) => !s)}
          autoComplete="current-password"
        />
      </div>
      <div className="field">
        <label htmlFor="acc-new">Contraseña nueva</label>
        <PasswordInput
          id="acc-new"
          value={next}
          onChange={(v) => {
            setNext(v);
            clear();
          }}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          autoComplete="new-password"
        />
        <p className="field__hint">
          Mínimo 10 caracteres.{" "}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              const p = generatePassword();
              setNext(p);
              setAgain(p);
              setShowNew(true);
              clear();
            }}
          >
            Generar una segura
          </button>
        </p>
      </div>
      <div className="field">
        <label htmlFor="acc-again">Repite la contraseña nueva</label>
        <input
          id="acc-again"
          type={showNew ? "text" : "password"}
          autoComplete="new-password"
          value={again}
          onChange={(e) => {
            setAgain(e.target.value);
            clear();
          }}
        />
      </div>
      <div role="alert" className="form-error-slot">
        {err ? <p className="form-error">{err}</p> : null}
      </div>
      <div role="status">{ok ? <p className="form-ok">{ok}</p> : null}</div>
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

export function AccountView() {
  const { state, reloadUser } = useSession();
  if (state.status !== "in") return null;
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Mi cuenta</h1>
          <p className="lede">Cambia el correo y la contraseña con los que entras a EzerPro.</p>
        </div>
      </header>
      <div className="account-grid">
        <EmailForm current={state.user.email} onDone={reloadUser} />
        <PasswordForm />
      </div>
    </div>
  );
}
