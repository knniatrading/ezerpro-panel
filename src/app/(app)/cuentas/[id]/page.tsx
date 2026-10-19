"use client";

import { useParams } from "next/navigation";
import { FerreAccountView } from "@/components/ferre-accounts";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <FerreAccountView id={id} />;
}
