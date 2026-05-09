"use client";

import React, { useState, useEffect } from "react";
import { CalendarCheck, Users, Search, Filter, CheckCircle2, XCircle, Clock, MinusCircle, ChevronRight, Save, Loader2 } from "lucide-react";
import { academicRepository } from "@/lib/repositories/academic_repository";
import { studentRepository } from "@/lib/repositories/student_repository";
import { courseRepository } from "@/lib/repositories/course_repository";
import { supabase } from "@/lib/supabase";
import { Course, Batch, Student } from "@/lib/types";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Unmarked";

export default function AttendanceManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; id?: string }>>({});
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Initial Data
  useEffect(() => {
    courseRepository.getCourses().then(setCourses);
  }, []);

  // Load Batches when Course changes
  useEffect(() => {
    if (selectedCourse) {
      courseRepository.getBatchesByCourse(selectedCourse).then(setBatches);
      setSelectedBatch("");
    }
  }, [selectedCourse]);

  // Load Students and Existing Attendance when Batch or Date changes
  useEffect(() => {
    if (selectedBatch && selectedDate) {
      loadAttendanceData();

      // Setup Realtime Subscription
      const channel = supabase
        .channel('attendance_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: `batch_id=eq.${selectedBatch}`
          },
          (payload) => {
            if (payload.new && (payload.new as any).attendance_date === selectedDate) {
              const newRecord = payload.new as any;
              setAttendanceMap(prev => ({
                ...prev,
                [newRecord.student_id]: { 
                  status: newRecord.status as AttendanceStatus,
                  id: newRecord.id 
                }
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedBatch, selectedDate]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const studentData = await studentRepository.getStudentsByBatch(selectedBatch);
      const attendanceData = await academicRepository.getAttendance(selectedBatch, selectedDate);
      
      const map: Record<string, { status: AttendanceStatus; id?: string }> = {};
      studentData.forEach(s => {
        const record = attendanceData.find((a: any) => a.student_id === s.id);
        map[s.id] = {
          status: (record?.status as AttendanceStatus) || "Unmarked",
          id: record?.id
        };
      });
      
      setStudents(studentData);
      setAttendanceMap(map);
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ 
      ...prev, 
      [studentId]: { ...prev[studentId], status } 
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendanceMap)
        .map(([studentId, data]) => ({
          id: data.id, // Include existing ID if it exists
          student_id: studentId,
          batch_id: selectedBatch,
          attendance_date: selectedDate,
          status: data.status,
        }));
      
      await academicRepository.updateAttendance(records);
      alert("Attendance updated successfully!");
      // Reload to ensure we have all IDs
      loadAttendanceData();
    } catch (err: any) {
      console.error("Detailed Save Error:", err);
      alert(`Failed to update attendance: ${err.message || "Unknown Error"}. Please ensure you have run the SQL constraint command.`);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || attendanceMap[s.id] === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Attendance Management</h1>
          <p className="text-foreground/70 mt-1">Mark and monitor daily attendance for specific batches.</p>
        </div>
        {selectedBatch && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Attendance
          </button>
        )}
      </header>

      {/* Filters & Search */}
      <div className="bg-surface p-6 rounded-3xl border border-border/50 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 ml-1 uppercase tracking-wider">Course</label>
            <select 
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 ml-1 uppercase tracking-wider">Batch</label>
            <select 
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
              disabled={!selectedCourse}
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
            >
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 ml-1 uppercase tracking-wider">Date</label>
            <input 
              type="date"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 ml-1 uppercase tracking-wider">Status Filter</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
              <select 
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Unmarked">Unmarked</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 ml-1 uppercase tracking-wider">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
              <input 
                type="text"
                placeholder="Name or ID..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      {!selectedBatch ? (
        <div className="bg-muted/20 border-2 border-dashed border-border rounded-3xl p-20 text-center space-y-4">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <CalendarCheck className="text-foreground/20" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">No Batch Selected</h3>
            <p className="text-foreground/50 text-sm max-w-xs mx-auto mt-1">Please select a course and batch from the filters above to mark attendance.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-foreground/40 italic flex flex-col items-center gap-4">
          <Loader2 className="animate-spin" size={32} />
          Fetching students and attendance records...
        </div>
      ) : (
        <div className="bg-surface rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="py-5 px-8 text-xs font-bold uppercase tracking-widest text-foreground/40">Student Info</th>
                <th className="py-5 px-8 text-xs font-bold uppercase tracking-widest text-foreground/40 text-center">Status</th>
                <th className="py-5 px-8 text-xs font-bold uppercase tracking-widest text-foreground/40 text-right">Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredStudents.map((student) => {
                const { status } = attendanceMap[student.id] || { status: "Unmarked" };
                const rowColors: any = {
                  Present: "bg-emerald-50/30 hover:bg-emerald-50/50",
                  Absent: "bg-rose-50/30 hover:bg-rose-50/50",
                  Late: "bg-amber-50/30 hover:bg-amber-50/50",
                  Unmarked: "hover:bg-muted/10"
                };

                return (
                  <tr key={student.id} className={`transition-colors group ${rowColors[status]}`}>
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          status === 'Unmarked' ? 'bg-primary/10 text-primary' : 
                          status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'Absent' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {student.full_name?.[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{student.full_name}</h4>
                          <p className="text-[11px] text-foreground/40 font-mono">{student.admission_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-8 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-4 px-8">
                      <div className="flex items-center justify-end gap-2">
                        <StatusButton 
                          status="Present" 
                          active={status === "Present"} 
                          onClick={() => handleStatusChange(student.id, "Present")}
                          icon={<CheckCircle2 size={16} />}
                          color="emerald"
                        />
                        <StatusButton 
                          status="Absent" 
                          active={status === "Absent"} 
                          onClick={() => handleStatusChange(student.id, "Absent")}
                          icon={<XCircle size={16} />}
                          color="rose"
                        />
                        <StatusButton 
                          status="Late" 
                          active={status === "Late"} 
                          onClick={() => handleStatusChange(student.id, "Late")}
                          icon={<Clock size={16} />}
                          color="amber"
                        />
                        <StatusButton 
                          status="Unmarked" 
                          active={status === "Unmarked"} 
                          onClick={() => handleStatusChange(student.id, "Unmarked")}
                          icon={<MinusCircle size={16} />}
                          color="slate"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-20 text-center text-foreground/40 italic">No students found matching your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles = {
    Present: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Absent: "bg-rose-50 text-rose-600 border-rose-100",
    Late: "bg-amber-50 text-amber-600 border-amber-100",
    Unmarked: "bg-slate-50 text-slate-400 border-slate-100"
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
}

function StatusButton({ status, active, onClick, icon, color }: any) {
  const colorStyles: any = {
    emerald: active ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100",
    rose: active ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-rose-50 text-rose-500 hover:bg-rose-100",
    amber: active ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-amber-50 text-amber-500 hover:bg-amber-100",
    slate: active ? "bg-slate-500 text-white shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100",
  };

  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-xl transition-all active:scale-90 flex items-center gap-2 px-3 ${colorStyles[color]}`}
      title={status}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">{status}</span>
    </button>
  );
}
