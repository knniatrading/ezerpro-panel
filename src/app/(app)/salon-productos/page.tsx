import type { Metadata } from "next";
import { SalonProductsView } from "@/components/salon-products";

export const metadata: Metadata = { title: "Productos" };

export default function Page() {
  return <SalonProductsView />;
}
