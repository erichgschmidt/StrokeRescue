import type { AlignedPair } from "../snapshots/alignment";
import type { BBox } from "../types/engineTypes";
import type { OutputMode } from "../photoshop/outputService";

export interface DiffResult {
  aligned: AlignedPair;
  /** Single-channel 0..255 score map sized to aligned.width x aligned.height. */
  scoreMap: Uint8ClampedArray;
  bbox: BBox | null;
  changedPixelCount: number;
}

export interface RefineSettings {
  threshold: number;
  softness: number;
  contrast: number;
  grow: number;
  cleanup: number;
}

export const DEFAULT_REFINE: RefineSettings = {
  threshold: 0.15,
  softness: 0.1,
  contrast: 0.5,
  grow: 0,
  cleanup: 0,
};

export interface OutputSettings {
  mode: OutputMode;
  layerName: string;
}

export const DEFAULT_OUTPUT: OutputSettings = {
  mode: "masked",
  layerName: "Stroke Rescue",
};
