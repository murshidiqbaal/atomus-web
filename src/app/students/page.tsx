import React from "react";

export default function StudentManagement() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Student Management</h1>
          <p className="text-foreground/70 mt-1">Manage student profiles, enrollments, and status.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-surface text-primary border border-border px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors shadow-sm">
            Import CSV
          </button>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
            + Add Student
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-[12px] border border-border/50 shadow-[0_4px_20px_rgba(11,60,93,0.02)]">
        <div className="flex items-center gap-4">
          <select className="border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>All Batches</option>
            <option>Class 10</option>
            <option>Class 11</option>
            <option>Class 12</option>
          </select>
          <select className="border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>Status: All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <div className="relative">
          <input type="text" placeholder="Search by name, ID or phone..." className="border border-border rounded-[8px] pl-9 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-80" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">🔍</span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-surface rounded-[12px] shadow-[0_4px_20px_rgba(11,60,93,0.05)] border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60 w-12">
                  <input type="checkbox" className="rounded-[4px] border-border text-primary focus:ring-primary/20" />
                </th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Student Info</th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">ID</th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Batch</th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Parent Contact</th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Status</th>
                <th className="py-4 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: "John Doe", email: "john@example.com", id: "STU-001", batch: "Class 12", parent: "+1 234 567 8900", status: "Active" },
                { name: "Emily Chen", email: "emily@example.com", id: "STU-002", batch: "Class 11", parent: "+1 234 567 8901", status: "Active" },
                { name: "Michael Brown", email: "michael@example.com", id: "STU-003", batch: "Class 10", parent: "+1 234 567 8902", status: "Inactive" },
                { name: "Sarah Williams", email: "sarah@example.com", id: "STU-004", batch: "Class 12", parent: "+1 234 567 8903", status: "Active" },
                { name: "David Kim", email: "david@example.com", id: "STU-005", batch: "Class 11", parent: "+1 234 567 8904", status: "Active" },
              ].map((student, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors group">
                  <td className="py-4 px-6">
                    <input type="checkbox" className="rounded-[4px] border-border text-primary focus:ring-primary/20" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-foreground/60">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[14px] font-medium text-foreground/80">{student.id}</td>
                  <td className="py-4 px-6 text-[14px] text-foreground/80">{student.batch}</td>
                  <td className="py-4 px-6 text-[14px] text-foreground/80">{student.parent}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-xs font-medium ${
                      student.status === "Active" ? "bg-green-100/50 text-green-700" : "bg-foreground/10 text-foreground/70"
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-foreground/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                      ✏️
                    </button>
                    <button className="text-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 ml-2">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-foreground/70 bg-muted/20">
          <span>Showing 1 to 5 of 1,248 entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded-[6px] border border-border hover:bg-surface disabled:opacity-50" disabled>Prev</button>
            <button className="px-3 py-1 rounded-[6px] bg-primary text-primary-foreground">1</button>
            <button className="px-3 py-1 rounded-[6px] border border-border hover:bg-surface">2</button>
            <button className="px-3 py-1 rounded-[6px] border border-border hover:bg-surface">3</button>
            <button className="px-3 py-1 rounded-[6px] border border-border hover:bg-surface">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
