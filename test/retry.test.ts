import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APIConnectionError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { CrashDoctorApiError, withRetry } from "../src/agent/retry.js";

const noSleep = async () => {};

test("returns the result immediately on success, no retries", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return "ok";
  });

  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("retries a rate-limit error until it succeeds", async () => {
  let calls = 0;
  const retries: number[] = [];

  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new RateLimitError(429, {}, "rate limited", undefined, "rate_limit_error");
      return "ok";
    },
    { sleep: noSleep, onRetry: (attempt) => retries.push(attempt) },
  );

  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(retries, [1, 2]);
});

test("retries a connection error and a 5xx error, both count as transient", async () => {
  let calls = 0;
  const errors = [
    new APIConnectionError({ message: "network blip" }),
    new InternalServerError(500, {}, "server hiccup", undefined, "api_error"),
  ];

  const result = await withRetry(
    async () => {
      const error = errors[calls];
      calls += 1;
      if (error) throw error;
      return "ok";
    },
    { sleep: noSleep },
  );

  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("throws a clean CrashDoctorApiError once retries are exhausted", async () => {
  const attempts: number[] = [];

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          throw new RateLimitError(429, {}, "still rate limited", undefined, "rate_limit_error");
        },
        { maxRetries: 2, sleep: noSleep, onRetry: (attempt) => attempts.push(attempt) },
      ),
    (error: unknown) => {
      assert.ok(error instanceof CrashDoctorApiError);
      assert.match(error.message, /rate limit/i);
      return true;
    },
  );

  // maxRetries: 2 means 3 total attempts, so exactly 2 retry callbacks.
  assert.deepEqual(attempts, [1, 2]);
});

test("does not retry a non-transient error like a bad API key", async () => {
  let calls = 0;
  let retried = false;

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new AuthenticationError(401, {}, "invalid api key", undefined, "authentication_error");
        },
        { sleep: noSleep, onRetry: () => (retried = true) },
      ),
    (error: unknown) => {
      assert.ok(error instanceof CrashDoctorApiError);
      assert.match(error.message, /ANTHROPIC_API_KEY/);
      return true;
    },
  );

  assert.equal(calls, 1);
  assert.equal(retried, false);
});

test("does not retry a plain, non-SDK error either", async () => {
  let calls = 0;

  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error("something unrelated broke");
        },
        { sleep: noSleep },
      ),
    (error: unknown) => {
      assert.ok(error instanceof CrashDoctorApiError);
      assert.equal(error.message, "something unrelated broke");
      return true;
    },
  );

  assert.equal(calls, 1);
});
