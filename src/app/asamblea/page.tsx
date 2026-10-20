import type { Metadata } from "next";
import { ResAssemblyPage } from "@/components/res-public";

export const metadata: Metadata = { title: "Asamblea" };

export default function Page() {
  return <ResAssemblyPage />;
}
