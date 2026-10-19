import type { Metadata } from "next";
import { FerreAccountPage } from "@/components/ferre-account-page";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default function Page() {
  return <FerreAccountPage />;
}
