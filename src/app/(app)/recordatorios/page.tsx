import type { Metadata } from "next";
import { TallerRemindersView } from "@/components/taller-reminders";

export const metadata: Metadata = { title: "Recordatorios" };

export default function Page() {
  return <TallerRemindersView />;
}
