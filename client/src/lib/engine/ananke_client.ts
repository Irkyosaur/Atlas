// Location: atlas/client/src/lib/engine/ananke_client.ts
// Atlas client wrapper for Ananke Galaxy Engine (:8000 / 127.0.0.1:8000)

import { type DssaCarrier, EMBEDDED_DSSA_REGISTRY, findNearestDssa } from './dssa_registry';
import { securityEngine } from './security_challenge_engine';
import {
  type CommodityRecord,
  type StationMarketRecord,
  type SingleHopQuery,
  type SingleHopTradeOpportunity,
  type CircularLoopQuery,
  type CircularTradeLoop,
  type SmugglingQuery,
  type SmugglingRouteOpportunity,
  type StationBlackMarketInfo,
  CANONICAL_COMMODITIES,
  CANONICAL_MARKET_STATIONS,
  CANONICAL_BLACK_MARKETS,
  normalizeLandingPad,
  classifyHealthLevel,
  calculateOfflineSingleHopTrades,
  calculateOfflineCircularLoops,
  calculateOfflineSmugglingRoutes,
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
      const secHeaders = await securityEngine.getSecurityHeaders(undefined, {
        method: 'POST',
        pathAndQuery: '/api/cube-search',
      }).catch(() => ({}));
      const res = await fetch(`${this.baseUrl}/api/cube-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...secHeaders },
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

    const secHeaders = await securityEngine.getSecurityHeaders(undefined, {
      method: 'GET',
      pathAndQuery: `/api/cube-search?x=${x}&y=${y}&z=${z}&size=${size}`,
    }).catch(() => ({}));
    const getRes = await fetch(`${this.baseUrl}/api/cube-search?x=${x}&y=${y}&z=${z}&size=${size}`, {
      headers: { ...secHeaders },
      signal,
    });
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

  /**
   * Stage 6.3: Multi-Stop Circular Trade Loop Router
   * Connects to Ananke POST /api/trade/loop supporting 2-hop, 3-hop, and 4-hop circular itineraries
   * with fuel stop / jump range constraints and true Cr/hour metrics.
   */
  async getCircularTradeLoops(query: CircularLoopQuery): Promise<CircularTradeLoop[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/trade/loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_system: query.currentSystem,
          current_station: query.currentStation,
          hops: query.hopsCount,
          cargo_capacity: query.cargoCapacity,
          budget: query.budgetCredits,
          max_jump_range: query.maxJumpRangeLy,
          pad_size: query.padSize,
          include_planetary: query.includePlanetary,
          max_age_hours: query.maxAgeHours,
          min_profit_per_ton: query.minProfitPerTon,
          fuel_tank_capacity: query.fuelTankCapacityTons ?? 32,
          fuel_consumption_per_ly: query.fuelConsumptionPerLy ?? 0.8,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const loops = data.loops || data.itineraries || data.results || data;
        if (Array.isArray(loops) && loops.length > 0) {
          return loops.map((loop: any) => ({
            id: loop.id || `loop_${loop.hops || query.hopsCount}_${Date.now()}`,
            originSystem: loop.originSystem || loop.origin_system || query.currentSystem,
            originStation: loop.originStation || loop.origin_station || '',
            hopsCount: Number(loop.hopsCount || loop.hops || query.hopsCount),
            totalDistanceLy: Number(loop.totalDistanceLy || loop.total_distance_ly || 0),
            totalJumps: Number(loop.totalJumps || loop.total_jumps || 0),
            totalRoundTripMinutes: Number(loop.totalRoundTripMinutes || loop.total_duration_minutes || 0),
            totalNetProfitCr: Number(loop.totalNetProfitCr || loop.total_profit_cr || 0),
            profitPerTonPerRound: Number(loop.profitPerTonPerRound || loop.profit_per_ton || 0),
            crPerHour: Number(loop.crPerHour || loop.cr_per_hour || 0),
            fuelStopRequired: !!(loop.fuelStopRequired || loop.fuel_stop_required),
            legs: (loop.legs || []).map((leg: any, idx: number) => ({
              legIndex: Number(leg.legIndex ?? leg.leg_index ?? (idx + 1)),
              fromSystem: leg.fromSystem || leg.from_system,
              fromStation: leg.fromStation || leg.from_station,
              fromPadSize: normalizeLandingPad(leg.fromPadSize || leg.from_pad_size),
              fromDistanceLs: Number(leg.fromDistanceLs || leg.from_distance_ls || 500),
              fromIsPlanetary: !!(leg.fromIsPlanetary ?? leg.from_is_planetary),
              commodityName: leg.commodityName || leg.commodity_name || leg.commodity,
              commodityCategory: leg.commodityCategory || leg.category || 'Metals',
              buyPrice: Number(leg.buyPrice || leg.buy_price || 0),
              toSystem: leg.toSystem || leg.to_system,
              toStation: leg.toStation || leg.to_station,
              toPadSize: normalizeLandingPad(leg.toPadSize || leg.to_pad_size),
              toDistanceLs: Number(leg.toDistanceLs || leg.to_distance_ls || 500),
              toIsPlanetary: !!(leg.toIsPlanetary ?? leg.to_is_planetary),
              sellPrice: Number(leg.sellPrice || leg.sell_price || 0),
              jumpDistanceLy: Number(leg.jumpDistanceLy || leg.jump_distance_ly || 10.0),
              jumpsCount: Number(leg.jumpsCount || leg.jumps_count || 1),
              unitsTraded: Number(leg.unitsTraded || leg.units_traded || query.cargoCapacity),
              grossProfitPerTon: Number(leg.grossProfitPerTon || leg.gross_profit_per_ton || 0),
              netProfitPerTon: Number(leg.netProfitPerTon || leg.net_profit_per_ton || 0),
              legNetProfit: Number(leg.legNetProfit || leg.leg_profit || 0),
              legDurationMinutes: Number(leg.legDurationMinutes || leg.leg_duration_minutes || 5.0),
              needsFuelStop: !!(leg.needsFuelStop ?? leg.needs_fuel_stop),
              navigationInstruction: leg.navigationInstruction || leg.instruction ||
                `Buy [${leg.commodityName || leg.commodity}] at [${leg.fromStation || leg.from_station}] -> Jump -> Sell at [${leg.toStation || leg.to_station}]`,
              fromCoords: leg.fromCoords || leg.from_coords,
              toCoords: leg.toCoords || leg.to_coords,
            })),
          }));
        }
      }
    } catch {
      // Fallback to internal high-fidelity offline circular routing engine
    }

    return calculateOfflineCircularLoops(query);
  }

  /**
   * Stage 6.4: Station Services / Black Market Presence Ingestion
   * Queries Ananke GET /api/stations/services?service=blackmarket with embedded fallback.
   */
  async getBlackMarketStations(): Promise<StationBlackMarketInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/stations/services?service=blackmarket`);
      if (res.ok) {
        const data = await res.json();
        const list = data.stations || data.results || data;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((item: any) => ({
            stationId: item.stationId || item.station_id || item.id,
            stationName: item.stationName || item.station_name || item.name,
            systemName: item.systemName || item.system_name,
            hasBlackMarket: true,
            government: item.government || 'Democracy',
            allegiance: item.allegiance || 'Independent',
            securityLevel: item.securityLevel || item.security || 'Medium',
            prohibitedCommodities: item.prohibitedCommodities || item.prohibited || [],
            policePatrolDensity: item.policePatrolDensity || item.patrol_density || 'Moderate',
            scanningRiskScore: Number(item.scanningRiskScore || item.scanning_risk || 50),
            heatSignatureThreshold: Number(item.heatSignatureThreshold || item.heat_threshold || 20),
          }));
        }
      }
    } catch {
      // Fallback to embedded canonical black markets
    }
    return CANONICAL_BLACK_MARKETS;
  }

  /**
   * Stage 6.4: Black Market Smuggling Route Triangulator
   * Connects to Ananke POST /api/trade/smuggle or falls back to internal simulation triangulator.
   */
  async getSmugglingRoutes(query: SmugglingQuery): Promise<SmugglingRouteOpportunity[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/trade/smuggle`, {
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
          target_jurisdiction: query.targetJurisdiction,
          illicit_commodity_filter: query.illicitCommodityFilter,
          cargo_condition: query.cargoCondition,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const routes = data.routes || data.opportunities || data.results || data;
        if (Array.isArray(routes) && routes.length > 0) {
          return routes.map((r: any) => ({
            id: r.id || `smuggle_${Date.now()}_${Math.random()}`,
            commodityName: r.commodityName || r.commodity_name || r.commodity,
            commodityCategory: r.commodityCategory || r.category || 'Weapons',
            isStolen: !!(r.isStolen || r.is_stolen),
            sourceSystem: r.sourceSystem || r.source_system,
            sourceStation: r.sourceStation || r.source_station,
            sourcePadSize: normalizeLandingPad(r.sourcePadSize || r.source_pad_size),
            sourceDistanceLs: Number(r.sourceDistanceLs || r.source_distance_ls || 500),
            sourceIsPlanetary: !!(r.sourceIsPlanetary || r.source_is_planetary),
            sourceBuyPrice: Number(r.sourceBuyPrice || r.source_buy_price || 0),
            sourceSupply: Number(r.sourceSupply || r.source_supply || 1000),
            sourceGovernment: r.sourceGovernment || r.source_government || 'Corporate',
            sourceSecurity: r.sourceSecurity || r.source_security || 'Medium',
            sourceLegality: r.sourceLegality || r.source_legality || 'Legal',
            targetSystem: r.targetSystem || r.target_system,
            targetStation: r.targetStation || r.target_station,
            targetPadSize: normalizeLandingPad(r.targetPadSize || r.target_pad_size),
            targetDistanceLs: Number(r.targetDistanceLs || r.target_distance_ls || 500),
            targetIsPlanetary: !!(r.targetIsPlanetary || r.target_is_planetary),
            targetBlackMarketPrice: Number(r.targetBlackMarketPrice || r.target_black_market_price || r.sellPrice || 0),
            targetDemand: Number(r.targetDemand || r.target_demand || 10000),
            targetGovernment: r.targetGovernment || r.target_government || 'Democracy',
            targetAllegiance: r.targetAllegiance || r.target_allegiance || 'Federation',
            targetSecurity: r.targetSecurity || r.target_security || 'High',
            targetHasBlackMarket: true,
            targetLegality: r.targetLegality || r.target_legality || 'Prohibited (Smuggle)',
            policePatrolDensity: r.policePatrolDensity || r.police_patrol_density || 'Moderate',
            scanningRiskFactor: Number(r.scanningRiskFactor || r.scanning_risk_factor || 50),
            fineRiskCreditsPerTon: Number(r.fineRiskCreditsPerTon || r.fine_risk_credits_per_ton || 0),
            jumpDistanceLy: Number(r.jumpDistanceLy || r.jump_distance_ly || 10),
            jumpsCount: Number(r.jumpsCount || r.jumps_count || 1),
            unitsTraded: Number(r.unitsTraded || r.units_traded || query.cargoCapacity),
            totalInvestmentCr: Number(r.totalInvestmentCr || r.total_investment_cr || 0),
            grossProfitPerTon: Number(r.grossProfitPerTon || r.gross_profit_per_ton || 0),
            netProfitPerTon: Number(r.netProfitPerTon || r.net_profit_per_ton || 0),
            totalNetProfit: Number(r.totalNetProfit || r.total_net_profit || 0),
            estimatedFlightDurationMin: Number(r.estimatedFlightDurationMin || r.estimated_flight_duration_min || 5),
            estimatedCrPerHour: Number(r.estimatedCrPerHour || r.estimated_cr_per_hour || 0),
            smugglingTips: r.smugglingTips || r.tips || [],
            sourceCoords: r.sourceCoords || r.source_coords,
          }));
        }
      }
    } catch {
      // Fallback to internal simulation triangulator
    }

    return calculateOfflineSmugglingRoutes(query);
  }

  /**
   * Stage 13.1: Material Traders Triangulator (Raw, Encoded, Manufactured)
   * Queries GET /api/stations/traders on Ananke with fallback to canonical embedded registry.
   */
  async getMaterialTraders(referenceSystem: string = 'Sol'): Promise<import('./material_trader_engine').MaterialTraderStation[]> {
    const { CANONICAL_MATERIAL_TRADERS, calculateEuclideanDistanceLy } = await import('./material_trader_engine');
    try {
      const resp = await fetch(`${this.baseUrl}/api/stations/traders?system=${encodeURIComponent(referenceSystem)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const traders = Array.isArray(data) ? data : data.traders;
        if (Array.isArray(traders) && traders.length > 0) {
          return traders.map((t: any) => ({
            id: t.id || `${t.system_name || t.systemName}_${t.station_name || t.stationName}`,
            stationName: t.station_name || t.stationName || 'Station',
            systemName: t.system_name || t.systemName || referenceSystem,
            systemCoords: {
              x: Number(t.system_coords?.x ?? t.coords?.x ?? 0),
              y: Number(t.system_coords?.y ?? t.coords?.y ?? 0),
              z: Number(t.system_coords?.z ?? t.coords?.z ?? 0),
            },
            traderType: t.trader_type || t.traderType || 'Manufactured',
            economy: t.economy || 'Industrial',
            landingPad: (t.landing_pad || t.landingPad || 'L') as import('./material_trader_engine').LandingPadSize,
            stationType: t.station_type || t.stationType || 'Coriolis Starport',
            distanceLs: Number(t.distance_ls ?? t.distanceLs ?? 250),
            controllingFaction: t.controlling_faction || t.controllingFaction,
            allegiance: t.allegiance,
            distanceLy: Number(t.distance_ly ?? t.distanceLy ?? 0),
          }));
        }
      }
    } catch {
      // Fallback
    }

    // Resolve reference system coordinates
    let refCoords = { x: 0, y: 0, z: 0 };
    const refSys = await this.getSystemByName(referenceSystem);
    if (refSys) {
      refCoords = { x: refSys.x, y: refSys.y, z: refSys.z };
    } else if (referenceSystem.toLowerCase() === 'deciat') {
      refCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    }

    return CANONICAL_MATERIAL_TRADERS.map((t) => ({
      ...t,
      distanceLy: calculateEuclideanDistanceLy(refCoords, t.systemCoords),
    }));
  }

  /**
   * Stage 13.2: Technology Brokers & Experimental Weaponry Unlocks
   * Queries GET /api/stations/tech-brokers with fallback to canonical embedded registry.
   */
  async getTechnologyBrokers(referenceSystem: string = 'Sol'): Promise<import('./technology_broker_engine').TechBrokerStation[]> {
    const { CANONICAL_TECH_BROKERS, calculateEuclideanDistanceLy } = await import('./technology_broker_engine');
    try {
      const resp = await fetch(`${this.baseUrl}/api/stations/tech-brokers?system=${encodeURIComponent(referenceSystem)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const brokers = Array.isArray(data) ? data : data.brokers;
        if (Array.isArray(brokers) && brokers.length > 0) {
          return brokers.map((b: any) => ({
            id: b.id || `${b.system_name || b.systemName}_${b.station_name || b.stationName}`,
            stationName: b.station_name || b.stationName || 'Station',
            systemName: b.system_name || b.systemName || referenceSystem,
            systemCoords: {
              x: Number(b.system_coords?.x ?? b.coords?.x ?? 0),
              y: Number(b.system_coords?.y ?? b.coords?.y ?? 0),
              z: Number(b.system_coords?.z ?? b.coords?.z ?? 0),
            },
            brokerType: (b.broker_type || b.brokerType || 'Guardian') as import('./technology_broker_engine').BrokerType,
            economy: b.economy || 'High Tech',
            landingPad: (b.landing_pad || b.landingPad || 'L') as import('./technology_broker_engine').LandingPadSize,
            stationType: b.station_type || b.stationType || 'Starport',
            distanceLs: Number(b.distance_ls ?? b.distanceLs ?? 250),
            controllingFaction: b.controlling_faction || b.controllingFaction,
            allegiance: b.allegiance,
            distanceLy: Number(b.distance_ly ?? b.distanceLy ?? 0),
          }));
        }
      }
    } catch {
      // Fallback to internal registry
    }

    // Resolve reference system coordinates
    let refCoords = { x: 0, y: 0, z: 0 };
    const refSys = await this.getSystemByName(referenceSystem);
    if (refSys) {
      refCoords = { x: refSys.x, y: refSys.y, z: refSys.z };
    } else if (referenceSystem.toLowerCase() === 'deciat') {
      refCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    }

    return CANONICAL_TECH_BROKERS.map((b) => ({
      ...b,
      distanceLy: calculateEuclideanDistanceLy(refCoords, b.systemCoords),
    }));
  }

  /**
   * Stage 13.3: Interstellar Factors Triangulator & Anti-Local Faction Safety Filter
   * Queries GET /api/stations/services?service=interstellar_factors on Ananke with fallback to canonical registry.
   */
  async getInterstellarFactors(referenceSystem: string = 'Sol'): Promise<import('./interstellar_factors_engine').InterstellarFactorStation[]> {
    const { CANONICAL_INTERSTELLAR_FACTORS, calculateEuclideanDistanceLy } = await import('./interstellar_factors_engine');
    try {
      const resp = await fetch(`${this.baseUrl}/api/stations/services?service=interstellar_factors&system=${encodeURIComponent(referenceSystem)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const stations = Array.isArray(data) ? data : (data.stations || data.factors);
        if (Array.isArray(stations) && stations.length > 0) {
          return stations.map((s: any) => ({
            id: s.id || `${s.system_name || s.systemName}_${s.station_name || s.stationName}`,
            stationName: s.station_name || s.stationName || 'Station',
            systemName: s.system_name || s.systemName || referenceSystem,
            systemCoords: {
              x: Number(s.system_coords?.x ?? s.coords?.x ?? 0),
              y: Number(s.system_coords?.y ?? s.coords?.y ?? 0),
              z: Number(s.system_coords?.z ?? s.coords?.z ?? 0),
            },
            systemSecurity: (s.security || s.systemSecurity || 'Low') as 'Anarchy' | 'Low' | 'Medium' | 'High',
            economy: s.economy || 'Refinery',
            landingPad: (s.landing_pad || s.landingPad || 'L') as import('./interstellar_factors_engine').LandingPadSize,
            stationType: s.station_type || s.stationType || 'Starport',
            distanceLs: Number(s.distance_ls ?? s.distanceLs ?? 300),
            controllingFaction: s.controlling_faction || s.controllingFaction || 'Independent',
            allegiance: (s.allegiance || 'Independent') as import('./interstellar_factors_engine').SuperpowerAllegiance,
            factionsPresent: Array.isArray(s.factions_present || s.factionsPresent)
              ? (s.factions_present || s.factionsPresent).map((f: any) => ({
                  factionName: f.faction_name || f.name || f.factionName || '',
                  influence: Number(f.influence ?? 0),
                  allegiance: f.allegiance,
                  isControlling: Boolean(f.is_controlling || f.isControlling),
                }))
              : [],
            distanceLy: Number(s.distance_ly ?? s.distanceLy ?? 0),
          }));
        }
      }
    } catch {
      // Fallback to internal registry
    }

    // Resolve reference system coordinates
    let refCoords = { x: 0, y: 0, z: 0 };
    const refSys = await this.getSystemByName(referenceSystem);
    if (refSys) {
      refCoords = { x: refSys.x, y: refSys.y, z: refSys.z };
    } else if (referenceSystem.toLowerCase() === 'deciat') {
      refCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    }

    return CANONICAL_INTERSTELLAR_FACTORS.map((s) => ({
      ...s,
      distanceLy: calculateEuclideanDistanceLy(refCoords, s.systemCoords),
    }));
  }

  /**
   * Stage 13.4: Ingest Anarchy Havens and Lawless Pirate Stations
   * Queries /api/stations/anarchy or falls back to internal canonical registry.
   */
  async getAnarchyHavens(referenceSystem = 'Deciat'): Promise<import('./anarchy_havens_engine').AnarchyHavenStation[]> {
    const { CANONICAL_ANARCHY_HAVENS, calculateEuclideanDistanceLy: calcDist } = await import('./anarchy_havens_engine');
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/stations/anarchy?reference_system=${encodeURIComponent(referenceSystem)}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.havens || json.stations || json;
        if (Array.isArray(items) && items.length > 0) {
          return items;
        }
      }
    } catch {
      // Fallback to internal registry
    }

    let refCoords = { x: 0, y: 0, z: 0 };
    const refSys = await this.getSystemByName(referenceSystem);
    if (refSys) {
      refCoords = { x: refSys.x, y: refSys.y, z: refSys.z };
    } else if (referenceSystem.toLowerCase() === 'deciat') {
      refCoords = { x: 122.625, y: -0.3125, z: -47.28125 };
    }

    return CANONICAL_ANARCHY_HAVENS.map((haven) => ({
      ...haven,
      distanceLy: calcDist(refCoords, haven.systemCoords),
    }));
  }

  /**
   * Stage 14.1: Ingest Live Thargoid War Frontline & Titan Maelstrom State
   * Ingests GET /api/thargoid/war-state or falls back to internal canonical war state.
   */
  async getThargoidWarState(): Promise<import('./thargoid_war_engine').WarStateOverview> {
    const { compileWarStateOverview, CANONICAL_TITANS, CANONICAL_WAR_SYSTEMS } = await import('./thargoid_war_engine');
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/api/thargoid/war-state`);
      if (res.ok) {
        const json = await res.json();
        if (json && (json.titans || json.systems)) {
          return compileWarStateOverview(json.titans || CANONICAL_TITANS, json.systems || CANONICAL_WAR_SYSTEMS);
        }
      }
    } catch {
      // Fallback to internal canonical dataset
    }
    return compileWarStateOverview(CANONICAL_TITANS, CANONICAL_WAR_SYSTEMS);
  }
}

export const ananke = new AnankeClient();




