import type { Metadata } from "next";
import { ClinicPortalView } from "@/components/clinic-portal";

export const metadata: Metadata = { title: "Portal del paciente", robots: { index: false } };

export default function Page() {
  return <ClinicPortalView />;
}
