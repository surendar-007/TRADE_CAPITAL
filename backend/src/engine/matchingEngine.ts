import { Invoice, CapitalProvider, RiskAssessment, AgentLog } from '../models/types';

export interface MatchResult {
  provider: CapitalProvider;
  isEligible: boolean;
  exclusionReason?: string;
  suitabilityScore: number;
}

export class MatchingEngine {
  public static discoverAndFilterProviders(
    invoice: Invoice,
    risk: RiskAssessment,
    providers: CapitalProvider[]
  ): { matches: MatchResult[]; logs: AgentLog[] } {
    const logs: AgentLog[] = [];
    const matches: MatchResult[] = [];

    providers.forEach(provider => {
      const currentBuyerExp = provider.buyerExposures[invoice.buyerId] || 0;
      const projectedBuyerExp = currentBuyerExp + invoice.amountLakhs;
      const minRequired = invoice.minRequiredAmountLakhs || (invoice.amountLakhs * 0.7);

      // Check 1: Liquidity availability
      if (provider.availableLiquidityLakhs < minRequired) {
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `Insufficient liquidity: Available ₹${provider.availableLiquidityLakhs.toFixed(1)}L < Required ₹${minRequired.toFixed(1)}L`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Insufficient deployable liquidity.`
        });
        return;
      }

      // Check 2: Risk Appetite Threshold
      if (risk.compositeScore < provider.minAcceptableRiskScore) {
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `Risk appetite mismatch: Invoice score (${risk.compositeScore}/100) below provider minimum (${provider.minAcceptableRiskScore}/100)`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Risk grade below policy threshold.`
        });
        return;
      }

      // Check 3: Max Tenor constraint
      if (invoice.tenorDays > provider.maxTenorDays) {
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `Tenor constraint: Invoice tenor (${invoice.tenorDays}d) exceeds provider max limit (${provider.maxTenorDays}d)`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Tenor duration exceeds policy limit.`
        });
        return;
      }

      // Check 4: Portfolio / Buyer Concentration Limit
      if (projectedBuyerExp > provider.maxExposurePerBuyerLakhs) {
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `Buyer concentration limit: Current ₹${currentBuyerExp}L + Deal ₹${invoice.amountLakhs}L exceeds cap ₹${provider.maxExposurePerBuyerLakhs}L`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Single-buyer concentration limit breached.`
        });
        return;
      }

      const liquidityFit = Math.min(100, (provider.availableLiquidityLakhs / invoice.amountLakhs) * 20);
      const riskBuffer = risk.compositeScore - provider.minAcceptableRiskScore;
      const suitability = Math.round(50 + (riskBuffer * 0.5) + (liquidityFit * 0.3));

      matches.push({
        provider,
        isEligible: true,
        suitabilityScore: Math.min(100, suitability)
      });

      logs.push({
        id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        agentName: 'Agent 2: Capital Provider Underwriting Agent',
        level: 'DECISION',
        invoiceId: invoice.id,
        providerId: provider.id,
        message: `Provider [${provider.name}] matched: Underwriting approved with suitability score ${suitability}/100.`
      });
    });

    return { matches, logs };
  }
}
