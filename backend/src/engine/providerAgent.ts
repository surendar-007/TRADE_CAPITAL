import { Invoice, CapitalProvider, RiskAssessment, FinancingOffer, AgentLog } from '../models/types';

export class ProviderAgent {
  public static generateBid(
    invoice: Invoice,
    provider: CapitalProvider,
    risk: RiskAssessment
  ): { offer: FinancingOffer; log: AgentLog } {
    let rate = provider.baseInterestRatePercent;
    
    if (risk.riskTier === 'TIER_2_A') {
      rate += 0.8;
    } else if (risk.riskTier === 'TIER_3_HIGH_RISK') {
      rate += 2.2;
    }

    if (invoice.tenorDays > 60) {
      rate += ((invoice.tenorDays - 60) / 30) * 0.3;
    }
    rate = Math.round(rate * 10) / 10;

    let advanceRate = provider.maxAdvanceRate;
    if (risk.riskTier === 'TIER_3_HIGH_RISK') {
      advanceRate = Math.min(advanceRate, 0.70);
    }
    
    const offeredAmountLakhs = Math.round(invoice.amountLakhs * advanceRate * 100) / 100;
    const feeAmountLakhs = Math.round((offeredAmountLakhs * (provider.originationFeePercent / 100)) * 1000) / 1000;
    const netDisbursedLakhs = Math.round((offeredAmountLakhs - feeAmountLakhs) * 100) / 100;

    const interestCostLakhs = (offeredAmountLakhs * (rate / 100) * (invoice.tenorDays / 365));
    const totalFinancingCostLakhs = Math.round((interestCostLakhs + feeAmountLakhs) * 1000) / 1000;
    const effectiveAPR = Math.round(((totalFinancingCostLakhs / offeredAmountLakhs) * (365 / invoice.tenorDays) * 100) * 10) / 10;

    const rationale = `${provider.name} generated autonomous bid: ${advanceRate * 100}% advance (₹${offeredAmountLakhs}L) @ ${rate}% APR with ${provider.settlementSpeedHours}h settlement speed based on Tier [${risk.riskTier}].`;

    const offer: FinancingOffer = {
      id: `off-${provider.id}-${invoice.id}-${Date.now().toString(36)}`,
      invoiceId: invoice.id,
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      offeredAdvanceRate: advanceRate,
      offeredAmountLakhs,
      interestRatePercent: rate,
      originationFeePercent: provider.originationFeePercent,
      feeAmountLakhs,
      netDisbursedLakhs,
      settlementSpeedHours: provider.settlementSpeedHours,
      tenorDays: invoice.tenorDays,
      totalFinancingCostLakhs,
      effectiveAnnualYield: effectiveAPR,
      utilityScore: 0,
      scoreBreakdown: {
        rateScore: 0,
        advanceScore: 0,
        speedScore: 0,
        feeScore: 0,
        tenorScore: 0
      },
      rationale,
      isSelected: false,
      status: 'PENDING',
      generatedAt: new Date().toISOString()
    };

    const log: AgentLog = {
      id: `log-bid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 2: Capital Provider Underwriting Agent',
      level: 'ACTION',
      invoiceId: invoice.id,
      providerId: provider.id,
      message: `[${provider.name}] submitted autonomous offer: ₹${offeredAmountLakhs}L advance @ ${rate}%, Speed ${provider.settlementSpeedHours}h.`,
      details: offer
    };

    return { offer, log };
  }
}
