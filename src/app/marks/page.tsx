import React from "react";

export default function MarksManagement() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Marks Management</h1>
          <p className="text-foreground/70 mt-1">Record, evaluate, and publish exam results.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors shadow-sm">
            Publish Results
          </button>
        </div>
      </header>

      {/* Selector Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface p-6 rounded-[12px] border border-border/50 shadow-[0_4px_20px_rgba(11,60,93,0.02)]">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-foreground/60 mb-2">Class/Batch</label>
          <select className="w-full border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>Class 12 - Science</option>
            <option>Class 11 - Commerce</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-foreground/60 mb-2">Subject</label>
          <select className="w-full border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>Advanced Mathematics</option>
            <option>Physics</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-foreground/60 mb-2">Exam Type</label>
          <select className="w-full border border-border rounded-[8px] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent">
            <option>Mid-Term Examination</option>
            <option>Unit Test 1</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Load Sheet
          </button>
        </div>
      </div>

      {/* Marks Entry Table */}
      <div className="bg-surface rounded-[12px] shadow-[0_4px_20px_rgba(11,60,93,0.05)] border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
          <h2 className="font-semibold text-foreground">Mid-Term Examination: Advanced Mathematics</h2>
          <span className="text-sm font-medium px-3 py-1 bg-accent/10 text-accent rounded-full">Max Marks: 100</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60 w-16">Roll</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Student Name</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60 w-32">Marks Obtained</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60 w-24">Grade</th>
                <th className="py-3 px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground/60">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { roll: "01", name: "Alice Johnson", marks: "94", grade: "A+" },
                { roll: "02", name: "Michael Smith", marks: "78", grade: "B+" },
                { roll: "03", name: "Sarah Williams", marks: "88", grade: "A" },
                { roll: "04", name: "David Kim", marks: "65", grade: "B" },
                { roll: "05", name: "Emily Chen", marks: "91", grade: "A+" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-6 text-[14px] font-medium text-foreground/60">{row.roll}</td>
                  <td className="py-3 px-6 text-[14px] font-medium text-foreground">{row.name}</td>
                  <td className="py-3 px-6">
                    <input 
                      type="number" 
                      defaultValue={row.marks} 
                      className="w-full border border-border rounded-[6px] px-2 py-1.5 text-sm text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium"
                      max="100"
                    />
                  </td>
                  <td className="py-3 px-6">
                    <span className={`inline-block w-full text-center py-1 rounded-[4px] text-xs font-bold ${
                      row.grade.includes('A') ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <input 
                      type="text" 
                      placeholder="Optional" 
                      className="w-full border-none bg-transparent px-2 py-1 text-sm outline-none focus:bg-muted rounded-[4px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <button className="bg-surface text-foreground border border-border px-6 py-2 rounded-lg font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
