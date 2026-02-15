/** Returns true for HTTP status codes that should be retried. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

/** Computes exponential backoff delay with jitter. */
export function computeBackoff(attempt: number, baseDelay = 1000): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return exponential + jitter;
}
