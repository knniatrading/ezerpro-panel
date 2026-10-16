/** Dirección pública del negocio (https://negocio.dominio). Nunca la del panel desde donde se entró. */
export function tenantOrigin(host: string | undefined): string {
  if (typeof window === "undefined") return "";
  if (!host || window.location.hostname === host) return window.location.origin;
  return `${window.location.protocol}//${host}`;
}
