import { z } from "zod";

export const AdminVehicleSchema = z.object({
  id: z.string().uuid(),
  make: z.string(),
  model: z.string(),
  year: z.number().nullable(),
  size: z.enum(['small', 'medium', 'large', 'extra_large']).nullable(),
});

export const AdminProfileSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  phone: z.string().nullable(),
  reward_points: z.number().default(0),
});

export const AdminBookingSchema = z.object({
  id: z.string().uuid(),
  booking_date: z.string(),
  booking_time: z.string(),
  status: z.enum(["confirmed", "completed", "cancelled", "no-show"]),
  total_price: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
  // Relationship Mappings
  profiles: AdminProfileSchema.nullable(),
  vehicles: AdminVehicleSchema.nullable(),
  services: z.object({ name: z.string() }).nullable(),
});

export type AdminBooking = z.infer<typeof AdminBookingSchema>;
export type AdminCustomer = z.infer<typeof AdminProfileSchema> & {
  reward_points: number;
  _booking_count?: number;
};
