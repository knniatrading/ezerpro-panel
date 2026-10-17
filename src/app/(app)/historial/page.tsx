import type { Metadata } from "next";
import { DriverHistoryView } from "@/components/driver-history";

export const metadata: Metadata = { title: "Historial y ganancias" };

export default function Page() {
  return <DriverHistoryView />;
}
