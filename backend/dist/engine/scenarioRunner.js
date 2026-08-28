"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioRunner = void 0;
const verificationEngine_1 = require("./verificationEngine");
const riskEngine_1 = require("./riskEngine");
const matchingEngine_1 = require("./matchingEngine");
const providerAgent_1 = require("./providerAgent");
const evaluationEngine_1 = require("./evaluationEngine");
class ScenarioRunner {
    static runFullPipeline(invoice, suppliers, buyers, providers) {
        const allLogs = [];
        const supplier = suppliers.find(s => s.id === invoice.supplierId);
        const buyer = buyers.find(b => b.id === invoice.buyerId);
        // Step 1: Verification
        const { result: verResult, log: verLog } = verificationEngine_1.VerificationEngine.verifyInvoice(invoice, supplier, buyer);
        allLogs.push(verLog);
        invoice.verificationResult = verResult;
        if (verResult.status === 'FAILED') {
            invoice.status = 'VERIFICATION_FAILED';
            return {
                updatedInvoice: invoice,
                offers: [],
                explanation: `Pipeline aborted: ${verResult.explanation}`,
                logs: allLogs,
                eligibleProvidersCount: 0
            };
        }
        invoice.status = 'VERIFIED';
        // Step 2: Risk Assessment
        const { assessment: riskResult, log: riskLog } = riskEngine_1.RiskEngine.assessRisk(invoice, supplier, buyer);
        allLogs.push(riskLog);
        invoice.riskAssessment = riskResult;
        invoice.status = 'IN_MARKET';
        // Step 3: Provider Matching & Discovery
        const { matches, logs: matchLogs } = matchingEngine_1.MatchingEngine.discoverAndFilterProviders(invoice, riskResult, providers);
        allLogs.push(...matchLogs);
        const eligibleMatches = matches.filter(m => m.isEligible);
        if (eligibleMatches.length === 0) {
            invoice.status = 'IN_MARKET';
            return {
                updatedInvoice: invoice,
                offers: [],
                explanation: 'No capital providers met the risk, liquidity, and portfolio constraints for this deal.',
                logs: allLogs,
                eligibleProvidersCount: 0
            };
        }
        // Step 4: Autonomous Bidding
        const generatedOffers = [];
        eligibleMatches.forEach(m => {
            const { offer, log: bidLog } = providerAgent_1.ProviderAgent.generateBid(invoice, m.provider, riskResult);
            generatedOffers.push(offer);
            allLogs.push(bidLog);
        });
        // Step 5: Multi-Dimensional Clearing Evaluation
        const { evaluatedOffers, winningOffer, explanation, log: evalLog } = evaluationEngine_1.EvaluationEngine.evaluateOffers(invoice, generatedOffers);
        allLogs.push(evalLog);
        invoice.status = 'OFFERS_RECEIVED';
        return {
            updatedInvoice: invoice,
            offers: evaluatedOffers,
            winningOffer,
            explanation,
            logs: allLogs,
            eligibleProvidersCount: eligibleMatches.length
        };
    }
}
exports.ScenarioRunner = ScenarioRunner;
