import type { Metadata } from "next";
import { ResidentPage } from "@/components/res-public";

export const metadata: Metadata = { title: "Mi portal" };

export default function Page() {
  return <ResidentPage />;
}
