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
  status: z.enum(["confirmed", "completed", "cancelled", "no-show", "pending_payment"]),
  total_price: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),

  // ── Direct lead capture columns (source of truth) ───────────────────────
  // Stored at booking time — never changes even if profile is updated later.
  customer_name:   z.string().nullable().optional(),
  customer_email:  z.string().nullable().optional(),
  customer_phone:  z.string().nullable().optional(),
  service_address: z.string().nullable().optional(),
  vehicle_make:    z.string().nullable().optional(),
  vehicle_model:   z.string().nullable().optional(),
  vehicle_year:    z.string().nullable().optional(),
  vehicle_size:    z.string().nullable().optional(),
  service_name:    z.string().nullable().optional(),
  addons_json: z
    .array(z.object({ id: z.string(), label: z.string(), price: z.number() }))
    .nullable()
    .optional(),

  water_power: z.string().nullable().optional(),
  duration_override: z.number().nullable().optional(),

  additional_vehicles_json: z
    .array(z.object({
      vehicleSize:    z.string().optional(),
      vehicleYear:    z.string().optional(),
      vehicleMake:    z.string().optional(),
      vehicleModel:   z.string().optional(),
      serviceId:      z.string().optional(),
      serviceName:    z.string().optional(),
      servicePrice:   z.number().optional(),
      vehicleDbId:    z.string().optional(),
      selectedAddons: z.array(z.object({
        id:    z.string(),
        label: z.string(),
        price: z.number(),
      })).optional(),
    }))
    .nullable()
    .optional(),

  // ── Relationship joins (used for account linking badge + points display) ─
  profiles: AdminProfileSchema.nullable(),
  vehicles: AdminVehicleSchema.nullable(),
  services: z.object({ name: z.string() }).nullable(),
});

export type AdminBooking = z.infer<typeof AdminBookingSchema>;
export type AdminCustomer = z.infer<typeof AdminProfileSchema> & {
  reward_points: number;
  _booking_count?: number;
};
