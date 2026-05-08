import React from "react";

export default function AttendanceManagement() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Attendance Management</h1>
          <p className="text-foreground/70 mt-1">Track and update student attendance records.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-surface text-primary border border-border px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors shadow-sm">
            Download Sheet
          </button>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Mark Attendance
          </button>
        </div>
      </header>

      {/* Date Selector & Filters */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-[12px] border border-border/50 shadow-[0_4px_20px_rgba(11,60,93,0.02)]">
        <div className="flex items-center gap-4">
          <input type="date" defaultValue="2023-10-24" className="border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
          <select className="border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>All Courses</option>
            <option>Advanced Mathematics</option>
            <option>Physics 101</option>
          </select>
        </div>
        <div className="relative">
          <input type="text" placeholder="Search student..." className="border border-border rounded-[8px] pl-9 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-64" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">🔍</span>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: "Advanced Mathematics", time: "09:00 AM - 10:30 AM", present: 28, total: 30, status: "Completed" },
          { name: "Physics 101", time: "11:00 AM - 12:30 PM", present: 22, total: 25, status: "Ongoing" },
          { name: "Chemistry Basics", time: "02:00 PM - 03:30 PM", present: 0, total: 24, status: "Upcoming" },
        ].map((cls, i) => (
          <div key={i} className="bg-surface rounded-[12px] p-6 border border-border/50 shadow-[0_4px_20px_rgba(11,60,93,0.05)] hover:shadow-[0_8px_30px_rgba(11,60,93,0.08)] transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{cls.name}</h3>
                <p className="text-sm text-foreground/60">{cls.time}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold tracking-wider uppercase ${
                cls.status === "Completed" ? "bg-green-100/50 text-green-700" :
                cls.status === "Ongoing" ? "bg-blue-100/50 text-blue-700" : "bg-muted text-foreground/60"
              }`}>
                {cls.status}
              </span>
            </div>
            
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">Attendance Rate</span>
                <span className="font-semibold text-foreground">{cls.total > 0 && cls.present > 0 ? Math.round((cls.present / cls.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${cls.status === 'Upcoming' ? 'bg-transparent' : 'bg-primary'}`} 
                  style={{ width: `${cls.total > 0 ? (cls.present / cls.total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-foreground/60 pt-1">
                <span>{cls.present} Present</span>
                <span>{cls.total} Total Students</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
