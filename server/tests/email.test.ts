import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn()
}));

import { Resend } from "resend";
import { sendEmail, EmailSendError, getAppBaseUrl } from "../src/services/email";

const baseInput = {
  to: "me@example.com",
  subject: "hi",
  html: "<p>hi</p>",
  text: "hi"
};

describe("sendEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // restoreMocks (vitest config) wipes the factory implementation before each
    // test, so re-establish the Resend constructor → mocked client each time.
    vi.mocked(Resend).mockImplementation(() => ({ emails: { send } }) as unknown as Resend);
    send.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("skips and makes no network call when no API key is configured", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail(baseInput);

    expect(result).toEqual({ id: "noop", skipped: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("stays inert under NODE_ENV=test even with a key set", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Test <t@example.com>";

    const result = await sendEmail(baseInput);

    expect(result).toEqual({ id: "noop", skipped: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends through Resend with the configured sender when a key is set", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Test <t@example.com>";
    send.mockResolvedValueOnce({ data: { id: "email_123" }, error: null });

    const result = await sendEmail(baseInput);

    expect(result).toEqual({ id: "email_123", skipped: false });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Test <t@example.com>",
        to: "me@example.com",
        subject: "hi"
      })
    );
  });

  it("throws EmailSendError when the provider returns an error", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Test <t@example.com>";
    send.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "boom" } });

    await expect(sendEmail(baseInput)).rejects.toBeInstanceOf(EmailSendError);
  });

  it("throws EmailSendError when a key is set but EMAIL_FROM is missing", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_test_key";
    delete process.env.EMAIL_FROM;

    await expect(sendEmail(baseInput)).rejects.toBeInstanceOf(EmailSendError);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("getAppBaseUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers APP_BASE_URL, then FRONTEND_ORIGIN, then a local default", () => {
    process.env.APP_BASE_URL = "https://app.example.com";
    expect(getAppBaseUrl()).toBe("https://app.example.com");

    delete process.env.APP_BASE_URL;
    process.env.FRONTEND_ORIGIN = "https://prod.example.com";
    expect(getAppBaseUrl()).toBe("https://prod.example.com");

    delete process.env.FRONTEND_ORIGIN;
    expect(getAppBaseUrl()).toBe("http://localhost:5173");
  });
});
