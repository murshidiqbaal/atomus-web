import { z } from "zod";

export const parentSchema = z.object({
  full_name:      z.string().min(2, "At least 2 characters").max(100),
  email:          z.string().email("Invalid email"),
  phone_number:   z.string().min(7, "Enter a valid phone number").max(20),
  account_status: z.enum(["Active", "Pending", "Disabled"]),
  student_ids:    z.array(z.string().uuid()),
  password:       z.string().optional(),
});

export type ParentFormValues = z.infer<typeof parentSchema>;

export const linkStudentsSchema = z.object({
  parent_id:   z.string().uuid(),
  student_ids: z.array(z.string().uuid()).min(1, "Select at least one student"),
});

export type LinkStudentsValues = z.infer<typeof linkStudentsSchema>;
