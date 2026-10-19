import type { Metadata } from "next";
import { GymSettingsView } from "@/components/gym-settings";

export const metadata: Metadata = { title: "Mi gimnasio y QR" };

export default function Page() {
  return <GymSettingsView />;
}
