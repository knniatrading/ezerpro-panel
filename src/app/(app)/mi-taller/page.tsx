import type { Metadata } from "next";
import { TallerSettingsView } from "@/components/taller-settings";

export const metadata: Metadata = { title: "Mi taller" };

export default function Page() {
  return <TallerSettingsView />;
}
