"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet, Plus, Save, Trophy, AlertTriangle,
  Loader2, Search, ChevronDown, CheckCircle2, X
} from "lucide-react";
import { academicRepository } from "@/lib/repositories/academic_repository";
import { courseRepository } from "@/lib/repositories/course_repository";
import { studentRepository } from "@/lib/repositories/student_repository";
import { Course, Batch } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type Performance = "Excellent" | "Good" | "Average" | "At Risk";

function calcPerformance(marks: number, total: number): Performance {
  const pct = total > 0 ? (marks / total) * 100 : 0;
  if (pct >= 85) return "Excellent";
  if (pct >= 65) return "Good";
  if (pct >= 40) return "Average";
  return "At Risk";
}

export default function MarksManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, { value: number; id?: string; remarks: string }>>({});

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [newExamName, setNewExamName] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isNewExam, setIsNewExam] = useState(false);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => { courseRepository.getCourses().then(setCourses); }, []);

  useEffect(() => {
    if (selectedCourse) {
      courseRepository.getBatchesByCourse(selectedCourse).then(setBatches);
      setSelectedBatch("");
      setSelectedExam("");
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedBatch) {
      academicRepository.getExams(selectedCourse, selectedBatch).then(setExams);
      setSelectedExam("");
    }
  }, [selectedCourse, selectedBatch]);

  const loadMarksData = useCallback(async () => {
    if (!selectedBatch || !selectedExam) return;
    setLoading(true);
    try {
      const [studentData, marksData] = await Promise.all([
        studentRepository.getStudentsByBatch(selectedBatch),
        academicRepository.getMarks(selectedExam),
      ]);

      const map: Record<string, { value: number; id?: string; remarks: string }> = {};
      studentData.forEach(s => {
        const existing = marksData.find((m: any) => m.student_id === s.id);
        map[s.id] = { value: (existing as any)?.marks_obtained ?? existing?.marksObtained ?? 0, id: existing?.id, remarks: existing?.remarks ?? "" };
      });
      setStudents(studentData);
      setMarksMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedExam]);

  useEffect(() => { loadMarksData(); }, [loadMarksData]);

  const handleCreateExam = async () => {
    if (!newExamName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([{
          name: newExamName,
          course_id: selectedCourse,
          batch_id: selectedBatch,
          total_marks: totalMarks,
          exam_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;
      setExams(prev => [...prev, data]);
      setSelectedExam(data.id);
      setIsNewExam(false);
      setNewExamName("");
      showNotif("success", "Exam created!");
    } catch (err: any) {
      showNotif("error", err.message || "Failed to create exam.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(marksMap).map(([studentId, data]) => ({
        ...(data.id ? { id: data.id } : {}),
        exam_id: selectedExam,
        student_id: studentId,
        marks_obtained: data.value,
        total_marks: totalMarks,
        remarks: data.remarks,
      }));
      await academicRepository.updateMarks(records);
      showNotif("success", "Marks saved successfully!");
      loadMarksData();
    } catch (err: any) {
      showNotif("error", err.message || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const excellent = students.filter(s => calcPerformance(marksMap[s.id]?.value ?? 0, totalMarks) === "Excellent").length;
  const atRisk = students.filter(s => calcPerformance(marksMap[s.id]?.value ?? 0, totalMarks) === "At Risk").length;
  const avgPct = students.length > 0
    ? (students.reduce((sum, s) => sum + (marksMap[s.id]?.value ?? 0), 0) / students.length / totalMarks * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
          notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-bold">{notification.msg}</p>
          <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tight">Academic Grading</h1>
          <p className="text-slate-500 font-medium mt-1">Record and review student performance by exam and subject.</p>
        </div>
        {selectedExam && students.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0B3C5D] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0B3C5D]/90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Marks
          </button>
        )}
      </header>

      {/* Context Selectors */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none"
              value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch</label>
            <select
              disabled={!selectedCourse}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none disabled:opacity-50"
              value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            >
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam</label>
            <div className="flex gap-2">
              <select
                disabled={!selectedBatch}
                className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none disabled:opacity-50"
                value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
              >
                <option value="">Select Exam</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {selectedBatch && (
                <button
                  onClick={() => setIsNewExam(!isNewExam)}
                  className="px-3 py-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl font-black hover:bg-[#D4AF37]/20 transition-colors"
                  title="Create new exam"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Marks</label>
            <input
              type="number" min={1}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none"
              value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))}
            />
          </div>
        </div>

        {/* New Exam Form */}
        {isNewExam && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
            <input
              type="text"
              placeholder="Exam name e.g. Mid-Term Mathematics 2026"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0B3C5D]"
              value={newExamName} onChange={e => setNewExamName(e.target.value)}
            />
            <button onClick={handleCreateExam} className="bg-[#0B3C5D] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0B3C5D]/90 transition-all">
              Create Exam
            </button>
            <button onClick={() => setIsNewExam(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedExam && students.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: students.length, color: "bg-blue-50 text-blue-600" },
            { label: "Class Average", value: `${avgPct}%`, color: "bg-purple-50 text-purple-600" },
            { label: "Excellent (≥85%)", value: excellent, color: "bg-emerald-50 text-emerald-600" },
            { label: "At Risk (<40%)", value: atRisk, color: "bg-rose-50 text-rose-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                <Trophy size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <h3 className="text-2xl font-black text-[#0B3C5D] mt-1">{s.value}</h3>
            </div>
          ))}
        </div>
      )}

      {/* Marks Table */}
      {!selectedBatch ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Select a batch to begin</h3>
          <p className="text-slate-400 text-sm mt-1">Choose course → batch → exam to enter marks.</p>
        </div>
      ) : loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin" size={32} />
          <span className="font-medium">Loading students and marks...</span>
        </div>
      ) : !selectedExam ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <p className="text-slate-400 font-medium">Select an exam or create a new one to enter marks.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[280px]">Student</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Marks / {totalMarks}</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Percentage</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Grade</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">No students in this batch.</td>
                </tr>
              ) : students.map(student => {
                const entry = marksMap[student.id] ?? { value: 0, remarks: "" };
                const pct = totalMarks > 0 ? (entry.value / totalMarks * 100).toFixed(1) : "0.0";
                const perf = calcPerformance(entry.value, totalMarks);
                const perfStyles = {
                  "Excellent": "bg-emerald-100 text-emerald-700",
                  "Good": "bg-blue-100 text-blue-700",
                  "Average": "bg-amber-100 text-amber-700",
                  "At Risk": "bg-rose-100 text-rose-700",
                };

                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center font-black text-sm shrink-0">
                          {student.full_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[#0B3C5D] text-sm leading-tight">{student.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{student.admission_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={totalMarks}
                          value={entry.value}
                          onChange={e => setMarksMap(prev => ({
                            ...prev,
                            [student.id]: { ...prev[student.id], value: Math.min(Number(e.target.value), totalMarks) }
                          }))}
                          className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-[#0B3C5D] focus:ring-2 focus:ring-[#0B3C5D]/20 outline-none transition-all"
                        />
                        <span className="text-xs text-slate-400 font-bold">/ {totalMarks}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              Number(pct) >= 85 ? 'bg-emerald-500' : Number(pct) >= 65 ? 'bg-blue-500' : Number(pct) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-[#0B3C5D]">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${perfStyles[perf]}`}>
                        {perf}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <input
                        type="text"
                        placeholder="Add remark..."
                        value={entry.remarks}
                        onChange={e => setMarksMap(prev => ({
                          ...prev,
                          [student.id]: { ...prev[student.id], remarks: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#0B3C5D] focus:outline-none text-sm transition-all"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
