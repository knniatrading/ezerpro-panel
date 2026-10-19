import type { Metadata } from "next";
import { ClinicConsentTemplatesView } from "@/components/clinic-consent-templates";

export const metadata: Metadata = { title: "Consentimientos" };

export default function Page() {
  return <ClinicConsentTemplatesView />;
}
