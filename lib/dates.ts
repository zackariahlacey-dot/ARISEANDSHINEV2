// Business-local date helpers.
//
// The DB stores blocked_dates / booking_date as plain YYYY-MM-DD DATE values
// — they're business-local dates, NOT UTC instants. On a server set to UTC
// (Vercel default) `toISOString().split("T")[0]` flips to tomorrow's date
// any time after ~7 PM Eastern, which silently breaks blocked-date checks
// and "next available" widgets — you blocked today, but the query filters
// today out because UTC says we're already on tomorrow.
//
// Use these helpers anywhere a JS Date needs to become a YYYY-MM-DD string
// that aligns with how the business stores and reasons about dates.

const BUSINESS_TZ = "America/New_York"; // Vermont = Eastern

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD for a given Date (or now), evaluated in the business timezone. */
export function ymdInBusinessTz(d: Date = new Date()): string {
  // en-CA locale renders as YYYY-MM-DD; the timeZone option does the shift.
  return ymdFormatter.format(d);
}

/** Today's YYYY-MM-DD in the business timezone. */
export function todayInBusinessTz(): string {
  return ymdInBusinessTz();
}
