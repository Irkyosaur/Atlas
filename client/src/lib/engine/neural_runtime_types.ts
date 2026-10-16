// Location: atlas/client/src/lib/engine/neural_runtime_types.ts
// Stage 16.1: Neural Runtime Types & Interfaces for Exploration Valuation

export type ExecutionProvider = 'webgpu' | 'wasm' | 'wasm-simd' | 'cpu' | 'heuristic-fallback';

export interface ExplorationInputFeatures {
  spectralClass: string;          // e.g. 'O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'T', 'Y', 'Neutron', 'BlackHole', etc.
  starAgeMyr: number;             // Age in Mega-years (e.g. 4600 Myr)
  starLuminosity: number;         // Solar luminosity units (e.g. 1.0 for Sol)
  metallicity: number;            // Metallicity ratio [-2.0 to 1.0]
  habitableZoneInnerLs: number;   // Habitable zone inner margin in light-seconds
  habitableZoneOuterLs: number;   // Habitable zone outer margin in light-seconds
  totalBodies: number;            // Total body count in system (FSS honk body count)
  gasGiantsCount: number;         // Known or estimated gas giants in system
}

export interface ExplorationPredictionResult {
  executionProvider: ExecutionProvider;
  inferenceLatencyMs: number;
  timestamp: number;
  probabilities: {
    elwProbability: number;               // Earth-Like World occurrence probability [0 - 1]
    terraformableProbability: number;     // Terraformable candidate probability [0 - 1]
    ammoniaWorldProbability: number;      // Ammonia World probability [0 - 1]
    waterWorldProbability: number;        // Water World probability [0 - 1]
    highValueBioProbability: number;      // High-Value Exobiology probability [0 - 1]
  };
  valuation: {
    estimatedPayoutCredits: number;       // Anticipated exploration credit payout
    systemRarityTier: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EXOTIC' | 'LEGENDARY';
    recommendedScanBand: string;          // e.g. "450 Ls - 920 Ls (Habitable Zone)"
  };
  cachedFromIndexedDb?: boolean;
}

export interface NeuralRuntimeStatus {
  isInitialized: boolean;
  isLoading: boolean;
  activeProvider: ExecutionProvider;
  isSimdAvailable: boolean;
  isWebGpuAvailable: boolean;
  modelLoaded: boolean;
  modelSizeBytes: number;
  lastLatencyMs: number;
  totalInferences: number;
  error: string | null;
}
