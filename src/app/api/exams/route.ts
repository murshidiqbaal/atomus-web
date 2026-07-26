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
    const { name, course_id, batch_id, campus_id, exam_scope, exam_date, total_marks, is_daily, subject_id } = body;

    if (!name || !exam_scope || !exam_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Role validations
    if (auth.role === "teacher") {
      if (exam_scope === "campus") {
         return NextResponse.json({ error: "Teachers cannot create campus-wide exams." }, { status: 403 });
      }
      if (course_id && !auth.assignedCourses?.includes(course_id)) {
        return NextResponse.json({ error: "Not assigned to this course." }, { status: 403 });
      }
      if (batch_id && !auth.assignedBatches?.includes(batch_id)) {
        return NextResponse.json({ error: "Not assigned to this batch." }, { status: 403 });
      }
    } else if (auth.role !== "admin" && auth.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized to create exams." }, { status: 403 });
    }

    const adminDb = getSupabaseAdmin();
    const creatorRole = auth.role === 'admin' || auth.role === 'staff' ? 'admin' : 'teacher';

    const { data: exam, error } = await adminDb
      .from("exams")
      .insert({
        name,
        course_id: exam_scope === "campus" ? null : course_id,
        batch_id: exam_scope === "batch" ? batch_id : null,
        campus_id: exam_scope === "campus" ? campus_id : null,
        subject_id: subject_id || null,
        exam_scope,
        exam_date,
        total_marks,
        is_daily: !!is_daily,
        creator_id: auth.userId === "master-admin" ? null : auth.userId,
        creator_role: creatorRole
      })
      .select()
      .single();

    if (error) {
      console.error("Exam insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(exam, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing exam ID" }, { status: 400 });

    const adminDb = getSupabaseAdmin();

    const { data: exam } = await adminDb.from("exams").select("*").eq("id", id).single();
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.role === "teacher" && exam.creator_id !== auth.userId) {
      return NextResponse.json({ error: "You can only delete your own exams." }, { status: 403 });
    } else if (auth.role !== "admin" && auth.role !== "teacher" && auth.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await adminDb.from("exams").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing exam ID" }, { status: 400 });

    const body = await req.json();
    const { name, course_id, batch_id, campus_id, exam_scope, exam_date, total_marks, is_daily, subject_id } = body;

    const adminDb = getSupabaseAdmin();
    const { data: existing } = await adminDb.from("exams").select("*").eq("id", id).single();
    if (!existing) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    if (auth.role === "teacher" && existing.creator_id !== auth.userId) {
      return NextResponse.json({ error: "You can only edit your own exams." }, { status: 403 });
    } else if (auth.role !== "admin" && auth.role !== "teacher" && auth.role !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (exam_date !== undefined) updates.exam_date = exam_date;
    if (total_marks !== undefined) updates.total_marks = total_marks;
    if (is_daily !== undefined) updates.is_daily = !!is_daily;
    if (subject_id !== undefined) updates.subject_id = subject_id || null;
    if (exam_scope !== undefined) updates.exam_scope = exam_scope;
    if (course_id !== undefined) updates.course_id = exam_scope === "campus" ? null : course_id;
    if (batch_id !== undefined) updates.batch_id = exam_scope === "batch" ? batch_id : null;
    if (campus_id !== undefined) updates.campus_id = exam_scope === "campus" ? campus_id : null;

    const { data: updated, error } = await adminDb
      .from("exams")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Exam update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

