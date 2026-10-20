import type { Metadata } from "next";
import { ResGateView } from "@/components/res-gate";

export const metadata: Metadata = { title: "Portería" };

export default function Page() {
  return <ResGateView />;
}
