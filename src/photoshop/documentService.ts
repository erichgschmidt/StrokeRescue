import { app } from "photoshop";
import type { DocumentRef } from "../types/documentTypes";
import type { LayerRef, LayerBounds } from "../types/layerTypes";

export function getActiveDocument(): DocumentRef | null {
  const doc = app.activeDocument;
  if (!doc) return null;
  return { id: doc.id, name: doc.name, width: doc.width, height: doc.height };
}

export function getActiveLayer(): LayerRef | null {
  const doc = app.activeDocument;
  if (!doc) return null;
  const layer = doc.activeLayers?.[0];
  if (!layer) return null;
  return { id: layer.id, name: layer.name, kind: String(layer.kind ?? "pixel") };
}

/** Top-level layers, top-to-bottom (PS native order). Groups not recursed. */
export function listTopLevelLayers(): LayerRef[] {
  const doc = app.activeDocument;
  if (!doc) return [];
  const layers: any[] = doc.layers ?? [];
  return layers.map((l) => ({
    id: l.id,
    name: l.name,
    kind: String(l.kind ?? "pixel"),
  }));
}

export function getLayerBounds(layerId: number): LayerBounds | null {
  const doc = app.activeDocument;
  if (!doc) return null;
  const layer = doc.layers?.find((l: any) => l.id === layerId);
  if (!layer?.bounds) return null;
  const b = layer.bounds;
  return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
}
