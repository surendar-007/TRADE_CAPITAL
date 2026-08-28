import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  Users, 
  Layers, 
  Award, 
  DollarSign, 
  RefreshCw,
  Play,
  Zap,
  Check
} from 'lucide-react';
import { MarketplaceState } from '../types';
import { OfferComparisonRadar } from './OfferComparisonRadar';

interface PipelineViewProps {
  state: MarketplaceState;
  selectedInvoiceId?: string;
  onSelectInvoice: (id: string) => void;
  onVerify: (id: string) => Promise<void>;
  onAssessRisk: (id: string) => Promise<void>;
  onClearMarket: (id: string) => Promise<void>;
  onFinanceOffer: (invoiceId: string, offerId: string) => Promise<void>;
  onSettleFinancing: (recordId: string, isSuccessful?: boolean) => Promise<void>;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  state,
  selectedInvoiceId,
  onSelectInvoice,
  onVerify,
  onAssessRisk,
  onClearMarket,
  onFinanceOffer,
  onSettleFinancing
}) => {
  const currentInvoice = state.invoices.find(i => i.id === selectedInvoiceId) || state.invoices[0];
  const offers = state.offersMap[currentInvoice?.id || ''] || [];
  const supplier = state.suppliers.find(s => s.id === currentInvoice?.supplierId);
  const buyer = state.buyers.find(b => b.id === currentInvoice?.buyerId);
  const financingRecord = state.financingRecords.find(r => r.invoiceId === currentInvoice?.id);

  const [isLoading, setIsLoading] = useState(false);

  // Define the 9 Stages
  const stages = [
    { id: 1, name: 'Invoice', label: '1. Invoice', icon: FileText },
    { id: 2, name: 'Verify', label: '2. Verification', icon: ShieldCheck },
    { id: 3, name: 'Risk', label: '3. Risk Review', icon: AlertCircle },
    { id: 4, name: 'Discover', label: '4. Discovery', icon: Search },
    { id: 5, name: 'Bidding', label: '5. Provider Bids', icon: Users },
    { id: 6, name: 'Compare', label: '6. Scoring', icon: Layers },
    { id: 7, name: 'Match', label: '7. Allocation', icon: Award },
    { id: 8, name: 'Finance', label: '8. Funding', icon: DollarSign },
    { id: 9, name: 'Settle', label: '9. Settlement', icon: RefreshCw }
  ];

  const getStageStatus = (stageId: number) => {
    if (!currentInvoice) return 'pending';
    if (stageId === 1) return 'completed';
    if (stageId === 2) {
      if (!currentInvoice.verificationResult) return 'current';
      return currentInvoice.verificationResult.status === 'FAILED' ? 'failed' : 'completed';
    }
    if (stageId === 3) {
      if (currentInvoice.verificationResult?.status === 'FAILED') return 'skipped';
      if (!currentInvoice.riskAssessment) return 'current';
      return 'completed';
    }
    if (stageId === 4 || stageId === 5 || stageId === 6 || stageId === 7) {
      if (currentInvoice.verificationResult?.status === 'FAILED') return 'skipped';
      if (offers.length === 0) return 'current';
      return 'completed';
    }
    if (stageId === 8) {
      if (!financingRecord) return offers.length > 0 ? 'current' : 'pending';
      return 'completed';
    }
    if (stageId === 9) {
      if (!financingRecord) return 'pending';
      return financingRecord.status === 'SETTLED_COMPLETED' ? 'completed' : (financingRecord.status === 'SETTLEMENT_FAILED' ? 'failed' : 'current');
    }
    return 'pending';
  };

  const handleStepAction = async () => {
    if (!currentInvoice) return;
    setIsLoading(true);
    try {
      if (!currentInvoice.verificationResult) {
        await onVerify(currentInvoice.id);
      } else if (!currentInvoice.riskAssessment) {
        await onAssessRisk(currentInvoice.id);
      } else if (offers.length === 0) {
        await onClearMarket(currentInvoice.id);
      } else if (!financingRecord) {
        const winning = offers.find(o => o.isSelected) || offers[0];
        if (winning) await onFinanceOffer(currentInvoice.id, winning.id);
      } else if (financingRecord.status === 'ACTIVE_FINANCED') {
        await onSettleFinancing(financingRecord.id, true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Invoice Selector Strip */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Invoice:</span>
          <select
            value={currentInvoice?.id}
            onChange={(e) => onSelectInvoice(e.target.value)}
            style={{
              background: '#ffffff',
              color: 'var(--text-main)',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          >
            {state.invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — ₹{inv.amountLakhs}L (Status: {inv.status})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={handleStepAction}
            disabled={isLoading || (financingRecord?.status === 'SETTLED_COMPLETED')}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            <Play size={13} />
            {isLoading ? 'Executing...' : 'Next Step'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onClearMarket(currentInvoice.id)}
            disabled={isLoading}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            <Zap size={13} color="var(--primary-blue)" />
            Auto-Clear Deal
          </button>
        </div>
      </div>

      {/* Clean 9-Stage Progress Bar */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
          {stages.map((stage, idx) => {
            const status = getStageStatus(stage.id);

            let circleBg = '#f1f5f9';
            let circleColor = '#64748b';
            let circleBorder = '1px solid #cbd5e1';

            if (status === 'completed') {
              circleBg = '#16a34a';
              circleColor = '#ffffff';
              circleBorder = 'none';
            } else if (status === 'current') {
              circleBg = '#2563eb';
              circleColor = '#ffffff';
              circleBorder = 'none';
            } else if (status === 'failed') {
              circleBg = '#dc2626';
              circleColor = '#ffffff';
              circleBorder = 'none';
            }

            return (
              <React.Fragment key={stage.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: circleBg,
                    color: circleColor,
                    border: circleBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '6px'
                  }}>
                    {status === 'completed' ? <Check size={16} /> : stage.id}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: status === 'current' ? 700 : 500, color: status === 'current' ? 'var(--primary-blue)' : 'var(--text-main)' }}>
                    {stage.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'capitalize', color: status === 'completed' ? 'var(--success-emerald-text)' : 'var(--text-faint)' }}>
                    {status}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: status === 'completed' ? '#16a34a' : '#e2e8f0',
                    minWidth: '16px',
                    alignSelf: 'center',
                    marginBottom: '22px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stage Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Stage 1 & 2: Verification Details */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              1. Document & Verification
            </h3>
            {currentInvoice?.verificationResult && (
              <span className={`badge ${currentInvoice.verificationResult.status === 'PASSED' ? 'badge-emerald' : 'badge-rose'}`}>
                {currentInvoice.verificationResult.status} ({currentInvoice.verificationResult.verificationScore}/100)
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div>• <strong>Supplier:</strong> {supplier?.name} (GSTIN: {supplier?.gstin})</div>
            <div>• <strong>Buyer:</strong> {buyer?.name} (Rating: {buyer?.rating})</div>
            <div>• <strong>Amount:</strong> ₹{currentInvoice?.amountLakhs}L (Urgent Need: ₹{currentInvoice?.minRequiredAmountLakhs}L)</div>
            <div>• <strong>PO Number:</strong> {currentInvoice?.purchaseOrderNumber}</div>
            <div>• <strong>eWay Bill:</strong> {currentInvoice?.eWayBillNumber}</div>
          </div>

          {currentInvoice?.verificationResult && (
            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.775rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>Audit Summary:</strong> {currentInvoice.verificationResult.explanation}
            </div>
          )}
        </div>

        {/* Stage 3: Risk Assessment */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              2. Underwriting & Risk Grade
            </h3>
            {currentInvoice?.riskAssessment && (
              <span className={`badge ${currentInvoice.riskAssessment.riskTier === 'TIER_1_AAA' ? 'badge-emerald' : 'badge-amber'}`}>
                {currentInvoice.riskAssessment.riskTier}
              </span>
            )}
          </div>

          {currentInvoice?.riskAssessment ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Risk Score:</strong> <strong style={{ color: 'var(--primary-blue)' }}>{currentInvoice.riskAssessment.compositeScore}/100</strong></div>
              <div>• <strong>Buyer Quality:</strong> {currentInvoice.riskAssessment.buyerRiskScore}/100 ({buyer?.rating})</div>
              <div>• <strong>Supplier Track Record:</strong> {currentInvoice.riskAssessment.supplierRiskScore}/100 ({supplier?.completedDeals} deals)</div>
              <div>• <strong>Recommended Advance:</strong> {(currentInvoice.riskAssessment.recommendedMaxAdvance * 100)}%</div>
              <div>• <strong>Base Pricing Benchmark:</strong> {currentInvoice.riskAssessment.recommendedBaseRate}% APR</div>
            </div>
          ) : (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-faint)', paddingTop: '8px' }}>
              Risk evaluation will execute upon invoice verification.
            </p>
          )}
        </div>

        {/* Stage 8 & 9: Financing & Settlement */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              3. Funding & Settlement
            </h3>
            {financingRecord && (
              <span className={`badge ${financingRecord.status === 'SETTLED_COMPLETED' ? 'badge-emerald' : 'badge-cyan'}`}>
                {financingRecord.status === 'SETTLED_COMPLETED' ? 'Settled' : 'Financed'}
              </span>
            )}
          </div>

          {financingRecord ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Funder:</strong> {financingRecord.providerName}</div>
              <div>• <strong>Disbursed:</strong> ₹{financingRecord.disbursedAmountLakhs}L @ {financingRecord.interestRatePercent}% APR</div>
              <div>• <strong>Settlement Speed:</strong> {financingRecord.settlementSpeedHours}h (T+0 instant)</div>
              <div>• <strong>Disbursed At:</strong> {new Date(financingRecord.disbursedAt).toLocaleTimeString()}</div>
              
              {financingRecord.status === 'ACTIVE_FINANCED' && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => onSettleFinancing(financingRecord.id, true)}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', flex: 1 }}
                  >
                    Simulate Buyer Repayment
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onSettleFinancing(financingRecord.id, false)}
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Simulate Delay
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-faint)', paddingTop: '8px' }}>
              Awaiting offer clearing and funding disbursement.
            </p>
          )}
        </div>
      </div>

      {/* Stage 5 & 6 & 7: Multi-Dimensional Offer Matrix */}
      {offers.length > 0 && (
        <OfferComparisonRadar
          invoice={currentInvoice}
          offers={offers}
          providers={state.providers}
          onFinanceOffer={onFinanceOffer}
          isFinancing={isLoading}
        />
      )}
    </div>
  );
};
