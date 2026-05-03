import { describe, it, expect } from 'vitest';
import { growShrink, cleanup } from '../morphology';

function makeMask(w: number, h: number, on: Array<[number, number]>): Uint8ClampedArray {
  const m = new Uint8ClampedArray(w * h);
  for (const [x, y] of on) m[y * w + x] = 255;
  return m;
}

function countOn(m: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) if (m[i] >= 128) n++;
  return n;
}

describe('growShrink', () => {
  it('grow by 1 expands a single white pixel into a 3x3 block', () => {
    const w = 5, h = 5;
    const mask = makeMask(w, h, [[2, 2]]);
    const grown = growShrink(mask, w, h, 1);
    expect(countOn(grown)).toBe(9);
    // verify center and corners
    expect(grown[2 * w + 2]).toBe(255);
    expect(grown[1 * w + 1]).toBe(255);
    expect(grown[3 * w + 3]).toBe(255);
    // outside the 3x3 should still be 0
    expect(grown[0]).toBe(0);
  });

  it('shrink by 1 removes a 3x3 block down to a single pixel', () => {
    const w = 5, h = 5;
    const on: Array<[number, number]> = [];
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) on.push([x, y]);
    const mask = makeMask(w, h, on);
    const shrunk = growShrink(mask, w, h, -1);
    expect(countOn(shrunk)).toBe(1);
    expect(shrunk[2 * w + 2]).toBe(255);
  });

  it('zero pixels returns a copy unchanged', () => {
    const mask = makeMask(3, 3, [[1, 1]]);
    const out = growShrink(mask, 3, 3, 0);
    expect(Array.from(out)).toEqual(Array.from(mask));
    expect(out).not.toBe(mask);
  });
});

describe('cleanup', () => {
  it('removes a single isolated pixel', () => {
    const w = 7, h = 7;
    const mask = makeMask(w, h, [[3, 3]]);
    const out = cleanup(mask, w, h, 0.5);
    expect(countOn(out)).toBe(0);
  });

  it('amount=0 returns a copy unchanged', () => {
    const mask = makeMask(5, 5, [[2, 2]]);
    const out = cleanup(mask, 5, 5, 0);
    expect(Array.from(out)).toEqual(Array.from(mask));
  });
});
