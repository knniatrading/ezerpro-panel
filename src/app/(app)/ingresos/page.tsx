import type { Metadata } from "next";
import { TallerIncomeView } from "@/components/taller-income";

export const metadata: Metadata = { title: "Ingresos" };

export default function Page() {
  return <TallerIncomeView />;
}
