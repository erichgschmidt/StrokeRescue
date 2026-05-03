import { imaging, core, action } from "photoshop";

export interface MaskBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Inner helper: writes a single-channel 0..255 mask as the layer's pixel mask.
 * Does NOT wrap in executeAsModal — caller is responsible. Use this when the
 * caller is already inside a modal scope (e.g., outputService.commitOutput).
 */
export async function applyMaskToLayerInModal(
  documentId: number,
  layerId: number,
  mask: Uint8ClampedArray,
  bounds: MaskBounds,
): Promise<void> {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (mask.length !== width * height) {
    throw new Error(
      `applyMaskToLayer: mask length ${mask.length} !== ${width}*${height}`,
    );
  }

  // Imaging API expects a Uint8Array view; reuse underlying buffer.
  const buffer = new Uint8Array(mask.buffer, mask.byteOffset, mask.byteLength);
  const imageData = await imaging.createImageDataFromBuffer(buffer, {
    width,
    height,
    components: 1,
    colorSpace: "Grayscale",
  });

  try {
    // Preferred path: imaging.putLayerMask writes directly into the layer's
    // pixel mask, creating one if it doesn't already exist.
    // Fallback if this name is wrong on the host: a batchPlay `set` against
    // the layer's mask channel ("channel" -> "mask") with a pixel descriptor.
    if (typeof imaging.putLayerMask === "function") {
      await imaging.putLayerMask({
        documentID: documentId,
        layerID: layerId,
        imageData,
        targetBounds: bounds,
      });
    } else {
      await ensureLayerMask(documentId, layerId);
      // Some UXP builds accept a `channel: "mask"` arg on putPixels.
      await imaging.putPixels({
        documentID: documentId,
        layerID: layerId,
        imageData,
        targetBounds: bounds,
        channel: "mask",
      });
    }
  } finally {
    imageData.dispose?.();
  }
}

/**
 * Apply a single-channel 0..255 mask as the layer's pixel mask, at the given
 * canvas bounds. Replaces any existing mask. Public, modal-wrapped entry.
 */
export async function applyMaskToLayer(
  documentId: number,
  layerId: number,
  mask: Uint8ClampedArray,
  bounds: MaskBounds,
): Promise<void> {
  await core.executeAsModal(
    async () => {
      await applyMaskToLayerInModal(documentId, layerId, mask, bounds);
    },
    { commandName: "Stroke Rescue: apply layer mask" },
  );
}

/**
 * Add a reveal-all pixel mask to the layer if one doesn't already exist.
 * Used only on the batchPlay fallback path.
 */
async function ensureLayerMask(
  documentId: number,
  layerId: number,
): Promise<void> {
  await action.batchPlay(
    [
      {
        _obj: "make",
        new: { _class: "channel" },
        at: { _ref: "channel", _enum: "channel", _value: "mask" },
        using: { _enum: "userMaskEnabled", _value: "revealAll" },
        _options: { dialogOptions: "dontDisplay" },
        _target: [
          { _ref: "layer", _id: layerId },
          { _ref: "document", _id: documentId },
        ],
      },
    ],
    { synchronousExecution: true },
  );
}
