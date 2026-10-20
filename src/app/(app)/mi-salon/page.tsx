import type { Metadata } from "next";
import { SalonSettingsView } from "@/components/salon-settings";

export const metadata: Metadata = { title: "Mi salón" };

export default function Page() {
  return <SalonSettingsView />;
}
