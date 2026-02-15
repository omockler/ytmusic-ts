/**
 * Compute SHA-1 hash of a string.
 * Uses Web Crypto API when available, falls back to pure-JS implementation.
 */
export async function sha1(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);

  try {
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    return bufferToHex(new Uint8Array(hashBuffer));
  } catch {
    return sha1Fallback(data);
  }
}

function bufferToHex(buffer: Uint8Array): string {
  const hexCodes: string[] = [];
  for (let i = 0; i < buffer.length; i++) {
    hexCodes.push(buffer[i].toString(16).padStart(2, "0"));
  }
  return hexCodes.join("");
}

/** Pure-JS SHA-1 fallback for environments without Web Crypto. */
function sha1Fallback(data: Uint8Array): string {
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;
  let h4 = 0xC3D2E1F0;

  const bitLength = data.length * 8;

  // Pre-processing: add padding
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  // Append original length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  const bitLengthHigh = Math.floor(data.length / 0x20000000);
  view.setUint32(paddedLength - 8, bitLengthHigh, false);
  view.setUint32(paddedLength - 4, bitLength, false);

  const w = new Int32Array(80);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getInt32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5A827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }

      const temp = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((v) => (v >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function rotl(value: number, count: number): number {
  return (value << count) | (value >>> (32 - count));
}
