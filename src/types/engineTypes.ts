// Engine type definitions for the Stroke Rescue difference pipeline.
// Pure data types — no Photoshop API surface.

export interface DifferenceWeights {
  rgbWeight: number;
  lumaWeight: number;
  chromaWeight: number;
  alphaWeight: number;
}

export interface DifferenceOptions {
  weights?: Partial<DifferenceWeights>;
  /**
   * If undefined the engine auto-detects whether the reference contains any
   * non-opaque alpha and only enables alphaWeight in that case.
   */
  forceEnableAlpha?: boolean;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DifferenceResult {
  /** Single-channel score map, length = width * height, values 0..255. */
  scoreMap: Uint8ClampedArray;
  /** Maximum raw score observed before quantization to 0..255. */
  maxScore: number;
  /** Number of pixels with a nonzero score. */
  changedPixelCount: number;
  /** Tight bounding box around changed pixels, or null if none. */
  bbox: BBox | null;
}

export const DEFAULT_WEIGHTS: DifferenceWeights = {
  rgbWeight: 0.4,
  lumaWeight: 0.3,
  chromaWeight: 0.3,
  alphaWeight: 0,
};
