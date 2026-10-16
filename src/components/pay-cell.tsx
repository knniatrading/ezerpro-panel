import { payStatus } from "@/lib/format";

export function PayCell({ paidUntil }: { paidUntil: string | null }) {
  const pay = payStatus(paidUntil);
  return (
    <span className="pay">
      <span className={`pay__label pay__label--${pay.tone}`}>{pay.label}</span>
      <span className="pay__detail">{pay.detail}</span>
    </span>
  );
}
