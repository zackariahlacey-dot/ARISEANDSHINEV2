import { LOGO_URL, FOOTER_LINKS, PHONE, PHONE_LINK } from "./Layout";

interface OtpEmailProps {
  otpCode: string;
}

export function getOtpEmailHtml({ otpCode }: OtpEmailProps) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background-color:#18181b;border:1px solid rgba(212,175,55,0.2);border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="Arise & Shine VT" width="80" style="display:block;margin-bottom:24px;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.02em;text-align:center;">
                Verification <span style="color:#d4af37;">Code</span>
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:20px 40px 40px 40px;text-align:center;">
              <p style="margin:0 0 24px 0;color:#a1a1aa;font-size:16px;line-height:1.6;">
                Use the following 6-digit code to verify your email and complete your Arise & Shine registration.
              </p>
              
              <!-- OTP Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="background-color:rgba(212,175,55,0.1);border:1px dashed rgba(212,175,55,0.4);border-radius:16px;padding:24px;display:inline-block;">
                      <span style="color:#d4af37;font-size:42px;font-weight:900;letter-spacing:12px;margin-left:12px;font-family:monospace;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin:32px 0 0 0;color:#71717a;font-size:14px;line-height:1.6;">
                This code will expire in 10 minutes. If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:40px;background-color:#09090b;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0 0 16px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">
                Stay Connected
              </p>
              <p style="margin:0;color:#52525b;font-size:13px;">
                ${FOOTER_LINKS}
              </p>
              <p style="margin:24px 0 0 0;color:#52525b;font-size:12px;">
                Questions? Call us at <a href="${PHONE_LINK}" style="color:#d4af37;text-decoration:none;font-weight:600;">${PHONE}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
