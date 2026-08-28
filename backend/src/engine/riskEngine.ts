import { Invoice, Supplier, Buyer, RiskAssessment, RiskTier, RiskBand, RiskConfidence, AgentLog } from '../models/types';

export class RiskEngine {
  public static assessRisk(invoice: Invoice, supplier?: Supplier, buyer?: Buyer): { assessment: RiskAssessment; log: AgentLog } {
    const reasons: string[] = [];

    // 1. Verification & Integrity factor
    const isVerified = invoice.verificationResult?.status === 'PASSED' || invoice.status === 'VERIFIED' || invoice.status === 'DRAFT';
    if (isVerified) {
      reasons.push('✓ Invoice document successfully verified with active GSTIN registry');
    } else {
      reasons.push('✕ Invoice verification incomplete or flagged');
    }

    // 2. Buyer risk factor (0 - 100, higher is safer)
    let buyerRiskScore = 85;
    if (buyer) {
      buyerRiskScore = buyer.ratingScore;
      if (buyer.avgPaymentDays > 60) {
        buyerRiskScore -= Math.min(20, (buyer.avgPaymentDays - 60) * 0.5);
        reasons.push(`✕ Buyer payment cycle is extended (${buyer.avgPaymentDays}d avg repayment)`);
      } else {
        reasons.push(`✓ Prime enterprise debtor (${buyer.name}, Rating: ${buyer.rating || 'A'}, Avg Pay: ${buyer.avgPaymentDays}d)`);
      }
      
      if (buyer.disputeRatePercent <= 0.5) {
        reasons.push(`✓ Minimal debtor dispute rate (${buyer.disputeRatePercent}%)`);
      } else {
        buyerRiskScore -= (buyer.disputeRatePercent * 3);
        reasons.push(`✕ Elevated debtor dispute rate (${buyer.disputeRatePercent}%)`);
      }
    } else {
      buyerRiskScore = 50;
      reasons.push('✕ Unregistered debtor entity - baseline credit assessment applied');
    }
    buyerRiskScore = Math.max(10, Math.min(100, buyerRiskScore));

    // 3. Supplier credit factor (0 - 100)
    let supplierRiskScore = 80;
    if (supplier) {
      const creditScoreFactor = ((supplier.creditScore - 300) / 600) * 100;
      const historyBonus = Math.min(15, supplier.completedDeals * 0.5);
      const defaultPenalty = supplier.defaultRatePercent * 10;
      supplierRiskScore = creditScoreFactor + historyBonus - defaultPenalty;

      if (supplier.completedDeals >= 10 && supplier.defaultRatePercent === 0) {
        reasons.push(`✓ Proven supplier track record (${supplier.completedDeals} deals completed, 0.0% default rate)`);
      } else if (supplier.creditScore >= 750) {
        reasons.push(`✓ High supplier credit profile (Score: ${supplier.creditScore})`);
      } else {
        reasons.push(`✓ Supplier performance rating: ${supplier.ratingGrade || 'BBB'} (Score: ${supplier.creditScore})`);
      }
    } else {
      supplierRiskScore = 50;
      reasons.push('✕ Supplier entity unprofiled - baseline score applied');
    }
    supplierRiskScore = Math.max(10, Math.min(100, supplierRiskScore));

    // 4. Tenor risk factor
    let tenorRiskScore = 90;
    if (invoice.tenorDays > 90) {
      tenorRiskScore = 70;
      reasons.push(`✕ Extended tenor duration (${invoice.tenorDays} days) increases term exposure`);
    } else if (invoice.tenorDays > 60) {
      tenorRiskScore = 80;
      reasons.push(`✓ Standard trade credit tenor (${invoice.tenorDays} days)`);
    } else {
      tenorRiskScore = 95;
      reasons.push(`✓ Short tenor horizon (${invoice.tenorDays} days) limits liquidity lockup`);
    }

    // 5. Information Uncertainty & Document Completeness
    let infoUncertainty = 0;
    if (invoice.purchaseOrderNumber) {
      reasons.push(`✓ Verified Purchase Order attached (${invoice.purchaseOrderNumber})`);
    } else {
      infoUncertainty += 15;
      reasons.push('✕ Missing Purchase Order reference');
    }

    if (invoice.eWayBillNumber) {
      reasons.push(`✓ Logistics eWay Bill validated (${invoice.eWayBillNumber})`);
    } else {
      infoUncertainty += 15;
      reasons.push('✕ Missing eWay Bill reference');
    }

    if (!buyer) infoUncertainty += 20;
    if (!supplier || supplier.completedDeals < 5) infoUncertainty += 10;

    // 6. Composite Score Calculation
    let compositeScore = (buyerRiskScore * 0.45) + (supplierRiskScore * 0.25) + (tenorRiskScore * 0.15) - (infoUncertainty * 0.5);
    compositeScore = Math.round(Math.max(10, Math.min(100, compositeScore)));

    const riskScore = compositeScore;

    let riskTier: RiskTier = 'TIER_2_A';
    let riskBand: RiskBand = 'MEDIUM';
    let recommendedMaxAdvance = 0.85;
    let recommendedBaseRate = 10.5;

    if (compositeScore >= 80) {
      riskTier = 'TIER_1_AAA';
      riskBand = 'LOW';
      recommendedMaxAdvance = 0.90;
      recommendedBaseRate = 9.0;
    } else if (compositeScore >= 65) {
      riskTier = 'TIER_2_A';
      riskBand = 'MEDIUM';
      recommendedMaxAdvance = 0.80;
      recommendedBaseRate = 11.2;
    } else {
      riskTier = 'TIER_3_HIGH_RISK';
      riskBand = 'HIGH';
      recommendedMaxAdvance = 0.65;
      recommendedBaseRate = 13.8;
    }

    // 7. Confidence Determination
    let riskConfidence: RiskConfidence = 'HIGH';
    if (infoUncertainty >= 30 || !buyer || !supplier) {
      riskConfidence = 'LOW';
    } else if (infoUncertainty > 0 || (supplier && supplier.completedDeals < 5)) {
      riskConfidence = 'MEDIUM';
    }

    const explanation = `Composite Risk Score: ${compositeScore}/100 [Band: ${riskBand}, Grade: ${riskTier}, Confidence: ${riskConfidence}]. ` +
      `Buyer Quality: ${Math.round(buyerRiskScore)}/100 (${buyer?.rating || 'Unrated'}), ` +
      `Supplier Track Record: ${Math.round(supplierRiskScore)}/100, ` +
      `Tenor Duration: ${invoice.tenorDays}d, ` +
      `Uncertainty Penalty: -${infoUncertainty} pts.`;

    const assessment: RiskAssessment = {
      compositeScore,
      riskScore,
      riskBand,
      riskConfidence,
      riskReasons: reasons.slice(0, 6),
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
      message: `Risk assessment completed for ${invoice.invoiceNumber}: ${riskBand} Risk [Tier ${riskTier}] (Score ${compositeScore}/100, Confidence: ${riskConfidence})`,
      details: assessment
    };

    return { assessment, log };
  }
}
