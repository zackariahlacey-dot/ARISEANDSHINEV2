const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generates a random, uppercase 6-character alphanumeric referral code
 * (e.g. 'A8X92M').
 */
export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return code;
}
