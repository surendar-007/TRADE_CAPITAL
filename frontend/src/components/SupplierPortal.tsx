import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Send, 
  ArrowRight,
  Sliders,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  HelpCircle
} from 'lucide-react';
import { MarketplaceState, ScanInvoiceResponse } from '../types';

interface SupplierPortalProps {
  state: MarketplaceState;
  onSelectInvoice: (id: string) => void;
  onSubmitInvoice: (invoiceId: string, invoiceData: any) => Promise<void>;
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
  const [goodsDescription, setGoodsDescription] = useState('Machined Aerospace Grade Flanges');
  const [urgencyLevel, setUrgencyLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('CRITICAL');

  // Priority Weights
  const [advanceWeight, setAdvanceWeight] = useState(0.35);
  const [speedWeight, setSpeedWeight] = useState(0.30);
  const [rateWeight, setRateWeight] = useState(0.20);
  const [feeWeight, setFeeWeight] = useState(0.10);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload Invoice state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanInvoiceResponse | null>(null);
  const [extractedInvoiceNo, setExtractedInvoiceNo] = useState<string>('');
  const [extractedIssueDate, setExtractedIssueDate] = useState<string>('');
  const [extractedDueDate, setExtractedDueDate] = useState<string>('');
  const [extractedPO, setExtractedPO] = useState<string>('');
  const [extractedEWayBill, setExtractedEWayBill] = useState<string>('');
  
  const [uploadedInvoiceId, setUploadedInvoiceId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVerificationPassed = scanResult?.verification?.status === 'VERIFIED';

  const handleFileUpload = async (file: File) => {
    onSelectInvoice('');
    setSelectedFile(file);
    setScanError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append('invoice', file);

      const token = sessionStorage.getItem('tc_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/invoices/scan', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan invoice document.');
      }

      setScanResult(data);
      if (data.invoice?.id) {
        setUploadedInvoiceId(data.invoice.id);
        onSelectInvoice(data.invoice.id);
      }

      // Pre-fill existing form fields where information was extracted
      const fields = data.extractedFields;
      if (fields) {
        // Pre-fill Invoice Amount
        if (fields.invoiceAmount?.amountLakhs && fields.invoiceAmount.amountLakhs > 0) {
          const lakhs = fields.invoiceAmount.amountLakhs;
          setAmountLakhs(lakhs.toString());
          const calculatedUrgent = Math.round(lakhs * 0.8 * 10) / 10;
          setMinRequiredLakhs(calculatedUrgent.toString());
        }

        // Pre-select Supplier Entity if matched
        if (fields.supplierName?.matchedSupplierId) {
          setSupplierId(fields.supplierName.matchedSupplierId);
        }

        // Pre-select Buyer if matched
        if (fields.buyerName?.matchedBuyerId) {
          setBuyerId(fields.buyerName.matchedBuyerId);
        }

        // Pre-fill Tenor
        if (fields.tenorDays?.value && fields.tenorDays.value > 0) {
          setTenorDays(fields.tenorDays.value.toString());
        }

        // Save supplementary extracted fields
        if (fields.invoiceNumber?.value) {
          setExtractedInvoiceNo(fields.invoiceNumber.value);
        }
        if (fields.invoiceDate?.value) {
          setExtractedIssueDate(fields.invoiceDate.value);
        }
        if (fields.dueDate?.value) {
          setExtractedDueDate(fields.dueDate.value);
        }
        if (fields.purchaseOrderNumber?.value) {
          setExtractedPO(fields.purchaseOrderNumber.value);
        }
        if (fields.eWayBillNumber?.value) {
          setExtractedEWayBill(fields.eWayBillNumber.value);
        }
        if (fields.goodsDescription?.value) {
          setGoodsDescription(fields.goodsDescription.value);
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || 'Unable to read this invoice. Please upload a clearer PDF or image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearScannedFile = () => {
    setSelectedFile(null);
    setScanResult(null);
    setScanError(null);
    setExtractedInvoiceNo('');
    setExtractedIssueDate('');
    setExtractedDueDate('');
    setExtractedPO('');
    setExtractedEWayBill('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedInvoiceId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        invoiceNumber: extractedInvoiceNo || undefined,
        supplierId,
        buyerId,
        amountLakhs: parseFloat(amountLakhs),
        minRequiredAmountLakhs: parseFloat(minRequiredLakhs),
        tenorDays: parseInt(tenorDays),
        goodsDescription,
        purchaseOrderNumber: extractedPO || undefined,
        eWayBillNumber: extractedEWayBill || undefined,
        issueDate: extractedIssueDate || undefined,
        dueDate: extractedDueDate || undefined,
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
        },
        verificationStatus: scanResult?.verification?.status
      };
      await onSubmitInvoice(uploadedInvoiceId, payload);
      setShowCreateModal(false);
      handleClearScannedFile();
    } catch (err: any) {
      console.error('Submit error:', err);
      setScanError(err.message || 'Failed to submit invoice to clearing market.');
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary-blue)" />
              Submit Invoice to Capital Market
            </h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowCreateModal(false);
                handleClearScannedFile();
              }}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Cancel
            </button>
          </div>

          {/* ====================================================== */}
          {/* UPLOAD INVOICE SECTION (PDF / OCR SCANNING)            */}
          {/* ====================================================== */}
          <div style={{
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                <UploadCloud size={16} color="var(--primary-blue)" />
                <span>Upload Invoice Document (PDF / Image OCR)</span>
              </div>
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleClearScannedFile}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear File
                </button>
              )}
            </div>

              {!selectedFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }} 
                  />
                  <UploadCloud size={28} color="var(--primary-blue)" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Click to choose file or drag and drop invoice here
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '4px' }}>
                    Supports PDF (direct text extraction) and JPG / JPEG / PNG (Tesseract OCR)
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* File Selected Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--primary-blue)" />
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{selectedFile.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginLeft: '8px' }}>
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>

                    {isScanning && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                        <RefreshCw size={14} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                        Scanning invoice...
                      </div>
                    )}

                    {!isScanning && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        Change File
                      </button>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }} 
                    />
                  </div>

                  {/* Scan Error Notice */}
                  {scanError && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: 'var(--danger-rose-light)',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: 'var(--danger-rose-text)',
                      fontSize: '0.78rem'
                    }}>
                      <AlertCircle size={16} />
                      <span>{scanError}</span>
                    </div>
                  )}

                  {/* Extracted Invoice Metadata Card */}
                  {scanResult && scanResult.extractedFields && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={14} color="var(--primary-blue)" />
                          Extracted Invoice Information
                        </div>
                        
                        {/* Verification Status Badge */}
                        <span className={`badge ${
                          scanResult.verification.status === 'VERIFIED' ? 'badge-emerald' : 
                          (scanResult.verification.status === 'NEEDS REVIEW' ? 'badge-amber' : 'badge-rose')
                        }`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {scanResult.verification.status === 'VERIFIED' ? '✓ ' : (scanResult.verification.status === 'NEEDS REVIEW' ? '⚠ ' : '✗ ')}
                          {scanResult.verification.status}
                        </span>
                      </div>

                      {/* Extracted Fields Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '10px',
                        fontSize: '0.78rem'
                      }}>
                        {/* Invoice Number */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Invoice Number</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            {scanResult.extractedFields.invoiceNumber.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic', fontWeight: 400 }}>Missing</span>
                            )}
                          </div>
                        </div>

                        {/* Supplier */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Supplier</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.supplierName.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic' }}>Missing</span>
                            )}
                            {scanResult.extractedFields.supplierName.matchedSupplierId && (
                              <span className="badge badge-cyan" style={{ marginLeft: '6px', fontSize: '0.65rem', padding: '1px 5px' }}>Matched</span>
                            )}
                          </div>
                        </div>

                        {/* Buyer */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Buyer</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.buyerName.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic' }}>Missing</span>
                            )}
                            {scanResult.extractedFields.buyerName.matchedBuyerId && (
                              <span className="badge badge-cyan" style={{ marginLeft: '6px', fontSize: '0.65rem', padding: '1px 5px' }}>Matched</span>
                            )}
                          </div>
                        </div>

                        {/* Invoice Amount */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Invoice Amount</div>
                          <div style={{ fontWeight: 700, color: 'var(--primary-blue)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            {scanResult.extractedFields.invoiceAmount.formatted ? (
                              `${scanResult.extractedFields.invoiceAmount.formatted} (${scanResult.extractedFields.invoiceAmount.amountLakhs}L)`
                            ) : (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic' }}>Missing</span>
                            )}
                          </div>
                        </div>

                        {/* Invoice Date */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Invoice Date</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.invoiceDate.formatted || scanResult.extractedFields.invoiceDate.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic', fontWeight: 400 }}>Missing</span>
                            )}
                          </div>
                        </div>

                        {/* Due Date */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Due Date</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.dueDate.formatted || scanResult.extractedFields.dueDate.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic', fontWeight: 400 }}>Missing</span>
                            )}
                          </div>
                        </div>

                        {/* Currency */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Currency</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.currency.value || 'INR'}
                          </div>
                        </div>

                        {/* Payment Terms */}
                        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>Payment Terms</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                            {scanResult.extractedFields.paymentTerms.value || (
                              <span style={{ color: 'var(--danger-rose-text)', fontStyle: 'italic', fontWeight: 400 }}>Missing</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deterministic Verification Checklist */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <ShieldCheck size={13} color="var(--primary-blue)" />
                          Invoice Verification Checks:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '0.72rem' }}>
                          {scanResult.verification.checklist.map((item) => (
                            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {item.passed ? (
                                <CheckCircle2 size={13} color="var(--success-emerald)" />
                              ) : (
                                <XCircle size={13} color="var(--danger-rose)" />
                              )}
                              <span style={{ color: item.passed ? 'var(--text-main)' : 'var(--danger-rose-text)', fontWeight: item.passed ? 500 : 600 }}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                          {scanResult.verification.summary}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* ====================================================== */}
          {/* EXISTING SUPPLIER PORTAL FORM (PRE-FILLED & EDITABLE)  */}
          {/* ====================================================== */}
          
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
              {!isVerificationPassed && (
                <div style={{ marginRight: 'auto', padding: '8px 12px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Invoice verification must pass before the invoice can be submitted to the capital market.</strong>
                    {scanResult?.verification?.status === 'INCOMPLETE' && (
                      <div style={{ marginTop: '2px', fontSize: '0.75rem' }}>Please upload a valid invoice or correct the missing information.</div>
                    )}
                  </div>
                </div>
              )}
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowCreateModal(false);
                  handleClearScannedFile();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !isVerificationPassed}>
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
                      {(inv.status === 'DRAFT' || inv.status === 'VERIFICATION_FAILED') ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setUploadedInvoiceId(inv.id);
                            setShowCreateModal(true);
                            setScanResult({
                              verification: inv.verificationResult,
                              extractedFields: {
                                invoiceAmount: { amountLakhs: inv.amountLakhs, formatted: `Rs. ${inv.amountLakhs}L` },
                                supplierName: { value: supp?.name },
                                buyerName: { value: buy?.name }
                              } as any
                            } as any);
                            setSelectedFile(new File([''], inv.documentUrl?.split('/').pop() || 'invoice.pdf'));
                            setAmountLakhs(inv.amountLakhs.toString());
                            setMinRequiredLakhs(inv.minRequiredAmountLakhs.toString());
                            setTenorDays(inv.tenorDays.toString());
                          }}
                          style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
                        >
                          Review & Submit
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            onSelectInvoice(inv.id);
                            setActiveTab('pipeline');
                          }}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          View in Pipeline <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                        </button>
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
