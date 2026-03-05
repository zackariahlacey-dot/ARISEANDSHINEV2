/**
 * Reminder email template (e.g. appointment reminder) using the shared Layout.
 */

import { getEmailLayoutHtml } from "./Layout";

export type ReminderOptions = {
  title?: string;
  headline: string;
  bodyHtml: string;
  primaryButton?: {
    label: string;
    url: string;
  };
};

export function getReminderHtml(options: ReminderOptions): string {
  return getEmailLayoutHtml({
    title: options.title,
    headline: options.headline,
    bodyHtml: options.bodyHtml,
    primaryButton: options.primaryButton,
  });
}
