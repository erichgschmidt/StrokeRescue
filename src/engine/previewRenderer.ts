/**
 * Preview rendering: composite the "after" image over a transparency
 * checkerboard, using a single-channel mask as alpha. Pure buffer math —
 * no DOM, no Photoshop API.
 */

export interface PreviewOptions {
  /** Checker tile size in pixels. Default 8. */
  checkerSize?: number;
  /** Light checker color RGB. Default [220,220,220]. */
  checkerLight?: [number, number, number];
  /** Dark checker color RGB. Default [180,180,180]. */
  checkerDark?: [number, number, number];
}

const DEFAULT_CHECKER_SIZE = 8;
const DEFAULT_CHECKER_LIGHT: [number, number, number] = [220, 220, 220];
const DEFAULT_CHECKER_DARK: [number, number, number] = [180, 180, 180];

/**
 * Composite the "after" image over a transparency checkerboard, using the
 * single-channel mask as alpha. Returns an opaque RGBA buffer suitable for
 * drawing into a canvas via ImageData.
 *
 * - afterRGBA: length = width*height*4, non-premultiplied.
 * - mask: length = width*height, 0..255. 0 = fully transparent (show checker),
 *   255 = fully opaque (show after pixel).
 */
export function renderMaskPreview(
  afterRGBA: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  opts: PreviewOptions = {},
): Uint8ClampedArray {
  const pixelCount = width * height;
  if (afterRGBA.length !== pixelCount * 4) {
    throw new Error('renderMaskPreview: afterRGBA length does not match width*height*4');
  }
  if (mask.length !== pixelCount) {
    throw new Error('renderMaskPreview: mask length does not match width*height');
  }

  const tile = Math.max(1, Math.trunc(opts.checkerSize ?? DEFAULT_CHECKER_SIZE));
  const light = opts.checkerLight ?? DEFAULT_CHECKER_LIGHT;
  const dark = opts.checkerDark ?? DEFAULT_CHECKER_DARK;

  const out = new Uint8ClampedArray(pixelCount * 4);
  for (let y = 0; y < height; y++) {
    const tileY = (y / tile) | 0;
    for (let x = 0; x < width; x++) {
      const tileX = (x / tile) | 0;
      const isLight = ((tileX + tileY) & 1) === 0;
      const checker = isLight ? light : dark;

      const i = y * width + x;
      const p = i * 4;
      const a = mask[i] / 255;
      const inv = 1 - a;

      out[p] = afterRGBA[p] * a + checker[0] * inv;
      out[p + 1] = afterRGBA[p + 1] * a + checker[1] * inv;
      out[p + 2] = afterRGBA[p + 2] * a + checker[2] * inv;
      out[p + 3] = 255;
    }
  }
  return out;
}
