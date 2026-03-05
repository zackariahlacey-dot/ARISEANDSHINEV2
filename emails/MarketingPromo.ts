/**
 * Marketing / promo email template using the shared Layout.
 */

import { getEmailLayoutHtml } from "./Layout";

export type MarketingPromoOptions = {
  title?: string;
  headline: string;
  bodyHtml: string;
  buttonLabel: string;
  buttonUrl: string;
};

export function getMarketingPromoHtml(options: MarketingPromoOptions): string {
  return getEmailLayoutHtml({
    title: options.title,
    headline: options.headline,
    bodyHtml: options.bodyHtml,
    primaryButton: {
      label: options.buttonLabel,
      url: options.buttonUrl,
    },
  });
}
