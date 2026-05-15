"use client";

import { useParams } from "next/navigation";
import StudentDetailPage from "@/features/students/pages/StudentDetailPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StudentDetailPage id={id} />;
}
