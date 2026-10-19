import type { Metadata } from "next";
import { ClinicConsentPage } from "@/components/clinic-docs-public";

export const metadata: Metadata = { title: "Consentimiento informado", robots: { index: false } };

export default function Page() {
  return <ClinicConsentPage />;
}
