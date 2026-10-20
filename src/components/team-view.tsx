"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { EMAIL_RE, generatePassword, roleLabel } from "@/lib/format";
import type { Employee, Role } from "@/lib/types";
import { useSession } from "./session";
import { Modal } from "./modal";
import { NoAccess } from "./no-access";
import { IconCopy, IconEye, IconEyeOff, IconPlus } from "./icons";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "TENANT_ADMIN", label: "Administrador", hint: "Controla todo el negocio." },
  { value: "CASHIER", label: "Cajero", hint: "Ve y gestiona pedidos y la caja." },
  { value: "WAITER", label: "Mesero", hint: "Toma y atiende pedidos." },
  { value: "DRIVER", label: "Domiciliario", hint: "Solo ve sus entregas." },
  { value: "EMPLOYEE", label: "Entrenador", hint: "Crea rutinas para los socios y ve las clases." },
];

type Policy = { roles: string[] | null; isPresident: boolean; hasPresident: boolean };

type Dlg =
  | { kind: "form"; emp: Employee | null }
  | { kind: "delegate" }
  | { kind: "pw"; emp: Employee }
  | { kind: "created"; name: string; email: string; password: string; role: Role }
  | null;

function PasswordField({ id, value, onChange, show, setShow }: { id: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (b: boolean) => void }) {
  return (
    <>
      <div className="input-group">
        <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="input-group__btn" onClick={() => setShow(!show)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      <p className="field__hint">
        Mínimo 10 caracteres.{" "}
        <button type="button" className="linklike" onClick={() => { onChange(generatePassword()); setShow(true); }}>
          Generar una segura
        </button>
      </p>
    </>
  );
}

function EmployeeForm({ emp, policy, onSaved, onCreated, onClose }: { emp: Employee | null; policy: Policy | null; onSaved: () => void; onCreated: (d: { name: string; email: string; password: string; role: Role }) => void; onClose: () => void }) {
  const [name, setName] = useState(emp?.name ?? "");
  const [email, setEmail] = useState(emp?.email ?? "");
  const [phone, setPhone] = useState(emp?.phone ?? "");
  const sessG = useSession();
  const mods = sessG.state.status === "in" ? sessG.state.user.tenant?.modules ?? [] : [];
  const isClinic = mods.includes("clinica");
  const isTaller = mods.includes("taller");
  const isFerre = mods.includes("ferreteria");
  const isBelleza = mods.includes("belleza");
  const isRes = mods.includes("residencial");
  const isGym = mods.includes("gimnasio") || isClinic || isTaller || isBelleza || isRes;
  const roleList = ROLES.filter((r) => !isFerre || r.value === "TENANT_ADMIN" || r.value === "CASHIER").map((r) => (isFerre && r.value === "CASHIER" ? { ...r, label: "Vendedor", hint: "Vende en el mostrador y despacha pedidos. No cambia precios, no anula ventas ni ve las ganancias." } : r)).filter((r) => r.value !== "EMPLOYEE" || isGym).filter((r) => !isGym || r.value !== "WAITER" && r.value !== "DRIVER").map((r) => (isRes && r.value === "TENANT_ADMIN" ? { ...r, hint: "Administra el conjunto día a día: unidades, cartera, áreas y portería. Lo nombra el presidente del consejo." } : isRes && r.value === "CASHIER" ? { ...r, label: "Portería", hint: "Escanea visitas, registra paquetes, busca placas y lleva el control de ingresos. No ve cartera ni participa en asambleas." } : isRes && r.value === "EMPLOYEE" ? { ...r, label: "Consejo", hint: "Ve la cartera en modo consulta, atiende PQRS, publica en la cartelera y maneja las asambleas. El primero que se crea es el presidente del consejo." } : isBelleza && r.value === "EMPLOYEE" ? { ...r, label: "Estilista", hint: "Ve su propia agenda, las fichas de sus clientes y sus comisiones." } : isClinic && r.value === "EMPLOYEE" ? { ...r, label: "Doctor", hint: "Ve la agenda, la historia clínica, el odontograma, las recetas y los consentimientos." } : isTaller && r.value === "EMPLOYEE" ? { ...r, label: "Mecánico", hint: "Ve sus órdenes, sube fotos del diagnóstico, cotiza repuestos y marca el avance." } : r));
  const allowed = isRes && policy?.roles ? roleList.filter((r) => policy.roles!.includes(r.value)) : roleList;
  const [role, setRole] = useState<Role>(emp?.role ?? (allowed[0]?.value ?? "CASHIER"));
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clear = () => setErr(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setErr("Escribe el nombre.");
    if (!emp && !EMAIL_RE.test(email.trim())) return setErr("Escribe un correo válido.");
    if (!emp && password.length < 10) return setErr("La contraseña debe tener al menos 10 caracteres.");
    setBusy(true);
    try {
      if (emp) {
        await api(`/employees/${emp.id}`, { method: "PATCH", body: JSON.stringify({ name, phone: phone.trim() || null, role }) });
        onSaved();
      } else {
        await api("/employees", { method: "POST", body: JSON.stringify({ name, email: email.trim(), phone: phone.trim() || undefined, role, password }) });
        onCreated({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      }
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>{emp ? "Editar empleado" : "Nuevo empleado"}</h2>
      <div className="field">
        <label htmlFor="e-name">Nombre</label>
        <input id="e-name" type="text" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); clear(); }} />
      </div>
      {!emp ? (
        <div className="field">
          <label htmlFor="e-email">Correo (con este entra)</label>
          <input id="e-email" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => { setEmail(e.target.value); clear(); }} />
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor="e-phone">Teléfono (opcional)</label>
          <input id="e-phone" type="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-role">Rol</label>
          <select id="e-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {allowed.map((r) => <option key={r.value} value={r.value}>{isGym && r.value === "CASHIER" ? (isRes ? "Portería" : "Recepción") : r.label}</option>)}
          </select>
        </div>
      </div>
      <p className="field__hint" style={{ marginTop: -6, marginBottom: 14 }}>{roleList.find((r) => r.value === role)?.hint}</p>
      {!emp ? (
        <div className="field">
          <label htmlFor="e-pass">Contraseña inicial</label>
          <PasswordField id="e-pass" value={password} onChange={(v) => { setPassword(v); clear(); }} show={show} setShow={setShow} />
        </div>
      ) : null}
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : emp ? "Guardar" : "Crear empleado"}</button>
      </div>
    </form>
  );
}

function PasswordForm({ emp, onDone, onClose }: { emp: Employee; onDone: (pw: string) => void; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 10) return setErr("La contraseña debe tener al menos 10 caracteres.");
    setBusy(true);
    try {
      await api(`/employees/${emp.id}/password`, { method: "POST", body: JSON.stringify({ newPassword: pw }) });
      onDone(pw);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Nueva contraseña</h2>
      <p className="lede">Para {emp.name ?? emp.email}. Si tenía una sesión abierta, se cierra.</p>
      <div className="field">
        <label htmlFor="e-newpw">Contraseña nueva</label>
        <PasswordField id="e-newpw" value={pw} onChange={(v) => { setPw(v); setErr(null); }} show={show} setShow={setShow} />
      </div>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Cambiar contraseña"}</button>
      </div>
    </form>
  );
}

function DelegateForm({ members, onClose }: { members: Employee[]; onClose: () => void }) {
  const [to, setTo] = useState(members[0]?.id ?? "");
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault();
    if (busy || !to) return;
    if (!sure) return setErr("Marca la casilla para confirmar.");
    setBusy(true);
    try {
      await api("/residential/president/delegate", { method: "POST", body: JSON.stringify({ userId: to }) });
      window.location.assign("/");
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Algo salió mal.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={go} noValidate>
      <h2 id="dlg-title" tabIndex={-1}>Delegar la presidencia</h2>
      <p className="lede">Para casos de renuncia o fuerza mayor. La persona que elijas pasa a ser presidente del consejo; tú sigues como miembro del consejo y pierdes el manejo del equipo.</p>
      <div className="field">
        <label htmlFor="d-to">Nuevo presidente</label>
        <select id="d-to" value={to} onChange={(e) => { setTo(e.target.value); setErr(null); }}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
        </select>
      </div>
      <label className="check"><input type="checkbox" checked={sure} onChange={(e) => { setSure(e.target.checked); setErr(null); }} /> Entiendo que este cambio es inmediato.</label>
      <div role="alert" className="form-error-slot">{err ? <p className="form-error">{err}</p> : null}</div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Guardando…" : "Delegar presidencia"}</button>
      </div>
    </form>
  );
}

export function TeamView() {
  const { state } = useSession();
  const user = state.status === "in" ? state.user : null;
  const isRes = !!user?.tenant?.modules?.includes("residencial");
  const isPresident = isRes && user?.role === "EMPLOYEE" && !!user.tenant?.presidentId && user.tenant.presidentId === user.id;
  const isAdmin = user?.role === "TENANT_ADMIN";
  const allowed = isAdmin || isPresident;
  const { data, error, reload } = useResource<Employee[]>(allowed ? "/employees" : null);
  const { data: policy } = useResource<Policy>(allowed && isRes ? "/employees/policy" : null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [note, setNote] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);
  const close = () => setDlg(null);
  const myId = state.status === "in" ? state.user.id : "";
  if (state.status === "in" && !allowed) return <NoAccess />;
  const canCreate = !isRes || !policy || (policy.roles?.length ?? 0) > 0;
  const board = (data ?? []).filter((x) => x.role === "EMPLOYEE" && x.status === "active" && x.id !== myId);

  async function toggle(emp: Employee) {
    setActionErr(null);
    try {
      await api(`/employees/${emp.id}`, { method: "PATCH", body: JSON.stringify({ status: emp.status === "active" ? "inactive" : "active" }) });
      reload();
    } catch (x) {
      setActionErr(x instanceof ApiError ? x.message : "No se pudo cambiar el estado.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Datos copiados");
    } catch {
      setNote("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Equipo</h1>
          <p className="lede">{isPresident ? "Como presidente del consejo, tú creas y das de baja al administrador y a los demás miembros del consejo." : isRes ? "El administrador crea al personal de portería. El administrador y el consejo los maneja el presidente del consejo." : "Las personas que trabajan en tu negocio y lo que puede hacer cada una."}</p>
        </div>
        <div className="actions-cell">
          {isPresident && board.length > 0 ? <button type="button" className="btn btn--secondary" onClick={() => setDlg({ kind: "delegate" })}>Delegar presidencia</button> : null}
          {canCreate ? <button type="button" className="btn btn--primary" onClick={() => setDlg({ kind: "form", emp: null })}>
            <IconPlus /><span>Nuevo empleado</span>
          </button> : null}
        </div>
      </header>

      {error ? <div className="banner banner--error" role="alert"><span>{error}</span></div> : null}
      {actionErr ? <div className="banner banner--error" role="alert"><span>{actionErr}</span></div> : null}

      {data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Persona</th><th>Rol</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {data.map((u) => { const manage = !isRes || u.canManage !== false; return (
                <tr key={u.id}>
                  <td>
                    <div className="strong-t">{u.name ?? "Sin nombre"}{u.id === myId ? " (tú)" : ""}</div>
                    <div className="sub">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </td>
                  <td>{u.isPresident ? "Presidente del consejo" : roleLabel(u.role)}</td>
                  <td>{u.status === "active" ? <span className="badge badge--ok">Activo</span> : <span className="badge badge--warn">Desactivado</span>}</td>
                  <td>
                    <div className="actions-cell">
                      {isRes && !manage ? <span className="sub">{u.id === myId ? "Eres tú" : u.isPresident ? "Para cambiarlo, delega la presidencia" : "Lo maneja otro perfil"}</span> : null}
                      {manage ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "form", emp: u })}>Editar</button> : null}
                      {manage ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDlg({ kind: "pw", emp: u })}>Contraseña</button> : null}
                      {manage && u.id !== myId ? (
                        <button type="button" className={`btn btn--sm ${u.status === "active" ? "btn--danger-ghost" : "btn--secondary"}`} onClick={() => toggle(u)}>
                          {u.status === "active" ? "Desactivar" : "Activar"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={dlg?.kind === "form"} onClose={close}>
        {dlg?.kind === "form" ? (
          <EmployeeForm
            emp={dlg.emp}
            policy={policy ?? null}
            onClose={close}
            onSaved={() => { close(); reload(); }}
            onCreated={(d) => { setNote(""); setDlg({ kind: "created", ...d }); reload(); }}
          />
        ) : null}
      </Modal>
      <Modal open={dlg?.kind === "delegate"} onClose={close}>
        {dlg?.kind === "delegate" ? <DelegateForm members={board} onClose={close} /> : null}
      </Modal>
      <Modal open={dlg?.kind === "pw"} onClose={close}>
        {dlg?.kind === "pw" ? (
          <PasswordForm
            emp={dlg.emp}
            onClose={close}
            onDone={(pw) => { setNote(""); setDlg({ kind: "created", name: dlg.emp.name ?? dlg.emp.email, email: dlg.emp.email, password: pw, role: dlg.emp.role }); }}
          />
        ) : null}
      </Modal>
      <Modal open={dlg?.kind === "created"} onClose={close}>
        {dlg?.kind === "created" ? (
          <div>
            <h2 id="dlg-title" tabIndex={-1}>Datos de acceso</h2>
            <p className="lede">Entrégaselos a {dlg.name}. La contraseña no se vuelve a mostrar.</p>
            <dl className="cred">
              <div><dt>Rol</dt><dd>{roleLabel(dlg.role)}</dd></div>
              <div><dt>Correo</dt><dd>{dlg.email}</dd></div>
              <div><dt>Contraseña</dt><dd className="mono">{dlg.password}</dd></div>
            </dl>
            <p className="field__hint" role="status" style={{ minHeight: "1.4em", marginTop: 0 }}>{note}</p>
            <div className="dialog__actions">
              <button type="button" className="btn btn--secondary" onClick={() => copy(`Correo: ${dlg.email}\nContraseña: ${dlg.password}`)}>
                <IconCopy /><span>Copiar datos</span>
              </button>
              <button type="button" className="btn btn--primary" onClick={close}>Listo</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
