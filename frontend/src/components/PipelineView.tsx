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
  onInitiateFinance?: (invoiceId: string, offerId?: string) => Promise<void>;
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
  onInitiateFinance,
  onFinanceOffer,
  onSettleFinancing
}) => {
  const currentInvoice = state.invoices.find(i => i.id === selectedInvoiceId);
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

  const isVerificationFailed = currentInvoice?.verificationResult?.status === 'FAILED' || currentInvoice?.status === 'VERIFICATION_FAILED';
  const isSettled = currentInvoice?.status === 'SETTLED' || financingRecord?.status === 'SETTLED_COMPLETED';

  const getStageStatus = (stageId: number) => {
    if (!currentInvoice) return 'pending';
    if (stageId === 1) return 'completed';
    if (stageId === 2) {
      if (!currentInvoice.verificationResult) return 'current';
      return isVerificationFailed ? 'failed' : 'completed';
    }
    
    if (isVerificationFailed) return 'locked';

    if (stageId === 3) {
      if (!currentInvoice.riskAssessment) return 'current';
      return 'completed';
    }
    if (stageId === 4) {
      if (!currentInvoice.matches || currentInvoice.matches.length === 0) {
        return currentInvoice.riskAssessment ? 'current' : 'pending';
      }
      return 'completed';
    }
    if (stageId === 5 || stageId === 6) {
      if (offers.length === 0) return currentInvoice.riskAssessment ? 'current' : 'pending';
      return 'completed';
    }
    if (stageId === 7) {
      if (currentInvoice.status === 'MATCHED' || currentInvoice.status === 'FINANCING_INITIATED' || currentInvoice.status === 'FINANCED' || currentInvoice.status === 'SETTLEMENT_PENDING' || currentInvoice.status === 'SETTLED') {
        return 'completed';
      }
      return offers.length > 0 ? 'current' : 'pending';
    }
    if (stageId === 8) {
      if (currentInvoice.status === 'FINANCED' || currentInvoice.status === 'SETTLEMENT_PENDING' || currentInvoice.status === 'SETTLED' || financingRecord) {
        return 'completed';
      }
      if (currentInvoice.status === 'FINANCING_INITIATED' || currentInvoice.status === 'MATCHED') {
        return 'current';
      }
      return 'pending';
    }
    if (stageId === 9) {
      if (isSettled) return 'completed';
      if (currentInvoice.status === 'DEFAULTED' || financingRecord?.status === 'SETTLEMENT_FAILED') return 'failed';
      if (currentInvoice.status === 'SETTLEMENT_PENDING' || currentInvoice.status === 'FINANCED' || financingRecord?.status === 'ACTIVE_FINANCED') {
        return 'current';
      }
      return 'pending';
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
      } else if (offers.length === 0 || currentInvoice.status === 'IN_MARKET' || currentInvoice.status === 'VERIFIED') {
        await onClearMarket(currentInvoice.id);
      } else if (currentInvoice.status === 'MATCHED') {
        const winning = offers.find(o => o.isSelected) || offers[0];
        if (onInitiateFinance) {
          await onInitiateFinance(currentInvoice.id, winning?.id);
        } else if (winning) {
          await onFinanceOffer(currentInvoice.id, winning.id);
        }
      } else if (currentInvoice.status === 'FINANCING_INITIATED') {
        const winning = offers.find(o => o.isSelected) || offers[0];
        if (winning) await onFinanceOffer(currentInvoice.id, winning.id);
      } else if (currentInvoice.status === 'SETTLEMENT_PENDING' || currentInvoice.status === 'FINANCED' || financingRecord?.status === 'ACTIVE_FINANCED') {
        if (financingRecord) {
          await onSettleFinancing(financingRecord.id, true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStepButtonLabel = () => {
    if (isLoading) return 'Executing...';
    if (!currentInvoice) return 'Next Step';
    if (!currentInvoice.verificationResult) return 'Verify Invoice';
    if (!currentInvoice.riskAssessment) return 'Assess Risk';
    if (offers.length === 0 || currentInvoice.status === 'IN_MARKET' || currentInvoice.status === 'VERIFIED') return 'Run Clearing Engine';
    if (currentInvoice.status === 'MATCHED') return 'Initiate Financing';
    if (currentInvoice.status === 'FINANCING_INITIATED') return 'Disburse Capital';
    if (currentInvoice.status === 'SETTLEMENT_PENDING' || currentInvoice.status === 'FINANCED' || financingRecord?.status === 'ACTIVE_FINANCED') return 'Settle Obligation';
    if (isSettled) return 'Settlement Complete';
    return 'Next Step';
  };

  if (!currentInvoice) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Invoice:</span>
            <select
              value=""
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
              <option value="" disabled>-- No Invoice Selected --</option>
              {state.invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — ₹{inv.amountLakhs}L (Status: {inv.status})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <AlertCircle size={48} color="var(--danger-rose)" opacity={0.8} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Invoice verification failed. No financing workflow is available.
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', lineHeight: 1.5 }}>
            The current invoice is incomplete, verification failed, or no invoice is selected. 
            Please upload and submit a valid verified invoice to access the clearing pipeline, or select an existing invoice from the dropdown above.
          </p>
        </div>
      </div>
    );
  }

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
            disabled={isLoading || isSettled || isVerificationFailed}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            <Play size={13} />
            {getStepButtonLabel()}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onClearMarket(currentInvoice.id)}
            disabled={isLoading || isVerificationFailed}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            <Zap size={13} color="var(--primary-blue)" />
            Auto-Clear Deal
          </button>
        </div>
      </div>

      {isVerificationFailed && (
        <div style={{ padding: '12px 20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            Verification failed. This invoice cannot proceed to financing.
          </span>
        </div>
      )}

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
            } else if (status === 'locked') {
              circleBg = '#f1f5f9';
              circleColor = '#94a3b8';
              circleBorder = '1px dashed #cbd5e1';
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              2. Underwriting & Risk Assessment
            </h3>
            {currentInvoice?.riskAssessment && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className={`badge ${
                  currentInvoice.riskAssessment.riskBand === 'LOW' ? 'badge-emerald' : 
                  currentInvoice.riskAssessment.riskBand === 'MEDIUM' ? 'badge-amber' : 'badge-rose'
                }`}>
                  {currentInvoice.riskAssessment.riskBand || currentInvoice.riskAssessment.riskTier} RISK
                </span>
                {currentInvoice.riskAssessment.riskConfidence && (
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                    Conf: {currentInvoice.riskAssessment.riskConfidence}
                  </span>
                )}
              </div>
            )}
          </div>

          {currentInvoice?.riskAssessment ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                <span>Risk Score:</span>
                <strong style={{ fontSize: '1.1rem', color: currentInvoice.riskAssessment.riskBand === 'LOW' ? 'var(--success-emerald-text)' : currentInvoice.riskAssessment.riskBand === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--danger-rose)' }}>
                  {currentInvoice.riskAssessment.riskScore || currentInvoice.riskAssessment.compositeScore}/100
                </strong>
              </div>
              <div>• <strong>Buyer Quality:</strong> {currentInvoice.riskAssessment.buyerRiskScore}/100 ({buyer?.rating || 'A'})</div>
              <div>• <strong>Supplier Track Record:</strong> {currentInvoice.riskAssessment.supplierRiskScore}/100 ({supplier?.completedDeals} deals)</div>
              <div>• <strong>Recommended Advance:</strong> {(currentInvoice.riskAssessment.recommendedMaxAdvance * 100)}% max</div>
              <div>• <strong>Base Pricing Benchmark:</strong> {currentInvoice.riskAssessment.recommendedBaseRate}% APR</div>

              {currentInvoice.riskAssessment.riskReasons && currentInvoice.riskAssessment.riskReasons.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Risk Factor Breakdown:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {currentInvoice.riskAssessment.riskReasons.map((reason, rIdx) => (
                      <span key={rIdx} style={{ fontSize: '0.75rem', color: reason.startsWith('✓') ? '#15803d' : '#b91c1c' }}>
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-faint)', paddingTop: '8px' }}>
              Risk evaluation will execute upon invoice verification.
            </p>
          )}
        </div>

        {/* Stage 4: Provider Matching & Eligibility */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              3. Provider Eligibility Matching
            </h3>
            {currentInvoice?.matches && (
              <span className={`badge ${currentInvoice.matches.some(m => m.isEligible) ? 'badge-emerald' : 'badge-rose'}`}>
                {currentInvoice.matches.filter(m => m.isEligible).length}/{currentInvoice.matches.length} Eligible
              </span>
            )}
          </div>

          {currentInvoice?.matches && currentInvoice.matches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentInvoice.matches.map((match, mIdx) => (
                <div key={mIdx} style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: match.isEligible ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${match.isEligible ? '#bbf7d0' : '#fecaca'}`,
                  fontSize: '0.775rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{match.provider.name}</strong>
                    <span style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: match.isEligible ? '#16a34a' : '#dc2626',
                      color: '#ffffff'
                    }}>
                      {match.isEligible ? 'ELIGIBLE' : 'EXCLUDED'}
                    </span>
                  </div>
                  {match.isEligible ? (
                    <div style={{ color: '#15803d', fontSize: '0.725rem', lineHeight: 1.4 }}>
                      {match.eligibilityReasons && match.eligibilityReasons.length > 0 ? (
                        match.eligibilityReasons.slice(0, 2).map((r, rId) => <div key={rId}>{r}</div>)
                      ) : (
                        <div>✓ Mandate, liquidity & concentration limits satisfied</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#b91c1c', fontSize: '0.725rem', lineHeight: 1.4 }}>
                      {match.exclusionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-faint)', paddingTop: '8px' }}>
              Provider constraint checks will execute upon risk assessment.
            </p>
          )}
        </div>

        {/* Stage 8 & 9: Financing & Settlement */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              4. Funding & Settlement
            </h3>
            {isSettled ? (
              <span className="badge badge-emerald">SETTLED</span>
            ) : currentInvoice?.status === 'SETTLEMENT_PENDING' || financingRecord?.status === 'ACTIVE_FINANCED' ? (
              <span className="badge badge-cyan">FINANCED • SETTLEMENT PENDING</span>
            ) : currentInvoice?.status === 'FINANCING_INITIATED' ? (
              <span className="badge badge-amber">FINANCING INITIATED</span>
            ) : currentInvoice?.status === 'MATCHED' ? (
              <span className="badge badge-purple" style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>MATCHED</span>
            ) : null}
          </div>

          {isSettled ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Funder:</strong> {financingRecord?.providerName || 'Institutional Capital Pool'}</div>
              <div>• <strong>Total Settled:</strong> <strong style={{ color: 'var(--success-emerald-text)' }}>₹{currentInvoice.settledAmountLakhs || financingRecord?.faceValueLakhs || currentInvoice.amountLakhs}L</strong></div>
              <div>• <strong>Settled At:</strong> {currentInvoice.settledAt ? new Date(currentInvoice.settledAt).toLocaleTimeString() : (financingRecord?.settledAt ? new Date(financingRecord.settledAt).toLocaleTimeString() : 'Completed')}</div>
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.75rem' }}>
                ✓ Trade debt obligation successfully cleared and closed. Capital returned to provider escrow.
              </div>
            </div>
          ) : currentInvoice?.status === 'SETTLEMENT_PENDING' || financingRecord?.status === 'ACTIVE_FINANCED' ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Funder:</strong> {financingRecord?.providerName || 'Selected Capital Provider'}</div>
              <div>• <strong>Disbursed Capital:</strong> <strong style={{ color: 'var(--primary-blue)' }}>₹{financingRecord?.disbursedAmountLakhs || currentInvoice.financedAmountLakhs || currentInvoice.amountLakhs}L</strong></div>
              <div>• <strong>Pricing & Terms:</strong> {financingRecord?.interestRatePercent || 11.5}% APR ({financingRecord?.settlementSpeedHours || 2}h T+0 speed)</div>
              <div>• <strong>Disbursed At:</strong> {financingRecord?.disbursedAt ? new Date(financingRecord.disbursedAt).toLocaleTimeString() : (currentInvoice.financedAt ? new Date(currentInvoice.financedAt).toLocaleTimeString() : 'Active')}</div>
              
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-success"
                  onClick={() => {
                    if (financingRecord) {
                      onSettleFinancing(financingRecord.id, true);
                    } else {
                      fetch(`/api/invoices/${currentInvoice.id}/settle`, { method: 'POST' }).then(() => onSelectInvoice(currentInvoice.id));
                    }
                  }}
                  disabled={isLoading}
                  style={{ fontSize: '0.75rem', padding: '6px 12px', flex: 1 }}
                >
                  Settle Obligation (Simulate Buyer Repayment)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (financingRecord) {
                      onSettleFinancing(financingRecord.id, false);
                    }
                  }}
                  disabled={isLoading}
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  Simulate Delay
                </button>
              </div>
            </div>
          ) : currentInvoice?.status === 'FINANCING_INITIATED' ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Matched Provider:</strong> {offers.find(o => o.isSelected)?.providerName || 'Selected Capital Provider'}</div>
              <div>• <strong>Approved Amount:</strong> ₹{currentInvoice.matchedAmountLakhs || offers.find(o => o.isSelected)?.offeredAmountLakhs || currentInvoice.amountLakhs}L</div>
              <div>• <strong>Initiated At:</strong> {currentInvoice.financingInitiatedAt ? new Date(currentInvoice.financingInitiatedAt).toLocaleTimeString() : 'Just now'}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                Escrow contract initialized. Ready for capital disbursement.
              </p>
              <div style={{ marginTop: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const winning = offers.find(o => o.isSelected) || offers[0];
                    if (winning) onFinanceOffer(currentInvoice.id, winning.id);
                  }}
                  disabled={isLoading}
                  style={{ fontSize: '0.75rem', padding: '6px 14px', width: '100%' }}
                >
                  Disburse & Complete Financing
                </button>
              </div>
            </div>
          ) : currentInvoice?.status === 'MATCHED' ? (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div>• <strong>Winning Provider:</strong> {offers.find(o => o.isSelected)?.providerName || 'Best Match'}</div>
              <div>• <strong>Offered Capital:</strong> ₹{currentInvoice.matchedAmountLakhs || offers.find(o => o.isSelected)?.offeredAmountLakhs}L @ {offers.find(o => o.isSelected)?.interestRatePercent}% APR</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                Optimal capital offer selected by TOPSIS. Ready to initiate financing escrow.
              </p>
              <div style={{ marginTop: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const winning = offers.find(o => o.isSelected) || offers[0];
                    if (onInitiateFinance) {
                      onInitiateFinance(currentInvoice.id, winning?.id);
                    } else if (winning) {
                      onFinanceOffer(currentInvoice.id, winning.id);
                    }
                  }}
                  disabled={isLoading}
                  style={{ fontSize: '0.75rem', padding: '6px 14px', width: '100%' }}
                >
                  Initiate Financing
                </button>
              </div>
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
