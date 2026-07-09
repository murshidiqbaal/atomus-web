import { z } from "zod";

export const teacherSchema = z.object({
  full_name:        z.string().min(2, "At least 2 characters").max(120),
  email:            z.string().email("Invalid email"),
  phone_number:     z.string().min(7, "Enter a valid phone").max(20),
  qualification:    z.string().min(2, "Required").max(120),
  campus_ids:       z.array(z.string().uuid()).min(1, "Select at least one campus"),
  campus_id:        z.string().uuid().optional(),
  gender:           z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  address:          z.string().max(255).optional().or(z.literal("")),
  experience_years: z.number().int().min(0).max(70).optional(),
  subject_specialization: z.string().max(120).optional().or(z.literal("")),
  account_status:   z.enum(["Active", "Pending", "Disabled"]),
  course_ids:       z.array(z.string().uuid()),
  subject_ids:      z.array(z.string().uuid()),
  batch_ids:        z.array(z.string().uuid()),
  password:         z.string().optional().or(z.literal("")),
});

export type TeacherFormValues = z.infer<typeof teacherSchema>;
