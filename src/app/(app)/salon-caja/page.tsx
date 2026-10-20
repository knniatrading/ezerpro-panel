import type { Metadata } from "next";
import { SalonPosView } from "@/components/salon-pos";

export const metadata: Metadata = { title: "Caja" };

export default function Page() {
  return <SalonPosView />;
}
