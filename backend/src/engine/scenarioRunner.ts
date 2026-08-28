import { 
  Invoice, 
  Supplier, 
  Buyer, 
  CapitalProvider, 
  FinancingOffer, 
  FinancingRecord, 
  AgentLog,
  VerificationResult,
  RiskAssessment
} from '../models/types';
import { VerificationEngine } from './verificationEngine';
import { RiskEngine } from './riskEngine';
import { MatchingEngine } from './matchingEngine';
import { ProviderAgent } from './providerAgent';
import { EvaluationEngine } from './evaluationEngine';
import { SettlementEngine } from './settlementEngine';

export interface ScenarioExecutionResult {
  scenarioId: string;
  scenarioTitle: string;
  invoice: Invoice;
  verificationResult: VerificationResult;
  riskAssessment?: RiskAssessment;
  eligibleProviders: { providerName: string; isEligible: boolean; reason?: string }[];
  offers: FinancingOffer[];
  winningOffer?: FinancingOffer;
  explanation: string;
  financingRecord?: FinancingRecord;
  logs: AgentLog[];
}

export class ScenarioRunner {
  public static runFullPipeline(
    invoice: Invoice,
    suppliers: Supplier[],
    buyers: Buyer[],
    providers: CapitalProvider[]
  ): {
    updatedInvoice: Invoice;
    offers: FinancingOffer[];
    winningOffer?: FinancingOffer;
    explanation: string;
    logs: AgentLog[];
    eligibleProvidersCount: number;
  } {
    const allLogs: AgentLog[] = [];
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const buyer = buyers.find(b => b.id === invoice.buyerId);

    // Step 1: Verification
    const { result: verResult, log: verLog } = VerificationEngine.verifyInvoice(invoice, supplier, buyer);
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
    const { assessment: riskResult, log: riskLog } = RiskEngine.assessRisk(invoice, supplier, buyer);
    allLogs.push(riskLog);
    invoice.riskAssessment = riskResult;
    invoice.status = 'IN_MARKET';

    // Step 3: Provider Matching & Discovery
    const { matches, logs: matchLogs } = MatchingEngine.discoverAndFilterProviders(invoice, riskResult, providers);
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
    const generatedOffers: FinancingOffer[] = [];
    eligibleMatches.forEach(m => {
      const { offer, log: bidLog } = ProviderAgent.generateBid(invoice, m.provider, riskResult);
      generatedOffers.push(offer);
      allLogs.push(bidLog);
    });

    // Step 5: Multi-Dimensional Clearing Evaluation
    const { evaluatedOffers, winningOffer, explanation, log: evalLog } = EvaluationEngine.evaluateOffers(invoice, generatedOffers);
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
