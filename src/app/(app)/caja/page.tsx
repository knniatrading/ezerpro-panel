import type { Metadata } from "next";
import { CashView } from "@/components/cash-view";

export const metadata: Metadata = { title: "Caja" };

export default function Page() {
  return <CashView />;
}
