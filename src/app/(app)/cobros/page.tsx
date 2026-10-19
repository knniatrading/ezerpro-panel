import type { Metadata } from "next";
import { ClinicPaymentsView } from "@/components/clinic-payments";

export const metadata: Metadata = { title: "Cobros" };

export default function Page() {
  return <ClinicPaymentsView />;
}
