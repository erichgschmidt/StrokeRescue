import { describe, it, expect } from 'vitest';
import { applyThreshold } from '../maskRefinement';

describe('applyThreshold', () => {
  it('values well below threshold map to 0, well above map to 255', () => {
    const map = new Uint8ClampedArray([0, 50, 200, 255]);
    const out = applyThreshold(map, 0.5, 0, 0.1);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[3]).toBe(255);
  });

  it('higher contrast pushes mid values toward extremes', () => {
    const map = new Uint8ClampedArray([140]); // just above 0.5
    const low = applyThreshold(map, 0.5, 0, 0.5);
    const high = applyThreshold(map, 0.5, 1, 0.5);
    expect(high[0]).toBeGreaterThanOrEqual(low[0]);
  });

  it('softness=0 yields a near-hard step', () => {
    const map = new Uint8ClampedArray([127, 128, 129]);
    const out = applyThreshold(map, 0.5, 0, 0);
    expect(out[0]).toBe(0);
    expect(out[2]).toBe(255);
  });

  it('output length matches input length', () => {
    const map = new Uint8ClampedArray(16);
    const out = applyThreshold(map, 0.5, 0.5, 0.5);
    expect(out.length).toBe(16);
  });
});
