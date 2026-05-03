/**
 * Simple binary-ish morphology on single-channel 0..255 masks.
 * Treats values >= 128 as "on" for structuring purposes.
 */

const ON = 128;

/**
 * Grow (dilate, positive pixels) or shrink (erode, negative pixels) the mask.
 * Uses a square box of radius |pixels|.
 */
export function growShrink(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  pixels: number,
): Uint8ClampedArray {
  if (pixels === 0) return new Uint8ClampedArray(mask);
  const radius = Math.abs(Math.trunc(pixels));
  return pixels > 0
    ? boxOp(mask, width, height, radius, /*dilate*/ true)
    : boxOp(mask, width, height, radius, /*dilate*/ false);
}

/**
 * Despeckle + fill-small-holes via open-then-close. Single 0..1 amount control.
 */
export function cleanup(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): Uint8ClampedArray {
  const a = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  if (a === 0) return new Uint8ClampedArray(mask);
  const r = Math.max(1, Math.round(a * 3));
  // Open: erode then dilate (removes small specks).
  const opened = boxOp(boxOp(mask, width, height, r, false), width, height, r, true);
  // Close: dilate then erode (fills small holes).
  const closed = boxOp(boxOp(opened, width, height, r, true), width, height, r, false);
  return closed;
}

function boxOp(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  dilate: boolean,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = dilate ? 0 : 255;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * width;
        for (let xx = x0; xx <= x1; xx++) {
          const v = src[row + xx];
          if (dilate) {
            if (v > acc) acc = v;
          } else {
            if (v < acc) acc = v;
          }
        }
      }
      out[y * width + x] = acc >= ON ? 255 : 0;
    }
  }
  return out;
}
