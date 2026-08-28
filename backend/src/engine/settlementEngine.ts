import { Invoice, CapitalProvider, FinancingOffer, FinancingRecord, Supplier, Buyer, AgentLog } from '../models/types';

export class SettlementEngine {
  public static executeFinancing(
    invoice: Invoice,
    offer: FinancingOffer,
    provider: CapitalProvider,
    supplier: Supplier,
    buyer: Buyer
  ): { financingRecord: FinancingRecord; updatedProvider: CapitalProvider; logs: AgentLog[] } {
    const logs: AgentLog[] = [];

    const disbursed = offer.offeredAmountLakhs;
    const updatedLiquidity = Math.max(0, Math.round((provider.availableLiquidityLakhs - disbursed) * 100) / 100);
    const updatedDeployed = Math.round((provider.deployedCapitalLakhs + disbursed) * 100) / 100;
    
    const currentExp = provider.buyerExposures[buyer.id] || 0;
    const updatedExposures = {
      ...provider.buyerExposures,
      [buyer.id]: Math.round((currentExp + invoice.amountLakhs) * 100) / 100
    };

    const updatedProvider: CapitalProvider = {
      ...provider,
      availableLiquidityLakhs: updatedLiquidity,
      deployedCapitalLakhs: updatedDeployed,
      buyerExposures: updatedExposures
    };

    const financingRecord: FinancingRecord = {
      id: `fin-${invoice.id}-${Date.now().toString(36)}`,
      invoiceId: invoice.id,
      offerId: offer.id,
      providerId: provider.id,
      providerName: provider.name,
      supplierId: supplier.id,
      supplierName: supplier.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      faceValueLakhs: invoice.amountLakhs,
      disbursedAmountLakhs: disbursed,
      interestRatePercent: offer.interestRatePercent,
      originationFeeLakhs: offer.feeAmountLakhs,
      settlementSpeedHours: offer.settlementSpeedHours,
      disbursedAt: new Date().toISOString(),
      dueDate: invoice.dueDate,
      expectedSettlementLakhs: invoice.amountLakhs,
      status: 'ACTIVE_FINANCED'
    };

    logs.push({
      id: `log-fin-${Date.now()}-1`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'ACTION',
      invoiceId: invoice.id,
      providerId: provider.id,
      message: `Financing executed: ₹${disbursed}L disbursed to ${supplier.name} via ${provider.name} escrow.`
    });

    logs.push({
      id: `log-fin-${Date.now()}-2`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'INFO',
      invoiceId: invoice.id,
      providerId: provider.id,
      message: `Provider [${provider.name}] liquidity updated: Available ₹${updatedLiquidity}L (Deployed: ₹${updatedDeployed}L). Buyer [${buyer.name}] exposure: ₹${updatedExposures[buyer.id]}L.`
    });

    return { financingRecord, updatedProvider, logs };
  }

  public static completeSettlement(
    financingRecord: FinancingRecord,
    provider: CapitalProvider,
    supplier: Supplier,
    isSuccessful: boolean = true
  ): { updatedRecord: FinancingRecord; updatedProvider: CapitalProvider; updatedSupplier: Supplier; logs: AgentLog[] } {
    const logs: AgentLog[] = [];

    if (!isSuccessful) {
      const updatedRecord: FinancingRecord = {
        ...financingRecord,
        status: 'SETTLEMENT_FAILED',
        settledAt: new Date().toISOString()
      };

      logs.push({
        id: `log-settle-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
        level: 'WARNING',
        invoiceId: financingRecord.invoiceId,
        providerId: provider.id,
        message: `Settlement alert: Buyer payment delayed or in dispute for invoice [${financingRecord.invoiceId}]. Escalated to dispute resolution protocol.`
      });

      return { updatedRecord, updatedProvider: provider, updatedSupplier: supplier, logs };
    }

    const principalReturned = financingRecord.disbursedAmountLakhs;
    const earnedInterest = (financingRecord.disbursedAmountLakhs * (financingRecord.interestRatePercent / 100) * (60 / 365));
    const totalReturnLakhs = Math.round((principalReturned + earnedInterest) * 100) / 100;

    const newLiquidity = Math.round((provider.availableLiquidityLakhs + totalReturnLakhs) * 100) / 100;
    const newDeployed = Math.max(0, Math.round((provider.deployedCapitalLakhs - principalReturned) * 100) / 100);

    const buyerId = financingRecord.buyerId;
    const currentExp = provider.buyerExposures[buyerId] || 0;
    const newExposures = {
      ...provider.buyerExposures,
      [buyerId]: Math.max(0, Math.round((currentExp - financingRecord.faceValueLakhs) * 100) / 100)
    };

    const updatedProvider: CapitalProvider = {
      ...provider,
      availableLiquidityLakhs: newLiquidity,
      deployedCapitalLakhs: newDeployed,
      buyerExposures: newExposures
    };

    const updatedSupplier: Supplier = {
      ...supplier,
      completedDeals: supplier.completedDeals + 1,
      creditScore: Math.min(850, supplier.creditScore + 5)
    };

    const updatedRecord: FinancingRecord = {
      ...financingRecord,
      actualSettledLakhs: financingRecord.faceValueLakhs,
      settledAt: new Date().toISOString(),
      status: 'SETTLED_COMPLETED'
    };

    logs.push({
      id: `log-settle-done-${Date.now()}-1`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'SUCCESS',
      invoiceId: financingRecord.invoiceId,
      providerId: provider.id,
      message: `Settlement confirmed: ₹${financingRecord.faceValueLakhs}L received from ${financingRecord.buyerName}. Principal & yield disbursed to ${provider.name}.`
    });

    logs.push({
      id: `log-settle-done-${Date.now()}-2`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'ACTION',
      invoiceId: financingRecord.invoiceId,
      providerId: provider.id,
      message: `Market rebalance: [${provider.name}] liquidity replenished to ₹${newLiquidity}L (+₹${totalReturnLakhs}L return). Exposure on ${financingRecord.buyerName} released.`
    });

    return { updatedRecord, updatedProvider, updatedSupplier, logs };
  }
}
