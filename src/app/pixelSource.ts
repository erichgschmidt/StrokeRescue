import { getSnapshot } from "../snapshots/snapshotManager";
import {
  readLayerPixels,
  readMergedAtOrBelow,
  type LayerPixels,
} from "../photoshop/pixelService";
import type { AlignableBuffer } from "../snapshots/alignment";

export type PixelSource =
  | { kind: "snapshot"; id: string }
  | { kind: "layer"; documentId: number; layerId: number }
  | { kind: "merged-below"; documentId: number; layerId: number };

export interface ResolvedSource extends AlignableBuffer {
  /** The layer this source came from (for output target). null for snapshots
   * whose source layer is also recorded — set anyway. */
  layerId: number | null;
  documentId: number | null;
  label: string;
}

export function describeSource(src: PixelSource | null): string {
  if (!src) return "—";
  switch (src.kind) {
    case "snapshot": {
      const s = getSnapshot(src.id);
      return s ? `Snap: ${s.label}` : "Snap: (missing)";
    }
    case "layer":
      return `Layer #${src.layerId}`;
    case "merged-below":
      return `Merged ↓ #${src.layerId}`;
  }
}

export async function resolveSource(src: PixelSource): Promise<ResolvedSource> {
  switch (src.kind) {
    case "snapshot": {
      const s = getSnapshot(src.id);
      if (!s) throw new Error(`Snapshot ${src.id} no longer exists`);
      return {
        width: s.width,
        height: s.height,
        components: s.components,
        pixels: s.pixels,
        sourceBounds: s.sourceBounds,
        layerId: s.layerId,
        documentId: s.documentId,
        label: s.label ?? s.id,
      };
    }
    case "layer": {
      const p = await readLayerPixels(src.documentId, src.layerId);
      return wrap(p, src.layerId, src.documentId, `Layer #${src.layerId}`);
    }
    case "merged-below": {
      const p = await readMergedAtOrBelow(src.documentId, src.layerId);
      return wrap(p, src.layerId, src.documentId, `Merged ↓ #${src.layerId}`);
    }
  }
}

function wrap(
  p: LayerPixels,
  layerId: number,
  documentId: number,
  label: string,
): ResolvedSource {
  return {
    width: p.width,
    height: p.height,
    components: p.components,
    pixels: p.data,
    sourceBounds: p.sourceBounds,
    layerId,
    documentId,
    label,
  };
}
