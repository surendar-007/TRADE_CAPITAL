import React from 'react';
import { ShieldCheck, Activity, RefreshCw, Layers, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { MarketMetrics } from '../types';

interface NavbarProps {
  metrics?: MarketMetrics;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  metrics,
  activeTab,
  setActiveTab,
  onReset,
  isResetting
}) => {
  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: '#ffffff', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-sm)' }}>
      {/* Top Banner */}
      <div className="app-container" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'var(--primary-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                TradeCapital
              </h1>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>CSI ORIGIN 2026</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supply Chain Working Capital Clearing & Discovery Platform
            </p>
          </div>
        </div>

        {/* Live Engine Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            <Activity size={14} />
            Market Clearing: Active
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={onReset} 
            disabled={isResetting}
            style={{ fontSize: '0.8rem', padding: '7px 13px' }}
          >
            <RefreshCw size={13} className={isResetting ? 'pulse-active' : ''} />
            Reset Data
          </button>
        </div>
      </div>

      {/* Metrics Ticker Bar */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="app-container" style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <DollarSign size={14} color="var(--primary-blue)" />
            <span style={{ color: 'var(--text-faint)' }}>Available Liquidity:</span>
            <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              ₹{(metrics?.totalAvailableLiquidityLakhs || 1330).toFixed(1)}L (₹{((metrics?.totalAvailableLiquidityLakhs || 1330) / 100).toFixed(2)} Cr)
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <TrendingUp size={14} color="var(--success-emerald)" />
            <span style={{ color: 'var(--text-faint)' }}>Active Financed:</span>
            <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              ₹{(metrics?.activeFinancingLakhs || 0).toFixed(1)}L
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <ShieldCheck size={14} color="var(--purple-accent)" />
            <span style={{ color: 'var(--text-faint)' }}>Avg Advance Rate:</span>
            <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {(metrics?.averageAdvanceRatePercent || 85.0).toFixed(1)}%
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <Clock size={14} color="var(--warning-amber)" />
            <span style={{ color: 'var(--text-faint)' }}>Avg Settlement:</span>
            <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {(metrics?.averageSettlementTimeHours || 18.5).toFixed(1)} hrs
            </strong>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="app-container" style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'scenarios', label: 'Benchmark Scenarios' },
            { id: 'pipeline', label: 'Clearing Pipeline' },
            { id: 'supplier', label: 'Supplier Portal' },
            { id: 'providers', label: 'Capital Providers' },
            { id: 'analytics', label: 'Market Analytics' },
            { id: 'logs', label: 'Audit Logs' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  color: isActive ? 'var(--primary-blue)' : 'var(--text-muted)',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary-blue)' : '2px solid transparent',
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
