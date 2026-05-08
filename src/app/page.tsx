import React from "react";

export default function DashboardOverview() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-foreground/70 mt-1">Welcome back. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Generate Report
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Students", value: "1,248", trend: "+12% from last month", icon: "🎓" },
          { label: "Average Attendance", value: "94.2%", trend: "+2.1% from last month", icon: "📅" },
          { label: "Active Courses", value: "34", trend: "Steady", icon: "📚" }
        ].map((stat, i) => (
          <div key={i} className="bg-surface p-6 rounded-[12px] shadow-[0_4px_20px_rgba(11,60,93,0.05)] border border-border/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-foreground/60 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
            <div className="mt-4 text-sm text-foreground/70">{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-surface rounded-[12px] shadow-[0_4px_20px_rgba(11,60,93,0.05)] border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Recent Enrollments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Student Name</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Course</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Date</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: "Alice Johnson", course: "Advanced Mathematics", date: "Oct 24, 2023", status: "Active" },
                { name: "Michael Smith", course: "Physics 101", date: "Oct 23, 2023", status: "Pending" },
                { name: "Sarah Williams", course: "Chemistry Basics", date: "Oct 21, 2023", status: "Active" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 text-[14px] font-medium text-foreground">{row.name}</td>
                  <td className="py-4 px-6 text-[14px] text-foreground/80">{row.course}</td>
                  <td className="py-4 px-6 text-[14px] text-foreground/80">{row.date}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-xs font-medium ${
                      row.status === "Active" ? "bg-green-100/50 text-green-700" : "bg-accent/20 text-accent"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
