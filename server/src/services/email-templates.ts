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

export type PriceDropEntry = {
  brand: string;
  name: string;
  oldPrice: string;
  newPrice: string;
  url: string | null;
  closetName: string;
};

export type OutOfStockEntry = {
  brand: string;
  name: string;
  url: string | null;
  closetName: string;
};

type PriceDropEmailInput = {
  drops: PriceDropEntry[];
  outOfStock: OutOfStockEntry[];
  baseUrl: string;
};

function itemLabel(brand: string, name: string, url: string | null): string {
  const label = escapeHtml(`${brand} — ${name}`);
  return url ? `<a href="${escapeHtml(url)}" style="color:#111827;font-weight:600;">${label}</a>` : `<strong>${label}</strong>`;
}

/**
 * Digest emailed after a refresh run that found price drops and/or newly out-of-stock
 * items. Lists each change with a link back to the product, and a CTA into the in-app
 * price-drops view.
 */
export function priceDropEmail({ drops, outOfStock, baseUrl }: PriceDropEmailInput): RenderedEmail {
  const dropCount = drops.length;
  const oosCount = outOfStock.length;

  const subjectParts: string[] = [];
  if (dropCount > 0) subjectParts.push(`${dropCount} price drop${dropCount === 1 ? "" : "s"}`);
  if (oosCount > 0) subjectParts.push(`${oosCount} out of stock`);
  const subject = `Window Shopping: ${subjectParts.join(" · ")}`;

  const sections: string[] = [];
  if (dropCount > 0) {
    const rows = drops
      .map(
        (d) =>
          `<li style="margin-bottom:8px;">${itemLabel(d.brand, d.name, d.url)}<br/>` +
          `<span style="color:#6b7280;">${escapeHtml(d.closetName)} · ${escapeHtml(d.oldPrice)} → </span>` +
          `<span style="color:#15803d;font-weight:600;">${escapeHtml(d.newPrice)}</span></li>`
      )
      .join("");
    sections.push(`<p style="font-weight:600;margin:0 0 8px;">Price drops</p><ul style="padding-left:18px;margin:0 0 16px;">${rows}</ul>`);
  }
  if (oosCount > 0) {
    const rows = outOfStock
      .map(
        (o) =>
          `<li style="margin-bottom:8px;">${itemLabel(o.brand, o.name, o.url)}<br/>` +
          `<span style="color:#6b7280;">${escapeHtml(o.closetName)} · now out of stock</span></li>`
      )
      .join("");
    sections.push(`<p style="font-weight:600;margin:0 0 8px;">Out of stock</p><ul style="padding-left:18px;margin:0;">${rows}</ul>`);
  }

  const textLines = [BRAND.toUpperCase(), "", subjectParts.join(" · "), ""];
  if (dropCount > 0) {
    textLines.push("Price drops:");
    for (const d of drops) {
      textLines.push(`- ${d.brand} — ${d.name} (${d.closetName}): ${d.oldPrice} -> ${d.newPrice}${d.url ? ` ${d.url}` : ""}`);
    }
    textLines.push("");
  }
  if (oosCount > 0) {
    textLines.push("Out of stock:");
    for (const o of outOfStock) {
      textLines.push(`- ${o.brand} — ${o.name} (${o.closetName})${o.url ? ` ${o.url}` : ""}`);
    }
    textLines.push("");
  }
  textLines.push(`View your closet: ${baseUrl}/?priceDrops=true`);
  textLines.push("", `You're receiving this because you have a ${BRAND} account.`);

  return {
    subject,
    html: renderLayout({
      heading: "Updates from your closet",
      bodyHtml: sections.join(""),
      ctaLabel: "View your closet",
      ctaUrl: `${baseUrl}/?priceDrops=true`
    }),
    text: textLines.join("\n")
  };
}
