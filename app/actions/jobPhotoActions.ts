"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expectedSlotsFor } from "@/lib/jobPhotos";

const BUCKET = "contractor-job-photos";

export type JobPhoto = {
  id: string;
  photoType: string;        // pre_existing_damage | before_<area> | after_<area>
  fileUrl: string;          // signed URL for display (5 min TTL)
  storagePath: string;      // raw storage path (admin uses for direct ops)
  uploadedAt: string;
};

/**
 * List photos for a booking. Contractor can see their own; admin can see
 * any. Returns signed URLs (5 min TTL) for inline display.
 */
export async function listJobPhotos(bookingId: string): Promise<JobPhoto[]> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Authorization: contractor must own the booking; admin can see any
  const { data: meRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = ((meRow as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const { data: bookingRow } = await admin
    .from("bookings")
    .select("assigned_to")
    .eq("id", bookingId)
    .maybeSingle();
  const isAssigned = !!bookingRow && (bookingRow as any).assigned_to === user.id;
  if (!isAdmin && !isAssigned) return [];

  const { data: rows } = await admin
    .from("contractor_job_photos")
    .select("id, photo_type, file_url, uploaded_at")
    .eq("booking_id", bookingId)
    .order("uploaded_at", { ascending: true });

  if (!rows || rows.length === 0) return [];

  // Sign each storage path
  const out: JobPhoto[] = [];
  for (const r of rows as any[]) {
    const path = r.file_url as string;
    let signedUrl = "";
    try {
      const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 300);
      signedUrl = signed?.signedUrl ?? "";
    } catch {}
    out.push({
      id: r.id,
      photoType: r.photo_type,
      fileUrl: signedUrl,
      storagePath: path,
      uploadedAt: r.uploaded_at,
    });
  }
  return out;
}

/**
 * Upload a job photo. Called from the contractor dashboard execution flow.
 * The file is sent as a base64 data URL to keep the server action simple;
 * for very large files we may want a direct-to-storage signed upload in
 * the future, but this works fine for phone-camera JPGs.
 */
export async function uploadJobPhoto({
  bookingId,
  photoType,
  dataUrl,
  gpsLat,
  gpsLng,
}: {
  bookingId: string;
  photoType: string;
  dataUrl: string;         // "data:image/jpeg;base64,..."
  gpsLat?: number;
  gpsLng?: number;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  // Verify the contractor owns this booking
  const { data: b } = await admin
    .from("bookings")
    .select("id, assigned_to, service_name")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return { ok: false, error: "Booking not found." };
  if ((b as any).assigned_to !== user.id) {
    return { ok: false, error: "This job is not assigned to you." };
  }

  // Validate photo type against the service's expected slots
  const expected = new Set(expectedSlotsFor((b as any).service_name as string));
  if (!expected.has(photoType as any)) {
    return { ok: false, error: `Photo type "${photoType}" is not required for this service.` };
  }

  // Decode data URL
  const match = /^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) return { ok: false, error: "Unsupported image format. Use JPEG / PNG / WebP." };
  const mime = match[1];
  const ext  = match[2].toLowerCase() === "jpg" ? "jpeg" : match[2].toLowerCase();
  const base64 = match[3];
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > 8 * 1024 * 1024) {
    return { ok: false, error: "Photo too large (max 8 MB)." };
  }

  // Storage path: bucket / contractorId / bookingId / photoType-timestamp.ext
  const ts = Date.now();
  const path = `${user.id}/${bookingId}/${photoType}-${ts}.${ext}`;

  const { error: uploadErr } = await admin
    .storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadErr) {
    console.error("[uploadJobPhoto] storage upload:", uploadErr);
    return { ok: false, error: uploadErr.message };
  }

  // If a photo of this type already exists, supersede it (delete the
  // old storage object so we don't accumulate stale "before" shots).
  const { data: existing } = await admin
    .from("contractor_job_photos")
    .select("id, file_url")
    .eq("booking_id", bookingId)
    .eq("photo_type", photoType);
  for (const old of (existing ?? []) as any[]) {
    try {
      await admin.storage.from(BUCKET).remove([old.file_url as string]);
      await admin.from("contractor_job_photos").delete().eq("id", old.id);
    } catch {}
  }

  // Insert row
  const { data: inserted, error: insertErr } = await admin
    .from("contractor_job_photos")
    .insert({
      booking_id:    bookingId,
      contractor_id: user.id,
      photo_type:    photoType,
      file_url:      path,
      gps_lat:       gpsLat ?? null,
      gps_lng:       gpsLng ?? null,
      device_taken_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[uploadJobPhoto] db insert:", insertErr);
    // Try to clean up the orphaned storage object
    try { await admin.storage.from(BUCKET).remove([path]); } catch {}
    return { ok: false, error: insertErr?.message ?? "Photo record could not be saved." };
  }

  return { ok: true, id: inserted.id };
}

/** Admin-only delete (used during photo review when a shot is unusable). */
export async function deleteJobPhoto(photoId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: meRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = ((meRow as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  if (!isAdmin) return { ok: false, error: "Admin only." };

  const { data: row } = await admin
    .from("contractor_job_photos")
    .select("id, booking_id, file_url")
    .eq("id", photoId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Photo not found." };

  try {
    await admin.storage.from(BUCKET).remove([(row as any).file_url as string]);
  } catch {}
  const { error } = await admin.from("contractor_job_photos").delete().eq("id", photoId);
  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "delete_job_photo",
    target_table: "contractor_job_photos",
    target_id: photoId,
    payload: { booking_id: (row as any).booking_id },
  });
  return { ok: true };
}
