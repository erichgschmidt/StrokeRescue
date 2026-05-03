import {
  BBox,
  DEFAULT_WEIGHTS,
  DifferenceOptions,
  DifferenceResult,
  DifferenceWeights,
} from '../types/engineTypes';

/**
 * Compute a per-pixel difference score between two RGBA buffers.
 * Both buffers are assumed to be the same size and non-premultiplied.
 */
export function computeDifference(
  current: Uint8ClampedArray,
  reference: Uint8ClampedArray,
  width: number,
  height: number,
  opts: DifferenceOptions = {},
): DifferenceResult {
  const pixelCount = width * height;
  if (current.length !== pixelCount * 4 || reference.length !== pixelCount * 4) {
    throw new Error('computeDifference: buffer length does not match width*height*4');
  }

  const refHasAlpha = opts.forceEnableAlpha ?? hasNonOpaqueAlpha(reference);
  const weights: DifferenceWeights = {
    ...DEFAULT_WEIGHTS,
    ...(opts.weights ?? {}),
  };
  if (!refHasAlpha && opts.weights?.alphaWeight === undefined) {
    weights.alphaWeight = 0;
  }

  const scoreMap = new Uint8ClampedArray(pixelCount);
  // First pass: compute raw float scores and track max for normalization.
  const rawScores = new Float32Array(pixelCount);
  let maxScore = 0;
  let changedPixelCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    const dR = current[p] - reference[p];
    const dG = current[p + 1] - reference[p + 1];
    const dB = current[p + 2] - reference[p + 2];
    const dA = current[p + 3] - reference[p + 3];

    const adR = dR < 0 ? -dR : dR;
    const adG = dG < 0 ? -dG : dG;
    const adB = dB < 0 ? -dB : dB;
    const adA = dA < 0 ? -dA : dA;

    // Per PRD: deltaRGB is mean abs channel diff, normalized to 0..1.
    const deltaRGB = (adR + adG + adB) / (3 * 255);

    // BT.709 luma delta.
    const lumaDelta = 0.2126 * dR + 0.7152 * dG + 0.0722 * dB;
    const deltaLuma = (lumaDelta < 0 ? -lumaDelta : lumaDelta) / 255;

    // BT.709 chroma (Cb/Cr) distance — captures hue shifts independent of luma.
    const cbDelta = -0.1146 * dR - 0.3854 * dG + 0.5 * dB;
    const crDelta = 0.5 * dR - 0.4542 * dG - 0.0458 * dB;
    // Max plausible magnitude ≈ 255·sqrt(0.5²+0.5²) ≈ 180; normalize by 180.
    const deltaChroma = Math.min(1, Math.sqrt(cbDelta * cbDelta + crDelta * crDelta) / 180);

    const deltaAlpha = adA / 255;

    const score =
      weights.rgbWeight * deltaRGB +
      weights.lumaWeight * deltaLuma +
      weights.chromaWeight * deltaChroma +
      weights.alphaWeight * deltaAlpha;

    rawScores[i] = score;
    if (score > maxScore) maxScore = score;
    if (score > 0) {
      changedPixelCount++;
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Normalize to 0..255. If maxScore is 0, scoreMap is already all zero.
  if (maxScore > 0) {
    const inv = 255 / maxScore;
    for (let i = 0; i < pixelCount; i++) {
      scoreMap[i] = rawScores[i] * inv;
    }
  }

  const bbox: BBox | null =
    maxX >= 0
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : null;

  return { scoreMap, maxScore, changedPixelCount, bbox };
}

function hasNonOpaqueAlpha(buf: Uint8ClampedArray): boolean {
  for (let p = 3; p < buf.length; p += 4) {
    if (buf[p] !== 255) return true;
  }
  return false;
}
