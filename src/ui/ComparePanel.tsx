import { ReactElement, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { listSnapshots, subscribe } from "../snapshots/snapshotManager";
import { alignBuffers } from "../snapshots/alignment";
import { computeDifference } from "../engine/differenceEngine";
import {
  getActiveDocument,
  listTopLevelLayers,
} from "../photoshop/documentService";
import {
  describeSource,
  resolveSource,
  type PixelSource,
  type ResolvedSource,
} from "../app/pixelSource";
import type { LayerRef } from "../types/layerTypes";
import type { DiffResult } from "../app/extractionTypes";

interface Props {
  before: PixelSource | null;
  after: PixelSource | null;
  onPick: (slot: "before" | "after", src: PixelSource | null) => void;
  onDiff: (diff: DiffResult | null, sources: { before: ResolvedSource; after: ResolvedSource } | null) => void;
  onError: (msg: string) => void;
}

const sel: React.CSSProperties = {
  flex: 1,
  fontSize: 11,
  padding: 2,
  background: "#222",
  color: "#ddd",
  border: "1px solid #444",
};

const btn: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

function encodeSource(src: PixelSource): string {
  return JSON.stringify(src);
}
function decodeSource(s: string): PixelSource | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as PixelSource;
  } catch {
    return null;
  }
}

export function ComparePanel({ before, after, onPick, onDiff, onError }: Props): ReactElement {
  const snaps = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => listSnapshots(),
  );
  const [layers, setLayers] = useState<LayerRef[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    const doc = getActiveDocument();
    setDocId(doc?.id ?? null);
    setLayers(listTopLevelLayers());
  }, []);

  useEffect(refresh, [refresh]);

  const compute = async () => {
    if (!before || !after) {
      onError("Pick a Before and an After source.");
      return;
    }
    if (encodeSource(before) === encodeSource(after)) {
      onError("Before and After must be different.");
      return;
    }
    setBusy(true);
    try {
      const [a, b] = await Promise.all([resolveSource(before), resolveSource(after)]);
      const aligned = alignBuffers(a, b);
      const result = computeDifference(aligned.b, aligned.a, aligned.width, aligned.height);
      onDiff(
        {
          aligned,
          scoreMap: result.scoreMap,
          bbox: result.bbox,
          changedPixelCount: result.changedPixelCount,
        },
        { before: a, after: b },
      );
      onError("");
    } catch (e: any) {
      onError(`Diff: ${e?.message ?? String(e)}`);
      onDiff(null, null);
    } finally {
      setBusy(false);
    }
  };

  const renderPicker = (slot: "before" | "after", value: PixelSource | null) => (
    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
      <span style={{ width: 44, fontSize: 11 }}>{slot === "before" ? "Before" : "After"}</span>
      <select
        style={sel}
        value={value ? encodeSource(value) : ""}
        onChange={(e) => onPick(slot, decodeSource(e.target.value))}
      >
        <option value="">— pick a source —</option>
        {snaps.map((s) => (
          <option key={`s${s.id}`} value={encodeSource({ kind: "snapshot", id: s.id })}>
            [Snap] {s.label}
          </option>
        ))}
        {docId !== null && layers.map((l) => (
          <option
            key={`l${l.id}`}
            value={encodeSource({ kind: "layer", documentId: docId, layerId: l.id })}
          >
            [Layer] {l.name}
          </option>
        ))}
        {docId !== null && layers.map((l) => (
          <option
            key={`m${l.id}`}
            value={encodeSource({ kind: "merged-below", documentId: docId, layerId: l.id })}
          >
            [Merged ↓] {l.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600 }}>Compare</span>
        <button style={{ ...btn, fontSize: 10 }} onClick={refresh}>
          Refresh
        </button>
      </div>
      {renderPicker("before", before)}
      {renderPicker("after", after)}
      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
        {describeSource(before)} → {describeSource(after)}
        {" · "}
        {snaps.length} snap{snaps.length === 1 ? "" : "s"}, {layers.length} layer
        {layers.length === 1 ? "" : "s"}
        {docId === null && " (no doc)"}
      </div>
      <button style={btn} onClick={compute} disabled={busy}>
        {busy ? "Diffing…" : "Compute Diff"}
      </button>
    </div>
  );
}
