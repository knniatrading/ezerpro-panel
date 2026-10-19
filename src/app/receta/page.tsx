import type { Metadata } from "next";
import { ClinicRxPage } from "@/components/clinic-docs-public";

export const metadata: Metadata = { title: "Receta médica", robots: { index: false } };

export default function Page() {
  return <ClinicRxPage />;
}
