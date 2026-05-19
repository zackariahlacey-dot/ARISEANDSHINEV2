-- Track payment-confirmation email delivery on each booking so the Stripe
-- webhook can be truly idempotent on email state (not just booking state).
--
-- Before this column existed, a transient Resend failure on the first
-- webhook attempt would silently drop the email — and Stripe webhook
-- retries would no-op because the booking already had its
-- stripe_checkout_session_id set. Now the retry resends until the
-- timestamp is set.

alter table bookings
  add column if not exists payment_received_email_sent_at   timestamptz,
  add column if not exists payment_received_email_failed_at timestamptz,
  add column if not exists payment_received_email_last_error text;

create index if not exists idx_bookings_payment_email_pending
  on bookings (id)
  where stripe_checkout_session_id is not null
    and payment_received_email_sent_at is null;
