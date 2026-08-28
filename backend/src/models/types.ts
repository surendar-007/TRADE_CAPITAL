export type RiskTier = 'TIER_1_AAA' | 'TIER_2_A' | 'TIER_3_HIGH_RISK';

export type InvoiceStatus = 
  | 'DRAFT'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'IN_MARKET'
  | 'OFFERS_RECEIVED'
  | 'MATCHED'
  | 'FINANCED'
  | 'SETTLED'
  | 'DEFAULTED';

export type ProviderType = 'BANK' | 'NBFC' | 'PRIVATE_CREDIT' | 'FINTECH';
export type RiskAppetite = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'HIGH_YIELD';

export interface SupplierPreferences {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetAdvanceRate: number;
  maxAcceptableRate: number;
  priorityWeights: {
    advanceRate: number;
    interestRate: number;
    settlementSpeed: number;
    fees: number;
    tenorFlexibility: number;
  };
}

export interface Supplier {
  id: string;
  name: string;
  industry: string;
  gstin: string;
  annualTurnoverLakhs: number;
  completedDeals: number;
  creditScore: number;
  defaultRatePercent: number;
  ratingGrade: string;
}

export interface Buyer {
  id: string;
  name: string;
  industry: string;
  gstin: string;
  rating: string;
  ratingScore: number;
  avgPaymentDays: number;
  disputeRatePercent: number;
}

export interface VerificationResult {
  status: 'PASSED' | 'FLAGGED' | 'FAILED';
  verificationScore: number;
  gstinActive: boolean;
  eWayBillValid: boolean;
  threeWayMatchScore: number;
  buyerAcknowledged: boolean;
  flags: string[];
  explanation: string;
  verifiedAt: string;
}

export interface RiskAssessment {
  compositeScore: number;
  riskTier: RiskTier;
  buyerRiskScore: number;
  supplierRiskScore: number;
  tenorRiskScore: number;
  informationUncertaintyPenalty: number;
  recommendedMaxAdvance: number;
  recommendedBaseRate: number;
  explanation: string;
  assessedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  buyerId: string;
  amountLakhs: number;
  minRequiredAmountLakhs: number;
  issueDate: string;
  dueDate: string;
  tenorDays: number;
  goodsDescription: string;
  eWayBillNumber: string;
  purchaseOrderNumber: string;
  status: InvoiceStatus;
  preferences: SupplierPreferences;
  verificationResult?: VerificationResult;
  riskAssessment?: RiskAssessment;
  createdAt: string;
}

export interface CapitalProvider {
  id: string;
  name: string;
  type: ProviderType;
  totalFundSizeLakhs: number;
  availableLiquidityLakhs: number;
  deployedCapitalLakhs: number;
  riskAppetite: RiskAppetite;
  minAcceptableRiskScore: number;
  maxTenorDays: number;
  maxAdvanceRate: number;
  baseInterestRatePercent: number;
  originationFeePercent: number;
  settlementSpeedHours: number;
  maxExposurePerBuyerLakhs: number;
  buyerExposures: Record<string, number>;
  autoBidEnabled: boolean;
}

export interface ScoreBreakdown {
  rateScore: number;
  advanceScore: number;
  speedScore: number;
  feeScore: number;
  tenorScore: number;
}

export interface FinancingOffer {
  id: string;
  invoiceId: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  offeredAdvanceRate: number;
  offeredAmountLakhs: number;
  interestRatePercent: number;
  originationFeePercent: number;
  feeAmountLakhs: number;
  netDisbursedLakhs: number;
  settlementSpeedHours: number;
  tenorDays: number;
  totalFinancingCostLakhs: number;
  effectiveAnnualYield: number;
  utilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  rationale: string;
  rank?: number;
  isSelected: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  generatedAt: string;
}

export interface FinancingRecord {
  id: string;
  invoiceId: string;
  offerId: string;
  providerId: string;
  providerName: string;
  supplierId: string;
  supplierName: string;
  buyerId: string;
  buyerName: string;
  faceValueLakhs: number;
  disbursedAmountLakhs: number;
  interestRatePercent: number;
  originationFeeLakhs: number;
  settlementSpeedHours: number;
  disbursedAt: string;
  dueDate: string;
  expectedSettlementLakhs: number;
  actualSettledLakhs?: number;
  settledAt?: string;
  status: 'ACTIVE_FINANCED' | 'SETTLED_COMPLETED' | 'SETTLEMENT_FAILED' | 'RESOLVED_RECOVERED';
}

// 3 Core Autonomous AI Agents as per Problem Statement Architecture
export type CoreAgentType = 
  | 'Agent 1: Supplier Demand & Verification Agent'
  | 'Agent 2: Capital Provider Underwriting Agent'
  | 'Agent 3: Marketplace Clearing & Settlement Agent';

export interface AgentLog {
  id: string;
  timestamp: string;
  agentName: CoreAgentType;
  level: 'INFO' | 'DECISION' | 'WARNING' | 'ACTION' | 'SUCCESS';
  invoiceId?: string;
  providerId?: string;
  message: string;
  details?: any;
}

export interface MarketMetrics {
  totalInvoicesProcessed: number;
  totalVolumeLakhs: number;
  activeFinancingLakhs: number;
  completedSettlementsLakhs: number;
  totalAvailableLiquidityLakhs: number;
  averageClearingRatePercent: number;
  averageSettlementTimeHours: number;
  averageAdvanceRatePercent: number;
}
