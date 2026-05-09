"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, MoreVertical, Eye, Edit2, Trash2 } from "lucide-react";
import { studentRepository } from "@/lib/repositories/student_repository";
import { Student } from "@/lib/types";

import AddStudentModal from "@/components/AddStudentModal";

export default function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await studentRepository.getStudents();
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Student Management</h1>
          <p className="text-foreground/70 mt-1">Total {students.length} students enrolled across all batches.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          Add Student
        </button>
      </header>

      <AddStudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchStudents} 
      />

      {/* Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID or roll number..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <select className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium bg-background focus:outline-none">
            <option>All Batches</option>
            <option>Batch A</option>
            <option>Batch B</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Student Info</th>
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Admission ID</th>
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Batch</th>
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Attendance</th>
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50">Performance</th>
                <th className="py-4 px-6 text-[12px] font-bold uppercase tracking-wider text-foreground/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-8 px-6">
                      <div className="h-10 bg-muted rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-foreground/40 italic">No students found matching your criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                          {student.full_name?.[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{student.full_name}</h4>
                          <p className="text-[11px] text-foreground/50">Roll: {student.roll_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground/70 font-medium font-mono">
                      {student.admission_number}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-foreground/80 font-medium">{student.batches?.name || "Batch A"}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
                          <div 
                            className={`h-full rounded-full ${student.attendance_percentage > 90 ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                            style={{ width: `${student.attendance_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground/70">{student.attendance_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        student.progress_status === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 
                        student.progress_status === 'Good' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {student.progress_status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 text-foreground/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-foreground/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 text-foreground/40 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
