"use client";

import { useParams } from "next/navigation";
import TeacherDetailPage from "@/features/teachers/pages/TeacherDetailPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <TeacherDetailPage id={id} />;
}
