"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Send,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  Users,
  Smartphone,
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  Calendar
} from "lucide-react";

export default function NotificationManagement() {
  // DB references
  const [campuses, setCampuses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({
    sent: 0,
    delivered: 0,
    failed: 0,
    readRate: 0,
    unread: 0,
    totalDevices: 0
  });

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [target, setTarget] = useState<"everyone" | "campus" | "course" | "teachers" | "parents" | "students">("everyone");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [scheduleTime, setScheduleTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "logs">("send");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInitialData();
    fetchLogsAndAnalytics();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: campusData } = await supabase.from("campuses").select("id, name");
      const { data: courseData } = await supabase.from("courses").select("id, name");
      const { data: studentData } = await supabase.from("students").select("id, full_name, admission_number").limit(100);

      setCampuses(campusData || []);
      setCourses(courseData || []);
      setStudents(studentData || []);
    } catch (err) {
      console.error("Error fetching form metadata:", err);
    }
  };

  const fetchLogsAndAnalytics = async () => {
    setLoadingLogs(true);
    try {
      // Fetch devices count
      const { count: deviceCount } = await supabase
        .from("device_tokens")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch total count of notifications
      const { count: totalNotifs } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true });

      // Fetch notification history with parents join (using full_name)
      let notifData: any[] | null = null;
      const { data: joinedData, error: notifErr } = await supabase
        .from("notifications")
        .select("*, parents(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (notifErr) {
        // Fallback to simple select if join fails
        const { data: simpleData } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        notifData = simpleData;
      } else {
        notifData = joinedData;
      }

      // Fetch logs count for simple analytics if table exists
      let delCount = 0;
      let failCount = 0;
      try {
        const { data: logStats } = await supabase
          .from("notification_logs")
          .select("status");

        logStats?.forEach((l) => {
          if (l.status === "sent" || l.status === "delivered") delCount++;
          if (l.status === "failed") failCount++;
        });
      } catch {
        // notification_logs optional
      }

      // Fetch unread history count
      const { count: unreadCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      const sentCount = totalNotifs || notifData?.length || 0;
      const readRate = Math.round(
        ((sentCount - (unreadCount || 0)) / (sentCount || 1)) * 100
      );

      setAnalytics({
        sent: sentCount,
        delivered: delCount || sentCount, // fallback
        failed: failCount,
        readRate: Math.max(0, Math.min(100, readRate)),
        unread: unreadCount || 0,
        totalDevices: deviceCount || 0
      });

      setLogs(notifData || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert("Please fill in notification title and message.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        message,
        type,
        target,
        priority,
        image_url: imageUrl || undefined
      };

      if (target === "campus") payload.campus_id = selectedCampus;
      if (target === "course") payload.course_id = selectedCourse;
      if (target === "students") payload.student_ids = [selectedStudent];

      let endpoint = "/api/notifications/send-bulk";

      // If scheduling, save to scheduled table
      if (scheduleTime) {
        const { error: schedError } = await supabase
          .from("scheduled_notifications")
          .insert([
            {
              title,
              message,
              type,
              target,
              campus_id: selectedCampus || null,
              course_id: selectedCourse || null,
              scheduled_time: new Date(scheduleTime).toISOString()
            }
          ]);

        if (schedError) throw schedError;
        alert("Notification scheduled successfully!");
      } else {
        // Send immediately via API
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sending failed");

        alert(`Notification dispatched! Targeted ${data.devices_targeted || 0} active devices.`);
      }

      // Reset Form
      setTitle("");
      setMessage("");
      setImageUrl("");
      setScheduleTime("");
      fetchLogsAndAnalytics();
    } catch (err: any) {
      alert("Failed to send notification: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification from history?")) return;
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      fetchLogsAndAnalytics();
    } catch (err: any) {
      alert("Error deleting notification: " + err.message);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.message?.toLowerCase().includes(q) ||
      l.type?.toLowerCase().includes(q) ||
      l.parents?.full_name?.toLowerCase().includes(q) ||
      l.receiver_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0B3C5D] tracking-tight">Push Notifications</h1>
          <p className="text-slate-500 mt-1">Manage, compose, schedule, and analyze global push notifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogsAndAnalytics}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loadingLogs ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="bg-[#0B3C5D]/10 p-4 rounded-2xl text-[#0B3C5D]">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sent</p>
            <h3 className="text-2xl font-black text-slate-800">{analytics.sent}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered Messages</p>
            <h3 className="text-2xl font-black text-slate-800">{analytics.delivered}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Failed Devices</p>
            <h3 className="text-2xl font-black text-slate-800">{analytics.failed}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-5">
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-600">
            <Smartphone size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Device Tokens</p>
            <h3 className="text-2xl font-black text-slate-800">{analytics.totalDevices}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("send")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "send"
              ? "border-[#0B3C5D] text-[#0B3C5D]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <Send size={16} />
            Compose & Target
          </div>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-[#0B3C5D] text-[#0B3C5D]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            Delivery History
          </div>
        </button>
      </div>

      {activeTab === "send" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Formulator */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Compose Message</h2>
            <form onSubmit={handleSend} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Exam Schedule Published"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-semibold transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Notification Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-semibold transition-all"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="general">General Broadcast</option>
                    <option value="attendance">Attendance Alerts</option>
                    <option value="marks">Academic Marks</option>
                    <option value="exam">Exams & Schedules</option>
                    <option value="fees">Fee Reminders</option>
                    <option value="announcements">School Announcement</option>
                    <option value="emergency">Emergency / Urgent Alert</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Body Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the message contents that will appear on devices..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-semibold transition-all resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Target Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Target Audience</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-bold transition-all"
                    value={target}
                    onChange={(e: any) => {
                      setTarget(e.target.value);
                      setSelectedCampus("");
                      setSelectedCourse("");
                      setSelectedStudent("");
                    }}
                  >
                    <option value="everyone">Everyone (All Roles)</option>
                    <option value="campus">Filter by Campus</option>
                    <option value="course">Filter by Course</option>
                    <option value="teachers">All Teachers</option>
                    <option value="parents">All Parents</option>
                    <option value="students">Specific Student Parent</option>
                  </select>
                </div>

                {/* Sub Filters */}
                {target === "campus" && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Select Campus</label>
                    <select
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-bold transition-all"
                      value={selectedCampus}
                      onChange={(e) => setSelectedCampus(e.target.value)}
                    >
                      <option value="">Choose Campus...</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {target === "course" && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Select Course</label>
                    <select
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-bold transition-all"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      <option value="">Choose Course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {target === "students" && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Search Student</label>
                    <select
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-bold transition-all"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                      <option value="">Select Student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Custom Image URL and Scheduling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Optional Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.png"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-semibold transition-all"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Schedule Send (Optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="datetime-local"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0B3C5D] outline-none text-sm font-semibold transition-all"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-6 pt-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Priority:</span>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    className="accent-[#0B3C5D]"
                    checked={priority === "normal"}
                    onChange={() => setPriority("normal")}
                  />
                  Normal (Standard)
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    className="accent-rose-500"
                    checked={priority === "high"}
                    onChange={() => setPriority("high")}
                  />
                  High (Urgent, bypasses DND where allowed)
                </label>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-[#0B3C5D]/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {loading ? "Processing Delivery..." : scheduleTime ? "Schedule Notification" : "Broadcast Push Immediately"}
              </button>
            </form>
          </div>

          {/* Visual Mobile Preview Mock */}
          <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200/50 shadow-inner flex flex-col items-center justify-center min-h-[500px]">
            <div className="flex items-center gap-2 mb-6">
              <Eye size={18} className="text-[#0B3C5D]" />
              <h3 className="text-sm font-bold text-slate-600">Dynamic Mobile Preview</h3>
            </div>

            {/* Simulated Smartphone */}
            <div className="w-[300px] h-[550px] bg-black rounded-[40px] p-3 shadow-2xl relative border-4 border-slate-800">
              {/* Speaker / Camera Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Simulated Screen */}
              <div className="w-full h-full bg-[#111] rounded-[32px] overflow-hidden relative flex flex-col p-4 pt-10 text-white">
                {/* Status Bar */}
                <div className="flex justify-between items-center text-[10px] opacity-60 px-2 mb-8">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-2 border border-white rounded-sm" />
                    <span>5G</span>
                  </div>
                </div>

                {/* Preview Banner Box */}
                <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#D4AF37] rounded-md flex items-center justify-center">
                        <Bell size={10} className="text-[#0B3C5D]" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-slate-300">ATOMUS</span>
                    </div>
                    <span className="text-[9px] opacity-50">now</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold truncate text-white">{title || "Notification Title"}</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-3">
                      {message || "Compose the message to see how it looks on the recipient's phone lock screen."}
                    </p>
                  </div>

                  {imageUrl && (
                    <div className="w-full h-24 bg-slate-800/80 rounded-lg overflow-hidden border border-white/10 mt-1">
                      <img src={imageUrl} alt="Notification preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Hint */}
                <div className="absolute bottom-6 left-0 right-0 text-center opacity-40 text-[9px] uppercase tracking-widest font-black">
                  Lock Screen Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Searchable logs and history list */
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">Notification History</h2>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search history..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#0B3C5D] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loadingLogs ? (
            <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center gap-4">
              <RefreshCw className="animate-spin text-[#0B3C5D]" size={32} />
              Fetching history logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 italic">No notifications found in database.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Created At</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Recipient</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Message Content</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const colors: any = {
                      attendance: "bg-red-50 text-red-700 border-red-100",
                      marks: "bg-blue-50 text-blue-700 border-blue-100",
                      fees: "bg-amber-50 text-amber-700 border-amber-100",
                      announcements: "bg-purple-50 text-purple-700 border-purple-100",
                      emergency: "bg-rose-100 text-rose-700 border-rose-200 font-extrabold animate-pulse",
                      general: "bg-slate-50 text-slate-600 border-slate-100"
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-bold text-slate-800 capitalize">
                            {log.parents?.full_name || log.recipient_name || (log.receiver_type ? `${log.receiver_type} User` : "All Users")}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            {log.receiver_type || "General"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[log.type] || colors.general}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 max-w-sm">
                          <div className="text-sm font-bold text-slate-800 truncate">{log.title}</div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">{log.message}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${log.is_read ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            {log.is_read ? "Read" : "Delivered"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDeleteNotif(log.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
