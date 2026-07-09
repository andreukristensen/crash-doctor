import { APIConnectionError, APIError, InternalServerError, RateLimitError } from "@anthropic-ai/sdk";

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8_000;

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, maxAttempts: number, delayMs: number, error: unknown) => void;
  /** Injectable for tests so retry-delay logic doesn't actually sleep. */
  sleep?: (ms: number) => Promise<void>;
}

/** Thrown once retries are exhausted or the error isn't retryable - always has a clean, user-facing message. */
export class CrashDoctorApiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CrashDoctorApiError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof InternalServerError ||
    error instanceof APIConnectionError
  );
}

function describeApiError(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.status) {
      case 401:
        return "Anthropic API rejected the request: invalid or missing ANTHROPIC_API_KEY. Check .env.";
      case 429:
        return "Anthropic API rate limit hit and retries were exhausted. Wait a bit and try again.";
      default:
        return `Anthropic API error (${error.status ?? "connection failed"}): ${error.message}`;
    }
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries transient API failures (rate limits, 5xx, connection errors) with
 * exponential backoff + jitter; everything else - and exhausted retries -
 * surfaces as a single CrashDoctorApiError with a clean, user-facing message
 * instead of a raw SDK stack trace.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt >= maxRetries) {
        throw new CrashDoctorApiError(describeApiError(error), { cause: error });
      }

      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delayMs = Math.round(exponential / 2 + Math.random() * (exponential / 2));
      attempt += 1;
      options.onRetry?.(attempt, maxRetries + 1, delayMs, error);
      await sleep(delayMs);
    }
  }
}
