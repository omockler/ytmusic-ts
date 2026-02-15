import { isRetryableStatus, computeBackoff } from "../../src/http/retry.js";

describe("isRetryableStatus", () => {
  it("returns true for 429", () => {
    expect(isRetryableStatus(429)).toBe(true);
  });

  it("returns true for 503", () => {
    expect(isRetryableStatus(503)).toBe(true);
  });

  it("returns false for 200", () => {
    expect(isRetryableStatus(200)).toBe(false);
  });

  it("returns false for 500", () => {
    expect(isRetryableStatus(500)).toBe(false);
  });

  it("returns false for 404", () => {
    expect(isRetryableStatus(404)).toBe(false);
  });
});

describe("computeBackoff", () => {
  it("returns a value greater than zero", () => {
    expect(computeBackoff(0)).toBeGreaterThan(0);
  });

  it("increases with attempt number", () => {
    // run multiple times to account for jitter
    const attempt0Values = Array.from({ length: 20 }, () => computeBackoff(0, 1000));
    const attempt2Values = Array.from({ length: 20 }, () => computeBackoff(2, 1000));
    const avgAttempt0 = attempt0Values.reduce((a, b) => a + b, 0) / attempt0Values.length;
    const avgAttempt2 = attempt2Values.reduce((a, b) => a + b, 0) / attempt2Values.length;
    expect(avgAttempt2).toBeGreaterThan(avgAttempt0);
  });

  it("respects custom baseDelay", () => {
    const val = computeBackoff(0, 100);
    // exponential part is 100 * 2^0 = 100, jitter is 0-100, so max is 200
    expect(val).toBeLessThanOrEqual(200);
    expect(val).toBeGreaterThanOrEqual(100);
  });
});
