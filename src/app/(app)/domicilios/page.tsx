import type { Metadata } from "next";
import { DeliveryView } from "@/components/delivery-view";

export const metadata: Metadata = { title: "Domicilios" };

export default function Page() {
  return <DeliveryView />;
}
