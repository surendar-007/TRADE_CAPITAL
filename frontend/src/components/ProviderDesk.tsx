import React from 'react';
import { CheckCircle } from 'lucide-react';
import { MarketplaceState } from '../types';

interface ProviderDeskProps {
  state: MarketplaceState;
}

export const ProviderDesk: React.FC<ProviderDeskProps> = ({ state }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Capital Provider Management Desk</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
            Institutional capital allocators operating with distinct underwriting mandates, deployable liquidity pools, and exposure caps.
          </p>
        </div>
        <span className="badge badge-purple">4 Institutional Lenders Active</span>
      </div>

      {/* Capital Providers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {state.providers.map(provider => {
          const utilizationRate = Math.round((provider.deployedCapitalLakhs / provider.totalFundSizeLakhs) * 100);

          return (
            <div key={provider.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#f1f5f9', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {provider.type}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {provider.name}
                    </h3>
                  </div>

                  <span className={`badge ${
                    provider.riskAppetite === 'CONSERVATIVE' ? 'badge-cyan' :
                    (provider.riskAppetite === 'MODERATE' ? 'badge-emerald' : 'badge-amber')
                  }`}>
                    {provider.riskAppetite}
                  </span>
                </div>

                {/* Liquidity Meters */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-faint)' }}>Available Capital:</span>
                    <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      ₹{provider.availableLiquidityLakhs.toFixed(1)}L / ₹{provider.totalFundSizeLakhs.toFixed(1)}L
                    </strong>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{
                      width: `${100 - utilizationRate}%`,
                      height: '100%',
                      background: 'var(--primary-blue)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>Active Deployed: ₹{provider.deployedCapitalLakhs.toFixed(1)}L</span>
                    <span>Utilization: {utilizationRate}%</span>
                  </div>
                </div>

                {/* Underwriting Rules */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  <div>
                    <span style={{ color: 'var(--text-faint)' }}>Base Rate:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{provider.baseInterestRatePercent.toFixed(1)}% APR</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-faint)' }}>Max Advance Cap:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{(provider.maxAdvanceRate * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-faint)' }}>Settlement Time:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{provider.settlementSpeedHours}h ({provider.settlementSpeedHours <= 2 ? 'Instant T+0' : `T+${Math.ceil(provider.settlementSpeedHours / 24)}`})</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-faint)' }}>Min Risk Grade:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Score &ge; {provider.minAcceptableRiskScore}/100</div>
                  </div>
                </div>

                {/* Single Buyer Concentrations */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', marginBottom: '6px' }}>
                    Single-Buyer Portfolio Exposures (Limit: ₹{provider.maxExposurePerBuyerLakhs}L):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {Object.entries(provider.buyerExposures).map(([buyerId, exp]) => {
                      const buyer = state.buyers.find(b => b.id === buyerId);
                      const isNearCap = exp >= (provider.maxExposurePerBuyerLakhs * 0.7);
                      return (
                        <div 
                          key={buyerId}
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            background: isNearCap ? 'var(--warning-amber-light)' : '#f1f5f9',
                            border: `1px solid ${isNearCap ? '#fde68a' : '#e2e8f0'}`,
                            color: isNearCap ? 'var(--warning-amber-text)' : 'var(--text-muted)'
                          }}
                        >
                          {buyer?.name.split(' ')[0]}: ₹{exp.toFixed(0)}L
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--success-emerald-text)' }}>
                  <CheckCircle size={13} /> Auto-Bidding Active
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Max Tenor: {provider.maxTenorDays}d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
