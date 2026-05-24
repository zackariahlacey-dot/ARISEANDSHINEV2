"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result =
  | { success: true; alreadySubscribed: boolean }
  | { success: false; error: string };

export async function subscribeToNewsletter(input: {
  email: string;
  source?: string;
}): Promise<Result> {
  const email = (input.email ?? "").trim();
  if (!email) return { success: false, error: "Enter an email address." };
  if (!EMAIL_REGEX.test(email)) return { success: false, error: "That doesn't look like a valid email." };

  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent")?.slice(0, 500) ?? null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({
      email: email.toLowerCase(),
      source: input.source?.slice(0, 50) ?? "footer",
      user_agent: userAgent,
    });

  if (error) {
    // Unique violation = already subscribed. Treat as soft-success so
    // existing subscribers see the same confirmation, not an error.
    if (error.code === "23505") {
      return { success: true, alreadySubscribed: true };
    }
    console.error("[subscribeToNewsletter]", error);
    return { success: false, error: "Couldn't sign you up. Please try again." };
  }

  return { success: true, alreadySubscribed: false };
}
