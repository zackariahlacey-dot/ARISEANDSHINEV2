"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOtpEmailHtml } from "@/emails/OtpEmail";
import { sendAdminNewUserAlert } from "./sendAdminNewUserAlert";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Arise & Shine VT <bookings@ariseandshinevt.com>";

/**
 * Step 1: Generate and send a 6-digit OTP via Resend.
 * We store the OTP in user_metadata temporarily or just use it for the flow.
 * Actually, for a stateless flow, we'll use a short-lived table or just Resend.
 * Since we can't easily create a table, we'll use Supabase's built-in OTP if possible,
 * but the user wants custom emails.
 * 
 * Strategy: We'll use a dedicated 'otps' table if it exists, or create a simple one.
 * Given I can't run migrations easily, I'll use a more creative approach:
 * Use Supabase's `signInWithOtp` which handles the storage/verification,
 * but we'll use a custom email hook if available. 
 * Wait, I can't use a custom hook without Supabase dashboard.
 * 
 * Final Strategy for "Future Proof & Convenient":
 * 1. Generate a 6-digit code.
 * 2. Store it in a new 'otp_codes' table (I'll try to create it via RPC or just use it).
 * 3. Send via Resend.
 */

export async function checkUserExists(email: string) {
  const supabase = createAdminClient();
  const emailLower = email.toLowerCase().trim();

  // Use paginated search — avoids fetching all users
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    console.error("[checkUserExists] Error:", error);
    return { exists: false };
  }

  const authUser = data.users.find(u => u.email?.toLowerCase() === emailLower);
  return { exists: !!authUser };
}

export async function sendOtpAction(email: string) {
  const supabase = createAdminClient();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).getTime(); // 10 mins as number
  
  const emailLower = email.toLowerCase().trim();

  // 1. Store OTP in settings table
  const otpData = { email: emailLower, otp: otpCode, expiresAt };
  const { error: storeError } = await supabase
    .from("settings")
    .upsert({ 
      key: `otp_${emailLower}`, 
      value: otpData 
    });

  if (storeError) {
    console.error("[sendOtpAction] Store error:", storeError);
    return { success: false, error: storeError.message || "Verification system busy." };
  }

  // 2. Send via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = getOtpEmailHtml({ otpCode });

  const { error: emailError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email.trim(),
    subject: `${otpCode} is your Arise & Shine verification code`,
    html,
  });

  if (emailError) {
    console.error("[sendOtpAction] Email error:", emailError);
    return { success: false, error: "Failed to send email." };
  }

  return { success: true };
}

export async function verifyOtpAction(email: string, code: string) {
  const supabase = createAdminClient();
  const emailLower = email.toLowerCase().trim();
  
  const { data: setting, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", `otp_${emailLower}`)
    .single();

  if (error || !setting) {
    return { success: false, error: "Verification code expired or not found." };
  }

  try {
    const { email: storedEmail, otp: storedCode, expiresAt } = setting.value as any;
    
    if (storedEmail !== emailLower) return { success: false, error: "Email mismatch." };
    if (Date.now() > expiresAt) return { success: false, error: "Code expired." };
    if (storedCode !== code.trim()) return { success: false, error: "Invalid code." };

    return { success: true };
  } catch (e) {
    return { success: false, error: "Verification system error." };
  }
}

export async function completeSignupAction(payload: {
  email: string;
  code: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const supabase = createAdminClient();
  const { email, code, password, firstName, lastName } = payload;

  // 1. Final verification of OTP
  const verifyRes = await verifyOtpAction(email, code);
  if (!verifyRes.success) return { ...verifyRes };

  try {
    // 2. Create Auth User
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }
    });

    if (createError) {
      if (createError.message.includes("already registered")) {
        return { success: false, error: "This email is already registered. Please sign in." };
      }
      throw createError;
    }

    if (!userData.user) throw new Error("User creation failed.");

    // 3. Ensure profile has first/last name (DB trigger handle_new_user creates the row)
    await supabase
      .from("profiles")
      .upsert({ id: userData.user.id, first_name: firstName.trim(), last_name: lastName.trim() }, { onConflict: "id" });

    // 4. Cleanup OTP
    await supabase.from("settings").delete().eq("key", `otp_${email.toLowerCase().trim()}`);

    // 5. Alert Admin
    const fullName = `${firstName} ${lastName}`.trim();
    await sendAdminNewUserAlert(fullName, email);

    return { success: true };
  } catch (err: any) {
    console.error("[completeSignupAction] Error:", err);
    return { success: false, error: err.message || "Signup failed." };
  }
}
