// Location: atlas/client/src/lib/engine/ananke_client.ts
// Atlas client wrapper for Ananke Galaxy Engine (:8000 / 127.0.0.1:8000)

export interface SystemRecord {
  id64: string; // Serialized as String to prevent 64-bit integer truncation
  name: string;
  x: number;
  y: number;
  z: number;
  primaryStarClass: string;
  population: number;
  allegiance: string;
  security: string;
  government?: string;
  primaryEconomy?: string;
  secondaryEconomy?: string;
  controllingFaction?: string;
  powerState?: string;
  thargoidWar?: string;
}

export interface BodyRecord {
  bodyId: number;
  name: string;
  type: string;
  subType: string;
  mass: number;
  radius: number;
  gravity: number;
  surfaceTemperature: number;
  surfacePressure: number;
  semiMajorAxis: number;
  eccentricity: number;
  orbitalInclination: number;
  periapsis: number;
  ascendingNode: number;
  meanAnomaly: number;
  orbitalPeriod: number;
  rotationPeriod: number;
  axialTilt: number;
  atmosphereType?: string;
  volcanism?: string;
  terraformState?: string;
  landable: boolean;
}

export interface StationRecord {
  id: number;
  name: string;
  type: string;
  distanceToArrival: number;
  allegiance: string;
  government: string;
  economy: string;
  hasLargePads: boolean;
  hasMediumPads: boolean;
  hasSmallPads: boolean;
  services: string[];
}

export class AnankeClient {
  private baseUrl: string;

  constructor(baseUrl = "http://127.0.0.1:8000") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Sub-millisecond autocomplete for the Atlas search bar
   */
  async searchAutocomplete(query: string): Promise<SystemRecord[]> {
    if (!query || query.trim().length < 2) return [];
    const res = await fetch(`${this.baseUrl}/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`Ananke search failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches full system details by name or id64
   */
  async getSystem(nameOrId: string): Promise<SystemRecord> {
    const param = /^\d+$/.test(nameOrId) ? `id64=${nameOrId}` : `systemName=${encodeURIComponent(nameOrId)}`;
    const res = await fetch(`${this.baseUrl}/api/system?${param}`);
    if (!res.ok) throw new Error(`System fetch failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Streams 3D bounding-box star clusters for the WebGPU camera view via POST /api/cube-search
   */
  async getCubeSystems(x: number, y: number, z: number, size = 50, signal?: AbortSignal): Promise<SystemRecord[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/cube-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y, z, size }),
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        return this.normalizeCubeResults(data);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      // Fallback to GET query params if POST failed
    }

    const getRes = await fetch(`${this.baseUrl}/api/cube-search?x=${x}&y=${y}&z=${z}&size=${size}`, { signal });
    if (!getRes.ok) throw new Error(`Ananke cube search failed: ${getRes.statusText}`);
    const getData = await getRes.json();
    return this.normalizeCubeResults(getData);
  }

  private normalizeCubeResults(data: any): SystemRecord[] {
    if (!data) return [];
    const list = Array.isArray(data) ? data : (data.results || []);
    return list.map((item: any) => {
      // Map either flat system or nested coords
      const x = item.x ?? item.coords?.x ?? 0;
      const y = item.y ?? item.coords?.y ?? 0;
      const z = item.z ?? item.coords?.z ?? 0;
      const id64 = String(item.id64 ?? item.systemId64 ?? item.uniqueId ?? `${x}_${y}_${z}`);
      const name = item.name ?? item.system ?? 'Unknown';
      const primaryStarClass = item.primaryStarClass ?? item.spectralClass ?? item.type ?? 'G';
      const population = item.population ?? 0;
      const allegiance = item.allegiance ?? 'Independent';
      const security = item.security ?? 'Anarchy';

      return {
        id64,
        name,
        x,
        y,
        z,
        primaryStarClass,
        population,
        allegiance,
        security,
        government: item.government,
        controllingFaction: item.controllingFaction,
      };
    });
  }

  /**
   * Fetches celestial bodies hierarchy for the System Map & Orrery
   */
  async getSystemBodies(systemName: string): Promise<BodyRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/system/bodies?systemName=${encodeURIComponent(systemName)}`);
    if (!res.ok) throw new Error(`Bodies fetch failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches starports and outposts in a star system
   */
  async getSystemStations(systemName: string): Promise<StationRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/system/stations?systemName=${encodeURIComponent(systemName)}`);
    if (!res.ok) throw new Error(`Stations fetch failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Computes a 500 LY Fleet Carrier jump sequence
   */
  async calculateCarrierRoute(source: string, target: string, cargoMass = 0) {
    const res = await fetch(`${this.baseUrl}/api/carrier-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, cargo_mass: cargoMass }),
    });
    if (!res.ok) throw new Error(`Carrier routing failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Computes a 400% supercharged Neutron Highway route
   */
  async calculateNeutronRoute(source: string, target: string, jumpRange: number) {
    const res = await fetch(`${this.baseUrl}/api/neutron-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, range: jumpRange }),
    });
    if (!res.ok) throw new Error(`Neutron routing failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Returns live 1024x1024 galactic traffic density heatmap URL
   */
  getHeatmapUrl(): string {
    return `${this.baseUrl}/api/heatmap.png?t=${Date.now()}`;
  }
}

export const ananke = new AnankeClient();
