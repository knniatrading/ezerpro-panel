import type { Metadata } from "next";
import { DistributorsView } from "@/components/distributors-view";

export const metadata: Metadata = { title: "Distribuidores" };

export default function DistributorsPage() {
  return <DistributorsView />;
}
