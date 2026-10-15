// Location: atlas/client/src/lib/engine/hierarchy_parser.ts
// Hierarchical System Data Parser mapping Ananke celestial bodies and stations into D3-compatible tree layouts (Task 3.1.1, 3.1.3, 3.1.4)

import type { BodyRecord, StationRecord } from '$engine/ananke_client';

export type HierarchyNodeType = 'star' | 'planet' | 'moon' | 'barycentre' | 'station' | 'root';

export interface HierarchyNodeData {
  id: string;
  name: string;
  type: HierarchyNodeType;
  subType: string;
  bodyId?: number;
  distanceLs?: number;
  radiusKm?: number;
  spectralClass?: string;
  landable?: boolean;
  atmosphere?: string;
  terraformable?: boolean;
  gravityG?: number;
  temperatureK?: number;
  stationType?: string;
  stationEconomy?: string;
  hasLargePads?: boolean;
  children?: HierarchyNodeData[];
  _children?: HierarchyNodeData[]; // For collapse/expand state
  subMoonCount?: number;
  orbitalStationCount?: number;
}

/**
 * Builds a canonical Sol solar system hierarchy fallback when offline or Ananke service is unavailable.
 */
export function buildSolHierarchyFallback(): HierarchyNodeData {
  return {
    id: 'sol_root',
    name: 'SOL',
    type: 'star',
    subType: 'G (White-Yellow) Star',
    spectralClass: 'G',
    radiusKm: 696340,
    temperatureK: 5778,
    children: [
      {
        id: 'mercury',
        name: 'Mercury',
        type: 'planet',
        subType: 'Metal-rich body',
        distanceLs: 193.0,
        radiusKm: 2439.7,
        gravityG: 0.38,
        landable: true,
      },
      {
        id: 'venus',
        name: 'Venus',
        type: 'planet',
        subType: 'High metal content world',
        distanceLs: 360.0,
        radiusKm: 6051.8,
        gravityG: 0.90,
        atmosphere: 'Hot thick carbon dioxide',
        landable: false,
      },
      {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        subType: 'Earth-like world',
        distanceLs: 499.0,
        radiusKm: 6371.0,
        gravityG: 1.0,
        atmosphere: 'Suitable for water-based life',
        landable: false,
        orbitalStationCount: 3,
        subMoonCount: 1,
        children: [
          {
            id: 'moon',
            name: 'Moon',
            type: 'moon',
            subType: 'Rocky body',
            distanceLs: 500.3,
            radiusKm: 1737.4,
            gravityG: 0.166,
            landable: true,
          },
          {
            id: 'earth_station_1',
            name: 'Li Qing Jao',
            type: 'station',
            subType: 'Coriolis Starport',
            distanceLs: 499.2,
            hasLargePads: true,
            stationEconomy: 'High Tech',
          },
          {
            id: 'earth_station_2',
            name: 'M. Gorbachev',
            type: 'station',
            subType: 'Orbis Starport',
            distanceLs: 499.4,
            hasLargePads: true,
            stationEconomy: 'Refinery',
          },
        ],
      },
      {
        id: 'mars',
        name: 'Mars',
        type: 'planet',
        subType: 'Earth-like world',
        distanceLs: 760.0,
        radiusKm: 3389.5,
        gravityG: 0.379,
        atmosphere: 'Terraformed carbon dioxide',
        terraformable: false,
        landable: false,
        subMoonCount: 2,
        children: [
          {
            id: 'phobos',
            name: 'Phobos',
            type: 'moon',
            subType: 'Rocky body',
            distanceLs: 760.05,
            radiusKm: 11.2,
            gravityG: 0.005,
            landable: true,
          },
          {
            id: 'deimos',
            name: 'Deimos',
            type: 'moon',
            subType: 'Rocky body',
            distanceLs: 760.1,
            radiusKm: 6.2,
            gravityG: 0.003,
            landable: true,
          },
        ],
      },
      {
        id: 'jupiter',
        name: 'Jupiter',
        type: 'planet',
        subType: 'Class I gas giant',
        distanceLs: 2595.0,
        radiusKm: 69911.0,
        gravityG: 2.53,
        landable: false,
        subMoonCount: 4,
        children: [
          { id: 'io', name: 'Io', type: 'moon', subType: 'Rocky body', distanceLs: 2596.4, radiusKm: 1821.6, gravityG: 0.183, landable: true },
          { id: 'europa', name: 'Europa', type: 'moon', subType: 'Icy body', distanceLs: 2597.2, radiusKm: 1560.8, gravityG: 0.134, landable: true },
          { id: 'ganymede', name: 'Ganymede', type: 'moon', subType: 'Rocky ice world', distanceLs: 2598.6, radiusKm: 2634.1, gravityG: 0.146, landable: true },
          { id: 'callisto', name: 'Callisto', type: 'moon', subType: 'Icy body', distanceLs: 2601.3, radiusKm: 2410.3, gravityG: 0.126, landable: true },
        ],
      },
      {
        id: 'saturn',
        name: 'Saturn',
        type: 'planet',
        subType: 'Class I gas giant',
        distanceLs: 4760.0,
        radiusKm: 58232.0,
        gravityG: 1.07,
        landable: false,
        subMoonCount: 3,
        children: [
          { id: 'titan', name: 'Titan', type: 'moon', subType: 'Icy body', distanceLs: 4764.1, radiusKm: 2574.7, gravityG: 0.14, atmosphere: 'Thick Methane', landable: true },
          { id: 'rhea_moon', name: 'Rhea', type: 'moon', subType: 'Icy body', distanceLs: 4761.8, radiusKm: 763.8, gravityG: 0.027, landable: true },
          { id: 'iapetus', name: 'Iapetus', type: 'moon', subType: 'Icy body', distanceLs: 4771.9, radiusKm: 734.5, gravityG: 0.023, landable: true },
        ],
      },
      {
        id: 'uranus',
        name: 'Uranus',
        type: 'planet',
        subType: 'Class II gas giant',
        distanceLs: 9580.0,
        radiusKm: 25362.0,
        gravityG: 0.89,
        landable: false,
        subMoonCount: 2,
        children: [
          { id: 'titania', name: 'Titania', type: 'moon', subType: 'Icy body', distanceLs: 9581.5, radiusKm: 788.4, gravityG: 0.038, landable: true },
          { id: 'oberon', name: 'Oberon', type: 'moon', subType: 'Icy body', distanceLs: 9582.0, radiusKm: 761.4, gravityG: 0.036, landable: true },
        ],
      },
      {
        id: 'neptune',
        name: 'Neptune',
        type: 'planet',
        subType: 'Class II gas giant',
        distanceLs: 15000.0,
        radiusKm: 24622.0,
        gravityG: 1.14,
        landable: false,
        subMoonCount: 1,
        children: [
          { id: 'triton', name: 'Triton', type: 'moon', subType: 'Icy body', distanceLs: 15001.2, radiusKm: 1353.4, gravityG: 0.079, landable: true },
        ],
      },
      {
        id: 'pluto_charon_bary',
        name: 'Pluto-Charon Barycentre',
        type: 'barycentre',
        subType: 'Barycentre',
        distanceLs: 19800.0,
        children: [
          { id: 'pluto', name: 'Pluto', type: 'planet', subType: 'Icy body', distanceLs: 19800.1, radiusKm: 1188.3, gravityG: 0.063, landable: true },
          { id: 'charon', name: 'Charon', type: 'moon', subType: 'Icy body', distanceLs: 19800.2, radiusKm: 606.0, gravityG: 0.029, landable: true },
        ],
      },
    ],
  };
}

/**
 * Parses raw bodies and stations lists into a D3-compliant hierarchical tree.
 */
export function parseSystemHierarchy(
  systemName: string,
  bodies: BodyRecord[],
  stations: StationRecord[] = []
): HierarchyNodeData {
  if (!bodies || bodies.length === 0) {
    if (systemName.toUpperCase() === 'SOL') {
      return buildSolHierarchyFallback();
    }
    // Generic fallback root
    return {
      id: `${systemName}_root`,
      name: systemName.toUpperCase(),
      type: 'star',
      subType: 'G (White-Yellow) Star',
      spectralClass: 'G',
      children: [],
    };
  }

  // Map bodies by bodyId
  const nodeMap = new Map<number, HierarchyNodeData>();
  const parentMap = new Map<number, { parentId: number; parentType: string }>();

  // Find primary star or main root
  let primaryStarNode: HierarchyNodeData | null = null;

  for (const b of bodies) {
    const isStar = (b.type?.toLowerCase().includes('star') ?? false) || b.mainStar || b.spectralClass !== undefined;
    const isBary = b.type?.toLowerCase().includes('barycentre') ?? false;
    let nodeType: HierarchyNodeType = 'planet';

    if (isStar) nodeType = 'star';
    else if (isBary) nodeType = 'barycentre';
    else if (b.distanceToArrival && b.distanceToArrival > 0) {
      // Determined based on parentage later
      nodeType = 'planet';
    }

    const node: HierarchyNodeData = {
      id: `body_${b.bodyId}`,
      name: b.name,
      type: nodeType,
      subType: b.subType || b.type || 'Celestial Body',
      bodyId: b.bodyId,
      distanceLs: b.distanceToArrival ?? 0,
      radiusKm: b.radius ? Math.round(b.radius) : undefined,
      spectralClass: b.spectralClass || (isStar ? 'G' : undefined),
      landable: b.landable ?? b.isLandable ?? false,
      atmosphere: b.atmosphereType,
      terraformable: (b.terraformState || b.terraformingState || '').toLowerCase().includes('terraform'),
      gravityG: b.gravity ? Math.round(b.gravity * 100) / 100 : undefined,
      temperatureK: b.surfaceTemperature,
      children: [],
    };

    nodeMap.set(b.bodyId, node);

    if (b.mainStar || (!primaryStarNode && isStar)) {
      primaryStarNode = node;
    }

    // Parse parent pointer if available: parents is an array of objects e.g. [{"Planet": 1}, {"Star": 0}] or [{"Null": 2}]
    if (b.parents && Array.isArray(b.parents) && b.parents.length > 0) {
      const immediateParent = b.parents[0];
      const parentType = Object.keys(immediateParent)[0];
      const parentId = immediateParent[parentType];
      parentMap.set(b.bodyId, { parentId, parentType });
    }
  }

  // Link children to parents
  const rootCandidates: HierarchyNodeData[] = [];

  for (const [bodyId, node] of nodeMap.entries()) {
    const parentInfo = parentMap.get(bodyId);

    if (parentInfo && nodeMap.has(parentInfo.parentId)) {
      const parentNode = nodeMap.get(parentInfo.parentId)!;
      if (!parentNode.children) {
        parentNode.children = [];
      }
      // If parent is a planet or barycentre, this child is a moon or binary component
      if (parentNode.type === 'planet' || parentNode.type === 'moon') {
        node.type = 'moon';
      }
      parentNode.children.push(node);
    } else {
      rootCandidates.push(node);
    }
  }

  // Attach stations to their nearest celestial body
  for (const st of stations) {
    const stationNode: HierarchyNodeData = {
      id: `station_${st.id}`,
      name: st.name,
      type: 'station',
      subType: st.type,
      distanceLs: st.distanceToArrival,
      hasLargePads: st.hasLargePads,
      stationEconomy: st.economy,
      children: [],
    };

    // Find closest body to arrival distance
    let closestBody: HierarchyNodeData | null = null;
    let minDiff = Infinity;

    for (const bNode of nodeMap.values()) {
      if (bNode.type === 'planet' || bNode.type === 'star') {
        const diff = Math.abs((bNode.distanceLs ?? 0) - st.distanceToArrival);
        if (diff < minDiff) {
          minDiff = diff;
          closestBody = bNode;
        }
      }
    }

    if (closestBody && minDiff < 50.0) {
      if (!closestBody.children) closestBody.children = [];
      closestBody.children.push(stationNode);
      closestBody.orbitalStationCount = (closestBody.orbitalStationCount ?? 0) + 1;
    } else if (primaryStarNode) {
      if (!primaryStarNode.children) primaryStarNode.children = [];
      primaryStarNode.children.push(stationNode);
      primaryStarNode.orbitalStationCount = (primaryStarNode.orbitalStationCount ?? 0) + 1;
    }
  }

  // Calculate badge counts (subMoons and orbital stations)
  const computeBadges = (n: HierarchyNodeData) => {
    let subMoons = 0;
    let stationsCount = 0;

    if (n.children) {
      for (const child of n.children) {
        if (child.type === 'moon') subMoons++;
        if (child.type === 'station') stationsCount++;
        computeBadges(child);
      }
    }
    n.subMoonCount = (n.subMoonCount ?? 0) + subMoons;
    n.orbitalStationCount = (n.orbitalStationCount ?? 0) + stationsCount;
  };

  const root = primaryStarNode || rootCandidates[0] || buildSolHierarchyFallback();
  computeBadges(root);

  return root;
}
