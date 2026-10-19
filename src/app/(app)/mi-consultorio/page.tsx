import type { Metadata } from "next";
import { ClinicSettingsView } from "@/components/clinic-settings";

export const metadata: Metadata = { title: "Mi consultorio" };

export default function Page() {
  return <ClinicSettingsView />;
}
