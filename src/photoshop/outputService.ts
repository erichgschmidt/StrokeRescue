import { app, imaging, core } from "photoshop";
import { applyMaskToLayerInModal } from "./maskService";
import { readLayerPixelsInModal } from "./pixelService";

export type OutputMode = "masked" | "isolated";

export interface CommitBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CommitOptions {
  documentId: number;
  /** Source layer to duplicate / extract from. */
  sourceLayerId: number;
  /** Single-channel 0..255 mask sized to bounds.w x bounds.h */
  mask: Uint8ClampedArray;
  /** Canvas-space bounds of the mask buffer (matches snapshot.sourceBounds). */
  bounds: CommitBounds;
  mode: OutputMode;
  /** Name for the new layer. */
  layerName?: string;
}

function findLayer(documentId: number, layerId: number): any {
  const doc =
    app.documents?.find?.((d: any) => d.id === documentId) ?? app.activeDocument;
  if (!doc) throw new Error(`commitOutput: document ${documentId} not found`);
  const layer = doc.layers?.find?.((l: any) => l.id === layerId);
  if (!layer) throw new Error(`commitOutput: layer ${layerId} not found`);
  return layer;
}

/**
 * Materialize a mask preview as a new layer. Wrapped in a single
 * executeAsModal so it lands as one undo step. Original layer is untouched.
 */
export async function commitOutput(opts: CommitOptions): Promise<void> {
  const { documentId, sourceLayerId, mask, bounds, mode } = opts;
  const layerName =
    opts.layerName ?? (mode === "masked" ? "Stroke Rescue (masked)" : "Stroke Rescue (isolated)");

  await core.executeAsModal(
    async () => {
      const source = findLayer(documentId, sourceLayerId);
      const dup = await source.duplicate();
      if (dup && typeof dup === "object" && "name" in dup) {
        dup.name = layerName;
      }
      const dupId: number = dup?.id ?? source.id;

      if (mode === "masked") {
        await applyMaskToLayerInModal(documentId, dupId, mask, bounds);
        return;
      }

      // "isolated": multiply the duplicate's alpha by mask/255 and write back.
      const pixels = await readLayerPixelsInModal(documentId, dupId);
      const { width, height, components, data } = pixels;
      const maskW = bounds.right - bounds.left;
      const maskH = bounds.bottom - bounds.top;
      if (mask.length !== maskW * maskH) {
        throw new Error(
          `commitOutput: mask length ${mask.length} !== ${maskW}*${maskH}`,
        );
      }

      // pixels.sourceBounds may differ from the requested mask bounds (PS
      // returns the layer's tight bounds). Map mask coords -> pixel coords
      // by overlap rectangle.
      const pb = pixels.sourceBounds;
      const ox0 = Math.max(pb.left, bounds.left);
      const oy0 = Math.max(pb.top, bounds.top);
      const ox1 = Math.min(pb.right, bounds.right);
      const oy1 = Math.min(pb.bottom, bounds.bottom);

      if (components < 4) {
        throw new Error(
          `commitOutput: isolated mode requires RGBA (got ${components} components)`,
        );
      }

      for (let y = oy0; y < oy1; y++) {
        for (let x = ox0; x < ox1; x++) {
          const mi = (y - bounds.top) * maskW + (x - bounds.left);
          const pi = ((y - pb.top) * width + (x - pb.left)) * components + 3;
          data[pi] = Math.round((data[pi] * mask[mi]) / 255);
        }
      }

      // Zero alpha for any pixel rows/cols outside the mask rect.
      // (Only needed if the duplicate extends beyond the mask bounds.)
      if (
        pb.left < ox0 ||
        pb.top < oy0 ||
        pb.right > ox1 ||
        pb.bottom > oy1
      ) {
        for (let y = pb.top; y < pb.bottom; y++) {
          for (let x = pb.left; x < pb.right; x++) {
            if (x >= ox0 && x < ox1 && y >= oy0 && y < oy1) continue;
            const pi = ((y - pb.top) * width + (x - pb.left)) * components + 3;
            data[pi] = 0;
          }
        }
      }

      const imageData = await imaging.createImageDataFromBuffer(data, {
        width,
        height,
        components,
        colorSpace: "RGB",
        colorProfile: "sRGB IEC61966-2.1",
      });
      try {
        await imaging.putPixels({
          documentID: documentId,
          layerID: dupId,
          imageData,
          targetBounds: pb,
        });
      } finally {
        imageData.dispose?.();
      }
    },
    { commandName: "Stroke Rescue: commit output" },
  );
}
