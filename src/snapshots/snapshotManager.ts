import type { Snapshot } from "../types/snapshotTypes";
import { readLayerPixels, writeLayerPixels, type LayerPixels } from "../photoshop/pixelService";
import { getActiveDocument, getActiveLayer } from "../photoshop/documentService";

export interface StoredSnapshot extends Snapshot {
  components: number;
  sourceBounds: { left: number; top: number; right: number; bottom: number };
}

let snapshots: readonly StoredSnapshot[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function setSnapshots(next: readonly StoredSnapshot[]): void {
  snapshots = next;
  emit();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listSnapshots(): readonly Snapshot[] {
  return snapshots;
}

export function getSnapshot(id: string): StoredSnapshot | undefined {
  return snapshots.find((s) => s.id === id);
}

export async function captureActive(label?: string): Promise<Snapshot> {
  const doc = getActiveDocument();
  const layer = getActiveLayer();
  if (!doc) throw new Error("No active document.");
  if (!layer) throw new Error("No active layer.");

  const pixels = await readLayerPixels(doc.id, layer.id);
  const snap: StoredSnapshot = {
    id: `snap_${nextId++}`,
    layerId: layer.id,
    documentId: doc.id,
    capturedAt: Date.now(),
    label: label ?? `${layer.name} @ ${new Date().toLocaleTimeString()}`,
    width: pixels.width,
    height: pixels.height,
    pixels: pixels.data,
    components: pixels.components,
    sourceBounds: pixels.sourceBounds,
  };
  setSnapshots([snap, ...snapshots]);
  return snap;
}

export async function restore(snapshotId: string): Promise<void> {
  const snap = getSnapshot(snapshotId);
  if (!snap) throw new Error(`Snapshot ${snapshotId} not found.`);
  const layerPixels: LayerPixels = {
    width: snap.width,
    height: snap.height,
    components: snap.components,
    data: snap.pixels,
    sourceBounds: snap.sourceBounds,
  };
  await writeLayerPixels(snap.documentId, snap.layerId, layerPixels);
}

export function deleteSnapshot(snapshotId: string): void {
  setSnapshots(snapshots.filter((s) => s.id !== snapshotId));
}

export function clearAll(): void {
  setSnapshots([]);
}
