import type { Metadata } from "next";
import { PosView } from "@/components/pos-view";

export const metadata: Metadata = { title: "Vender" };

export default function Page() {
  return <PosView />;
}
