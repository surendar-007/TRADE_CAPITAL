import React, { useState } from 'react';
import { 
  PlusCircle, 
  Send, 
  ArrowRight,
  Sliders
} from 'lucide-react';
import { MarketplaceState } from '../types';

interface SupplierPortalProps {
  state: MarketplaceState;
  onSelectInvoice: (id: string) => void;
  onSubmitInvoice: (invoiceData: any) => Promise<void>;
  onClearMarket: (id: string) => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export const SupplierPortal: React.FC<SupplierPortalProps> = ({
  state,
  onSelectInvoice,
  onSubmitInvoice,
  setActiveTab
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || 'sup-001');
  const [buyerId, setBuyerId] = useState(state.buyers[0]?.id || 'buy-001');
  const [amountLakhs, setAmountLakhs] = useState('20.0');
  const [minRequiredLakhs, setMinRequiredLakhs] = useState('16.0');
  const [tenorDays, setTenorDays] = useState('60');
  const [goodsDescription] = useState('Machined Aerospace Grade Flanges');
  const [urgencyLevel, setUrgencyLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');

  // Priority Weights
  const [advanceWeight, setAdvanceWeight] = useState(0.35);
  const [speedWeight, setSpeedWeight] = useState(0.30);
  const [rateWeight, setRateWeight] = useState(0.20);
  const [feeWeight, setFeeWeight] = useState(0.10);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        supplierId,
        buyerId,
        amountLakhs: parseFloat(amountLakhs),
        minRequiredAmountLakhs: parseFloat(minRequiredLakhs),
        tenorDays: parseInt(tenorDays),
        goodsDescription,
        preferences: {
          urgencyLevel,
          targetAdvanceRate: parseFloat(minRequiredLakhs) / parseFloat(amountLakhs),
          maxAcceptableRate: 15.0,
          priorityWeights: {
            advanceRate: advanceWeight,
            settlementSpeed: speedWeight,
            interestRate: rateWeight,
            fees: feeWeight,
            tenorFlexibility: 0.05
          }
        }
      };
      await onSubmitInvoice(payload);
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Supplier Receivables Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
            Submit verified supply chain invoices to access competitive institutional financing and liquidity.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ fontSize: '0.8rem', padding: '8px 14px' }}
        >
          <PlusCircle size={15} />
          Create Invoice
        </button>
      </div>

      {/* Modal / Form for Custom Invoice */}
      {showCreateModal && (
        <div className="glass-card" style={{ border: '1px solid var(--border-medium)', background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Submit Invoice to Capital Market
            </h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowCreateModal(false)}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Supplier Entity
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
              >
                {state.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Credit: {s.creditScore})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Enterprise Debtor / Buyer
              </label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
              >
                {state.buyers.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Rating: {b.rating})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Invoice Amount (₹ Lakhs)
              </label>
              <input
                type="number"
                step="0.5"
                value={amountLakhs}
                onChange={(e) => setAmountLakhs(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Urgent Capital Requirement (₹ Lakhs)
              </label>
              <input
                type="number"
                step="0.5"
                value={minRequiredLakhs}
                onChange={(e) => setMinRequiredLakhs(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Tenor (Days)
              </label>
              <input
                type="number"
                value={tenorDays}
                onChange={(e) => setTenorDays(e.target.value)}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Urgency Profile
              </label>
              <select
                value={urgencyLevel}
                onChange={(e: any) => {
                  setUrgencyLevel(e.target.value);
                  if (e.target.value === 'CRITICAL') {
                    setAdvanceWeight(0.40);
                    setSpeedWeight(0.35);
                    setRateWeight(0.15);
                    setFeeWeight(0.10);
                  } else if (e.target.value === 'LOW') {
                    setAdvanceWeight(0.20);
                    setSpeedWeight(0.10);
                    setRateWeight(0.50);
                    setFeeWeight(0.20);
                  }
                }}
                style={{ width: '100%', background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--border-medium)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.825rem' }}
              >
                <option value="CRITICAL">Critical (High Advance % & Instant Settlement Priority)</option>
                <option value="HIGH">High (Balanced Fast Advance)</option>
                <option value="MEDIUM">Medium (Standard)</option>
                <option value="LOW">Low (Cost Focused: Seek Lowest Interest Rate)</option>
              </select>
            </div>

            {/* Sliders Box */}
            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="var(--primary-blue)" /> Multi-Attribute Priority Weights
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>Advance Weight</span>
                    <strong>{(advanceWeight * 100).toFixed(0)}%</strong>
                  </div>
                  <input type="range" min="0.05" max="0.6" step="0.05" value={advanceWeight} onChange={e => setAdvanceWeight(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>Speed Weight</span>
                    <strong>{(speedWeight * 100).toFixed(0)}%</strong>
                  </div>
                  <input type="range" min="0.05" max="0.6" step="0.05" value={speedWeight} onChange={e => setSpeedWeight(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>Rate Weight</span>
                    <strong>{(rateWeight * 100).toFixed(0)}%</strong>
                  </div>
                  <input type="range" min="0.05" max="0.6" step="0.05" value={rateWeight} onChange={e => setRateWeight(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>Fee Weight</span>
                    <strong>{(feeWeight * 100).toFixed(0)}%</strong>
                  </div>
                  <input type="range" min="0.05" max="0.4" step="0.05" value={feeWeight} onChange={e => setFeeWeight(parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Send size={13} />
                {isSubmitting ? 'Registering...' : 'Submit Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Invoices Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-main)' }}>Submitted Invoices</h3>
          <span className="badge badge-cyan">{state.invoices.length} Active Records</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}>
                <th style={{ padding: '10px 8px' }}>Invoice No</th>
                <th style={{ padding: '10px 8px' }}>Supplier</th>
                <th style={{ padding: '10px 8px' }}>Buyer</th>
                <th style={{ padding: '10px 8px' }}>Amount</th>
                <th style={{ padding: '10px 8px' }}>Urgent Need</th>
                <th style={{ padding: '10px 8px' }}>Tenor</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.invoices.map(inv => {
                const supp = state.suppliers.find(s => s.id === inv.supplierId);
                const buy = state.buyers.find(b => b.id === inv.buyerId);
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-blue)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{supp?.name}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {buy?.name} <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>({buy?.rating})</span>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ₹{inv.amountLakhs.toFixed(1)}L
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: 'var(--warning-amber-text)' }}>
                      ₹{inv.minRequiredAmountLakhs.toFixed(1)}L
                    </td>
                    <td style={{ padding: '10px 8px' }}>{inv.tenorDays} days</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className={`badge ${
                        inv.status === 'SETTLED' ? 'badge-emerald' : 
                        (inv.status === 'FINANCED' ? 'badge-purple' : 
                        (inv.status === 'VERIFICATION_FAILED' ? 'badge-rose' : 'badge-cyan'))
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          onSelectInvoice(inv.id);
                          setActiveTab('pipeline');
                        }}
                        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      >
                        Inspect Pipeline <ArrowRight size={12} />
                      </button>
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
