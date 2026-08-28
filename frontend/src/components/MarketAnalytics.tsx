import React from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  DollarSign
} from 'lucide-react';
import { MarketplaceState } from '../types';

interface MarketAnalyticsProps {
  state: MarketplaceState;
}

export const MarketAnalytics: React.FC<MarketAnalyticsProps> = ({ state }) => {
  const metrics = state.metrics;
  const totalFund = state.providers.reduce((sum, p) => sum + p.totalFundSizeLakhs, 0);
  const totalDeployed = state.providers.reduce((sum, p) => sum + p.deployedCapitalLakhs, 0);
  const totalAvailable = state.providers.reduce((sum, p) => sum + p.availableLiquidityLakhs, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Market Analytics & Liquidity Allocation</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
            Aggregated metrics on capital availability, portfolio deployment, and market clearing performance.
          </p>
        </div>
        <span className="badge badge-emerald">Continuous Allocation Active</span>
      </div>

      {/* Top 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-faint)' }}>Total Liquidity Pool</span>
            <DollarSign size={15} color="var(--primary-blue)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalFund.toFixed(1)}L (₹{(totalFund / 100).toFixed(2)} Cr)
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Available: ₹{totalAvailable.toFixed(1)}L | Deployed: ₹{totalDeployed.toFixed(1)}L
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-faint)' }}>Completed Settlements</span>
            <ShieldCheck size={15} color="var(--success-emerald)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success-emerald-text)', fontFamily: 'var(--font-mono)' }}>
            ₹{(metrics?.completedSettlementsLakhs || 0).toFixed(1)}L
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            100% Escrow Reconciled
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-faint)' }}>Avg Clearing Rate (APR)</span>
            <TrendingUp size={15} color="var(--purple-accent)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {(metrics?.averageClearingRatePercent || 10.8).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Competitive Risk-Adjusted Pricing
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-faint)' }}>Avg Disbursed Advance</span>
            <Zap size={15} color="var(--warning-amber)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {(metrics?.averageAdvanceRatePercent || 85.0).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Avg Turnaround: {(metrics?.averageSettlementTimeHours || 18.5).toFixed(0)} hrs
          </div>
        </div>
      </div>

      {/* Two Column Grid: Provider Capital Share & Traditional vs Autonomous Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        {/* Provider Deployment Distribution */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '14px' }}>
            Capital Allocation Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {state.providers.map(p => {
              const share = Math.round((p.totalFundSizeLakhs / totalFund) * 100);
              const util = Math.round((p.deployedCapitalLakhs / p.totalFundSizeLakhs) * 100);

              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{p.name} ({p.type})</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ₹{p.availableLiquidityLakhs.toFixed(0)}L liquid ({share}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${util}%`, height: '100%', background: 'var(--primary-blue)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                    {util}% Deployed
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Traditional Bilateral vs Autonomous Competitive Market */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
            Bilateral vs. Competitive Marketplace Comparison
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: '6px' }}>
              <strong style={{ color: 'var(--danger-rose-text)' }}>Traditional Single-Financier Model:</strong>
              <p style={{ color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                Supplier approaches a single bank with rigid advance caps and slow approvals. Limited price discovery leaves working capital locked.
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '6px' }}>
              <strong style={{ color: 'var(--success-emerald-text)' }}>Competitive Capital Market:</strong>
              <p style={{ color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.4 }}>
                Multiple banks, NBFCs, and fintechs compete simultaneously. Multi-dimensional clearing matches supplier cash flow requirements with provider risk mandates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
