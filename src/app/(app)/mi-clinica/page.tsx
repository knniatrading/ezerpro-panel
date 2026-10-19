import type { Metadata } from "next";
import { VetSettingsView } from "@/components/vet-settings";

export const metadata: Metadata = { title: "Mi clínica" };

export default function Page() {
  return <VetSettingsView />;
}
