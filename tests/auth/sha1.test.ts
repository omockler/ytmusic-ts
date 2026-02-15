import { sha1 } from "../../src/auth/sha1.js";

describe("sha1", () => {
  it("computes correct hash for empty string", async () => {
    const hash = await sha1("");
    expect(hash).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });

  it("computes correct hash for 'abc'", async () => {
    const hash = await sha1("abc");
    expect(hash).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("computes correct hash for longer string", async () => {
    const hash = await sha1("The quick brown fox jumps over the lazy dog");
    expect(hash).toBe("2fd4e1c67a2d28fced849ee1bb76e7391b93eb12");
  });

  it("computes correct hash for string with numbers", async () => {
    const hash = await sha1("1234567890");
    expect(hash).toBe("01b307acba4f54f55aafc33bb06bbbf6ca803e9a");
  });
});
