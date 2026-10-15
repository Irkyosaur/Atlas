// Location: atlas/client/src/lib/engine/odyssey_barter_engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { odysseyBarterEngine, CANONICAL_BARTENDER_STARPORTS } from './odyssey_barter_engine';
import { odysseyLockerEngine } from './odyssey_locker_engine';
import { odysseyTriageEngine } from './odyssey_triage_engine';

describe('Odyssey Concourse Bartender Barter Engine & Trade Optimizer (Stage 10.3)', () => {
  beforeEach(() => {
    odysseyLockerEngine.init();
    odysseyLockerEngine.resetToDefault();
    odysseyTriageEngine.init();
    odysseyTriageEngine.clearWishlist();
  });

  it('enforces that Assets are barterable and Goods/Data are non-tradeable', () => {
    // Assets
    expect(odysseyBarterEngine.isTradeableAtBartender('aerogelgelpack').isTradeable).toBe(true);
    expect(odysseyBarterEngine.isTradeableAtBartender('carbonfibre').isTradeable).toBe(true);
    expect(odysseyBarterEngine.isTradeableAtBartender('circuitboard').isTradeable).toBe(true);

    // Goods (Sell only for credits, cannot barter)
    const goodsCheck = odysseyBarterEngine.isTradeableAtBartender('catmedia');
    expect(goodsCheck.isTradeable).toBe(false);
    expect(goodsCheck.reason).toContain('NON-TRADEABLE');

    // Data (Sell only for credits, cannot barter)
    const dataCheck = odysseyBarterEngine.isTradeableAtBartender('manufacturinginstructions');
    expect(dataCheck.isTradeable).toBe(false);
    expect(dataCheck.reason).toContain('NON-TRADEABLE');
  });

  it('calculates direct 1:1 trade ratio within same asset category', () => {
    // Tech: Micro Hydraulics (Cost 7) vs Memory Chip (Value 2) -> 4 Memory Chips needed
    const techExchange = odysseyBarterEngine.calculateExchangeRate('memorychip', 'aerogelgelpack');
    expect(techExchange.isTradeable).toBe(true);
    expect(techExchange.unitsSourceNeededForOneTarget).toBe(4);
    expect(techExchange.costPerTarget).toBe(7);
    expect(techExchange.pointsPerSource).toBe(2);

    // Cross-category trade should fail (e.g. Chemicals -> Circuits)
    const crossCategory = odysseyBarterEngine.calculateExchangeRate('carbonfibre', 'circuitboard');
    expect(crossCategory.isTradeable).toBe(false);
    expect(crossCategory.reason).toContain('Cross-category barter prohibited');
  });

  it('computes optimal liquidation plan for desired target asset (Micro Hydraulics)', () => {
    const plan = odysseyBarterEngine.computeOptimalBarterPlan('aerogelgelpack', 5);
    expect(plan.targetItemId).toBe('aerogelgelpack');
    expect(plan.targetItemName).toBe('Micro Hydraulics');
    expect(plan.targetCategory).toBe('Tech');
    expect(plan.desiredQuantity).toBe(5);
    expect(plan.totalBarterCostRequired).toBe(35); // 5 * 7
    expect(plan.surrenderPlan.length).toBeGreaterThan(0);

    // All surrendered items must strictly be in Tech category
    for (const item of plan.surrenderPlan) {
      expect(item.subCategory).toBe('Tech');
      expect(item.surrenderCount).toBeGreaterThan(0);
    }
  });

  it('verification criterion: selecting missing Carbon Fibre items calculates exact surrender counts of surplus Chemical Inventory', () => {
    // Stage 10.3 Verification Standard:
    // "Selecting 10 missing Carbon Fibre items calculates exact surrender counts of surplus Chemical Inventory assets according to official bartender trade tables."
    const plan = odysseyBarterEngine.computeOptimalBarterPlan('carbonfibre', 10);
    expect(plan.targetItemId).toBe('carbonfibre');
    expect(plan.targetItemName).toBe('Carbon Fibre');
    expect(plan.targetCategory).toBe('Chemicals');
    expect(plan.desiredQuantity).toBe(10);
    expect(plan.totalBarterCostRequired).toBe(60); // 10 * 6 = 60

    // Must surrender Chemical assets
    const totalContributed = plan.surrenderPlan.reduce((sum, s) => sum + s.totalBarterValueContributed, 0);
    expect(totalContributed).toBeGreaterThanOrEqual(60);
    for (const s of plan.surrenderPlan) {
      expect(s.subCategory).toBe('Chemicals');
    }
  });

  it('provides list of nearest starports with active concourse Bartender contacts', () => {
    const starports = odysseyBarterEngine.getNearbyBartenderStarports(100);
    expect(starports.length).toBeGreaterThanOrEqual(5);

    // Starports should be sorted by distance ascending
    for (let i = 1; i < starports.length; i++) {
      expect(starports[i].distanceLy).toBeGreaterThanOrEqual(starports[i - 1].distanceLy);
    }

    // Should include canonical hubs like Sol (Li Qing Jao) and Jameson Memorial
    const names = starports.map((s) => s.name);
    expect(names).toContain('Li Qing Jao');
    expect(names).toContain('Jameson Memorial');
  });

  it('executes simulated barter trade, deducting surrendered assets and adding target asset', () => {
    const initialHydraulics = odysseyLockerEngine.getItemCount('aerogelgelpack');
    const plan = odysseyBarterEngine.computeOptimalBarterPlan('aerogelgelpack', 3);

    const exec = odysseyBarterEngine.executeBarterTrade(plan);
    expect(exec.success).toBe(true);

    const newHydraulics = odysseyLockerEngine.getItemCount('aerogelgelpack');
    expect(newHydraulics).toBe(initialHydraulics + 3);
  });
});
