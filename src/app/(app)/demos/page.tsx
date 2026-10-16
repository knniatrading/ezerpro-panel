import type { Metadata } from "next";
import { DemosView } from "@/components/demos-view";

export const metadata: Metadata = { title: "Demos" };

export default function Page() {
  return <DemosView />;
}
