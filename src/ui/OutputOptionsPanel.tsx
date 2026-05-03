import { ReactElement, useState } from "react";
import { commitOutput } from "../photoshop/outputService";
import type { DiffResult, OutputSettings } from "../app/extractionTypes";

interface Props {
  diff: DiffResult | null;
  mask: Uint8ClampedArray | null;
  sourceLayerId: number | null;
  documentId: number | null;
  settings: OutputSettings;
  onChange: (s: OutputSettings) => void;
  onError: (msg: string) => void;
}

const btn: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

export function OutputOptionsPanel({
  diff,
  mask,
  sourceLayerId,
  documentId,
  settings,
  onChange,
  onError,
}: Props): ReactElement {
  const [busy, setBusy] = useState(false);
  const ready = diff && mask && sourceLayerId !== null && documentId !== null;

  const commit = async () => {
    if (!ready || !diff || !mask || sourceLayerId === null || documentId === null) {
      onError("Need a diff + mask + active layer to commit.");
      return;
    }
    setBusy(true);
    try {
      await commitOutput({
        documentId,
        sourceLayerId,
        mask,
        bounds: diff.aligned.bounds,
        mode: settings.mode,
        layerName: settings.layerName,
      });
      onError("");
    } catch (e: any) {
      onError(`Commit: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Output</div>
      <div style={{ display: "flex", gap: 8, fontSize: 11, marginBottom: 6 }}>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="radio"
            checked={settings.mode === "masked"}
            onChange={() => onChange({ ...settings, mode: "masked" })}
          />
          Masked layer
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="radio"
            checked={settings.mode === "isolated"}
            onChange={() => onChange({ ...settings, mode: "isolated" })}
          />
          Isolated layer
        </label>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6 }}>
        <span style={{ width: 44, fontSize: 11 }}>Name</span>
        <input
          type="text"
          value={settings.layerName}
          onChange={(e) => onChange({ ...settings, layerName: e.target.value })}
          style={{
            flex: 1,
            fontSize: 11,
            padding: 2,
            background: "#222",
            color: "#ddd",
            border: "1px solid #444",
          }}
        />
      </div>
      <button style={btn} disabled={!ready || busy} onClick={commit}>
        {busy ? "Committing…" : "Commit"}
      </button>
    </div>
  );
}
