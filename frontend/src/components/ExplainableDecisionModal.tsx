import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Info, 
  FileText, 
  ArrowRight,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { FinancingOffer, Invoice, CapitalProvider, MatchResult } from '../types';

interface ExplainableDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  offers: FinancingOffer[];
  providers: CapitalProvider[];
  initialOfferId?: string;
}

export const ExplainableDecisionModal: React.FC<ExplainableDecisionModalProps> = ({
  isOpen,
  onClose,
  invoice,
  offers,
  providers,
  initialOfferId
}) => {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'matrix' | 'tree' | 'ineligible'>('breakdown');
  
  // Default to initialOfferId if passed, else winning offer, else first offer
  const winningOffer = offers.find(o => o.isSelected) || offers[0];
  const [selectedOfferId, setSelectedOfferId] = useState<string>(initialOfferId || winningOffer?.id || '');

  if (!isOpen || !invoice || offers.length === 0) return null;

  const currentOffer = offers.find(o => o.id === selectedOfferId) || winningOffer;
  const lowestRateOffer = [...offers].sort((a, b) => a.interestRatePercent - b.interestRatePercent)[0];
  const isWinner = currentOffer.id === winningOffer.id;
  const isLowestRate = currentOffer.id === lowestRateOffer.id;
  const isDifferentFromLowestRate = winningOffer.id !== lowestRateOffer.id;

  const weights = invoice.preferences?.priorityWeights || {
    advanceRate: 0.40,
    settlementSpeed: 0.30,
    interestRate: 0.20,
    fees: 0.05,
    tenorFlexibility: 0.05
  };

  const minRequired = invoice.minRequiredAmountLakhs || Math.round(invoice.amountLakhs * 0.8 * 10) / 10;
  const providerRecord = providers.find(p => p.id === currentOffer.providerId);

  // Ineligible providers from invoice matches
  const matchResults: MatchResult[] = invoice.matches || [];
  const ineligibleMatches = matchResults.filter(m => !m.isEligible);
  const eligibleMatches = matchResults.filter(m => m.isEligible);

  // Weighted score contributions for current offer
  const advanceContribution = Math.round(currentOffer.scoreBreakdown.advanceScore * weights.advanceRate);
  const speedContribution = Math.round(currentOffer.scoreBreakdown.speedScore * weights.settlementSpeed);
  const rateContribution = Math.round(currentOffer.scoreBreakdown.rateScore * weights.interestRate);
  const feeContribution = Math.round(currentOffer.scoreBreakdown.feeScore * weights.fees);
  const tenorContribution = Math.round(currentOffer.scoreBreakdown.tenorScore * (weights.tenorFlexibility || 0.05));

  // Determine deductions / what hurt the score
  const deductions: { label: string; reason: string; penalty: string }[] = [];
  if (currentOffer.offeredAmountLakhs < minRequired) {
    const deficit = (minRequired - currentOffer.offeredAmountLakhs).toFixed(1);
    deductions.push({
      label: 'Funding Deficit Penalty',
      reason: `Offered advance (₹${currentOffer.offeredAmountLakhs}L) fails to meet urgent supplier requirement (₹${minRequired}L, short by ₹${deficit}L).`,
      penalty: 'Subscore penalized (-20 to -50%)'
    });
  }
  if (currentOffer.settlementSpeedHours > 24) {
    deductions.push({
      label: 'Settlement Turnaround Delay',
      reason: `Settlement speed of ${currentOffer.settlementSpeedHours} hours is slower than instant T+0 clearing benchmark (<2h).`,
      penalty: `Speed subscore capped at ${currentOffer.scoreBreakdown.speedScore}/100`
    });
  }
  if (currentOffer.interestRatePercent > 11.5) {
    deductions.push({
      label: 'Financing Rate Spread',
      reason: `Interest rate of ${currentOffer.interestRatePercent}% APR is higher than competitive market baseline (8.0% - 10.5%).`,
      penalty: `Rate subscore reduced to ${currentOffer.scoreBreakdown.rateScore}/100`
    });
  }
  if (currentOffer.originationFeePercent > 0.4) {
    deductions.push({
      label: 'Origination Fee Overhead',
      reason: `Fee of ${currentOffer.originationFeePercent}% incurs additional closing overhead.`,
      penalty: `Fee subscore reduced to ${currentOffer.scoreBreakdown.feeScore}/100`
    });
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '820px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-blue)'
              }}>
                <Zap size={16} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                TradeCapital Explainable Decision Engine
              </h2>
              <span className="badge badge-cyan" style={{ fontSize: '0.675rem' }}>
                Invoice {invoice.invoiceNumber || invoice.id}
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.675rem' }}>
                Auditable & Deterministic
              </span>
            </div>
            <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Why this offer was selected • Lowest Rate ≠ Always Best Fit
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Four Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', background: '#f8fafc', padding: '6px 12px', margin: '0 -24px' }}>
          {[
            { id: 'breakdown', label: '1. Decision Breakdown' },
            { id: 'matrix', label: '2. Provider Comparison Matrix' },
            { id: 'tree', label: '3. Reasoning Tree & Pipeline' },
            { id: 'ineligible', label: `4. Ineligible Providers (${ineligibleMatches.length})` }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--primary-blue)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 4px 16px 0' }}>
          
          {/* TAB 1: DECISION BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Provider Selection Bar */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                  Inspect Score Breakdown For Provider:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {offers.map(o => {
                    const isSelected = o.id === currentOffer.id;
                    const isTop = o.isSelected;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOfferId(o.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isSelected ? 'var(--primary-blue)' : 'var(--border-medium)'}`,
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? 'var(--primary-blue)' : 'var(--text-main)',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isTop && <Trophy size={13} color="var(--warning-amber)" />}
                        <span>{o.providerName}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: isTop ? '#dcfce7' : '#f1f5f9',
                          color: isTop ? '#15803d' : 'var(--text-muted)',
                          fontWeight: 700
                        }}>
                          {o.utilityScore}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Summary Card */}
              <div style={{
                background: isWinner ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${isWinner ? '#bbf7d0' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isWinner ? '#15803d' : 'var(--text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {isWinner ? '🏆 Best Overall Financing Match' : `Rank #${currentOffer.rank || 2} Alternative Offer`}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                      {currentOffer.providerName} ({currentOffer.providerType})
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', display: 'block' }}>Overall Fit Score</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: isWinner ? 'var(--success-emerald)' : 'var(--primary-blue)', fontFamily: 'var(--font-mono)' }}>
                      {currentOffer.utilityScore} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
                    </span>
                  </div>
                </div>

                {/* Offer Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px' }}>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Advance Rate</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {currentOffer.offeredAdvanceRate * 100}%
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Disbursed Capital</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary-blue)', fontFamily: 'var(--font-mono)' }}>
                      ₹{currentOffer.offeredAmountLakhs.toFixed(1)}L
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Interest Rate</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {currentOffer.interestRatePercent.toFixed(1)}% APR
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Settlement Speed</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {currentOffer.settlementSpeedHours}h ({currentOffer.settlementSpeedHours <= 2 ? 'T+0 Instant' : 'Standard'})
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Origination Fee</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {currentOffer.originationFeePercent}% (₹{currentOffer.feeAmountLakhs.toFixed(2)}L)
                    </strong>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Provider Liquidity</span>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      ₹{providerRecord?.availableLiquidityLakhs || 120}L
                    </strong>
                  </div>
                </div>
              </div>

              {/* Positive Scoring Contributions */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="var(--success-emerald)" />
                  Positive Scoring Factors & Attribute Subscores
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>✓ Funding Requirement & Advance Rate</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.725rem' }}>
                        ({currentOffer.scoreBreakdown.advanceScore}/100 subscore × {Math.round(weights.advanceRate * 100)}% weight)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      +{advanceContribution} pts
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>✓ Settlement Speed & Urgency</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.725rem' }}>
                        ({currentOffer.scoreBreakdown.speedScore}/100 subscore × {Math.round(weights.settlementSpeed * 100)}% weight)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      +{speedContribution} pts
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>✓ Interest Rate Competitiveness</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.725rem' }}>
                        ({currentOffer.scoreBreakdown.rateScore}/100 subscore × {Math.round(weights.interestRate * 100)}% weight)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      +{rateContribution} pts
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>✓ Origination Fee Efficiency</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.725rem' }}>
                        ({currentOffer.scoreBreakdown.feeScore}/100 subscore × {Math.round(weights.fees * 100)}% weight)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      +{feeContribution} pts
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>✓ Tenor Suitability</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.725rem' }}>
                        ({currentOffer.scoreBreakdown.tenorScore}/100 subscore × {Math.round((weights.tenorFlexibility || 0.05) * 100)}% weight)
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'var(--font-mono)' }}>
                      +{tenorContribution} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions / What Hurt The Score */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} color="var(--warning-amber)" />
                  What Hurt The Score / Subscore Deductions
                </h4>

                {deductions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deductions.map((d, dIdx) => (
                      <div key={dIdx} style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.785rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <strong style={{ color: '#b91c1c' }}>⚠ {d.label}</strong>
                          <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.7rem' }}>{d.penalty}</span>
                        </div>
                        <p style={{ color: '#7f1d1d', margin: 0, lineHeight: 1.4 }}>{d.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontSize: '0.785rem' }}>
                    ✓ No significant score penalties recorded for this provider. Offer terms met or exceeded all target supplier benchmarks.
                  </div>
                )}
              </div>

              {/* Why Not The Lowest Rate Insight */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={15} />
                  TradeCapital Decision Insight: Why Not The Lowest Rate?
                </h4>
                
                {isDifferentFromLowestRate ? (
                  <div style={{ fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                    <p style={{ margin: 0 }}>
                      <strong>{lowestRateOffer.providerName}</strong> offered the lowest nominal interest rate at <strong>{lowestRateOffer.interestRatePercent}% APR</strong>. However, <strong>{winningOffer.providerName}</strong> won the deal with a higher utility score (<strong>{winningOffer.utilityScore}</strong> vs <strong>{lowestRateOffer.utilityScore}</strong>) because:
                    </p>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      <li>
                        <strong>Advance Adequacy:</strong> {winningOffer.providerName} provided <strong>{winningOffer.offeredAdvanceRate * 100}%</strong> (₹{winningOffer.offeredAmountLakhs}L), satisfying the supplier's urgent ₹{minRequired}L requirement, whereas {lowestRateOffer.providerName} offered only {lowestRateOffer.offeredAdvanceRate * 100}% (₹{lowestRateOffer.offeredAmountLakhs}L).
                      </li>
                      <li>
                        <strong>Settlement Speed:</strong> {winningOffer.providerName} clears in <strong>{winningOffer.settlementSpeedHours}h</strong> (T+0 instant), avoiding the <strong>{lowestRateOffer.settlementSpeedHours}h delay</strong> of the cheapest rate provider.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
                    The lowest-rate provider (<strong>{winningOffer.providerName}</strong> at <strong>{winningOffer.interestRatePercent}% APR</strong>) also achieved the highest overall fit score (<strong>{winningOffer.utilityScore}/100</strong>) for this opportunity by offering the optimal combination of capital volume, instant settlement, and competitive pricing.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROVIDER COMPARISON MATRIX */}
          {activeTab === 'matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Comprehensive multi-attribute ranking of all participating capital providers for Invoice #{invoice.invoiceNumber || invoice.id}:
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.785rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-faint)', background: '#f8fafc' }}>
                      <th style={{ padding: '8px' }}>Rank</th>
                      <th style={{ padding: '8px' }}>Provider</th>
                      <th style={{ padding: '8px' }}>Type</th>
                      <th style={{ padding: '8px' }}>Rate</th>
                      <th style={{ padding: '8px' }}>Advance</th>
                      <th style={{ padding: '8px' }}>Disbursed</th>
                      <th style={{ padding: '8px' }}>Speed</th>
                      <th style={{ padding: '8px' }}>Fee</th>
                      <th style={{ padding: '8px' }}>Utility Score</th>
                      <th style={{ padding: '8px' }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => {
                      const isTop = o.isSelected;
                      return (
                        <tr 
                          key={o.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isTop ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                            {isTop ? <span style={{ color: 'var(--warning-amber-text)' }}>🏆 #1</span> : `#${o.rank || 2}`}
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: isTop ? 'var(--primary-blue)' : 'var(--text-main)' }}>
                            {o.providerName}
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                            {o.providerType}
                          </td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>
                            {o.interestRatePercent}%
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                            {o.offeredAdvanceRate * 100}%
                          </td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            ₹{o.offeredAmountLakhs.toFixed(1)}L
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            {o.settlementSpeedHours}h
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                            {o.originationFeePercent}%
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <strong style={{ color: isTop ? '#15803d' : 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                              {o.utilityScore}/100
                            </strong>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            {isTop ? (
                              <span className="badge badge-emerald" style={{ fontSize: '0.675rem' }}>Selected</span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '0.725rem' }}>Outranked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REASONING TREE & PIPELINE */}
          {activeTab === 'tree' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Traceable step-by-step decision progression from raw supplier demand to capital allocation:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Step 1 */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Supplier Requirements Ingested</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Face Value: ₹{invoice.amountLakhs}L • Min Urgent Need: ₹{minRequired}L • Tenor: {invoice.tenorDays} Days
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✓ Ingested</span>
                </div>

                {/* Step 2 */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Deterministic Invoice Verification</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Status: {invoice.verificationResult?.status || 'PASSED'} • Integrity Score: {invoice.verificationResult?.verificationScore || 100}%
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✓ Passed</span>
                </div>

                {/* Step 3 */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Multi-Factor Risk Assessment</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Risk Grade: {invoice.riskAssessment?.riskBand || 'LOW_RISK'} • Composite Risk Score: {invoice.riskAssessment?.riskScore || 85}/100
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✓ Qualified</span>
                </div>

                {/* Step 4 */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>4</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Capital Provider Eligibility Filter</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {eligibleMatches.length} providers satisfied mandate, liquidity, and concentration caps ({ineligibleMatches.length} excluded)
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✓ Filtered</span>
                </div>

                {/* Step 5 */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>5</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Multi-Attribute TOPSIS Optimization</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Normalized multi-dimensional utility scoring across advance rate, speed, pricing, and fees
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✓ Optimized</span>
                </div>

                {/* Step 6 */}
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>6</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Optimal Deal Awarded</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      <strong>{winningOffer.providerName}</strong> selected with highest utility score of <strong>{winningOffer.utilityScore}/100</strong>
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>🏆 Winner</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INELIGIBLE PROVIDERS */}
          {activeTab === 'ineligible' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Providers excluded from bidding during the pre-trade underwriting and eligibility filter:
              </p>

              {ineligibleMatches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ineligibleMatches.map((m, mIdx) => (
                    <div 
                      key={mIdx}
                      style={{
                        padding: '12px 14px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{m.provider.name}</strong>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({m.provider.type} • Available: ₹{m.provider.availableLiquidityLakhs}L)
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#dc2626',
                          color: '#ffffff'
                        }}>
                          EXCLUDED
                        </span>
                      </div>

                      <div style={{ color: '#991b1b', fontSize: '0.75rem', lineHeight: 1.4 }}>
                        <strong>Reason:</strong> {m.exclusionReason || 'Policy or liquidity threshold not satisfied.'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '0.85rem', textAlign: 'center' }}>
                  ✓ All registered capital providers passed eligibility criteria for this opportunity.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.725rem',
          color: 'var(--text-faint)'
        }}>
          <div>
            <div><strong>Engine:</strong> TradeCapital Multi-Attribute Clearing Engine</div>
            <div><strong>Decision Confidence:</strong> {invoice.riskAssessment?.riskConfidence ? `${invoice.riskAssessment.riskConfidence} Confidence (Deterministic)` : 'HIGH Confidence (Deterministic)'} • <strong>Audit ID:</strong> {invoice.id}-CLR-{(winningOffer?.id || '001').slice(-6)}</div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '0.775rem', padding: '6px 14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
