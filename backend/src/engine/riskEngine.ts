import { Invoice, Supplier, Buyer, RiskAssessment, RiskTier, AgentLog } from '../models/types';

export class RiskEngine {
  public static assessRisk(invoice: Invoice, supplier?: Supplier, buyer?: Buyer): { assessment: RiskAssessment; log: AgentLog } {
    // 1. Buyer risk factor (0 - 100, higher is safer)
    let buyerRiskScore = 85;
    if (buyer) {
      buyerRiskScore = buyer.ratingScore;
      if (buyer.avgPaymentDays > 60) {
        buyerRiskScore -= Math.min(20, (buyer.avgPaymentDays - 60) * 0.5);
      }
      buyerRiskScore -= (buyer.disputeRatePercent * 3);
    } else {
      buyerRiskScore = 50;
    }
    buyerRiskScore = Math.max(10, Math.min(100, buyerRiskScore));

    // 2. Supplier credit factor (0 - 100)
    let supplierRiskScore = 80;
    if (supplier) {
      const creditScoreFactor = ((supplier.creditScore - 300) / 600) * 100;
      const historyBonus = Math.min(15, supplier.completedDeals * 0.5);
      const defaultPenalty = supplier.defaultRatePercent * 10;
      supplierRiskScore = creditScoreFactor + historyBonus - defaultPenalty;
    } else {
      supplierRiskScore = 50;
    }
    supplierRiskScore = Math.max(10, Math.min(100, supplierRiskScore));

    // 3. Tenor risk factor
    let tenorRiskScore = 90;
    if (invoice.tenorDays > 90) {
      tenorRiskScore = 70;
    } else if (invoice.tenorDays > 60) {
      tenorRiskScore = 80;
    } else {
      tenorRiskScore = 95;
    }

    // 4. Information Uncertainty penalty
    let infoUncertainty = 0;
    if (!invoice.purchaseOrderNumber) infoUncertainty += 15;
    if (!invoice.eWayBillNumber) infoUncertainty += 15;
    if (!buyer) infoUncertainty += 20;
    if (!supplier || supplier.completedDeals < 5) infoUncertainty += 10;

    let compositeScore = (buyerRiskScore * 0.45) + (supplierRiskScore * 0.25) + (tenorRiskScore * 0.15) - (infoUncertainty * 0.5);
    compositeScore = Math.round(Math.max(10, Math.min(100, compositeScore)));

    let riskTier: RiskTier = 'TIER_2_A';
    let recommendedMaxAdvance = 0.85;
    let recommendedBaseRate = 10.5;

    if (compositeScore >= 82) {
      riskTier = 'TIER_1_AAA';
      recommendedMaxAdvance = 0.90;
      recommendedBaseRate = 9.0;
    } else if (compositeScore >= 65) {
      riskTier = 'TIER_2_A';
      recommendedMaxAdvance = 0.80;
      recommendedBaseRate = 11.2;
    } else {
      riskTier = 'TIER_3_HIGH_RISK';
      recommendedMaxAdvance = 0.65;
      recommendedBaseRate = 13.8;
    }

    const explanation = `Composite Risk Score: ${compositeScore}/100 [Grade: ${riskTier}]. ` +
      `Buyer Quality: ${Math.round(buyerRiskScore)}/100 (${buyer?.rating || 'Unrated'}), ` +
      `Supplier Track Record: ${Math.round(supplierRiskScore)}/100, ` +
      `Tenor Duration: ${invoice.tenorDays}d, ` +
      `Uncertainty Penalty: -${infoUncertainty} pts.`;

    const assessment: RiskAssessment = {
      compositeScore,
      riskTier,
      buyerRiskScore: Math.round(buyerRiskScore),
      supplierRiskScore: Math.round(supplierRiskScore),
      tenorRiskScore: Math.round(tenorRiskScore),
      informationUncertaintyPenalty: infoUncertainty,
      recommendedMaxAdvance,
      recommendedBaseRate,
      explanation,
      assessedAt: new Date().toISOString()
    };

    const log: AgentLog = {
      id: `log-risk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 1: Supplier Demand & Verification Agent',
      level: 'DECISION',
      invoiceId: invoice.id,
      message: `Risk assessment completed for ${invoice.invoiceNumber}: Tier ${riskTier} (Score ${compositeScore}/100)`,
      details: assessment
    };

    return { assessment, log };
  }
}
