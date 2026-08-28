import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScenarioRunner } from './components/ScenarioRunner';
import { PipelineView } from './components/PipelineView';
import { SupplierPortal } from './components/SupplierPortal';
import { ProviderDesk } from './components/ProviderDesk';
import { MarketAnalytics } from './components/MarketAnalytics';
import { AgentLogsDrawer } from './components/AgentLogsDrawer';
import { MarketplaceState } from './types';

export const App: React.FC = () => {
  const [state, setState] = useState<MarketplaceState | null>(null);
  const [activeTab, setActiveTab] = useState('scenarios');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('inv-demo-20l');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch marketplace state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/scenarios/run/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setSelectedInvoiceId('inv-demo-20l');
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerify = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/verify`, { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssessRisk = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/risk`, { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearMarket = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/clear`, { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinanceOffer = async (invoiceId: string, offerId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/finance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleFinancing = async (recordId: string, isSuccessful: boolean = true) => {
    try {
      const res = await fetch(`/api/financing/${recordId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuccessful })
      });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScenario = async (scenarioId: string) => {
    try {
      const res = await fetch(`/api/scenarios/run/${scenarioId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
        } else {
          await fetchState();
        }
        return data;
      }
    } catch (err) {
      console.error('Scenario run failed:', err);
      throw err;
    }
  };

  const handleSubmitInvoice = async (invoiceData: any) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoiceId(data.invoice.id);
        await fetchState();
        setActiveTab('pipeline');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !state) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent' }} className="pulse-active" />
        <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.05em' }}>
          INITIALIZING COMPETITIVE CAPITAL MARKET ENGINE...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        metrics={state.metrics}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="app-container" style={{ flex: 1, padding: '24px' }}>
        {activeTab === 'scenarios' && (
          <ScenarioRunner
            state={state}
            onRunScenario={handleRunScenario}
            onSelectInvoice={setSelectedInvoiceId}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineView
            state={state}
            selectedInvoiceId={selectedInvoiceId}
            onSelectInvoice={setSelectedInvoiceId}
            onVerify={handleVerify}
            onAssessRisk={handleAssessRisk}
            onClearMarket={handleClearMarket}
            onFinanceOffer={handleFinanceOffer}
            onSettleFinancing={handleSettleFinancing}
          />
        )}

        {activeTab === 'supplier' && (
          <SupplierPortal
            state={state}
            onSelectInvoice={setSelectedInvoiceId}
            onSubmitInvoice={handleSubmitInvoice}
            onClearMarket={handleClearMarket}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'providers' && (
          <ProviderDesk state={state} />
        )}

        {activeTab === 'analytics' && (
          <MarketAnalytics state={state} />
        )}

        {activeTab === 'logs' && (
          <AgentLogsDrawer logs={state.logs} />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(7, 11, 20, 0.95)', padding: '16px 24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
        <div className="app-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>CSI ORIGIN 2026</strong> | Problem Statement #5: Building a Competitive Capital Market for Supply-Chain Working Capital
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Autonomous Decision Engine</span>
            <span>Multi-Attribute Clearing</span>
            <span>Dynamic Liquidity Recycling</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
