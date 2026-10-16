import type { Metadata } from "next";
import { PaymentsView } from "@/components/payments-view";

export const metadata: Metadata = { title: "Pagos" };

export default function PaymentsPage() {
  return <PaymentsView />;
}
