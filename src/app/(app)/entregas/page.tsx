import type { Metadata } from "next";
import { MyDeliveriesView } from "@/components/my-deliveries-view";

export const metadata: Metadata = { title: "Mis entregas" };

export default function Page() {
  return <MyDeliveriesView />;
}
