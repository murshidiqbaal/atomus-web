"use client";

import React, { useState, useEffect } from "react";
import { Layers, Clock, Users, Search, Filter } from "lucide-react";
import { courseRepository } from "@/lib/repositories/course_repository";
import { Batch, Course } from "@/lib/types";

export default function BatchManagement() {
  const [batches, setBatches] = useState<(Batch & { courseName?: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const coursesData = await courseRepository.getCourses();
        setCourses(coursesData);
        
        const allBatches: (Batch & { courseName?: string })[] = [];
        for (const course of coursesData) {
          const courseBatches = await courseRepository.getBatchesByCourse(course.id);
          allBatches.push(...courseBatches.map(b => ({ ...b, courseName: course.name })));
        }
        setBatches(allBatches);
      } catch (err) {
        console.error("Error loading batches:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.courseName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Batch Directory</h1>
          <p className="text-foreground/70 mt-1">Global view of all active and inactive instructional batches.</p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
          <input 
            type="text" 
            placeholder="Search by batch name or course..." 
            className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-bold text-foreground/60 hover:bg-muted transition-all">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-foreground/40 italic">Aggregating batch data...</div>
        ) : filteredBatches.length === 0 ? (
          <div className="col-span-full py-20 text-center text-foreground/40 italic">No batches found.</div>
        ) : (
          filteredBatches.map(batch => (
            <div key={batch.id} className="bg-surface p-6 rounded-3xl border border-border/50 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-accent/10 p-3 rounded-2xl text-accent">
                  <Layers size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  batch.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {batch.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-1">{batch.name}</h3>
              <p className="text-xs font-bold text-primary mb-4 uppercase tracking-wider">{batch.courseName}</p>
              
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Clock size={14} />
                    <span className="text-xs font-medium">Timing</span>
                  </div>
                  <span className="text-xs font-bold text-foreground/80">{batch.timing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground/50">
                    <Users size={14} />
                    <span className="text-xs font-medium">Students</span>
                  </div>
                  <span className="text-xs font-bold text-foreground/80">{batch.studentCount} Enrolled</span>
                </div>
              </div>
              
              <button className="w-full mt-6 py-3 bg-muted text-foreground/60 text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all">
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
