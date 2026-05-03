// TODO: flesh out from PRD.
export interface Snapshot {
  id: string;
  layerId: number;
  documentId: number;
  capturedAt: number;
  label?: string;
  width: number;
  height: number;
  pixels: Uint8Array;
}
