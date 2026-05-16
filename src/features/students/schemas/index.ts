import { z } from "zod";

export const studentSchema = z.object({
  full_name:       z.string().min(2, "At least 2 characters").max(100),
  roll_number:     z.string().min(1, "Required").max(30),
  gender:          z.enum(["Male", "Female", "Other"], { error: "Select gender" }),
  dob:             z.string().optional(),
  campus_id:       z.string().min(1, "Select a campus"),
  course_id:       z.string().min(1, "Select a course"),
  batch_id:        z.string().min(1, "Select a batch"),
  joining_date:    z.string().min(1, "Required"),
  academic_status: z.enum(["Active", "Inactive", "Graduated", "Dropped"], { error: "Select status" }),
  phone_number:    z.string().optional(),
  email:           z.string().email("Invalid email").optional().or(z.literal("")),
  address:         z.string().optional(),
  parent_name:     z.string().optional(),
  parent_email:    z.string().email("Invalid parent email").optional().or(z.literal("")),
  parent_phone:    z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
