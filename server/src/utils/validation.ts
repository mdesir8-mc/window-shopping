import { HttpError } from "./http";

export function requireString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

// Minimal email shape check: a single @ with non-empty, dot-bearing domain. Not RFC-exact
// (deliverability is verified out of band), just enough to reject obviously bad addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value: unknown, fieldName: string) {
  const email = requireString(value, fieldName);

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, `${fieldName} must be a valid email address.`);
  }

  return email;
}

export function optionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Expected a string value.");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function optionalStringArray(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} must be an array of strings.`);
  }

  const cleaned = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new HttpError(400, `${fieldName} must be an array of strings.`);
    }

    return entry.trim();
  }).filter(Boolean);

  return Array.from(new Set(cleaned));
}

export function optionalBoolean(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new HttpError(400, `${fieldName} must be a boolean.`);
  }

  return value;
}

export function optionalNullableBoolean(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return optionalBoolean(value, fieldName);
}

export function optionalInteger(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, `${fieldName} must be an integer.`);
  }

  return value;
}
