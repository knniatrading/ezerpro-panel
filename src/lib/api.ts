export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const NO_REFRESH = new Set(["/auth/login", "/auth/refresh", "/auth/logout"]);
const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function send(path: string, init: RequestInit) {
  return fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, init);
    if (res.status === 401 && !NO_REFRESH.has(path) && (await refreshSession())) {
      res = await send(path, init);
    }
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  if (!res.ok) {
    let message = "Algo salió mal. Inténtalo de nuevo.";
    try {
      const body = await res.json();
      const m = body?.message;
      if (typeof m === "string") message = m;
      else if (Array.isArray(m) && m.length > 0) message = String(m[0]);
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
