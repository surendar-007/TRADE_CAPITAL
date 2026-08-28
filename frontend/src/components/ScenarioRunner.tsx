import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { MarketplaceState } from '../types';

interface ScenarioRunnerProps {
  state: MarketplaceState;
  onRunScenario: (scenarioId: string) => Promise<any>;
  onSelectInvoice: (invoiceId: string) => void;
  setActiveTab: (tab: string) => void;
}

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
  onRunScenario,
  onSelectInvoice,
  setActiveTab
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any | null>(null);

  const scenarios = [
    {
      id: 'flagship-20l',
      badge: 'Core Scenario',
      badgeClass: 'badge-cyan',
      title: '₹20L Urgent Capital Demand (Lowest Rate ≠ Best Fit)',
      description: 'Supplier urgently requires ₹16L minimum on a ₹20L invoice. Bank offers 9.0% rate but only 70% advance (₹14L) with 72h turnaround. Swift NBFC offers 11.5% with 90% advance (₹18L) and instant 2h settlement.',
      expectedOutcome: 'Swift Growth Capital (11.5% rate) is awarded the financing because advance volume and disbursement speed satisfy the supplier cash flow constraint.',
      invoiceId: 'inv-demo-20l'
    },
    {
      id: 'fraud-rejection',
      badge: 'Compliance & Verification',
      badgeClass: 'badge-rose',
      title: '3-Way Reconciliation & Document Verification',
      description: 'An invoice with an invalid eWay Bill and purchase order electronic mismatch is submitted to the clearing system.',
      expectedOutcome: 'Verification Engine detects document irregularities (Score: 35/100) and halts clearing before reaching lenders.',
      invoiceId: 'inv-fraud-002'
    },
    {
      id: 'high-risk',
      badge: 'Risk Underwriting',
      badgeClass: 'badge-amber',
      title: 'Higher-Risk Debtor with Data Uncertainty',
      description: 'Invoice submitted for NovaTech Infra (BBB credit, higher dispute frequency) with sparse historical supplier data.',
      expectedOutcome: 'Assigned Tier 3 Risk grade. Autonomous lenders apply a risk spread (+2.2%) and constrain advance to 65%.',
      invoiceId: 'inv-risk-003'
    },
    {
      id: 'portfolio-cap',
      badge: 'Portfolio Limits',
      badgeClass: 'badge-purple',
      title: 'Single-Buyer Concentration Limit Enforcement',
      description: 'Large ₹85L invoice for Global Motors evaluated against institutional single-buyer risk caps.',
      expectedOutcome: 'National Apex Bank excluded due to breaching its ₹100L buyer exposure limit; unconstrained lenders compete.',
      invoiceId: 'inv-large-004'
    },
    {
      id: 'settlement-loop',
      badge: 'Capital Recycling',
      badgeClass: 'badge-emerald',
      title: 'End-to-End Financing & Dynamic Settlement',
      description: 'Executes funding disbursement from provider pool, followed by buyer escrow settlement and yield return.',
      expectedOutcome: 'Provider liquidity replenishes with earned yield, buyer credit exposure resets, and supplier reputation increases.',
      invoiceId: 'inv-demo-20l'
    }
  ];

  const handleRun = async (scenario: typeof scenarios[0]) => {
    setRunningId(scenario.id);
    try {
      const res = await onRunScenario(scenario.id);
      setLastResult({ scenario, data: res });
      onSelectInvoice(scenario.invoiceId);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Introduction Hero */}
      <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Supply Chain Financing Benchmark Demonstrations
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '880px', lineHeight: 1.5 }}>
              Select any benchmark scenario below to evaluate the automated clearing process. The system executes electronic invoice verification, risk scoring, provider eligibility discovery, and multi-attribute utility matching.
            </p>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            5 Scenarios Available
          </span>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
        {scenarios.map(scenario => {
          const isRunning = runningId === scenario.id;
          return (
            <div 
              key={scenario.id} 
              className="glass-card glass-card-interactive" 
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className={`badge ${scenario.badgeClass}`}>{scenario.badge}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    {scenario.invoiceId}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                  {scenario.title}
                </h3>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '12px' }}>
                  {scenario.description}
                </p>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--primary-blue)', fontWeight: 600, marginBottom: '2px' }}>
                    <Info size={13} />
                    Expected System Outcome:
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {scenario.expectedOutcome}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleRun(scenario)}
                  disabled={isRunning}
                  style={{ width: '100%' }}
                >
                  <Play size={14} />
                  {isRunning ? 'Processing...' : 'Run Scenario'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution Results Banner */}
      {lastResult && (
        <div className="glass-card" style={{ border: '1px solid #bfdbfe', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--success-emerald)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Result: {lastResult.scenario.title}
              </h3>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => setActiveTab('pipeline')}
              style={{ fontSize: '0.8rem', padding: '5px 12px' }}
            >
              View in Pipeline <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-blue)', marginBottom: '3px' }}>
              Clearing Decision Summary:
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
              {lastResult.data.explanation || lastResult.data.result?.explanation}
            </div>
          </div>

          {lastResult.data.result?.winningOffer && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Selected Provider</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-blue)' }}>
                  {lastResult.data.result.winningOffer.providerName}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Advance Capital</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {lastResult.data.result.winningOffer.offeredAdvanceRate * 100}% (₹{lastResult.data.result.winningOffer.offeredAmountLakhs}L)
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Interest Rate & Fee</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {lastResult.data.result.winningOffer.interestRatePercent}% (Fee: {lastResult.data.result.winningOffer.originationFeePercent}%)
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Settlement Time</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {lastResult.data.result.winningOffer.settlementSpeedHours} hours (T+0)
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
