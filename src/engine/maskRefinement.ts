/**
 * Mask refinement: threshold + smoothstep softness + contrast curve.
 * All inputs are pure math; no DOM / no Photoshop calls.
 */

/**
 * Apply a threshold with smoothstep softness and a contrast curve.
 * @param scoreMap single-channel 0..255 input
 * @param threshold 0..1, fractional cutoff in normalized score space
 * @param contrast 0..1, 0 = linear, 1 = hard step around 0.5
 * @param softness 0..1, transition width around the threshold
 */
export function applyThreshold(
  scoreMap: Uint8ClampedArray,
  threshold: number,
  contrast: number,
  softness: number,
): Uint8ClampedArray {
  const t = clamp01(threshold);
  const c = clamp01(contrast);
  const s = clamp01(softness);
  const halfWidth = Math.max(1e-4, s * 0.5);
  const lo = t - halfWidth;
  const hi = t + halfWidth;

  const out = new Uint8ClampedArray(scoreMap.length);
  for (let i = 0; i < scoreMap.length; i++) {
    const v = scoreMap[i] / 255;
    let m: number;
    if (v <= lo) {
      m = 0;
    } else if (v >= hi) {
      m = 1;
    } else {
      const x = (v - lo) / (hi - lo);
      m = x * x * (3 - 2 * x); // smoothstep
    }
    m = applyContrast(m, c);
    out[i] = Math.round(m * 255);
  }
  return out;
}

function applyContrast(v: number, contrast: number): number {
  if (contrast <= 0) return v;
  // Map contrast 0..1 -> exponent steepness. 1 ~= near-binary step.
  const k = 1 + contrast * 19; // 1..20
  // Sigmoid centered at 0.5.
  const x = (v - 0.5) * k;
  const sig = 1 / (1 + Math.exp(-x));
  // Re-anchor endpoints to 0..1 so contrast=0 path is identity-ish.
  const sig0 = 1 / (1 + Math.exp(0.5 * k));
  const sig1 = 1 / (1 + Math.exp(-0.5 * k));
  return clamp01((sig - sig0) / (sig1 - sig0));
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
