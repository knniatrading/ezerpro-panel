import type { Metadata } from "next";
import { TallerOrdersView } from "@/components/taller-orders";

export const metadata: Metadata = { title: "Órdenes" };

export default function Page() {
  return <TallerOrdersView />;
}
