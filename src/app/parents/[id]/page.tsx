"use client";

import { useParams } from "next/navigation";
import ParentDetailPage from "@/features/parents/pages/ParentDetailPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ParentDetailPage id={id} />;
}
