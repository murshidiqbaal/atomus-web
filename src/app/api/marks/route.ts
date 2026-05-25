import { NextRequest, NextResponse } from "next/server";
import { getServerAuth, getSupabaseAdmin } from "@/lib/auth/server_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { marks } = body; // Array of Mark objects
    if (!Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json({ error: "No marks provided" }, { status: 400 });
    }

    const examId = marks[0].exam_id;
    const subjectId = marks[0].subject_id;

    // Role validations
    if (auth.role === "teacher") {
      if (!subjectId) {
        return NextResponse.json({ error: "Teachers must select a specific subject to upload marks." }, { status: 400 });
      }
      if (!auth.assignedSubjects?.includes(subjectId)) {
        return NextResponse.json({ error: "You are not assigned to this subject." }, { status: 403 });
      }
    } else if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized to update marks." }, { status: 403 });
    }

    const adminDb = getSupabaseAdmin();

    // Clean up legacy overall marks (subject_id = null) if saving subject-specific marks
    if (subjectId) {
      const studentIds = marks.map((m: any) => m.student_id);
      const { error: delErr } = await adminDb
        .from("marks")
        .delete()
        .eq("exam_id", examId)
        .is("subject_id", null)
        .in("student_id", studentIds);
      if (delErr) {
        console.error("Failed to delete legacy overall marks via API:", delErr);
      }
    }

    const rowsToUpsert = marks.map((m: any) => ({
      ...(m.id ? { id: m.id } : {}),
      exam_id: m.exam_id,
      student_id: m.student_id,
      subject_id: m.subject_id || null,
      teacher_id: auth.role === "teacher" ? auth.userId : null,
      marks_obtained: m.marks_obtained,
      total_marks: m.total_marks,
      remarks: m.remarks || "",
    }));

    const { error } = await adminDb
      .from("marks")
      .upsert(rowsToUpsert, { onConflict: "id" });

    if (error) {
      console.error("Marks upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger background calculation for all affected students
    const uniqueStudents = Array.from(new Set(marks.map((m: any) => m.student_id)));
    if (uniqueStudents.length > 0) {
      // Import the service dynamically to avoid circular dependencies or heavy imports in edge route
      // Wait, this is nodejs runtime, so we can just do a fetch to a background API route, 
      // or just import the service if it doesn't use client code.
      import("@/features/students/services/academic_performance_service")
        .then(({ academicPerformanceService }) => {
          uniqueStudents.forEach(id => academicPerformanceService.recalculateForStudent(id as string));
        })
        .catch(err => console.error("Background recalculation error:", err));
    }

    return NextResponse.json({ success: true, count: rowsToUpsert.length }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
