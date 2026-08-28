import React from 'react';
import { 
  Trophy, 
  Clock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FinancingOffer, Invoice, CapitalProvider } from '../types';

interface OfferComparisonRadarProps {
  invoice: Invoice;
  offers: FinancingOffer[];
  providers: CapitalProvider[];
  onFinanceOffer: (invoiceId: string, offerId: string) => Promise<void>;
  isFinancing: boolean;
}

export const OfferComparisonRadar: React.FC<OfferComparisonRadarProps> = ({
  invoice,
  offers,
  onFinanceOffer,
  isFinancing
}) => {
  if (!offers || offers.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No active competing offers to display for this invoice.
        </p>
      </div>
    );
  }

  const winningOffer = offers.find(o => o.isSelected) || offers[0];
  const lowestRateOffer = [...offers].sort((a, b) => a.interestRatePercent - b.interestRatePercent)[0];
  const isDifferentFromLowestRate = winningOffer.id !== lowestRateOffer.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Key Insight Breakdown Card */}
      {isDifferentFromLowestRate && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '16px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <CheckCircle2 size={18} color="var(--primary-blue)" />
            <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--primary-blue)' }}>
              Clearing Insight: Why Lowest Interest Rate Was Not The Best Fit
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Lowest Rate Offer Card */}
            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)' }}>Cheapest Nominal Rate:</span>
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Sub-optimal</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lowestRateOffer.providerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                • Rate: <strong>{lowestRateOffer.interestRatePercent}%</strong> (Cheapest)<br />
                • Advance: <span style={{ color: 'var(--danger-rose-text)', fontWeight: 600 }}>{lowestRateOffer.offeredAdvanceRate * 100}% (₹{lowestRateOffer.offeredAmountLakhs}L)</span> — Fails supplier's urgent ₹{invoice.minRequiredAmountLakhs}L requirement<br />
                • Settlement: <strong>{lowestRateOffer.settlementSpeedHours}h delay (T+3)</strong>
              </div>
            </div>

            {/* Winning Offer Card */}
            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-emerald-text)' }}>Selected Optimal Offer:</span>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Utility Score: {winningOffer.utilityScore}/100</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {winningOffer.providerName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                • Rate: <strong>{winningOffer.interestRatePercent}%</strong> (+{(winningOffer.interestRatePercent - lowestRateOffer.interestRatePercent).toFixed(1)}% spread justified by liquidity & speed)<br />
                • Advance: <span style={{ color: 'var(--success-emerald-text)', fontWeight: 600 }}>{winningOffer.offeredAdvanceRate * 100}% (₹{winningOffer.offeredAmountLakhs}L)</span> — Fully covers capital need<br />
                • Settlement: <span style={{ color: 'var(--success-emerald-text)', fontWeight: 600 }}>{winningOffer.settlementSpeedHours}h instant disbursement (T+0)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Competing Offers Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Competing Capital Offers ({offers.length} Providers)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              Scored using multi-attribute utility optimization: Advance ({(invoice.preferences.priorityWeights.advanceRate * 100)}%), Speed ({(invoice.preferences.priorityWeights.settlementSpeed * 100)}%), Rate ({(invoice.preferences.priorityWeights.interestRate * 100)}%).
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}>
                <th style={{ padding: '10px 8px' }}>Rank</th>
                <th style={{ padding: '10px 8px' }}>Provider</th>
                <th style={{ padding: '10px 8px' }}>Type</th>
                <th style={{ padding: '10px 8px' }}>Advance %</th>
                <th style={{ padding: '10px 8px' }}>Disbursed Capital</th>
                <th style={{ padding: '10px 8px' }}>Interest Rate</th>
                <th style={{ padding: '10px 8px' }}>Speed</th>
                <th style={{ padding: '10px 8px' }}>Fee</th>
                <th style={{ padding: '10px 8px' }}>Utility Score</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => {
                const isWinner = offer.isSelected;
                return (
                  <tr 
                    key={offer.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isWinner ? '#f0fdf4' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      {isWinner ? (
                        <span style={{ color: 'var(--warning-amber-text)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Trophy size={14} /> #1
                        </span>
                      ) : (
                        `#${offer.rank || 2}`
                      )}
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: 600, color: isWinner ? 'var(--primary-blue)' : 'var(--text-main)' }}>
                      {offer.providerName}
                    </td>

                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                      {offer.providerType}
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      {offer.offeredAdvanceRate * 100}%
                    </td>

                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ₹{offer.offeredAmountLakhs.toFixed(1)}L
                    </td>

                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>
                      {offer.interestRatePercent.toFixed(1)}%
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <span className={`badge ${offer.settlementSpeedHours <= 2 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                        <Clock size={11} /> {offer.settlementSpeedHours}h
                      </span>
                    </td>

                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                      {offer.originationFeePercent}% (₹{offer.feeAmountLakhs.toFixed(2)}L)
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${offer.utilityScore}%`, height: '100%', background: isWinner ? 'var(--success-emerald)' : '#94a3b8' }} />
                        </div>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {offer.utilityScore}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {isWinner ? (
                        <button
                          className="btn btn-success"
                          onClick={() => onFinanceOffer(invoice.id, offer.id)}
                          disabled={isFinancing || invoice.status === 'FINANCED' || invoice.status === 'SETTLED'}
                          style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                        >
                          {invoice.status === 'FINANCED' ? 'Financed' : (invoice.status === 'SETTLED' ? 'Settled' : 'Disburse Capital')}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>Outranked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
