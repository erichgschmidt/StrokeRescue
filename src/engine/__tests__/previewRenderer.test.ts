import { describe, expect, it } from 'vitest';
import { renderMaskPreview } from '../previewRenderer';

function makeAfter(width: number, height: number, rgb: [number, number, number]) {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    buf[p] = rgb[0];
    buf[p + 1] = rgb[1];
    buf[p + 2] = rgb[2];
    buf[p + 3] = 255;
  }
  return buf;
}

describe('renderMaskPreview', () => {
  it('throws when afterRGBA length is wrong', () => {
    const after = new Uint8ClampedArray(4 * 4 * 4 - 1);
    const mask = new Uint8ClampedArray(16);
    expect(() => renderMaskPreview(after, mask, 4, 4)).toThrow(/afterRGBA/);
  });

  it('throws when mask length is wrong', () => {
    const after = new Uint8ClampedArray(4 * 4 * 4);
    const mask = new Uint8ClampedArray(15);
    expect(() => renderMaskPreview(after, mask, 4, 4)).toThrow(/mask/);
  });

  it('mask=0 yields pure checker pattern at default tile size 8', () => {
    const w = 16;
    const h = 16;
    const after = makeAfter(w, h, [255, 0, 0]);
    const mask = new Uint8ClampedArray(w * h); // all 0
    const out = renderMaskPreview(after, mask, w, h);

    // (0,0) is in tile (0,0) -> light
    const p00 = 0;
    expect(out[p00]).toBe(220);
    expect(out[p00 + 1]).toBe(220);
    expect(out[p00 + 2]).toBe(220);
    expect(out[p00 + 3]).toBe(255);

    // (8,0) is in tile (1,0) -> dark
    const p80 = (0 * w + 8) * 4;
    expect(out[p80]).toBe(180);
    expect(out[p80 + 1]).toBe(180);
    expect(out[p80 + 2]).toBe(180);

    // (0,8) is in tile (0,1) -> dark
    const p08 = (8 * w + 0) * 4;
    expect(out[p08]).toBe(180);

    // (8,8) is in tile (1,1) -> light
    const p88 = (8 * w + 8) * 4;
    expect(out[p88]).toBe(220);
  });

  it('mask=255 yields exact after-image RGB with alpha forced to 255', () => {
    const w = 4;
    const h = 4;
    const after = makeAfter(w, h, [10, 100, 200]);
    const mask = new Uint8ClampedArray(w * h).fill(255);
    const out = renderMaskPreview(after, mask, w, h);
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      expect(out[p]).toBe(10);
      expect(out[p + 1]).toBe(100);
      expect(out[p + 2]).toBe(200);
      expect(out[p + 3]).toBe(255);
    }
  });

  it('mid-mask (128) blends roughly halfway between after and checker', () => {
    const w = 8;
    const h = 8;
    const after = makeAfter(w, h, [0, 0, 0]); // black
    const mask = new Uint8ClampedArray(w * h).fill(128);
    const out = renderMaskPreview(after, mask, w, h);

    // Light tile pixel (0,0): expected ~ light * (127/255) ≈ 109.6
    const p00 = 0;
    // black*0.502 + 220*0.498 ≈ 109.6
    expect(out[p00]).toBeGreaterThanOrEqual(108);
    expect(out[p00] as number).toBeLessThanOrEqual(112);
    expect(out[p00 + 3]).toBe(255);
  });

  it('default checker tile size is 8', () => {
    const w = 16;
    const h = 1;
    const after = makeAfter(w, h, [0, 0, 0]);
    const mask = new Uint8ClampedArray(w * h); // all 0
    const out = renderMaskPreview(after, mask, w, h);

    // Pixels 0..7 should all be light (220), pixel 8 should switch to dark (180).
    for (let x = 0; x < 8; x++) {
      expect(out[x * 4]).toBe(220);
    }
    for (let x = 8; x < 16; x++) {
      expect(out[x * 4]).toBe(180);
    }
  });

  it('respects custom checkerSize option', () => {
    const w = 8;
    const h = 1;
    const after = makeAfter(w, h, [0, 0, 0]);
    const mask = new Uint8ClampedArray(w * h);
    const out = renderMaskPreview(after, mask, w, h, { checkerSize: 2 });

    // Tile size 2: pixels 0,1 light; 2,3 dark; 4,5 light; 6,7 dark.
    expect(out[0]).toBe(220);
    expect(out[1 * 4]).toBe(220);
    expect(out[2 * 4]).toBe(180);
    expect(out[3 * 4]).toBe(180);
    expect(out[4 * 4]).toBe(220);
    expect(out[6 * 4]).toBe(180);
  });
});
