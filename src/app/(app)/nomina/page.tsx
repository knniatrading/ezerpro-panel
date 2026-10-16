import type { Metadata } from "next";
import { PayrollView } from "@/components/payroll-view";

export const metadata: Metadata = { title: "Nómina" };

export default function Page() {
  return <PayrollView />;
}
