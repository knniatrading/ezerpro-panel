import type { Metadata } from "next";
import { VetShop } from "@/components/vet-shop";

export const metadata: Metadata = { title: "Tienda" };

export default function Page() {
  return <VetShop />;
}
