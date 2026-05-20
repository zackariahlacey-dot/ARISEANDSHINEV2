/**
 * Feature flag for the contractor system's customer-facing side effects.
 *
 * The contractor system is built end-to-end but the parts that send mail
 * to actual customers (e.g. the rating-request email + $15-coupon flow)
 * stay dormant until this flag is flipped on. Internal admin pages and
 * contractor dashboards still work — you can invite, onboard, assign,
 * and execute jobs through the system for testing purposes — but no
 * customer of a contractor-completed job receives the rating email
 * until the operator is ready.
 *
 * Why: auto-assign + photo enforcement etc. are internal. The rating
 * email is the one piece that hits a customer's inbox and is visibly
 * "new behavior." Until there's at least one contractor in production,
 * the operator wants this off.
 *
 * Set ENABLE_CONTRACTOR_CUSTOMER_EMAILS=true (env var) to turn it on.
 * That's the only switch — flip it and the rating emails start firing
 * for completed jobs going forward. Already-created rating rows from
 * test runs will start sending too, so clear them first if you want a
 * clean go-live.
 */

export function contractorCustomerEmailsEnabled(): boolean {
  const raw = process.env.ENABLE_CONTRACTOR_CUSTOMER_EMAILS ?? "";
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}
