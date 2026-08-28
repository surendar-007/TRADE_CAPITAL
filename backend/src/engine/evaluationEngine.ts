import { Invoice, FinancingOffer, AgentLog, ScoreBreakdown } from '../models/types';

export class EvaluationEngine {
  public static evaluateOffers(
    invoice: Invoice,
    offers: FinancingOffer[]
  ): { evaluatedOffers: FinancingOffer[]; winningOffer?: FinancingOffer; explanation: string; log: AgentLog } {
    if (offers.length === 0) {
      const log: AgentLog = {
        id: `log-eval-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
        level: 'WARNING',
        invoiceId: invoice.id,
        message: 'No eligible offers received from capital providers to evaluate.'
      };
      return {
        evaluatedOffers: [],
        explanation: 'No competing offers could be cleared due to risk appetite or portfolio constraints.',
        log
      };
    }

    const weights = invoice.preferences.priorityWeights;
    const minRequired = invoice.minRequiredAmountLakhs || (invoice.amountLakhs * 0.8);

    const evaluatedOffers = offers.map(offer => {
      let advanceScore = offer.offeredAdvanceRate * 100;
      if (offer.offeredAmountLakhs < minRequired) {
        const deficitPercent = (minRequired - offer.offeredAmountLakhs) / minRequired;
        advanceScore -= (deficitPercent * 70);
      } else {
        advanceScore += 10;
      }
      advanceScore = Math.max(0, Math.min(100, Math.round(advanceScore)));

      let speedScore = 100;
      if (offer.settlementSpeedHours <= 1) speedScore = 100;
      else if (offer.settlementSpeedHours <= 2) speedScore = 95;
      else if (offer.settlementSpeedHours <= 24) speedScore = 75;
      else if (offer.settlementSpeedHours <= 48) speedScore = 55;
      else speedScore = 40;

      const rateScore = Math.max(20, Math.min(100, Math.round(100 - (offer.interestRatePercent - 8.0) * 7.5)));
      const feeScore = Math.max(20, Math.min(100, Math.round(100 - (offer.originationFeePercent - 0.1) * 120)));
      const tenorScore = 95;

      const scoreBreakdown: ScoreBreakdown = {
        advanceScore,
        speedScore,
        rateScore,
        feeScore,
        tenorScore
      };

      const utilityScore = Math.round(
        (advanceScore * weights.advanceRate) +
        (speedScore * weights.settlementSpeed) +
        (rateScore * weights.interestRate) +
        (feeScore * weights.fees) +
        (tenorScore * (weights.tenorFlexibility || 0.05))
      );

      return {
        ...offer,
        scoreBreakdown,
        utilityScore
      };
    });

    evaluatedOffers.sort((a, b) => b.utilityScore - a.utilityScore);

    evaluatedOffers.forEach((offer, idx) => {
      offer.rank = idx + 1;
      offer.isSelected = (idx === 0);
      offer.status = (idx === 0) ? 'ACCEPTED' : 'REJECTED';
    });

    const winningOffer = evaluatedOffers[0];
    const lowestRateOffer = [...evaluatedOffers].sort((a, b) => a.interestRatePercent - b.interestRatePercent)[0];

    let explanation = '';
    if (winningOffer.id !== lowestRateOffer.id) {
      explanation = `🎯 Multi-Attribute Decision: [${winningOffer.providerName}] won with Utility Score ${winningOffer.utilityScore}/100. ` +
        `Even though [${lowestRateOffer.providerName}] offered a lower interest rate (${lowestRateOffer.interestRatePercent}% vs ${winningOffer.interestRatePercent}%), ` +
        `it was outscored because [${winningOffer.providerName}] delivered ${winningOffer.offeredAdvanceRate * 100}% advance (₹${winningOffer.offeredAmountLakhs}L meeting urgent need ₹${minRequired}L) ` +
        `and ${winningOffer.settlementSpeedHours}h T+0 speed, whereas [${lowestRateOffer.providerName}] offered only ${lowestRateOffer.offeredAdvanceRate * 100}% advance (₹${lowestRateOffer.offeredAmountLakhs}L) with a ${lowestRateOffer.settlementSpeedHours}h delay.`;
    } else {
      explanation = `🎯 Multi-Attribute Decision: [${winningOffer.providerName}] won with Utility Score ${winningOffer.utilityScore}/100, providing the best overall combination of pricing (${winningOffer.interestRatePercent}%), advance (${winningOffer.offeredAdvanceRate * 100}%), and settlement speed (${winningOffer.settlementSpeedHours}h).`;
    }

    const log: AgentLog = {
      id: `log-eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'SUCCESS',
      invoiceId: invoice.id,
      providerId: winningOffer.providerId,
      message: `Clearing completed: ${winningOffer.providerName} awarded deal. Utility Score: ${winningOffer.utilityScore}/100.`,
      details: {
        winningOfferId: winningOffer.id,
        utilityScore: winningOffer.utilityScore,
        explanation
      }
    };

    return { evaluatedOffers, winningOffer, explanation, log };
  }
}
