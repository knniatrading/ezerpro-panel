import type { Metadata } from "next";
import { TechServicesView } from "@/components/tech-services";

export const metadata: Metadata = { title: "Mis servicios" };

export default function Page() {
  return <TechServicesView />;
}
