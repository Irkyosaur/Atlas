// Location: client/src/lib/engine/exobiology_predictor.ts
// Stage 16.3: Exobiology Value Predictor & Vista Genomics Payout Calculator Engine
// Evaluates planetary environmental conditions (atmospheric composition, gravity, temperature, volcanism)
// to predict biological species presence, confidence probabilities, and calculate total Vista Genomics payouts (base & 5x first discovery).

import {
  EXOBIOLOGY_SPECIES_CATALOG,
  VISTA_FIRST_DISCOVERY_MULTIPLIER,
  type ExobiologySpecies
} from './exobiology_taxonomy';

export interface PlanetaryAtmosphereComposition {
  name: string; // e.g. "Carbon dioxide", "Argon", "Nitrogen", "Methane", "Oxygen", "Sulfur dioxide", "Water", "Ammonia"
  percent: number; // 0 to 100
}

export interface PlanetaryBioEvaluationInput {
  bodyName?: string;
  bodyType?: string; // e.g. "High metal content body", "Rocky body", "Icy body"
  gravityG: number;
  surfaceTemperatureK: number;
  surfacePressureAtm?: number;
  atmosphereType?: string;
  atmosphereComposition?: PlanetaryBioEvaluationInputAtmosphere[] | Record<string, number>;
  volcanism?: string;
  isLandable?: boolean;
}

export interface PlanetaryBioEvaluationInputAtmosphere {
  name: string;
  percent: number;
}

export interface PredictedBioSpeciesResult {
  species: ExobiologySpecies;
  probability: number;            // 0.00 to 1.00
  percentageFormatted: string;    // e.g. "94.2%"
  isHighValueTarget: boolean;     // > 10,000,000 CR base value
  suitabilityScore: number;       // 0 to 100
  payoutBaseCr: number;
  payoutFirstDiscoveryCr: number;
  matchedConditions: string[];
  unmatchedWarnings: string[];
}

export interface ExobiologyEvaluationReport {
  bodyName: string;
  isEligibleForExobiology: boolean;
  ineligibilityReason?: string;
  inputSummary: {
    gravityG: number;
    temperatureK: number;
    atmosphere: string;
    volcanism: string;
  };
  predictedSpecies: PredictedBioSpeciesResult[];
  mostProbableSpecies: PredictedBioSpeciesResult | null;
  highestValueSpecies: PredictedBioSpeciesResult | null;
  totalEstimatedBasePayoutCr: number;
  totalEstimatedFirstDiscoveryCr: number;
  expectedSpeciesCount: number;
  recommendation: 'HIGH_PRIORITY_SURVEY' | 'STANDARD_SURVEY' | 'LOW_VALUE' | 'UNINHABITABLE';
}

export interface RouteExobiologyItem {
  systemName: string;
  bodyName: string;
  distanceLs: number;
  species: ExobiologySpecies;
  isFirstDiscovery: boolean;
}

export interface RouteBioValueSummary {
  totalWaypoints: number;
  totalSpeciesScans: number;
  totalBaseCredits: number;
  totalFirstDiscoveryCredits: number;
  projectedTotalCredits: number;
  highestSingleSpeciesPayout: number;
  estimatedSurveyTimeMinutes: number;
}

export class ExobiologyPredictor {
  /**
   * Normalizes atmospheric string and composition list into parsed component tokens.
   */
  public parseAtmosphericSignature(
    atmosphereType?: string,
    composition?: PlanetaryBioEvaluationInputAtmosphere[] | Record<string, number>
  ): { mainType: string; components: string[] } {
    const mainType = (atmosphereType || 'No atmosphere').trim();
    const detected = new Set<string>();

    const checkString = (str: string) => {
      const lower = str.toLowerCase();
      if (lower.includes('carbon dioxide') || lower.includes('co2')) detected.add('Carbon dioxide');
      if (lower.includes('argon')) detected.add('Argon');
      if (lower.includes('nitrogen')) detected.add('Nitrogen');
      if (lower.includes('methane')) detected.add('Methane');
      if (lower.includes('oxygen')) detected.add('Oxygen');
      if (lower.includes('sulfur dioxide') || lower.includes('sulphur dioxide') || lower.includes('so2')) detected.add('Sulfur dioxide');
      if (lower.includes('water')) detected.add('Water');
      if (lower.includes('ammonia')) detected.add('Ammonia');
      if (lower.includes('neon')) detected.add('Neon');
      if (lower.includes('helium')) detected.add('Helium');
    };

    checkString(mainType);

    if (Array.isArray(composition)) {
      for (const comp of composition) {
        if (comp.percent > 0) checkString(comp.name);
      }
    } else if (composition && typeof composition === 'object') {
      for (const [name, pct] of Object.entries(composition)) {
        if (pct > 0) checkString(name);
      }
    }

    return {
      mainType,
      components: Array.from(detected)
    };
  }

  /**
   * Evaluates a planetary body against the exobiology matrix.
   */
  public evaluateBody(input: PlanetaryBioEvaluationInput): ExobiologyEvaluationReport {
    const bodyName = input.bodyName || 'Target Body';
    const gravity = Math.max(0, input.gravityG || 0);
    const tempK = Math.max(0, input.surfaceTemperatureK || 0);
    const volcanism = (input.volcanism || 'None').trim();
    const hasVolcanism = volcanism.toLowerCase() !== 'none' && volcanism.toLowerCase() !== 'no volcanism' && volcanism.length > 0;

    const parsedAtmo = this.parseAtmosphericSignature(input.atmosphereType, input.atmosphereComposition);

    // Pre-flight check: Odyssey exobiology only occurs on landable bodies with atmospheres (mostly tenuous atmospheres < 0.1 atm)
    // Non-landable or completely airless vacuum bodies without biological signals cannot support Odyssey flora.
    const isLandable = input.isLandable !== false;
    const isAirless = parsedAtmo.mainType.toLowerCase() === 'no atmosphere' || parsedAtmo.mainType.toLowerCase() === 'none';

    if (!isLandable) {
      return {
        bodyName,
        isEligibleForExobiology: false,
        ineligibilityReason: 'Body is not landable for on-foot Odyssey planetary survey.',
        inputSummary: {
          gravityG: gravity,
          temperatureK: tempK,
          atmosphere: parsedAtmo.mainType,
          volcanism
        },
        predictedSpecies: [],
        mostProbableSpecies: null,
        highestValueSpecies: null,
        totalEstimatedBasePayoutCr: 0,
        totalEstimatedFirstDiscoveryCr: 0,
        expectedSpeciesCount: 0,
        recommendation: 'UNINHABITABLE'
      };
    }

    if (isAirless) {
      return {
        bodyName,
        isEligibleForExobiology: false,
        ineligibilityReason: 'Airless vacuum body lacks required atmospheric envelope for plant/microbial colonization.',
        inputSummary: {
          gravityG: gravity,
          temperatureK: tempK,
          atmosphere: parsedAtmo.mainType,
          volcanism
        },
        predictedSpecies: [],
        mostProbableSpecies: null,
        highestValueSpecies: null,
        totalEstimatedBasePayoutCr: 0,
        totalEstimatedFirstDiscoveryCr: 0,
        expectedSpeciesCount: 0,
        recommendation: 'UNINHABITABLE'
      };
    }

    const predictions: PredictedBioSpeciesResult[] = [];

    for (const species of EXOBIOLOGY_SPECIES_CATALOG) {
      const matchDetails = this.scoreSpeciesCompatibility(species, gravity, tempK, parsedAtmo, hasVolcanism);
      if (matchDetails.probability >= 0.15) {
        predictions.push({
          species,
          probability: matchDetails.probability,
          percentageFormatted: `${(matchDetails.probability * 100).toFixed(1)}%`,
          isHighValueTarget: species.basePayoutCr >= 10000000,
          suitabilityScore: Math.round(matchDetails.probability * 100),
          payoutBaseCr: species.basePayoutCr,
          payoutFirstDiscoveryCr: species.firstDiscoveryPayoutCr,
          matchedConditions: matchDetails.matchedConditions,
          unmatchedWarnings: matchDetails.unmatchedWarnings
        });
      }
    }

    // Sort predictions by suitability score descending
    predictions.sort((a, b) => b.probability - a.probability);

    // Identify top species
    const mostProbable = predictions.length > 0 ? predictions[0] : null;
    const highestVal = [...predictions].sort((a, b) => b.payoutFirstDiscoveryCr - a.payoutFirstDiscoveryCr)[0] || null;

    // Estimate realistic expected species count (usually 1 - 6 biological signals per planet)
    // Filter high-confidence candidates (prob >= 0.50)
    const probableCount = predictions.filter((p) => p.probability >= 0.50).length;
    const expectedSpeciesCount = Math.min(8, Math.max(predictions.length > 0 ? 1 : 0, probableCount));

    // Calculate sum payouts of top expected species
    const topPicks = predictions.slice(0, Math.max(1, expectedSpeciesCount));
    const totalBase = topPicks.reduce((acc, p) => acc + p.payoutBaseCr, 0);
    const totalFirst = topPicks.reduce((acc, p) => acc + p.payoutFirstDiscoveryCr, 0);

    let recommendation: 'HIGH_PRIORITY_SURVEY' | 'STANDARD_SURVEY' | 'LOW_VALUE' | 'UNINHABITABLE' = 'LOW_VALUE';
    if (predictions.length === 0) {
      recommendation = 'UNINHABITABLE';
    } else if (highestVal && highestVal.payoutFirstDiscoveryCr >= 50000000) {
      recommendation = 'HIGH_PRIORITY_SURVEY';
    } else if (totalBase >= 3000000) {
      recommendation = 'STANDARD_SURVEY';
    }

    return {
      bodyName,
      isEligibleForExobiology: predictions.length > 0,
      inputSummary: {
        gravityG: gravity,
        temperatureK: tempK,
        atmosphere: parsedAtmo.mainType,
        volcanism
      },
      predictedSpecies: predictions,
      mostProbableSpecies: mostProbable,
      highestValueSpecies: highestVal,
      totalEstimatedBasePayoutCr: totalBase,
      totalEstimatedFirstDiscoveryCr: totalFirst,
      expectedSpeciesCount,
      recommendation
    };
  }

  /**
   * Multi-variable scoring function weighing gravity, temperature, atmospheric composition, and volcanism.
   */
  private scoreSpeciesCompatibility(
    species: ExobiologySpecies,
    gravity: number,
    tempK: number,
    atmosphere: { mainType: string; components: string[] },
    hasVolcanism: boolean
  ): { probability: number; matchedConditions: string[]; unmatchedWarnings: string[] } {
    const matchedConditions: string[] = [];
    const unmatchedWarnings: string[] = [];

    let score = 1.0;

    // 1. Gravity Scoring
    const minG = species.habitatRules.minGravityG;
    const maxG = species.habitatRules.maxGravityG;
    if (gravity >= minG && gravity <= maxG) {
      matchedConditions.push(`Surface Gravity (${gravity.toFixed(2)} G) within ideal genus window [${minG}-${maxG} G]`);
    } else if (gravity < minG) {
      const diff = minG - gravity;
      score *= Math.max(0.1, 1 - (diff / minG) * 1.5);
      unmatchedWarnings.push(`Gravity too low (${gravity.toFixed(2)} G vs min ${minG} G)`);
    } else {
      const diff = gravity - maxG;
      score *= Math.max(0.05, 1 - (diff / maxG) * 2.0);
      unmatchedWarnings.push(`Gravity too high (${gravity.toFixed(2)} G vs max ${maxG} G)`);
    }

    // 2. Temperature Scoring
    const minT = species.habitatRules.minTempK;
    const maxT = species.habitatRules.maxTempK;
    if (tempK >= minT && tempK <= maxT) {
      matchedConditions.push(`Surface Temp (${tempK.toFixed(0)} K) fits thermal envelope [${minT}-${maxT} K]`);
    } else if (tempK < minT) {
      const diff = minT - tempK;
      score *= Math.max(0.05, 1 - diff / 100);
      unmatchedWarnings.push(`Surface too cold (${tempK.toFixed(0)} K vs min ${minT} K)`);
    } else {
      const diff = tempK - maxT;
      score *= Math.max(0.05, 1 - diff / 100);
      unmatchedWarnings.push(`Surface too hot (${tempK.toFixed(0)} K vs max ${maxT} K)`);
    }

    // 3. Atmospheric Composition Matching
    const reqAtmos = species.habitatRules.requiredAtmospheres;
    if (reqAtmos && reqAtmos.length > 0) {
      let matchedAtmo = false;
      const fullAtmoStr = `${atmosphere.mainType} ${atmosphere.components.join(' ')}`.toLowerCase();

      for (const req of reqAtmos) {
        if (fullAtmoStr.includes(req.toLowerCase())) {
          matchedAtmo = true;
          matchedConditions.push(`Atmosphere match: detected ${req}`);
          break;
        }
      }

      if (!matchedAtmo) {
        score *= 0.15; // Heavy penalty if atmospheric chemistry doesn't match
        unmatchedWarnings.push(`Incompatible atmosphere (${atmosphere.mainType}); requires one of: ${reqAtmos.join(', ')}`);
      }
    }

    // 4. Volcanism Requirement
    if (species.habitatRules.volcanismRequirement === 'Required') {
      if (hasVolcanism) {
        score *= 1.1; // Bonus for active geological features
        matchedConditions.push('Active volcanism matches hydrothermal/geothermal requirement');
      } else {
        score *= 0.05;
        unmatchedWarnings.push('Requires active hydrothermal/geothermal volcanism vent activity');
      }
    } else if (species.habitatRules.volcanismRequirement === 'Forbidden') {
      if (hasVolcanism) {
        score *= 0.2;
        unmatchedWarnings.push('Volcanically inactive crust required');
      }
    }

    const finalProb = Math.min(0.99, Math.max(0.0, score));

    return {
      probability: Number(finalProb.toFixed(3)),
      matchedConditions,
      unmatchedWarnings
    };
  }

  /**
   * Computes Vista Genomics payout calculation for a given species, taking into account first discovery bonus.
   */
  public calculatePayout(speciesId: string, isFirstDiscovery: boolean = true): {
    speciesName: string;
    basePayoutCr: number;
    bonusPayoutCr: number;
    totalPayoutCr: number;
    multiplier: number;
  } {
    const species = EXOBIOLOGY_SPECIES_CATALOG.find((s) => s.id === speciesId) || EXOBIOLOGY_SPECIES_CATALOG[0];
    const base = species.basePayoutCr;
    const multiplier = isFirstDiscovery ? VISTA_FIRST_DISCOVERY_MULTIPLIER : 1;
    const total = base * multiplier;
    const bonus = total - base;

    return {
      speciesName: species.fullName,
      basePayoutCr: base,
      bonusPayoutCr: bonus,
      totalPayoutCr: total,
      multiplier
    };
  }

  /**
   * Calculates route exobiology survey summary across multiple planetary bodies.
   */
  public calculateRouteBiologicalValue(items: RouteExobiologyItem[]): RouteBioValueSummary {
    let totalBase = 0;
    let totalFirst = 0;
    let projectedTotal = 0;
    let maxSingle = 0;
    const uniqueBodies = new Set<string>();

    for (const item of items) {
      uniqueBodies.add(`${item.systemName}:${item.bodyName}`);
      const base = item.species.basePayoutCr;
      const first = item.species.firstDiscoveryPayoutCr;
      const payout = item.isFirstDiscovery ? first : base;

      totalBase += base;
      totalFirst += first;
      projectedTotal += payout;
      if (payout > maxSingle) maxSingle = payout;
    }

    // Survey time estimation: ~10 mins per species (travel, descent, 3-sample traversal)
    const surveyTimeMin = items.length * 10;

    return {
      totalWaypoints: uniqueBodies.size,
      totalSpeciesScans: items.length,
      totalBaseCredits: totalBase,
      totalFirstDiscoveryCredits: totalFirst,
      projectedTotalCredits: projectedTotal,
      highestSingleSpeciesPayout: maxSingle,
      estimatedSurveyTimeMinutes: surveyTimeMin
    };
  }
}

export const exobiologyPredictor = new ExobiologyPredictor();
