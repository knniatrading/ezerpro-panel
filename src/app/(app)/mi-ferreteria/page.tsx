import type { Metadata } from "next";
import { FerreSettingsView } from "@/components/ferre-settings";

export const metadata: Metadata = { title: "Mi ferretería" };

export default function Page() {
  return <FerreSettingsView />;
}
