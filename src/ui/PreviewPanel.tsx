import { ReactElement, useEffect, useMemo } from "react";
import { applyThreshold } from "../engine/maskRefinement";
import { cleanup as cleanupOp, growShrink } from "../engine/morphology";
import { renderMaskPreview } from "../engine/previewRenderer";
import { bytesToBase64, encodeRgbaToPng } from "../engine/pngEncoder";
import type { DiffResult, RefineSettings } from "../app/extractionTypes";

interface Props {
  diff: DiffResult | null;
  settings: RefineSettings;
  onChange: (next: RefineSettings) => void;
  onMask: (mask: Uint8ClampedArray | null) => void;
}

const PREVIEW_MAX = 240;

export function PreviewPanel({ diff, settings, onChange, onMask }: Props): ReactElement {
  const refined = useMemo(() => {
    if (!diff) return null;
    const { width, height } = diff.aligned;
    let m = applyThreshold(diff.scoreMap, settings.threshold, settings.contrast, settings.softness);
    if (settings.grow !== 0) m = growShrink(m, width, height, settings.grow);
    if (settings.cleanup > 0) m = cleanupOp(m, width, height, settings.cleanup);
    return m;
  }, [diff, settings]);

  useEffect(() => {
    onMask(refined ?? null);
  }, [refined, onMask]);

  // UXP's webview lacks ImageData / canvas createImageData; encode to PNG and
  // render via <img>.
  const dataUrl = useMemo(() => {
    if (!diff || !refined) return null;
    const { width, height, b } = diff.aligned;
    const composed = renderMaskPreview(b, refined, width, height);
    const png = encodeRgbaToPng(composed, width, height);
    return `data:image/png;base64,${bytesToBase64(png)}`;
  }, [diff, refined]);

  const scale = diff
    ? Math.min(1, PREVIEW_MAX / Math.max(diff.aligned.width, diff.aligned.height))
    : 1;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Preview</div>
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          padding: 4,
          minHeight: 80,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {diff && dataUrl ? (
          <img
            src={dataUrl}
            style={{
              width: diff.aligned.width * scale,
              height: diff.aligned.height * scale,
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <div style={{ fontSize: 11, opacity: 0.6, padding: 12 }}>
            Compute a diff to see a preview.
          </div>
        )}
      </div>
      {diff && (
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
          {diff.changedPixelCount.toLocaleString()} changed px · bbox{" "}
          {diff.bbox ? `${diff.bbox.w}×${diff.bbox.h}` : "—"}
        </div>
      )}
      <Slider
        label="Threshold"
        value={settings.threshold}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, threshold: v })}
      />
      <Slider
        label="Softness"
        value={settings.softness}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, softness: v })}
      />
      <Slider
        label="Contrast"
        value={settings.contrast}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, contrast: v })}
      />
      <Slider
        label="Grow / Shrink"
        value={settings.grow}
        min={-20}
        max={20}
        step={1}
        onChange={(v) => onChange({ ...settings, grow: v })}
      />
      <Slider
        label="Cleanup"
        value={settings.cleanup}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => onChange({ ...settings, cleanup: v })}
      />
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span style={{ width: 80, fontSize: 11 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 36, fontSize: 10, textAlign: "right" }}>
        {Number.isInteger(step) ? value : value.toFixed(2)}
      </span>
    </div>
  );
}
