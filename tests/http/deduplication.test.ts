import { RequestDeduplicator } from "../../src/http/deduplication.js";

describe("RequestDeduplicator", () => {
  it("deduplicates concurrent identical requests", async () => {
    const dedup = new RequestDeduplicator();
    let callCount = 0;

    const doFetch = () => {
      callCount++;
      return Promise.resolve(new Response("ok"));
    };

    const [r1, r2] = await Promise.all([
      dedup.execute("url", "body", doFetch),
      dedup.execute("url", "body", doFetch),
    ]);

    expect(callCount).toBe(1);
    // Deduplicated responses are clones, not the same reference
    expect(r1).not.toBe(r2);
    expect(await r1.text()).toBe("ok");
    expect(await r2.text()).toBe("ok");
  });

  it("does not deduplicate different requests", async () => {
    const dedup = new RequestDeduplicator();
    let callCount = 0;

    const doFetch = () => {
      callCount++;
      return Promise.resolve(new Response("ok"));
    };

    await Promise.all([
      dedup.execute("url1", undefined, doFetch),
      dedup.execute("url2", undefined, doFetch),
    ]);

    expect(callCount).toBe(2);
  });

  it("cleans up after settlement", async () => {
    const dedup = new RequestDeduplicator();

    await dedup.execute("url", "body", () => Promise.resolve(new Response("ok")));

    expect(dedup.size).toBe(0);
  });

  it("cleans up after error", async () => {
    const dedup = new RequestDeduplicator();

    await expect(
      dedup.execute("url", "body", () => Promise.reject(new Error("fail"))),
    ).rejects.toThrow("fail");

    expect(dedup.size).toBe(0);
  });
});
