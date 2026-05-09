"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Layers, Clock, Users, Plus, ChevronRight, Settings } from "lucide-react";
import { courseRepository } from "@/lib/repositories/course_repository";
import { Course, Batch } from "@/lib/types";

import AddCourseModal from "@/components/courses/AddCourseModal";

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  const fetchCourses = () => {
    setLoading(true);
    courseRepository.getCourses().then(data => {
      setCourses(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <AddCourseModal 
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSuccess={fetchCourses}
      />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Academic Architecture</h1>
          <p className="text-foreground/70 mt-1">Manage courses, subjects, and instructional batches.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCourseModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} />
            New Course
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
           <div className="col-span-full py-20 text-center text-foreground/40 italic">Loading courses...</div>
        ) : (
          courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))
        )}
      </div>
    </div>
  );
}

import AddBatchModal from "@/components/courses/AddBatchModal";

function CourseCard({ course }: { course: Course }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBatches = () => {
    courseRepository.getBatchesByCourse(course.id).then(setBatches);
  };

  useEffect(() => {
    if (expanded) {
      fetchBatches();
    }
  }, [expanded, course.id]);

  return (
    <div className="bg-surface rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <AddBatchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBatches}
        courseId={course.id}
        courseName={course.name}
      />
      <div className="p-6 border-b border-border/50">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <button className="p-2 text-foreground/30 hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1">{course.name}</h3>
        <p className="text-sm text-foreground/60 line-clamp-2 mb-4">{course.description}</p>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock className="text-foreground/40" size={14} />
            <span className="text-xs font-semibold text-foreground/70">{course.durationMonths} Months</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="text-foreground/40" size={14} />
            <span className="text-xs font-semibold text-foreground/70">{course.batchCount} Batches</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-muted/30">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground/50 hover:text-primary transition-colors"
        >
          <span>{expanded ? 'Hide Batches' : 'View Batches'}</span>
          <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {batches.map(batch => (
              <div key={batch.id} className="bg-surface p-4 rounded-xl border border-border/40 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{batch.name}</h4>
                  <p className="text-[11px] text-foreground/50 mt-1">{batch.timing}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-foreground/30" />
                    <span className="text-xs font-bold text-foreground/70">{batch.studentCount}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${batch.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 border border-dashed border-border rounded-xl text-xs font-bold text-foreground/40 hover:text-primary hover:border-primary/50 transition-all"
            >
              + Create New Batch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
