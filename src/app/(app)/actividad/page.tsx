import type { Metadata } from "next";
import { ActivityView } from "@/components/activity-view";

export const metadata: Metadata = { title: "Actividad" };

export default function Page() {
  return <ActivityView />;
}
