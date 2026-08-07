import { Resend } from "resend";

/**
 * Global kill switch. All customer-facing operations are shut down,
 * so every email send is short-circuited at the transport layer.
 * Set to false to restore email delivery.
 */
export const EMAILS_ENABLED = false;

type NoopSendResult = { data: null; error: null };

const NOOP_RESULT: NoopSendResult = { data: null, error: null };

/**
 * Returns a Resend-compatible client. When EMAILS_ENABLED is false,
 * returns a stub whose emails.send / batch.send calls resolve
 * immediately without contacting the API. Call sites continue to work
 * unchanged.
 */
export function createResend(): Resend {
  if (EMAILS_ENABLED) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  const noop = async (): Promise<NoopSendResult> => NOOP_RESULT;
  const stub = {
    emails: { send: noop, create: noop },
    batch:  { send: noop, create: noop },
  } as unknown as Resend;
  return stub;
}
