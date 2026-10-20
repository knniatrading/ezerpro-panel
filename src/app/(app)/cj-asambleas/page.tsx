import type { Metadata } from "next";
import { ResAssembliesView } from "@/components/res-assemblies";

export const metadata: Metadata = { title: "Asambleas" };

export default function Page() {
  return <ResAssembliesView />;
}
