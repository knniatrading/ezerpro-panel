"use client";

import { useSession } from "./session";
import { STATE_LABEL, memberPhoto } from "@/lib/gym";

export function useGymAccess(roles: string[] = ["TENANT_ADMIN"]) {
  const { state } = useSession();
  const allowed = state.status === "in" && roles.includes(state.user.role) && !!state.user.tenant?.modules?.includes("gimnasio");
  return { state, allowed, role: state.status === "in" ? state.user.role : "" };
}

export function StateBadge({ state }: { state: string }) {
  const s = STATE_LABEL[state] ?? { label: state, tone: "muted" as const };
  return <span className={`badge badge--${s.tone === "danger" ? "warn" : s.tone === "muted" ? "info" : s.tone}${s.tone === "danger" ? " badge--danger" : ""}`}>{s.label}</span>;
}

export function MemberAvatar({ m, size = 44 }: { m: { id: string; name: string; img: number | null }; size?: number }) {
  const src = memberPhoto(m.id, m.img);
  return src ? <img className="pet-av" src={src} alt="" width={size} height={size} /> : <span className="pet-av pet-av--empty" style={{ width: size, height: size }} aria-hidden="true">{m.name.charAt(0)}</span>;
}
