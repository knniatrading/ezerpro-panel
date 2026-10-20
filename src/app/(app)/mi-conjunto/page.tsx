import type { Metadata } from "next";
import { ResSettingsView } from "@/components/res-settings";

export const metadata: Metadata = { title: "Mi conjunto" };

export default function Page() {
  return <ResSettingsView />;
}
