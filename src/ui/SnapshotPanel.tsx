import { ReactElement, useEffect, useState, useSyncExternalStore } from "react";
import {
  captureActive,
  deleteSnapshot,
  listSnapshots,
  restore,
  subscribe,
} from "../snapshots/snapshotManager";

interface Props {
  onError: (msg: string) => void;
}

const btn: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 6px",
  borderBottom: "1px solid #333",
  fontSize: 11,
};

export function SnapshotPanel({ onError }: Props): ReactElement {
  const snaps = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => listSnapshots(),
  );
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    onError("");
  }, [onError]);

  const wrap = async (op: string, fn: () => Promise<void>) => {
    setBusy(op);
    try {
      await fn();
      onError("");
    } catch (e: any) {
      onError(`${op}: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          style={btn}
          disabled={busy !== null}
          onClick={() => wrap("Capture", async () => { await captureActive(); })}
        >
          {busy === "Capture" ? "Capturing…" : "Capture"}
        </button>
      </div>
      <div style={{ border: "1px solid #333", borderRadius: 2 }}>
        {snaps.length === 0 ? (
          <div style={{ padding: 8, fontSize: 11, opacity: 0.6 }}>
            No snapshots yet. Click Capture to record the active layer.
          </div>
        ) : (
          snaps.map((s) => (
            <div key={s.id} style={row}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label}
              </span>
              <span style={{ display: "flex", gap: 4 }}>
                <button
                  style={btn}
                  disabled={busy !== null}
                  onClick={() => wrap("Restore", async () => { await restore(s.id); })}
                >
                  Restore
                </button>
                <button
                  style={btn}
                  disabled={busy !== null}
                  onClick={() => deleteSnapshot(s.id)}
                >
                  ×
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
