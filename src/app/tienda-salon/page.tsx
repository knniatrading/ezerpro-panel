import type { Metadata } from "next";
import { SalonShopPage } from "@/components/salon-public";

export const metadata: Metadata = { title: "Productos" };

export default function Page() {
  return <SalonShopPage />;
}
