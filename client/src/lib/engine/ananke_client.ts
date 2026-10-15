// Location: atlas/client/src/lib/engine/ananke_client.ts
// Atlas client wrapper for Ananke Galaxy Engine (:8000 / 127.0.0.1:8000)

import { type DssaCarrier, EMBEDDED_DSSA_REGISTRY, findNearestDssa } from './dssa_registry';
import {
  type CommodityRecord,
  type StationMarketRecord,
  type SingleHopQuery,
  type SingleHopTradeOpportunity,
  CANONICAL_COMMODITIES,
  CANONICAL_MARKET_STATIONS,
  normalizeLandingPad,
  classifyHealthLevel,
  calculateOfflineSingleHopTrades,
} from './market_engine';

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
  mass?: number;
  earthMasses?: number;
  solarMasses?: number;
  radius?: number;
  gravity?: number;
  surfaceTemperature?: number;
  surfacePressure?: number;
  distanceToArrival?: number;
  semiMajorAxis?: number;
  orbitalEccentricity?: number;
  eccentricity?: number;
  orbitalInclination?: number;
  argOfPeriapsis?: number;
  periapsis?: number;
  ascendingNode?: number;
  meanAnomaly?: number;
  orbitalPeriod?: number;
  rotationalPeriod?: number;
  rotationPeriod?: number;
  axialTilt?: number;
  atmosphereType?: string;
  volcanism?: string;
  volcanismType?: string;
  terraformState?: string;
  terraformingState?: string;
  landable?: boolean;
  isLandable?: boolean;
  mainStar?: boolean;
  spectralClass?: string;
  parents?: Array<Record<string, number>> | Record<string, number>;
  rings?: any[];
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

  /**
   * Ingest DSSA registry data via Ananke GET /api/carriers/dssa (Stage 5.2)
   * Falls back gracefully to the embedded DSSA registry if Ananke is offline.
   */
  async getDssaCarriers(): Promise<DssaCarrier[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/carriers/dssa`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.carriers || []);
        if (list.length > 0) {
          return list.map((item: any) => ({
            callsign: item.callsign || item.name || 'DSSA Fleet Carrier',
            name: item.name || 'DSSA Carrier',
            systemName: item.systemName || item.system_name || 'Deep Space',
            bodyName: item.bodyName || item.body_name,
            region: item.region || item.project || 'Deep Space',
            coords: {
              x: Number(item.coords?.x ?? item.x ?? 0),
              y: Number(item.coords?.y ?? item.y ?? 0),
              z: Number(item.coords?.z ?? item.z ?? 0),
            },
            ownerCmdr: item.ownerCmdr || item.owner_cmdr || 'DSSA Network Command',
            operationalStatus: (item.operationalStatus || item.operational_status || 'Operational') as DssaCarrier['operationalStatus'],
            services: {
              refuel: item.services?.refuel ?? true,
              repair: item.services?.repair ?? true,
              armory: item.services?.armory ?? true,
              vistaGenomics: item.services?.vistaGenomics ?? item.services?.vista_genomics ?? true,
              universalCartographics: item.services?.universalCartographics ?? item.services?.universal_cartographics ?? true,
              pioneerSupplies: item.services?.pioneerSupplies ?? item.services?.pioneer_supplies ?? true,
              shipyard: item.services?.shipyard ?? true,
              outfitting: item.services?.outfitting ?? true,
            },
            tariffs: {
              fuelTariffPercent: Number(item.tariffs?.fuelTariffPercent ?? 0),
              armoryTariffPercent: Number(item.tariffs?.armoryTariffPercent ?? 0),
              repairTariffPercent: Number(item.tariffs?.repairTariffPercent ?? 0),
              generalTariffPercent: Number(item.tariffs?.generalTariffPercent ?? 0),
            },
            discordContact: item.discordContact || 'https://discord.gg/ed-dssa',
            notes: item.notes || 'Official Deep Space Support Array carrier.',
          }));
        }
      }
    } catch {
      // Fallback to structured embedded registry
    }

    return EMBEDDED_DSSA_REGISTRY;
  }

  /**
   * Find nearest operational DSSA carrier from coordinates
   */
  async getNearestDssa(
    x: number,
    y: number,
    z: number,
    limit = 10
  ): Promise<DssaCarrier[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/dssa/nearest?x=${x}&y=${y}&z=${z}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.carriers || []);
        if (list.length > 0) {
          return list.map((item: any) => ({
            callsign: item.callsign || item.name || 'DSSA Fleet Carrier',
            name: item.name || 'DSSA Carrier',
            systemName: item.system_name || item.systemName || 'Deep Space',
            bodyName: item.body_name || item.bodyName,
            region: item.project || item.region || 'Deep Space',
            coords: {
              x: Number(item.coords?.x ?? 0),
              y: Number(item.coords?.y ?? 0),
              z: Number(item.coords?.z ?? 0),
            },
            ownerCmdr: 'DSSA Command',
            operationalStatus: 'Operational',
            services: {
              refuel: true,
              repair: true,
              armory: true,
              vistaGenomics: true,
              universalCartographics: true,
              pioneerSupplies: true,
              shipyard: true,
              outfitting: true,
            },
            tariffs: {
              fuelTariffPercent: 0,
              armoryTariffPercent: 0,
              repairTariffPercent: 0,
              generalTariffPercent: 0,
            },
            discordContact: 'https://discord.gg/ed-dssa',
            distanceLy: Number(item.distance_ly ?? 0),
          }));
        }
      }
    } catch {
      // Compute with embedded registry
    }

    return findNearestDssa(EMBEDDED_DSSA_REGISTRY, { x, y, z }, {}, limit);
  }

  /**
   * Stage 6.1: Real-Time Commodity Market Ingestion
   * Queries Ananke /api/market/commodities with automatic fallback to CANONICAL_COMMODITIES
   */
  async getCommodities(): Promise<CommodityRecord[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/market/commodities`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.commodities || []);
        if (list.length > 0) {
          return list.map((c: any) => ({
            id: c.id || c.name?.toLowerCase().replace(/\s+/g, '_'),
            name: c.name,
            category: c.category || 'Minerals',
            averagePrice: Number(c.averagePrice || c.average_price || 0),
            maxBuyPrice: Number(c.maxBuyPrice || c.max_buy_price || 0),
            minSellPrice: Number(c.minSellPrice || c.min_sell_price || 0),
            isRare: !!c.isRare,
            isIllicit: !!c.isIllicit,
          }));
        }
      }
    } catch {
      // Ananke offline fallback
    }

    return CANONICAL_COMMODITIES;
  }

  /**
   * Stage 6.1: Market Stations Ingestion
   * Queries Ananke /api/market/stations or /api/trade/nearest-commodity with fallback to CANONICAL_MARKET_STATIONS
   */
  async getMarketStations(
    commodity?: string,
    refSystem?: string,
    radius = 500
  ): Promise<StationMarketRecord[]> {
    try {
      // Try /api/market/stations first
      const queryParam = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
      const res = await fetch(`${this.baseUrl}/api/market/stations${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.stations || []);
        if (list.length > 0) {
          return list.map((st: any) => {
            const galAvg = Number(st.galacticAverage ?? st.galactic_average ?? 50000);
            const buyP = Number(st.buyPrice ?? st.buy_price ?? 0);
            const sellP = Number(st.sellPrice ?? st.sell_price ?? 0);
            const sup = Number(st.supply ?? st.stock ?? 0);
            const dem = Number(st.demand ?? 0);
            return {
              stationId: String(st.stationId ?? st.station_id ?? st.id ?? Math.random()),
              stationName: st.stationName ?? st.station_name ?? st.name ?? 'Starport',
              systemName: st.systemName ?? st.system_name ?? 'Sol',
              systemId64: String(st.systemId64 ?? st.system_id64 ?? '0'),
              coords: {
                x: Number(st.coords?.x ?? 0),
                y: Number(st.coords?.y ?? 0),
                z: Number(st.coords?.z ?? 0),
              },
              distanceLy: Number(st.distanceLy ?? st.distance_ly ?? 0),
              stationType: st.stationType ?? st.station_type ?? st.type ?? 'Coriolis Starport',
              isPlanetary: !!(st.isPlanetary ?? st.is_planetary ?? st.type?.toLowerCase().includes('planetary')),
              distanceLs: Number(st.distanceLs ?? st.distance_to_arrival ?? 500),
              maxLandingPad: normalizeLandingPad(st.maxLandingPad ?? st.landing_pads),
              commodityName: st.commodityName ?? st.commodity_name ?? commodity ?? 'Tritium',
              commodityCategory: (st.commodityCategory ?? st.category ?? 'Minerals'),
              buyPrice: buyP,
              sellPrice: sellP,
              supply: sup,
              supplyLevel: classifyHealthLevel(sup),
              demand: dem,
              demandLevel: classifyHealthLevel(dem),
              marketUpdatedAt: Number(st.marketUpdatedAt ?? st.updated_at ?? Date.now()),
              galacticAverage: galAvg,
              buyVariancePct: galAvg > 0 ? Number((((buyP - galAvg) / galAvg) * 100).toFixed(1)) : 0,
              sellVariancePct: galAvg > 0 ? Number((((sellP - galAvg) / galAvg) * 100).toFixed(1)) : 0,
            };
          });
        }
      }

      // If commodity specified, also attempt /api/trade/nearest-commodity
      if (commodity) {
        const sysQuery = refSystem ? `&refSystem=${encodeURIComponent(refSystem)}` : '';
        const tradeRes = await fetch(`${this.baseUrl}/api/trade/nearest-commodity?commodity=${encodeURIComponent(commodity)}&radius=${radius}&limit=100${sysQuery}`);
        if (tradeRes.ok) {
          const tradeData = await tradeRes.json();
          const list = tradeData.stations || [];
          if (list.length > 0) {
            const commMeta = CANONICAL_COMMODITIES.find(
              (c) => c.name.toLowerCase() === commodity.toLowerCase()
            );
            const galAvg = commMeta ? commMeta.averagePrice : 50000;
            const category = commMeta ? commMeta.category : 'Minerals';

            return list.map((st: any) => {
              const buyP = Number(st.buy_price ?? 0);
              const sellP = Number(st.sell_price ?? 0);
              const sup = Number(st.stock ?? 0);
              const dem = Number(st.demand ?? 0);
              return {
                stationId: `${st.system_id64}_${st.station_name}`,
                stationName: st.station_name,
                systemName: st.system_name,
                systemId64: String(st.system_id64),
                coords: {
                  x: Number(st.coords?.x ?? 0),
                  y: Number(st.coords?.y ?? 0),
                  z: Number(st.coords?.z ?? 0),
                },
                distanceLy: Number(st.distance_ly ?? 0),
                stationType: st.station_type || 'Orbis Starport',
                isPlanetary: !!(st.station_type?.toLowerCase().includes('planetary')),
                distanceLs: Number(st.distance_to_arrival ?? 500),
                maxLandingPad: normalizeLandingPad(st.landing_pads),
                commodityName: commodity,
                commodityCategory: category,
                buyPrice: buyP,
                sellPrice: sellP,
                supply: sup,
                supplyLevel: classifyHealthLevel(sup),
                demand: dem,
                demandLevel: classifyHealthLevel(dem),
                marketUpdatedAt: Number(st.updated_at ?? Date.now()),
                galacticAverage: galAvg,
                buyVariancePct: galAvg > 0 ? Number((((buyP - galAvg) / galAvg) * 100).toFixed(1)) : 0,
                sellVariancePct: galAvg > 0 ? Number((((sellP - galAvg) / galAvg) * 100).toFixed(1)) : 0,
              };
            });
          }
        }
      }
    } catch {
      // Fallback
    }

    if (commodity) {
      return CANONICAL_MARKET_STATIONS.filter(
        (s) => s.commodityName.toLowerCase() === commodity.toLowerCase()
      );
    }
    return CANONICAL_MARKET_STATIONS;
  }

  /**
   * Stage 6.2: Single-Hop Best Trade Router
   * Queries POST /api/trade/single-hop on Ananke with fallbacks to spatial nearest commodity & offline calculations.
   */
  async getSingleHopTrades(query: SingleHopQuery): Promise<SingleHopTradeOpportunity[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/trade/single-hop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_system: query.currentSystem,
          current_station: query.currentStation,
          cargo_capacity: query.cargoCapacity,
          budget: query.budgetCredits,
          max_jump_range: query.maxJumpRangeLy,
          pad_size: query.padSize,
          include_planetary: query.includePlanetary,
          max_age_hours: query.maxAgeHours,
          min_profit_per_ton: query.minProfitPerTon,
          commodity: query.commodityFilter,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const trades = data.trades || data.opportunities || data;
        if (Array.isArray(trades) && trades.length > 0) {
          return trades.map((t: any) => ({
            id: t.id || `${t.source_station}->${t.target_station}_${t.commodity}`,
            commodityName: t.commodityName || t.commodity_name || t.commodity,
            commodityCategory: t.commodityCategory || t.category || 'Metals',
            sourceSystem: t.sourceSystem || t.source_system,
            sourceStation: t.sourceStation || t.source_station,
            sourcePadSize: normalizeLandingPad(t.sourcePadSize || t.source_pad_size),
            sourceDistanceLs: Number(t.sourceDistanceLs || t.source_distance_ls || 500),
            sourceIsPlanetary: !!(t.sourceIsPlanetary ?? t.source_is_planetary),
            sourceGravityG: Number(t.sourceGravityG ?? t.source_gravity ?? (t.sourceIsPlanetary ? 1.0 : 0)),
            sourceBuyPrice: Number(t.sourceBuyPrice || t.buy_price || 0),
            sourceSupply: Number(t.sourceSupply || t.stock || 0),
            sourceUpdatedAt: Number(t.sourceUpdatedAt || t.source_updated_at || Date.now()),
            targetSystem: t.targetSystem || t.target_system,
            targetStation: t.targetStation || t.target_station,
            targetPadSize: normalizeLandingPad(t.targetPadSize || t.target_pad_size),
            targetDistanceLs: Number(t.targetDistanceLs || t.target_distance_ls || 500),
            targetIsPlanetary: !!(t.targetIsPlanetary ?? t.target_is_planetary),
            targetGravityG: Number(t.targetGravityG ?? t.target_gravity ?? (t.targetIsPlanetary ? 1.0 : 0)),
            targetSellPrice: Number(t.targetSellPrice || t.sell_price || 0),
            targetDemand: Number(t.targetDemand || t.demand || 0),
            targetUpdatedAt: Number(t.targetUpdatedAt || t.target_updated_at || Date.now()),
            jumpDistanceLy: Number(t.jumpDistanceLy || t.jump_distance_ly || t.distance_ly || 10.0),
            jumpsCount: Number(t.jumpsCount || t.jumps || 1),
            unitsTraded: Number(t.unitsTraded || t.units_traded || query.cargoCapacity),
            totalCostCr: Number(t.totalCostCr || t.total_cost || 0),
            grossProfitPerTon: Number(t.grossProfitPerTon || t.gross_profit_per_ton || 0),
            netProfitPerTon: Number(t.netProfitPerTon || t.net_profit_per_ton || 0),
            totalGrossProfit: Number(t.totalGrossProfit || t.total_gross_profit || 0),
            totalNetProfit: Number(t.totalNetProfit || t.total_net_profit || 0),
            estimatedFlightDurationMin: Number(t.estimatedFlightDurationMin || t.flight_minutes || 6.5),
            estimatedCrPerHour: Number(t.estimatedCrPerHour || t.cr_per_hour || 0),
            sourceCoords: t.sourceCoords || t.source_coords,
            targetCoords: t.targetCoords || t.target_coords,
          }));
        }
      }
    } catch {
      // Fallback to internal high-fidelity offline routing engine
    }

    return calculateOfflineSingleHopTrades(query);
  }
}

export const ananke = new AnankeClient();



