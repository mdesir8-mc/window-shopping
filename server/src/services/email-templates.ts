/**
 * Email templates. Each template is a plain function returning the pieces `sendEmail`
 * needs: `{ subject, html, text }`. Transactional email clients strip <style> blocks,
 * so all HTML styling is inlined via `renderLayout`.
 *
 * This module ships one generic template (`simpleNotice`) as the shape to copy. The
 * feature-specific templates (price-drop, password reset) land with their own todos.
 */

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type LayoutInput = {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const BRAND = "Window Shopping";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wrap body HTML in the shared branded layout. `bodyHtml` is treated as trusted markup
 * the caller has already assembled (and escaped where needed).
 */
export function renderLayout({ heading, bodyHtml, ctaLabel, ctaUrl }: LayoutInput): string {
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 0 24px;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
            <tr><td style="font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;padding-bottom:16px;">${escapeHtml(BRAND)}</td></tr>
            <tr><td style="font-size:20px;font-weight:700;padding-bottom:12px;">${escapeHtml(heading)}</td></tr>
            <tr><td style="font-size:15px;line-height:1.6;color:#374151;padding-bottom:16px;">${bodyHtml}</td></tr>
            ${cta}
            <tr><td style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">You're receiving this because you have a ${escapeHtml(BRAND)} account.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderLayoutText({ heading, message, ctaLabel, ctaUrl }: { heading: string; message: string; ctaLabel?: string; ctaUrl?: string }): string {
  const lines = [BRAND.toUpperCase(), "", heading, "", message];
  if (ctaLabel && ctaUrl) {
    lines.push("", `${ctaLabel}: ${ctaUrl}`);
  }
  lines.push("", `You're receiving this because you have a ${BRAND} account.`);
  return lines.join("\n");
}

type SimpleNoticeInput = {
  subject: string;
  heading: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/**
 * A generic single-message notice with an optional call-to-action button. Serves as the
 * reference template for feature-specific emails to copy.
 */
export function simpleNotice({ subject, heading, message, ctaLabel, ctaUrl }: SimpleNoticeInput): RenderedEmail {
  return {
    subject,
    html: renderLayout({
      heading,
      bodyHtml: escapeHtml(message),
      ctaLabel,
      ctaUrl
    }),
    text: renderLayoutText({ heading, message, ctaLabel, ctaUrl })
  };
}

/**
 * Password reset email. `resetUrl` is the one-time link the recipient follows to choose a
 * new password.
 */
export function passwordResetEmail(resetUrl: string): RenderedEmail {
  return simpleNotice({
    subject: "Reset your Window Shopping password",
    heading: "Reset your password",
    message:
      "We received a request to reset your password. Tap the button below to choose a new one. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl
  });
}
