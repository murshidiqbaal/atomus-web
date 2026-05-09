"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  CreditCard, 
  History, 
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Download
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { feeRepository } from "@/lib/repositories/fee_repository";
import { courseRepository } from "@/lib/repositories/course_repository";

// Mock Data for Analytics
const monthlyData = [
  { name: "Jan", collection: 45000, pending: 12000 },
  { name: "Feb", collection: 52000, pending: 15000 },
  { name: "Mar", collection: 48000, pending: 10000 },
  { name: "Apr", collection: 61000, pending: 8000 },
  { name: "May", collection: 55000, pending: 11000 },
  { name: "Jun", collection: 67000, pending: 5000 },
];

const statusData = [
  { name: "Paid", value: 65, color: "#10b981" },
  { name: "Partial", value: 20, color: "#f59e0b" },
  { name: "Pending", value: 10, color: "#64748b" },
  { name: "Overdue", value: 5, color: "#ef4444" },
];

export default function FeeManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await feeRepository.getFeeDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "structures", label: "Structures", icon: Plus },
    { id: "students", label: "Student Fees", icon: Wallet },
    { id: "payments", label: "Record Payment", icon: CreditCard },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F5F7FA] min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0B3C5D] tracking-tighter">Finance & Fees</h1>
          <p className="text-slate-500 font-medium">Complete tuition revenue and payment lifecycle management.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={18} />
            Export Report
          </button>
          <button className="flex items-center gap-2 bg-[#D4AF37] text-white px-5 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-200">
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? "bg-[#0B3C5D] text-white shadow-md" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "overview" && <OverviewSection stats={stats} />}
        {activeTab === "structures" && <StructuresSection />}
        {activeTab === "students" && <StudentFeesSection />}
        {activeTab === "payments" && <PaymentUpdateSection />}
        {activeTab === "history" && <PaymentHistorySection />}
      </div>
    </div>
  );
}

function OverviewSection({ stats }: { stats: any }) {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Collection" 
          value={`₹${stats?.totalCollection?.toLocaleString() || '0'}`}
          change="+12.5%"
          trend="up"
          icon={Wallet}
          color="blue"
        />
        <StatCard 
          title="Outstanding Balance" 
          value={`₹${stats?.totalPending?.toLocaleString() || '0'}`}
          change="-2.1%"
          trend="down"
          icon={AlertCircle}
          color="amber"
        />
        <StatCard 
          title="Paid Students" 
          value={stats?.paidStudents || '0'}
          subValue={`out of ${stats?.totalStudents || '0'}`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard 
          title="Monthly Revenue" 
          value="₹67,000"
          change="+18%"
          trend="up"
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-[#0B3C5D]">Collection Trend</h3>
            <select className="bg-slate-50 border-none rounded-lg px-3 py-1 text-xs font-bold text-slate-500 outline-none cursor-pointer">
              <option>Last 6 Months</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B3C5D" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0B3C5D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="collection" stroke="#0B3C5D" strokeWidth={3} fillOpacity={1} fill="url(#colorColl)" />
                <Area type="monotone" dataKey="pending" stroke="#D4AF37" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-[#0B3C5D] mb-8">Payment Status</h3>
          <div className="flex-1 flex items-center justify-center relative">
             <ResponsiveContainer width="100%" height="200">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#0B3C5D]">85%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</span>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}} />
                  <span className="text-sm font-bold text-slate-500">{s.name}</span>
                </div>
                <span className="text-sm font-black text-[#0B3C5D]">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, change, trend, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-black text-[#0B3C5D]">{value}</h4>
        {subValue && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{subValue}</p>}
      </div>
    </div>
  );
}

function StructuresSection() {
  const [structures, setStructures] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  
  useEffect(() => {
    feeRepository.getFeeStructures().then(setStructures);
    courseRepository.getCourses().then(setCourses);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-[#0B3C5D]">Active Fee Structures</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none" placeholder="Search structures..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {structures.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:border-[#D4AF37] transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-amber-50 transition-colors">
                  <BookOpen className="text-slate-400 group-hover:text-[#D4AF37]" size={20} />
                </div>
                <button className="p-2 text-slate-300 hover:text-slate-600"><MoreVertical size={18} /></button>
              </div>
              <h4 className="text-lg font-black text-[#0B3C5D]">{s.courses?.name}</h4>
              <p className="text-xs font-bold text-slate-400 uppercase mb-6">{s.batches?.name}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Amount</p>
                  <p className="text-sm font-black text-[#0B3C5D]">₹{s.total_amount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monthly Fee</p>
                  <p className="text-sm font-black text-[#D4AF37]">₹{s.monthly_fee}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-fit">
        <h3 className="text-xl font-bold text-[#0B3C5D] mb-6">Setup New Structure</h3>
        <form className="space-y-5">
           <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Course</label>
            <select className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 outline-none">
              <option>Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Total Fee Amount</label>
            <input className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 outline-none" placeholder="e.g. 50000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Admission Fee</label>
              <input className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 outline-none" placeholder="10000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Monthly Fee</label>
              <input className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 outline-none" placeholder="5000" />
            </div>
          </div>
          <button className="w-full bg-[#0B3C5D] text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 mt-4 active:scale-95 transition-all">
            Save Structure
          </button>
        </form>
      </div>
    </div>
  );
}

function StudentFeesSection() {
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feeRepository.getStudentFees().then(data => {
      setStudentFees(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium" placeholder="Search by student name or ID..." />
        </div>
        <div className="flex gap-2">
          <button className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Filter size={18} />
            Status
          </button>
          <button className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2">
            <BookOpen size={18} />
            Course
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Detail</th>
              <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Course & Batch</th>
              <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Status</th>
              <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
              <th className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {studentFees.map(fee => (
              <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B3C5D]/10 text-[#0B3C5D] flex items-center justify-center font-black">
                      {fee.students?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0B3C5D]">{fee.students?.full_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">{fee.students?.admission_number}</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-8">
                  <p className="text-xs font-bold text-slate-600">{fee.students?.courses?.name}</p>
                  <p className="text-[10px] font-medium text-slate-400">{fee.students?.batches?.name}</p>
                </td>
                <td className="py-5 px-8">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total</p>
                      <p className="text-xs font-black text-[#0B3C5D]">₹{fee.total_fee}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-emerald-500">Paid</p>
                      <p className="text-xs font-black text-emerald-600">₹{fee.paid_amount}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-rose-500">Balance</p>
                      <p className="text-xs font-black text-rose-600">₹{fee.balance_amount}</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-8 text-center">
                  <FeeStatusBadge status={fee.payment_status} />
                </td>
                <td className="py-5 px-8 text-right">
                  <button className="p-2 text-slate-300 hover:text-[#D4AF37] transition-colors"><CreditCard size={18} /></button>
                  <button className="p-2 text-slate-300 hover:text-[#0B3C5D] transition-colors"><ChevronRight size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentUpdateSection() {
    return (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="text-center mb-10">
                <div className="bg-amber-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#D4AF37]">
                    <CreditCard size={32} />
                </div>
                <h2 className="text-2xl font-black text-[#0B3C5D]">Update Payment</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Record a manual fee payment for a student.</p>
            </div>

            <form className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Find Student</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" placeholder="Enter admission number or name..." />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input className="w-full pl-8 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-[#0B3C5D] outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                        <select className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 outline-none">
                            <option>Cash</option>
                            <option>UPI / GPay</option>
                            <option>Bank Transfer</option>
                            <option>Card</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
                    <textarea className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none" rows={3} placeholder="Add any payment notes..." />
                </div>

                <button className="w-full bg-[#0B3C5D] text-white py-5 rounded-[20px] font-black text-base shadow-2xl shadow-blue-200 mt-4 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <CheckCircle2 size={20} />
                    Confirm Payment
                </button>
            </form>
        </div>
    );
}

function PaymentHistorySection() {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        feeRepository.getPaymentHistory().then(setHistory);
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.map(tx => (
                    <div key={tx.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
                                <ArrowDownRight size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-[#0B3C5D]">{tx.students?.full_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.payment_method}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[10px] font-bold text-slate-400">{tx.payment_date}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-emerald-600">+₹{tx.amount_paid}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Confirmed</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FeeStatusBadge({ status }: { status: string }) {
    const styles: any = {
        Paid: "bg-emerald-50 text-emerald-600",
        Pending: "bg-slate-50 text-slate-400",
        Partial: "bg-amber-50 text-amber-600",
        Overdue: "bg-rose-50 text-rose-600",
    };

    return (
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status]}`}>
            {status}
        </span>
    );
}

function BookOpen(props: any) {
    return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
