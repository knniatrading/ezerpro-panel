import { statusInfo } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const { label, tone } = statusInfo(status);
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
