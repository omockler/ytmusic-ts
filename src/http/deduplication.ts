/** Deduplicates concurrent identical requests by sharing inflight promises. */
export class RequestDeduplicator {
  private inflight = new Map<string, Promise<Response>>();

  /** Returns a cache key for a request. */
  private key(url: string, body?: string): string {
    return body ? `${url}::${body}` : url;
  }

  /** Execute a request, deduplicating concurrent identical calls. */
  async execute(
    url: string,
    body: string | undefined,
    doFetch: () => Promise<Response>,
  ): Promise<Response> {
    const k = this.key(url, body);
    const existing = this.inflight.get(k);
    if (existing) {
      return existing.then((r) => r.clone());
    }

    const promise = doFetch().then(
      (response) => {
        this.inflight.delete(k);
        return response;
      },
      (error) => {
        this.inflight.delete(k);
        throw error;
      },
    );

    this.inflight.set(k, promise);
    return promise;
  }

  get size(): number {
    return this.inflight.size;
  }
}
