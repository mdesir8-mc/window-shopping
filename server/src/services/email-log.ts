import { prisma } from "../lib/prisma";
import type { SendEmailResult } from "./email";

type RecordEmailLogInput = {
  userId?: string | null;
  type: string;
  recipient: string;
  subject: string;
  result?: SendEmailResult;
  error?: unknown;
};

/**
 * Persist one `EmailLog` row capturing the outcome of a `sendEmail` call. Maps a
 * `SendEmailResult` (or a caught error) to a status:
 *   - `"sent"`    — delivered; `providerId` carries the Resend message id
 *   - `"skipped"` — service inert (no API key / test); no provider id
 *   - `"failed"`  — send threw; `error` holds the reason
 *
 * Best-effort: a logging failure is swallowed so it can never break the caller's flow.
 */
export async function recordEmailLog({
  userId,
  type,
  recipient,
  subject,
  result,
  error
}: RecordEmailLogInput): Promise<void> {
  let status: string;
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  if (error !== undefined) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : String(error);
  } else if (result?.skipped) {
    status = "skipped";
  } else {
    status = "sent";
    providerId = result?.id ?? null;
  }

  try {
    await prisma.emailLog.create({
      data: { userId: userId ?? null, type, recipient, subject, providerId, status, error: errorMessage }
    });
  } catch (logError) {
    console.error(`[email-log] failed to record ${type} email for ${recipient}:`, logError);
  }
}
