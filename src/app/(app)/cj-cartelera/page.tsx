import type { Metadata } from "next";
import { ResNoticesView } from "@/components/res-notices";

export const metadata: Metadata = { title: "Cartelera" };

export default function Page() {
  return <ResNoticesView />;
}
