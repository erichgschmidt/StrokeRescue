export interface AlignedPair {
  width: number;
  height: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  /** RGBA, length = width*height*4. Same components count enforced. */
  a: Uint8ClampedArray;
  b: Uint8ClampedArray;
}

export interface AlignableBuffer {
  width: number;
  height: number;
  components: number;
  pixels: Uint8Array | Uint8ClampedArray;
  sourceBounds: { left: number; top: number; right: number; bottom: number };
}

/**
 * Paint two pixel buffers into a shared RGBA buffer at the union of their
 * bounds. Pixels outside a buffer's own bounds are zeroed (transparent black)
 * so they don't get treated as "changed" — alpha=0 vs alpha=0 is no diff.
 */
export function alignBuffers(a: AlignableBuffer, b: AlignableBuffer): AlignedPair {
  if (a.components !== b.components) {
    throw new Error(
      `alignBuffers: component mismatch (${a.components} vs ${b.components})`,
    );
  }
  if (a.components !== 4) {
    throw new Error(
      `alignBuffers: expected RGBA buffers (got ${a.components} components)`,
    );
  }

  const left = Math.min(a.sourceBounds.left, b.sourceBounds.left);
  const top = Math.min(a.sourceBounds.top, b.sourceBounds.top);
  const right = Math.max(a.sourceBounds.right, b.sourceBounds.right);
  const bottom = Math.max(a.sourceBounds.bottom, b.sourceBounds.bottom);
  const width = right - left;
  const height = bottom - top;

  return {
    width,
    height,
    bounds: { left, top, right, bottom },
    a: paintInto(a, left, top, width, height),
    b: paintInto(b, left, top, width, height),
  };
}

/** Back-compat alias. */
export const alignSnapshots = alignBuffers;

function paintInto(
  buf: AlignableBuffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const sb = buf.sourceBounds;
  const sw = buf.width;
  const offX = sb.left - left;
  const offY = sb.top - top;
  for (let y = 0; y < buf.height; y++) {
    const dstRow = (offY + y) * width + offX;
    const srcRow = y * sw;
    for (let x = 0; x < sw; x++) {
      const di = (dstRow + x) * 4;
      const si = (srcRow + x) * 4;
      out[di] = buf.pixels[si];
      out[di + 1] = buf.pixels[si + 1];
      out[di + 2] = buf.pixels[si + 2];
      out[di + 3] = buf.pixels[si + 3];
    }
  }
  return out;
}
