import { describe, it, expect } from 'vitest';
import { computeDifference } from '../differenceEngine';

function fillRGBA(w: number, h: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = a;
  }
  return buf;
}

describe('computeDifference', () => {
  it('returns all zeros for identical inputs', () => {
    const w = 4, h = 4;
    const a = fillRGBA(w, h, 100, 150, 200);
    const b = fillRGBA(w, h, 100, 150, 200);
    const result = computeDifference(a, b, w, h);
    expect(result.changedPixelCount).toBe(0);
    expect(result.bbox).toBeNull();
    expect(result.maxScore).toBe(0);
    expect(Array.from(result.scoreMap).every((v) => v === 0)).toBe(true);
  });

  it('detects a single-pixel difference with correct bbox', () => {
    const w = 5, h = 5;
    const a = fillRGBA(w, h, 0, 0, 0);
    const b = fillRGBA(w, h, 0, 0, 0);
    // change pixel at (2,3) -> index = (3*5 + 2) = 17
    const idx = (3 * w + 2) * 4;
    a[idx] = 255;
    a[idx + 1] = 255;
    a[idx + 2] = 255;
    const result = computeDifference(a, b, w, h);
    expect(result.changedPixelCount).toBe(1);
    expect(result.bbox).toEqual({ x: 2, y: 3, w: 1, h: 1 });
  });

  it('pure red vs pure green has high chroma but moderate luma', () => {
    const w = 2, h = 2;
    const red = fillRGBA(w, h, 255, 0, 0);
    const green = fillRGBA(w, h, 0, 255, 0);
    // Compare with chroma-only weights
    const chromaResult = computeDifference(red, green, w, h, {
      weights: { rgbWeight: 0, lumaWeight: 0, chromaWeight: 1, alphaWeight: 0 },
    });
    const lumaResult = computeDifference(red, green, w, h, {
      weights: { rgbWeight: 0, lumaWeight: 1, chromaWeight: 0, alphaWeight: 0 },
    });
    // Chroma score should exceed luma score for red->green.
    expect(chromaResult.maxScore).toBeGreaterThan(lumaResult.maxScore);
  });

  it('pure black vs pure white has high luma', () => {
    const w = 2, h = 2;
    const black = fillRGBA(w, h, 0, 0, 0);
    const white = fillRGBA(w, h, 255, 255, 255);
    const result = computeDifference(black, white, w, h, {
      weights: { rgbWeight: 0, lumaWeight: 1, chromaWeight: 0, alphaWeight: 0 },
    });
    // Luma delta is 1.0 (full range), so maxScore should be close to 1.
    expect(result.maxScore).toBeCloseTo(1, 5);
    expect(result.changedPixelCount).toBe(w * h);
  });

  it('alpha-only difference is ignored when alphaWeight=0', () => {
    const w = 3, h = 3;
    const a = fillRGBA(w, h, 100, 100, 100, 255);
    const b = fillRGBA(w, h, 100, 100, 100, 128);
    const result = computeDifference(a, b, w, h, {
      forceEnableAlpha: false,
      weights: { rgbWeight: 0.4, lumaWeight: 0.3, chromaWeight: 0.3, alphaWeight: 0 },
    });
    expect(result.changedPixelCount).toBe(0);
    expect(result.maxScore).toBe(0);
  });
});
