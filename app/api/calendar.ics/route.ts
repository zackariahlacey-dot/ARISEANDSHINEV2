import { NextRequest, NextResponse } from "next/server";

// Stateless .ics generator. Booking-confirmation emails include a link here
// with all event data in the query string so the recipient can save the
// appointment to Apple Calendar / Outlook desktop / any .ics-aware client
// without exposing booking IDs or needing auth.
//
// Required params:
//   title    — event SUMMARY
//   start    — local YYYYMMDDTHHMMSS (no Z, treated as America/New_York)
//   end      — local YYYYMMDDTHHMMSS
// Optional:
//   location, details

export const dynamic = "force-dynamic";

const escapeIcs = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

function utcStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    p(date.getUTCMonth() + 1) +
    p(date.getUTCDate()) +
    "T" +
    p(date.getUTCHours()) +
    p(date.getUTCMinutes()) +
    p(date.getUTCSeconds()) +
    "Z"
  );
}

function isLocalTimestamp(s: string): boolean {
  return /^\d{8}T\d{6}$/.test(s);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const title    = sp.get("title")    ?? "Vermont Detailing Appointment";
  const start    = sp.get("start")    ?? "";
  const end      = sp.get("end")      ?? "";
  const location = sp.get("location") ?? "";
  const details  = sp.get("details")  ?? "";

  if (!isLocalTimestamp(start) || !isLocalTimestamp(end)) {
    return new NextResponse("invalid start/end", { status: 400 });
  }

  const uid = `${start}-${Math.random().toString(36).slice(2, 10)}@ariseandshinedetailing.com`;
  const dtstamp = utcStamp(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arise And Shine Detailing//Booking Confirmation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/New_York:${start}`,
    `DTEND;TZID=America/New_York:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    location ? `LOCATION:${escapeIcs(location)}` : "",
    details ? `DESCRIPTION:${escapeIcs(details)}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Detail appointment tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="arise-and-shine-vt.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
