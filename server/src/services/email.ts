import { Resend } from "resend";

export class EmailSendError extends Error {}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | string[];
};

export type SendEmailResult =
  | { id: string; skipped: false }
  | { id: "noop"; skipped: true };

let client: Resend | null = null;

function getClient(apiKey: string): Resend {
  if (!client) {
    client = new Resend(apiKey);
  }

  return client;
}

/**
 * Send a transactional email through Resend.
 *
 * The service degrades safely: under tests or when `RESEND_API_KEY` is unset it
 * logs a one-line summary and returns `{ skipped: true }` without making a network
 * call, so callers (price-drop notifications, password reset) can run unconfigured
 * in dev and CI without special-casing. A configured send that the provider rejects
 * throws `EmailSendError` so a failed notification can be caught without being
 * treated as a fatal request error.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (process.env.NODE_ENV === "test" || !apiKey) {
    console.log(`[email] would send "${input.subject}" to ${toLabel(input.to)}`);
    return { id: "noop", skipped: true };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new EmailSendError("EMAIL_FROM is not set; cannot send email.");
  }

  const { data, error } = await getClient(apiKey).emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {})
  });

  if (error || !data) {
    const reason = error?.message ?? "unknown error";
    console.error(`[email] send failed for "${input.subject}": ${reason}`);
    throw new EmailSendError(reason);
  }

  return { id: data.id, skipped: false };
}

/**
 * Base URL used to build links inside emails (password reset, item pages). Prefers
 * APP_BASE_URL, then the configured production frontend origin, then a local default.
 */
export function getAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173"
  );
}

function toLabel(to: string | string[]): string {
  return Array.isArray(to) ? to.join(", ") : to;
}
