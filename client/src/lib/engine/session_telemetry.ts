// Location: atlas/client/src/lib/engine/session_telemetry.ts
// Live session telemetry state and types for Atlas

export interface SessionTelemetry {
  currentSystem: string;
  distanceSol: number;
  activeShip: string;
  shipHullPercent: number;
  carrierLinkActive: boolean;
  carrierName?: string;
}

export const DEFAULT_TELEMETRY: SessionTelemetry = {
  currentSystem: 'SOL',
  distanceSol: 0.0,
  activeShip: 'ANACONDA MK I',
  shipHullPercent: 100,
  carrierLinkActive: true,
  carrierName: 'INV-PATHFINDER (Q0Z-88L)'
};
