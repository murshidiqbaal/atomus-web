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
    const { rows } = body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    // Validation for teacher scope
    if (auth.role === "teacher") {
      const uniqueCourses = Array.from(new Set(rows.map(r => r.course_id)));
      const uniqueSubjects = Array.from(new Set(rows.map(r => r.subject_id).filter(Boolean)));

      for (const courseId of uniqueCourses) {
        if (!auth.assignedCourses?.includes(courseId as string)) {
          return NextResponse.json({ error: "You are not assigned to this course." }, { status: 403 });
        }
      }
      for (const subjectId of uniqueSubjects) {
        if (!auth.assignedSubjects?.includes(subjectId as string)) {
          return NextResponse.json({ error: "You are not assigned to this subject." }, { status: 403 });
        }
      }
    } else if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized to update attendance." }, { status: 403 });
    }

    const adminDb = getSupabaseAdmin();

    let teacherProfile: { id: string; full_name: string } | null = null;
    if (auth.role === "teacher") {
      const { data: teacher } = await adminDb
        .from("teachers")
        .select("id, full_name")
        .eq("auth_id", auth.userId)
        .maybeSingle();
      teacherProfile = teacher;
    }

    const stamped = rows.map(r => {
      if (auth.role === "teacher") {
        return {
          ...r,
          marked_by: auth.userId,
          teacher_id: teacherProfile?.id ?? r.teacher_id ?? null,
          attendance_marker_role: "Teacher",
          attendance_marker_name: teacherProfile?.full_name ?? "Teacher"
        };
      } else {
        return {
          ...r,
          marked_by: auth.userId === "master-admin" ? null : auth.userId,
          teacher_id: r.teacher_id ?? null,
          attendance_marker_role: "Admin",
          attendance_marker_name: "ATOMUS"
        };
      }
    });

    const { error } = await adminDb
      .from("attendance")
      .upsert(stamped, { onConflict: "id" });

    if (error) {
      console.error("Attendance upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uniqueStudents = Array.from(new Set(rows.map(r => r.student_id)));
    if (uniqueStudents.length > 0) {
      import("@/features/students/services/academic_performance_service")
        .then(({ academicPerformanceService }) => {
          Promise.all(
            uniqueStudents.map(studentId => 
              academicPerformanceService.recalculateForStudent(studentId as string)
            )
          ).then(() => {
            return academicPerformanceService.recalculateAllRankings();
          });
        })
        .catch(err => console.error("Background recalculation error:", err));
    }

    return NextResponse.json({ success: true, count: stamped.length }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
