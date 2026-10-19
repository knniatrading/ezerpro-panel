"use client";

import { useParams } from "next/navigation";
import { FerreQuoteView } from "@/components/ferre-quotes";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <FerreQuoteView id={id} />;
}
