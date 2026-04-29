import {
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MAX_WORDS,
  NAME_MAX_LENGTH,
  SIGNATURE_MAX_BYTES,
} from "./types";

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; status: number; message: string };
type Result<T> = Ok<T> | Err;

const SIGNATURE_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export const FEEDBACK_MAX_WORDS = 200;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateName(raw: unknown): Result<string> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, status: 400, message: "Name is required." };
  }
  if (raw.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `Name must be ${NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: raw.trim() };
}

export function validateSignature(raw: unknown): Result<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, status: 400, message: "Invalid signature." };
  }

  const bytes = new TextEncoder().encode(raw).byteLength;

  if (bytes > SIGNATURE_MAX_BYTES) {
    return { ok: false, status: 413, message: "Signature image is too large." };
  }

  if (!SIGNATURE_RE.test(raw)) {
    return { ok: false, status: 400, message: "Invalid signature format." };
  }

  return { ok: true, value: raw };
}

export function validateFeedback(raw: unknown): Result<string | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };

  if (typeof raw !== "string") {
    return { ok: false, status: 400, message: "Invalid feedback." };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) return { ok: true, value: null };

  if (trimmed.length > FEEDBACK_MAX_CHARS) {
    return { ok: false, status: 400, message: "Feedback is too long." };
  }

  const words = countWords(trimmed);

  if (words > FEEDBACK_MAX_WORDS) {
    return {
      ok: false,
      status: 400,
      message: `Feedback must be ${FEEDBACK_MAX_WORDS} words or fewer (yours: ${words} words).`,
    };
  }

  return { ok: true, value: trimmed };
}
