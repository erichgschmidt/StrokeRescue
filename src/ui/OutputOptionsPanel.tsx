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

interface ModeChoiceProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

// UXP webview's <input type="radio"> doesn't reliably emit change events
// from a click on the radio glyph (only the label text). Roll our own.
function ModeChoice({ label, active, onClick }: ModeChoiceProps): ReactElement {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
        padding: "2px 6px",
        border: `1px solid ${active ? "#6af" : "#444"}`,
        borderRadius: 2,
        background: active ? "#243046" : "transparent",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: "1px solid #888",
          background: active ? "#6af" : "transparent",
        }}
      />
      {label}
    </div>
  );
}

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
        <ModeChoice
          label="Masked layer"
          active={settings.mode === "masked"}
          onClick={() => onChange({ ...settings, mode: "masked" })}
        />
        <ModeChoice
          label="Isolated layer"
          active={settings.mode === "isolated"}
          onClick={() => onChange({ ...settings, mode: "isolated" })}
        />
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
