import { ReactElement, useCallback, useState } from "react";
import { SnapshotPanel } from "../ui/SnapshotPanel";
import { ComparePanel } from "../ui/ComparePanel";
import { PreviewPanel } from "../ui/PreviewPanel";
import { OutputOptionsPanel } from "../ui/OutputOptionsPanel";
import {
  DEFAULT_OUTPUT,
  DEFAULT_REFINE,
  DiffResult,
  OutputSettings,
  RefineSettings,
} from "./extractionTypes";
import type { PixelSource, ResolvedSource } from "./pixelSource";

export function App(): ReactElement {
  const [error, setError] = useState("");
  const [before, setBefore] = useState<PixelSource | null>(null);
  const [after, setAfter] = useState<PixelSource | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [resolved, setResolved] = useState<{ before: ResolvedSource; after: ResolvedSource } | null>(null);
  const [refine, setRefine] = useState<RefineSettings>(DEFAULT_REFINE);
  const [mask, setMask] = useState<Uint8ClampedArray | null>(null);
  const [output, setOutput] = useState<OutputSettings>(DEFAULT_OUTPUT);

  const onPick = useCallback((slot: "before" | "after", src: PixelSource | null) => {
    if (slot === "before") setBefore(src);
    else setAfter(src);
    setDiff(null);
    setResolved(null);
    setMask(null);
  }, []);

  const onDiff = useCallback(
    (d: DiffResult | null, srcs: { before: ResolvedSource; after: ResolvedSource } | null) => {
      setDiff(d);
      setResolved(srcs);
    },
    [],
  );

  const onMask = useCallback((m: Uint8ClampedArray | null) => setMask(m), []);

  // Output target = before source's layer (the one being "rescued").
  const documentId = resolved?.before.documentId ?? null;
  const sourceLayerId = resolved?.before.layerId ?? null;

  return (
    <div
      style={{
        padding: 12,
        color: "#ddd",
        fontFamily: "sans-serif",
        background: "#2b2b2b",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        Stroke Rescue
      </h2>
      <SnapshotPanel onError={setError} />
      <ComparePanel
        before={before}
        after={after}
        onPick={onPick}
        onDiff={onDiff}
        onError={setError}
      />
      <PreviewPanel
        diff={diff}
        settings={refine}
        onChange={setRefine}
        onMask={onMask}
      />
      <OutputOptionsPanel
        diff={diff}
        mask={mask}
        documentId={documentId}
        sourceLayerId={sourceLayerId}
        settings={output}
        onChange={setOutput}
        onError={setError}
      />
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            fontSize: 11,
            color: "#f88",
            border: "1px solid #533",
            borderRadius: 2,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
