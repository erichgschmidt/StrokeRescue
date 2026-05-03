/**
 * Minimal RGBA -> PNG encoder. Uses uncompressed (stored) deflate blocks so we
 * avoid pulling in a real compressor — fine for in-panel preview images that
 * top out at a few MB. Pure: no DOM, no Photoshop API.
 */

export function encodeRgbaToPng(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  if (rgba.length !== width * height * 4) {
    throw new Error(
      `encodeRgbaToPng: buffer length ${rgba.length} !== ${width}*${height}*4`,
    );
  }

  const rowSize = width * 4;
  const raw = new Uint8Array((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0; // filter type: None
    const srcStart = y * rowSize;
    raw.set(rgba.subarray(srcStart, srcStart + rowSize), y * (rowSize + 1) + 1);
  }

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = makeChunk("IHDR", buildIHDR(width, height));
  const idat = makeChunk("IDAT", wrapZlibStored(raw));
  const iend = makeChunk("IEND", new Uint8Array(0));
  return concat([sig, ihdr, idat, iend]);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  // btoa is available in UXP webview.
  // eslint-disable-next-line no-undef
  return (globalThis as any).btoa(s);
}

function buildIHDR(w: number, h: number): Uint8Array {
  const out = new Uint8Array(13);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  out[8] = 8; // bit depth
  out[9] = 6; // color type: RGBA
  out[10] = 0; // compression
  out[11] = 0; // filter
  out[12] = 0; // interlace
  return out;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  return out;
}

function wrapZlibStored(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])]; // zlib header
  const maxLen = 0xffff;
  if (data.length === 0) {
    parts.push(new Uint8Array([1, 0, 0, 0xff, 0xff]));
  } else {
    for (let i = 0; i < data.length; i += maxLen) {
      const len = Math.min(maxLen, data.length - i);
      const isLast = i + len >= data.length;
      const header = new Uint8Array(5);
      header[0] = isLast ? 1 : 0;
      header[1] = len & 0xff;
      header[2] = (len >> 8) & 0xff;
      header[3] = ~len & 0xff;
      header[4] = (~len >> 8) & 0xff;
      parts.push(header);
      parts.push(data.subarray(i, i + len));
    }
  }
  const adler = adler32(data);
  const adlerBytes = new Uint8Array(4);
  new DataView(adlerBytes.buffer).setUint32(0, adler);
  parts.push(adlerBytes);
  return concat(parts);
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function concat(arrs: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}
