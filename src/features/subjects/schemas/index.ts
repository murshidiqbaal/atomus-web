import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(100, "Max 100 characters"),
  subject_code: z.string().min(1, "Required").max(20, "Max 20 characters"),
  course_id: z.string().min(1, "Select a course"),
  class_level: z.enum(["8", "9", "10", "+1", "+2"], {
    error: "Select a class level",
  }),
  subject_type: z.enum(["Core", "Theory", "Practical", "Language"], {
    error: "Select a subject type",
  }),
  is_active: z.boolean(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;
