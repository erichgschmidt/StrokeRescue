import { app, imaging, core } from "photoshop";

export interface LayerPixels {
  width: number;
  height: number;
  components: number;
  data: Uint8Array;
  sourceBounds: { left: number; top: number; right: number; bottom: number };
}

export async function readLayerPixelsInModal(
  documentId: number,
  layerId: number,
): Promise<LayerPixels> {
  const result = await imaging.getPixels({
    documentID: documentId,
    layerID: layerId,
    componentSize: 8,
    applyAlpha: false,
  });
  const data: Uint8Array = await result.imageData.getData();
  const out: LayerPixels = {
    width: result.imageData.width,
    height: result.imageData.height,
    components: result.imageData.components,
    data,
    sourceBounds: {
      left: result.sourceBounds?.left ?? 0,
      top: result.sourceBounds?.top ?? 0,
      right: result.sourceBounds?.right ?? result.imageData.width,
      bottom: result.sourceBounds?.bottom ?? result.imageData.height,
    },
  };
  result.imageData.dispose?.();
  return out;
}

export async function writeLayerPixelsInModal(
  documentId: number,
  layerId: number,
  pixels: LayerPixels,
): Promise<void> {
  const imageData = await imaging.createImageDataFromBuffer(pixels.data, {
    width: pixels.width,
    height: pixels.height,
    components: pixels.components,
    colorSpace: "RGB",
    colorProfile: "sRGB IEC61966-2.1",
  });
  try {
    await imaging.putPixels({
      documentID: documentId,
      layerID: layerId,
      imageData,
      targetBounds: pixels.sourceBounds,
    });
  } finally {
    imageData.dispose?.();
  }
}

export async function readLayerPixels(
  documentId: number,
  layerId: number,
): Promise<LayerPixels> {
  return core.executeAsModal(
    () => readLayerPixelsInModal(documentId, layerId),
    { commandName: "Stroke Rescue: read layer pixels" },
  );
}

/**
 * Read the document composite with layers above `layerId` temporarily hidden,
 * giving the "merge visible from this layer down" view. Top-level layers only;
 * layers nested inside groups are left as-is (treated as "below").
 */
export async function readMergedAtOrBelowInModal(
  documentId: number,
  layerId: number,
): Promise<LayerPixels> {
  const doc =
    app.documents?.find?.((d: any) => d.id === documentId) ?? app.activeDocument;
  if (!doc) throw new Error(`readMergedAtOrBelow: document ${documentId} not found`);
  const layers: any[] = doc.layers ?? [];
  const targetIdx = layers.findIndex((l) => l.id === layerId);
  if (targetIdx === -1) {
    throw new Error(
      `readMergedAtOrBelow: layer ${layerId} not at top level (groups not supported yet)`,
    );
  }

  // PS top-level layers list is top-to-bottom: indices < targetIdx are ABOVE.
  const toRestore: any[] = [];
  for (let i = 0; i < targetIdx; i++) {
    const l = layers[i];
    if (l?.visible) {
      l.visible = false;
      toRestore.push(l);
    }
  }

  try {
    const result = await imaging.getPixels({
      documentID: documentId,
      componentSize: 8,
      applyAlpha: false,
    });
    const data: Uint8Array = await result.imageData.getData();
    const out: LayerPixels = {
      width: result.imageData.width,
      height: result.imageData.height,
      components: result.imageData.components,
      data,
      sourceBounds: {
        left: result.sourceBounds?.left ?? 0,
        top: result.sourceBounds?.top ?? 0,
        right: result.sourceBounds?.right ?? result.imageData.width,
        bottom: result.sourceBounds?.bottom ?? result.imageData.height,
      },
    };
    result.imageData.dispose?.();
    return out;
  } finally {
    for (const l of toRestore) l.visible = true;
  }
}

export async function readMergedAtOrBelow(
  documentId: number,
  layerId: number,
): Promise<LayerPixels> {
  return core.executeAsModal(
    () => readMergedAtOrBelowInModal(documentId, layerId),
    { commandName: "Stroke Rescue: read merged below" },
  );
}

export async function writeLayerPixels(
  documentId: number,
  layerId: number,
  pixels: LayerPixels,
): Promise<void> {
  await core.executeAsModal(
    () => writeLayerPixelsInModal(documentId, layerId, pixels),
    { commandName: "Stroke Rescue: write layer pixels" },
  );
}
