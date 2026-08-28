"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationEngine = void 0;
class EvaluationEngine {
    static evaluateOffers(invoice, offers) {
        if (offers.length === 0) {
            const log = {
                id: `log-eval-${Date.now()}`,
                timestamp: new Date().toISOString(),
                agentName: 'ClearingHouseAgent',
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
            // 1. Advance Score (0 - 100) with liquidity deficit penalty
            let advanceScore = offer.offeredAdvanceRate * 100;
            if (offer.offeredAmountLakhs < minRequired) {
                const deficitPercent = (minRequired - offer.offeredAmountLakhs) / minRequired;
                advanceScore -= (deficitPercent * 70); // Severe penalty if it fails supplier's urgent minimum capital threshold
            }
            else {
                advanceScore += 10; // Bonus for meeting liquidity requirement
            }
            advanceScore = Math.max(0, Math.min(100, Math.round(advanceScore)));
            // 2. Speed Score (0 - 100)
            let speedScore = 100;
            if (offer.settlementSpeedHours <= 1)
                speedScore = 100;
            else if (offer.settlementSpeedHours <= 2)
                speedScore = 95;
            else if (offer.settlementSpeedHours <= 24)
                speedScore = 75;
            else if (offer.settlementSpeedHours <= 48)
                speedScore = 55;
            else
                speedScore = 40; // 72h / T+3
            // 3. Rate Score (0 - 100, lower interest rate = higher score)
            // Benchmark: 8.0% = 100, 16.0% = 40
            const rateScore = Math.max(20, Math.min(100, Math.round(100 - (offer.interestRatePercent - 8.0) * 7.5)));
            // 4. Fee Score (0 - 100, lower fee = higher score)
            // Benchmark: 0.1% = 100, 0.6% = 40
            const feeScore = Math.max(20, Math.min(100, Math.round(100 - (offer.originationFeePercent - 0.1) * 120)));
            // 5. Tenor Score
            const tenorScore = 95;
            const scoreBreakdown = {
                advanceScore,
                speedScore,
                rateScore,
                feeScore,
                tenorScore
            };
            // Compute Total Weighted Utility Score
            const utilityScore = Math.round((advanceScore * weights.advanceRate) +
                (speedScore * weights.settlementSpeed) +
                (rateScore * weights.interestRate) +
                (feeScore * weights.fees) +
                (tenorScore * (weights.tenorFlexibility || 0.05)));
            return {
                ...offer,
                scoreBreakdown,
                utilityScore
            };
        });
        // Sort offers by Utility Score descending
        evaluatedOffers.sort((a, b) => b.utilityScore - a.utilityScore);
        // Assign ranks and select top offer
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
        }
        else {
            explanation = `🎯 Multi-Attribute Decision: [${winningOffer.providerName}] won with Utility Score ${winningOffer.utilityScore}/100, providing the best overall combination of pricing (${winningOffer.interestRatePercent}%), advance (${winningOffer.offeredAdvanceRate * 100}%), and settlement speed (${winningOffer.settlementSpeedHours}h).`;
        }
        const log = {
            id: `log-eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            agentName: 'ClearingHouseAgent',
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
exports.EvaluationEngine = EvaluationEngine;
