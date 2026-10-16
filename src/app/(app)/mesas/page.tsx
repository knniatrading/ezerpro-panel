import type { Metadata } from "next";
import { TablesView } from "@/components/tables-view";

export const metadata: Metadata = { title: "Mesas" };

export default function Page() {
  return <TablesView />;
}
