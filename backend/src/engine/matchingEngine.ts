import { Invoice, CapitalProvider, RiskAssessment, MatchResult, AgentLog } from '../models/types';

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
      const minRequired = invoice.minRequiredAmountLakhs || (invoice.amountLakhs * 0.8);
      const requestedAdvanceAmount = invoice.amountLakhs * (invoice.preferences?.targetAdvanceRate || 0.85);
      const requiredFunding = Math.max(minRequired, requestedAdvanceAmount);

      const eligibilityReasons: string[] = [];

      // Check 1: Liquidity availability
      if (provider.availableLiquidityLakhs < requiredFunding) {
        const reason = `Insufficient deployable liquidity: Available ₹${provider.availableLiquidityLakhs.toFixed(1)}L is less than required ₹${requiredFunding.toFixed(1)}L`;
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `✕ ${reason}`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Insufficient deployable liquidity (₹${provider.availableLiquidityLakhs}L available).`
        });
        return;
      }

      // Check 2: Risk Appetite & Policy Threshold
      const riskScore = risk.riskScore || risk.compositeScore;
      if (riskScore < provider.minAcceptableRiskScore) {
        const reason = `Risk policy mismatch: Invoice score (${riskScore}/100) is below provider's ${provider.riskAppetite} mandate minimum (${provider.minAcceptableRiskScore}/100)`;
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `✕ ${reason}`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Deal risk score (${riskScore}/100) below minimum mandate (${provider.minAcceptableRiskScore}/100).`
        });
        return;
      }

      // Check 3: Max Tenor constraint
      if (invoice.tenorDays > provider.maxTenorDays) {
        const reason = `Tenor policy breached: Invoice duration (${invoice.tenorDays} days) exceeds provider maximum limit (${provider.maxTenorDays} days)`;
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `✕ ${reason}`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Tenor duration (${invoice.tenorDays}d) exceeds maximum limit (${provider.maxTenorDays}d).`
        });
        return;
      }

      // Check 4: Portfolio / Single-Buyer Concentration Cap
      if (projectedBuyerExp > provider.maxExposurePerBuyerLakhs) {
        const reason = `Single-buyer concentration cap exceeded: Current exposure ₹${currentBuyerExp}L + Deal ₹${invoice.amountLakhs}L = ₹${projectedBuyerExp}L (Cap: ₹${provider.maxExposurePerBuyerLakhs}L)`;
        matches.push({
          provider,
          isEligible: false,
          exclusionReason: `✕ ${reason}`,
          suitabilityScore: 0
        });
        logs.push({
          id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          agentName: 'Agent 2: Capital Provider Underwriting Agent',
          level: 'WARNING',
          invoiceId: invoice.id,
          providerId: provider.id,
          message: `Provider [${provider.name}] excluded: Single-buyer exposure limit breached (Projected ₹${projectedBuyerExp}L > Cap ₹${provider.maxExposurePerBuyerLakhs}L).`
        });
        return;
      }

      // All underwriting checks passed -> Provider is ELIGIBLE
      eligibilityReasons.push(`✓ Risk appetite matches: Score ${riskScore}/100 meets ${provider.riskAppetite} appetite (min ${provider.minAcceptableRiskScore})`);
      eligibilityReasons.push(`✓ Liquidity verified: ₹${provider.availableLiquidityLakhs}L available (Requires ₹${requiredFunding.toFixed(1)}L)`);
      eligibilityReasons.push(`✓ Tenor compliant: ${invoice.tenorDays} days within max limit of ${provider.maxTenorDays} days`);
      eligibilityReasons.push(`✓ Buyer exposure within limit: Projected ₹${projectedBuyerExp}L / ₹${provider.maxExposurePerBuyerLakhs}L cap`);

      const liquidityFit = Math.min(100, (provider.availableLiquidityLakhs / invoice.amountLakhs) * 20);
      const riskBuffer = riskScore - provider.minAcceptableRiskScore;
      const suitability = Math.round(50 + (riskBuffer * 0.5) + (liquidityFit * 0.3));

      matches.push({
        provider,
        isEligible: true,
        eligibilityReasons,
        suitabilityScore: Math.min(100, Math.max(10, suitability))
      });

      logs.push({
        id: `log-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        agentName: 'Agent 2: Capital Provider Underwriting Agent',
        level: 'DECISION',
        invoiceId: invoice.id,
        providerId: provider.id,
        message: `Provider [${provider.name}] approved for underwriting bidding. Suitability: ${suitability}/100.`
      });
    });

    return { matches, logs };
  }
}
