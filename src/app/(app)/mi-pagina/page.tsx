import type { Metadata } from "next";
import { TechProfileView } from "@/components/tech-profile-admin";

export const metadata: Metadata = { title: "Mi página y QR" };

export default function Page() {
  return <TechProfileView />;
}
