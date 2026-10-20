import type { Metadata } from "next";
import { ResBillingView } from "@/components/res-billing";

export const metadata: Metadata = { title: "Cartera" };

export default function Page() {
  return <ResBillingView />;
}
