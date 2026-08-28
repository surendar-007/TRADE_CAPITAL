import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Zap,
  Users,
  ShieldCheck,
  Building2,
  Layers
} from 'lucide-react';
import { AgentLog, CoreAgentType } from '../types';

interface AgentLogsDrawerProps {
  logs: AgentLog[];
}

export const AgentLogsDrawer: React.FC<AgentLogsDrawerProps> = ({ logs }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const filteredLogs = selectedFilter === 'ALL'
    ? logs
    : logs.filter(l => l.agentName.includes(selectedFilter));

  const getAgentBadge = (agentName: string) => {
    if (agentName.includes('Agent 1')) {
      return <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>Agent 1: Supplier Demand</span>;
    } else if (agentName.includes('Agent 2')) {
      return <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Agent 2: Capital Provider</span>;
    } else if (agentName.includes('Agent 3')) {
      return <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>Agent 3: Clearing & Settle</span>;
    }
    return <span className="badge" style={{ fontSize: '0.7rem' }}>{agentName}</span>;
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return <CheckCircle size={14} color="var(--success-emerald)" />;
      case 'WARNING':
        return <AlertTriangle size={14} color="var(--warning-amber)" />;
      case 'ACTION':
        return <Zap size={14} color="var(--primary-blue)" />;
      default:
        return <Info size={14} color="var(--text-faint)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 3 Core AI Agents Overview Header */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
          3 Core Autonomous AI Agents Architecture
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '16px' }}>
          As specified in the Problem Statement, the marketplace operates via three specialized autonomous AI agents coordinating across the entire financing lifecycle.
        </p>

        {/* 3 Agent Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <ShieldCheck size={16} color="var(--primary-blue)" />
              <strong style={{ fontSize: '0.85rem', color: 'var(--primary-blue)' }}>Agent 1: Supplier Demand & Verification</strong>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Role:</strong> Formulates supplier liquidity preferences, evaluates documentation under incomplete data, and performs electronic 3-way reconciliation (GSTIN, PO, eWay Bill).
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Building2 size={16} color="var(--purple-accent)" />
              <strong style={{ fontSize: '0.85rem', color: 'var(--purple-accent)' }}>Agent 2: Capital Provider Underwriting</strong>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Role:</strong> Represents institutional lenders (Banks, NBFCs, Fintechs) to autonomously evaluate deal suitability, enforce portfolio caps, and compute dynamic risk-adjusted pricing bids.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Layers size={16} color="var(--success-emerald)" />
              <strong style={{ fontSize: '0.85rem', color: 'var(--success-emerald-text)' }}>Agent 3: Clearing & Settlement</strong>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Role:</strong> Multi-attribute TOPSIS clearing engine that optimizes trade-offs (explains Lowest Rate ≠ Best Fit), executes escrow funding, and dynamically recycles liquidity upon settlement.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Real-Time Agent Activity Stream ({filteredLogs.length} Events)
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'ALL', label: 'All Agents' },
              { id: 'Agent 1', label: 'Agent 1 (Demand)' },
              { id: 'Agent 2', label: 'Agent 2 (Provider)' },
              { id: 'Agent 3', label: 'Agent 3 (Clearing)' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: selectedFilter === f.id ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                  background: selectedFilter === f.id ? 'var(--primary-blue-light)' : '#ffffff',
                  color: selectedFilter === f.id ? 'var(--primary-blue)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
          {filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ marginTop: '2px' }}>{getLevelIcon(log.level)}</div>

              <div style={{ minWidth: '75px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>

              <div style={{ minWidth: '180px' }}>
                {getAgentBadge(log.agentName)}
              </div>

              <div style={{ flex: 1, color: 'var(--text-main)', lineHeight: 1.45 }}>
                {log.message}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
