import { Router, Request, Response } from 'express';
import { 
  Supplier, 
  Buyer, 
  CapitalProvider, 
  Invoice, 
  FinancingRecord, 
  FinancingOffer, 
  AgentLog,
  MarketMetrics,
  VerificationResult,
  User,
  UserSafeProfile
} from '../models/types';
import { 
  INITIAL_SUPPLIERS, 
  INITIAL_BUYERS, 
  INITIAL_PROVIDERS, 
  INITIAL_INVOICES, 
  INITIAL_LOGS 
} from '../data/mockData';
import { VerificationEngine } from '../engine/verificationEngine';
import { RiskEngine } from '../engine/riskEngine';
import { MatchingEngine } from '../engine/matchingEngine';
import { ProviderAgent } from '../engine/providerAgent';
import { EvaluationEngine } from '../engine/evaluationEngine';
import { SettlementEngine } from '../engine/settlementEngine';
import { ScenarioRunner } from '../engine/scenarioRunner';
import { InvoiceScannerEngine } from '../engine/invoiceScannerEngine';
import multer from 'multer';
import { Database } from '../data/db';
import fs from 'fs';
import path from 'path';

export const router = Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function addLogs(newLogs: AgentLog[]) {
  const state = Database.getState();
  state.logs = [...newLogs, ...state.logs].slice(0, 100);
  await Database.save();
}

function calculateMetrics(): MarketMetrics {
  const { invoices, financingRecords, providers } = Database.getState();
  const totalInvoices = invoices.length;
  const totalVolume = invoices.reduce((sum, inv) => sum + inv.amountLakhs, 0);
  const activeFinancing = financingRecords
    .filter(f => f.status === 'ACTIVE_FINANCED')
    .reduce((sum, f) => sum + f.disbursedAmountLakhs, 0);
  const completedSettlements = financingRecords
    .filter(f => f.status === 'SETTLED_COMPLETED')
    .reduce((sum, f) => sum + (f.actualSettledLakhs || f.faceValueLakhs), 0);
  const totalLiquidity = providers.reduce((sum, p) => sum + p.availableLiquidityLakhs, 0);

  const financedRecords = financingRecords.filter(f => f.status === 'ACTIVE_FINANCED' || f.status === 'SETTLED_COMPLETED');
  const avgClearingRate = financedRecords.length > 0
    ? financedRecords.reduce((sum, f) => sum + f.interestRatePercent, 0) / financedRecords.length
    : 10.8;
  const avgSettlementTime = financedRecords.length > 0
    ? financedRecords.reduce((sum, f) => sum + f.settlementSpeedHours, 0) / financedRecords.length
    : 18.5;
  const avgAdvanceRate = financedRecords.length > 0
    ? (financedRecords.reduce((sum, f) => sum + (f.disbursedAmountLakhs / f.faceValueLakhs), 0) / financedRecords.length) * 100
    : 85.0;

  return {
    totalInvoicesProcessed: totalInvoices,
    totalVolumeLakhs: Math.round(totalVolume * 10) / 10,
    activeFinancingLakhs: Math.round(activeFinancing * 10) / 10,
    completedSettlementsLakhs: Math.round(completedSettlements * 10) / 10,
    totalAvailableLiquidityLakhs: Math.round(totalLiquidity * 10) / 10,
    averageClearingRatePercent: Math.round(avgClearingRate * 10) / 10,
    averageSettlementTimeHours: Math.round(avgSettlementTime * 10) / 10,
    averageAdvanceRatePercent: Math.round(avgAdvanceRate * 10) / 10
  };
}

import { AuthEngine } from '../engine/authEngine';

function getAuthenticatedUser(req: Request): { user: User; session: any } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = AuthEngine.getSession(token);
  if (!session) return null;
  const state = Database.getState();
  const user = state.users?.find(u => u.id === session.userId);
  if (!user) return null;
  return { user, session };
}

// 0a. Sign Up (Supplier Registration)
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { companyName, name, email, password, phone, industry } = req.body;

  if (!companyName || !companyName.trim()) {
    return res.status(400).json({ error: 'Company name is required.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Contact person name is required.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const state = Database.getState();
  if (!state.users) state.users = [];

  const existingUser = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
  }

  // Create Supplier Record
  const supplierId = `sup-${Date.now().toString(36)}`;
  const newSupplier: Supplier = {
    id: supplierId,
    name: companyName.trim(),
    industry: industry?.trim() || 'Manufacturing & Industrial Components',
    gstin: '27AAACA' + Math.floor(1000 + Math.random() * 9000) + 'F1Z8',
    annualTurnoverLakhs: 350,
    completedDeals: 0,
    creditScore: 740,
    defaultRatePercent: 0.0,
    ratingGrade: 'A'
  };
  state.suppliers.push(newSupplier);

  // Create User Record
  const salt = AuthEngine.generateSalt();
  const passwordHash = AuthEngine.hashPassword(password, salt);
  const newUser: User = {
    id: `usr-${Date.now().toString(36)}`,
    email: email.trim().toLowerCase(),
    passwordHash,
    salt,
    name: name.trim(),
    phone: phone?.trim() || '',
    role: 'SUPPLIER',
    supplierId: supplierId,
    createdAt: new Date().toISOString()
  };
  state.users.push(newUser);

  await Database.save();

  // Create session
  const token = AuthEngine.createSession(newUser);
  const safeProfile = AuthEngine.toSafeProfile(newUser, newSupplier);

  res.status(201).json({
    message: 'Supplier account registered successfully.',
    user: safeProfile,
    supplier: newSupplier,
    token
  });
});

// 0b. Login (Sign In)
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const state = Database.getState();
  if (!state.users) state.users = [];

  const user = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = AuthEngine.verifyPassword(password, user.salt, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const supplier = state.suppliers.find(s => s.id === user.supplierId);
  const token = AuthEngine.createSession(user);
  const safeProfile = AuthEngine.toSafeProfile(user, supplier);

  res.json({
    message: 'Authentication successful.',
    user: safeProfile,
    supplier,
    token
  });
});

// 0c. Demo Quick Login (Single Click Enterprise Demo Supplier)
router.post('/auth/demo', async (req: Request, res: Response) => {
  const state = Database.getState();
  AuthEngine.ensureInitialUsers(state);

  const demoUser = state.users?.find(u => u.id === 'usr-demo-apex') || state.users?.[0];
  if (!demoUser) {
    return res.status(500).json({ error: 'Demo supplier account not initialized.' });
  }

  const supplier = state.suppliers.find(s => s.id === demoUser.supplierId) || state.suppliers[0];
  const token = AuthEngine.createSession(demoUser);
  const safeProfile = AuthEngine.toSafeProfile(demoUser, supplier);

  res.json({
    message: 'Demo supplier authenticated.',
    user: safeProfile,
    supplier,
    token
  });
});

// 0d. Get Current Authenticated User Session
router.get('/auth/me', (req: Request, res: Response) => {
  const auth = getAuthenticatedUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthenticated session.' });
  }

  const state = Database.getState();
  const supplier = state.suppliers.find(s => s.id === auth.user.supplierId);
  const safeProfile = AuthEngine.toSafeProfile(auth.user, supplier);

  res.json({
    user: safeProfile,
    supplier
  });
});

// 0e. Sign Out
router.post('/auth/signout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    AuthEngine.removeSession(token);
  }
  res.json({ success: true, message: 'Signed out successfully.' });
});

// 1. Get Complete State
router.get('/state', (req: Request, res: Response) => {
  const auth = getAuthenticatedUser(req);
  const state = Database.getState();
  
  // Safe state serialization: NEVER expose password hashes or salts
  const safeUsers = state.users?.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    supplierId: u.supplierId,
    createdAt: u.createdAt
  }));

  res.json({
    ...state,
    users: safeUsers,
    currentUser: auth ? AuthEngine.toSafeProfile(auth.user, state.suppliers.find(s => s.id === auth.user.supplierId)) : null,
    metrics: calculateMetrics()
  });
});

// 1b. Scan and Extract Document (PDF / JPG / JPEG / PNG)
router.post('/invoices/scan', upload.single('invoice'), async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ 
        error: 'No invoice file uploaded. Please upload a PDF, JPG, JPEG, or PNG document.' 
      });
    }

    const { originalname, mimetype, path: filePath, filename: diskFilename, size } = file;
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const hasAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(originalname);

    if (!allowedMimes.includes(mimetype) && !hasAllowedExt) {
      if (filePath) {
        fs.unlink(filePath, () => {});
      }
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload an invoice in PDF, JPG, JPEG, or PNG format.' 
      });
    }

    // Step 1: Extract Text from Document (PDF parsing or Image OCR)
    let rawText = '';
    try {
      const fileBuffer = fs.readFileSync(filePath);
      rawText = await InvoiceScannerEngine.extractTextFromFile(fileBuffer, mimetype, originalname);
    } catch (err: any) {
      console.error(`[InvoiceScan] PDF extraction failed for ${originalname}:`, err.message);
      return res.status(422).json({
        error: 'Unable to read this invoice. Please upload a clearer PDF or image.',
        details: err.message
      });
    }

    // Step 2: Parse Fields & Perform Deterministic Verification
    const scanResult = InvoiceScannerEngine.processInvoice(
      rawText,
      originalname,
      size,
      mimetype,
      suppliers,
      buyers
    );

    // Step 3: Log verification event
    const scanLog: AgentLog = {
      id: `log-scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 1: Supplier Demand & Verification Agent',
      level: scanResult.verification.status === 'VERIFIED' ? 'SUCCESS' : (scanResult.verification.status === 'NEEDS REVIEW' ? 'WARNING' : 'ACTION'),
      message: `Invoice document [${originalname}] scanned & verified: ${scanResult.verification.status}. Extracted Amount: ${scanResult.extractedFields.invoiceAmount.formatted || 'N/A'}, Supplier: ${scanResult.extractedFields.supplierName.value || 'N/A'}, Buyer: ${scanResult.extractedFields.buyerName.value || 'N/A'}.`,
      details: {
        filename: originalname,
        verificationStatus: scanResult.verification.status,
        checklist: scanResult.verification.checklist,
        extractedFields: scanResult.extractedFields
      }
    };
    await addLogs([scanLog]);

    // Step 4: Instantly create and save the invoice record
    const ext = scanResult.extractedFields;
    const resolvedTenor = ext.tenorDays?.value || 60;
    const amountLakhs = ext.invoiceAmount?.amountLakhs || 0;
    
    // Map ScanVerificationResult to VerificationResult
    const mappedVerificationResult: VerificationResult = {
      status: scanResult.verification.status === 'VERIFIED' ? 'PASSED' : (scanResult.verification.status === 'NEEDS REVIEW' ? 'FLAGGED' : 'FAILED'),
      verificationScore: scanResult.verification.status === 'VERIFIED' ? 100 : 0,
      gstinActive: true,
      eWayBillValid: true,
      threeWayMatchScore: 100,
      buyerAcknowledged: false,
      flags: [],
      explanation: 'Scanned from document',
      verifiedAt: new Date().toISOString()
    };

    const auth = getAuthenticatedUser(req);
    const assignedSupplierId = auth ? auth.user.supplierId : (ext.supplierName?.matchedSupplierId || suppliers[0].id);

    const newInvoice: Invoice = {
      id: `inv-${Date.now().toString(36)}`,
      invoiceNumber: ext.invoiceNumber?.value || `INV-${Date.now().toString().slice(-5)}`,
      supplierId: assignedSupplierId,
      buyerId: ext.buyerName?.matchedBuyerId || buyers[0].id,
      amountLakhs: amountLakhs,
      minRequiredAmountLakhs: amountLakhs > 0 ? amountLakhs * 0.8 : 0,
      issueDate: ext.invoiceDate?.value || new Date().toISOString().split('T')[0],
      dueDate: ext.dueDate?.value || new Date(Date.now() + resolvedTenor * 86400000).toISOString().split('T')[0],
      tenorDays: resolvedTenor,
      goodsDescription: ext.goodsDescription?.value || 'Supply Chain Consignment Parts',
      eWayBillNumber: ext.eWayBillNumber?.value || '',
      purchaseOrderNumber: ext.purchaseOrderNumber?.value || '',
      status: scanResult.verification.status === 'VERIFIED' ? 'DRAFT' : 'VERIFICATION_FAILED',
      verificationResult: mappedVerificationResult,
      documentUrl: `/uploads/${file.filename}`,
      preferences: {
        urgencyLevel: 'CRITICAL',
        targetAdvanceRate: 0.85,
        maxAcceptableRate: 14.0,
        priorityWeights: {
          advanceRate: 0.35,
          settlementSpeed: 0.30,
          interestRate: 0.20,
          fees: 0.10,
          tenorFlexibility: 0.05
        }
      },
      createdAt: new Date().toISOString()
    };
    
    invoices.unshift(newInvoice);

    await Database.save();
    return res.json({ ...scanResult, invoice: newInvoice });
  } catch (error: any) {
    console.error('Invoice scan error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while scanning the invoice document. Please try again.',
      details: error.message 
    });
  }
});

// 2. Submit Existing Invoice to Market
router.post('/invoices/:id/submit', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  // Supplier Data Ownership Validation
  const auth = getAuthenticatedUser(req);
  if (auth && auth.user.role !== 'ADMIN') {
    if (invoice.supplierId && invoice.supplierId !== auth.user.supplierId) {
      if (invoice.status === 'DRAFT') {
        invoice.supplierId = auth.user.supplierId;
      } else {
        return res.status(403).json({ error: 'Access denied: You cannot submit invoices belonging to another supplier.' });
      }
    }
  }

  const { 
    amountLakhs, 
    minRequiredAmountLakhs, 
    tenorDays, 
    preferences
  } = req.body;

  if (invoice.verificationResult?.status !== 'PASSED' && invoice.verificationResult?.status !== ('VERIFIED' as any)) {
    return res.status(403).json({ error: 'Invoice cannot be submitted because verification has not passed.' });
  }

  // Update fields from the submission form
  invoice.amountLakhs = Number(amountLakhs) || invoice.amountLakhs;
  invoice.minRequiredAmountLakhs = Number(minRequiredAmountLakhs) || invoice.minRequiredAmountLakhs;
  invoice.tenorDays = Number(tenorDays) || invoice.tenorDays;
  if (preferences) {
    invoice.preferences = preferences;
  }
  
  // Transition to market
  invoice.status = 'IN_MARKET';

  const log: AgentLog = {
    id: `log-inv-new-${Date.now()}`,
    timestamp: new Date().toISOString(),
    agentName: 'Agent 1: Supplier Demand & Verification Agent',
    level: 'INFO',
    invoiceId: invoice.id,
    message: `Invoice [${invoice.invoiceNumber}] formally submitted to the clearing market by supplier. Amount: ₹${invoice.amountLakhs}L (Urgent requirement: ₹${invoice.minRequiredAmountLakhs}L).`
  };
  await addLogs([log]);

  await Database.save();
  res.status(200).json({ invoice, logs: [log] });
});

// 3. Verify Single Invoice
router.post('/invoices/:id/verify', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const supplier = suppliers.find(s => s.id === invoice.supplierId);
  const buyer = buyers.find(b => b.id === invoice.buyerId);

  const { result, log } = VerificationEngine.verifyInvoice(invoice, supplier, buyer);
  invoice.verificationResult = result;
  invoice.status = result.status === 'FAILED' ? 'VERIFICATION_FAILED' : 'VERIFIED';
  await addLogs([log]);

  await Database.save();
  res.json({ invoice, verificationResult: result, log });
});

// 4. Assess Risk on Single Invoice
router.post('/invoices/:id/risk', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.verificationResult?.status === 'FAILED' || invoice.status === 'VERIFICATION_FAILED') {
    return res.status(403).json({ error: 'Cannot assess risk: invoice verification has failed.' });
  }

  const supplier = suppliers.find(s => s.id === invoice.supplierId);
  const buyer = buyers.find(b => b.id === invoice.buyerId);

  const { assessment, log } = RiskEngine.assessRisk(invoice, supplier, buyer);
  invoice.riskAssessment = assessment;
  invoice.status = 'IN_MARKET';
  await addLogs([log]);

  // Immediately evaluate provider eligibility based on risk
  const { matches, logs: matchLogs } = MatchingEngine.discoverAndFilterProviders(invoice, assessment, providers);
  invoice.matches = matches;
  await addLogs(matchLogs);

  await Database.save();
  res.json({ invoice, riskAssessment: assessment, matches, log });
});

// 5. Run Clearing Engine on Invoice (Match + Competing Bids + Multi-Criteria TOPSIS Evaluation)
router.post('/invoices/:id/clear', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.verificationResult?.status === 'FAILED' || invoice.status === 'VERIFICATION_FAILED') {
    return res.status(403).json({ error: 'Cannot clear market: invoice verification has failed.' });
  }

  const supplier = suppliers.find(s => s.id === invoice.supplierId);
  const buyer = buyers.find(b => b.id === invoice.buyerId);

  // If not verified, verify now
  if (!invoice.verificationResult) {
    const { result: verResult, log: verLog } = VerificationEngine.verifyInvoice(invoice, supplier, buyer);
    invoice.verificationResult = verResult;
    await addLogs([verLog]);
    if (verResult.status === 'FAILED') {
      invoice.status = 'VERIFICATION_FAILED';
      await Database.save();
      return res.json({ invoice, offers: [], explanation: 'Verification failed. Quarantined from capital market.' });
    }
  }

  // If not risk assessed, assess now
  if (!invoice.riskAssessment) {
    const { assessment: riskResult, log: riskLog } = RiskEngine.assessRisk(invoice, supplier, buyer);
    invoice.riskAssessment = riskResult;
    await addLogs([riskLog]);
  }

  const { matches, logs: matchLogs } = MatchingEngine.discoverAndFilterProviders(invoice, invoice.riskAssessment!, providers);
  invoice.matches = matches;
  await addLogs(matchLogs);

  const eligibleMatches = matches.filter(m => m.isEligible);
  if (eligibleMatches.length === 0) {
    invoice.status = 'IN_MARKET';
    offersMap[invoice.id] = [];
    await Database.save();
    return res.json({
      invoice,
      matches,
      offers: [],
      explanation: 'No institutional providers currently meet the risk appetite or single-buyer concentration limits for this deal.'
    });
  }

  const generatedOffers: FinancingOffer[] = [];
  const bidLogs: AgentLog[] = [];
  eligibleMatches.forEach(m => {
    const { offer, log: bLog } = ProviderAgent.generateBid(invoice, m.provider, invoice.riskAssessment!);
    generatedOffers.push(offer);
    bidLogs.push(bLog);
  });
  await addLogs(bidLogs);

  const { evaluatedOffers, winningOffer, explanation, log: evalLog } = EvaluationEngine.evaluateOffers(invoice, generatedOffers);
  await addLogs([evalLog]);

  invoice.status = 'MATCHED';
  if (winningOffer) {
    invoice.matchedProviderId = winningOffer.providerId;
    invoice.matchedOfferId = winningOffer.id;
    invoice.matchedAmountLakhs = winningOffer.offeredAmountLakhs;
    invoice.matchedAt = new Date().toISOString();
  }
  offersMap[invoice.id] = evaluatedOffers;

  await Database.save();
  res.json({
    invoice,
    matches,
    offers: evaluatedOffers,
    winningOffer,
    explanation
  });
});

// 6a. Initiate Financing Workflow (MATCHED -> FINANCING_INITIATED)
router.post('/invoices/:id/finance/initiate', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.verificationResult?.status === 'FAILED' || invoice.status === 'VERIFICATION_FAILED') {
    return res.status(403).json({ error: 'Cannot initiate financing: Invoice verification has failed.' });
  }

  if (invoice.status === 'SETTLED') {
    return res.status(400).json({ error: 'Invoice is already SETTLED. Cannot re-initiate financing.' });
  }

  if (invoice.status === 'SETTLEMENT_PENDING' || invoice.status === 'FINANCED') {
    return res.status(400).json({ error: 'Invoice is already financed and pending settlement.' });
  }

  if (invoice.status === 'DRAFT' || invoice.status === 'IN_MARKET' || !invoice.status) {
    return res.status(400).json({ error: 'Cannot initiate financing: Invoice must first be MATCHED with an eligible capital provider.' });
  }

  const offers = offersMap[invoice.id] || [];
  const selectedOffer = req.body.offerId 
    ? offers.find(o => o.id === req.body.offerId) 
    : offers.find(o => o.isSelected) || offers[0];

  if (!selectedOffer) {
    return res.status(400).json({ error: 'No matched capital offer available to initiate financing.' });
  }

  invoice.status = 'FINANCING_INITIATED';
  invoice.financingInitiatedAt = new Date().toISOString();
  invoice.matchedProviderId = selectedOffer.providerId;
  invoice.matchedOfferId = selectedOffer.id;
  invoice.matchedAmountLakhs = selectedOffer.offeredAmountLakhs;

  const log: AgentLog = {
    id: `log-fin-init-${Date.now()}`,
    timestamp: new Date().toISOString(),
    agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
    level: 'ACTION',
    invoiceId: invoice.id,
    providerId: selectedOffer.providerId,
    message: `Financing initiated: Deal [${invoice.invoiceNumber}] approved for escrow disbursement by [${selectedOffer.providerName}]. Amount: ₹${selectedOffer.offeredAmountLakhs}L.`
  };
  await addLogs([log]);

  await Database.save();
  res.json({
    invoice,
    selectedOffer,
    log,
    metrics: calculateMetrics()
  });
});

// 6b. Execute Financing Disbursement (FINANCING_INITIATED / MATCHED -> FINANCED / SETTLEMENT_PENDING)
router.post('/invoices/:id/finance', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.verificationResult?.status === 'FAILED' || invoice.status === 'VERIFICATION_FAILED') {
    return res.status(403).json({ error: 'Cannot disburse capital: Invoice verification has failed.' });
  }

  if (invoice.status === 'SETTLED') {
    return res.status(400).json({ error: 'Invoice is already SETTLED. Cannot re-finance.' });
  }

  if (invoice.status === 'SETTLEMENT_PENDING' || invoice.status === 'FINANCED') {
    return res.status(400).json({ error: 'Invoice is already financed and waiting for settlement.' });
  }

  if (invoice.status === 'DRAFT' || invoice.status === 'IN_MARKET' || !invoice.status) {
    return res.status(400).json({ error: 'Cannot finance invoice: Invoice must be MATCHED with an eligible offer before financing.' });
  }

  const offers = offersMap[invoice.id] || [];
  const selectedOffer = req.body.offerId 
    ? offers.find(o => o.id === req.body.offerId) 
    : offers.find(o => o.isSelected) || offers[0];

  if (!selectedOffer) {
    return res.status(400).json({ error: 'No offer available to finance.' });
  }

  const providerIndex = providers.findIndex(p => p.id === selectedOffer.providerId);
  if (providerIndex === -1) return res.status(404).json({ error: 'Provider not found.' });

  const supplier = suppliers.find(s => s.id === invoice.supplierId) || suppliers[0];
  const buyer = buyers.find(b => b.id === invoice.buyerId) || buyers[0];

  // Set initiation timestamp if not set
  if (!invoice.financingInitiatedAt) {
    invoice.financingInitiatedAt = new Date().toISOString();
  }

  const { financingRecord, updatedProvider, logs: finLogs } = SettlementEngine.executeFinancing(
    invoice,
    selectedOffer,
    providers[providerIndex],
    supplier,
    buyer
  );

  providers[providerIndex] = updatedProvider;
  financingRecords.unshift(financingRecord);

  // Transition to SETTLEMENT_PENDING as required by the lifecycle
  invoice.status = 'SETTLEMENT_PENDING';
  invoice.financedAmountLakhs = selectedOffer.offeredAmountLakhs;
  invoice.financedAt = new Date().toISOString();
  invoice.settlementStatus = 'PENDING';
  invoice.matchedProviderId = selectedOffer.providerId;
  invoice.matchedOfferId = selectedOffer.id;

  await addLogs(finLogs);

  await Database.save();
  res.json({
    invoice,
    financingRecord,
    updatedProvider,
    metrics: calculateMetrics()
  });
});

// 7. Complete Buyer Settlement (SETTLEMENT_PENDING -> SETTLED)
router.post('/financing/:id/settle', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const recordIndex = financingRecords.findIndex(r => r.id === req.params.id);
  if (recordIndex === -1) return res.status(404).json({ error: 'Financing record not found' });

  const record = financingRecords[recordIndex];

  if (record.status === 'SETTLED_COMPLETED') {
    return res.status(400).json({ error: 'Financing transaction is already settled and completed.' });
  }

  const targetInvoice = invoices.find(inv => inv.id === record.invoiceId);
  if (targetInvoice && targetInvoice.status === 'SETTLED') {
    return res.status(400).json({ error: 'Invoice is already settled.' });
  }

  const providerIndex = providers.findIndex(p => p.id === record.providerId);
  const supplierIndex = suppliers.findIndex(s => s.id === record.supplierId);
  const isSuccessful = req.body.isSuccessful !== false;

  const { updatedRecord, updatedProvider, updatedSupplier, logs: settleLogs } = SettlementEngine.completeSettlement(
    record,
    providers[providerIndex] || providers[0],
    suppliers[supplierIndex] || suppliers[0],
    isSuccessful
  );

  financingRecords[recordIndex] = updatedRecord;
  if (providerIndex !== -1) providers[providerIndex] = updatedProvider;
  if (supplierIndex !== -1) suppliers[supplierIndex] = updatedSupplier;

  if (targetInvoice) {
    if (isSuccessful) {
      targetInvoice.status = 'SETTLED';
      targetInvoice.settlementStatus = 'SETTLED';
      targetInvoice.settledAt = new Date().toISOString();
      targetInvoice.settledAmountLakhs = record.faceValueLakhs;
    } else {
      targetInvoice.status = 'DEFAULTED';
      targetInvoice.settlementStatus = 'DEFAULTED';
    }
  }

  await addLogs(settleLogs);

  await Database.save();
  res.json({
    financingRecord: updatedRecord,
    updatedProvider,
    updatedSupplier,
    invoice: targetInvoice,
    metrics: calculateMetrics()
  });
});

// 7b. Settle by Invoice ID directly
router.post('/invoices/:id/settle', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const invoice = invoices.find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.status === 'MATCHED' || invoice.status === 'DRAFT' || invoice.status === 'IN_MARKET' || invoice.status === 'VERIFIED') {
    return res.status(400).json({ error: 'Cannot settle an unfinanced invoice. Must execute financing first.' });
  }

  if (invoice.status === 'SETTLED') {
    return res.status(400).json({ error: 'Invoice is already settled.' });
  }

  const recordIndex = financingRecords.findIndex(r => r.invoiceId === invoice.id);
  if (recordIndex === -1) {
    return res.status(400).json({ error: 'No active financing record found for this invoice.' });
  }

  const record = financingRecords[recordIndex];
  const providerIndex = providers.findIndex(p => p.id === record.providerId);
  const supplierIndex = suppliers.findIndex(s => s.id === record.supplierId);
  const isSuccessful = req.body.isSuccessful !== false;

  const { updatedRecord, updatedProvider, updatedSupplier, logs: settleLogs } = SettlementEngine.completeSettlement(
    record,
    providers[providerIndex] || providers[0],
    suppliers[supplierIndex] || suppliers[0],
    isSuccessful
  );

  financingRecords[recordIndex] = updatedRecord;
  if (providerIndex !== -1) providers[providerIndex] = updatedProvider;
  if (supplierIndex !== -1) suppliers[supplierIndex] = updatedSupplier;

  if (isSuccessful) {
    invoice.status = 'SETTLED';
    invoice.settlementStatus = 'SETTLED';
    invoice.settledAt = new Date().toISOString();
    invoice.settledAmountLakhs = record.faceValueLakhs;
  } else {
    invoice.status = 'DEFAULTED';
    invoice.settlementStatus = 'DEFAULTED';
  }

  await addLogs(settleLogs);

  await Database.save();
  res.json({
    invoice,
    financingRecord: updatedRecord,
    updatedProvider,
    updatedSupplier,
    metrics: calculateMetrics()
  });
});

// 8. One-Click Benchmark Scenarios Runner
router.post('/scenarios/run/:scenarioId', async (req: Request, res: Response) => {
  const state = Database.getState();
  let { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs } = state;

  const { scenarioId } = req.params;

  if (scenarioId === 'reset') {
await Database.reset();
    const newState = Database.getState();
    suppliers = newState.suppliers;
    buyers = newState.buyers;
    providers = newState.providers;
    invoices = newState.invoices;
    offersMap = newState.offersMap;
    financingRecords = newState.financingRecords;
    state.logs = newState.logs;
    
    const resetLog: AgentLog = {
      id: `log-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agentName: 'Agent 3: Marketplace Clearing & Settlement Agent',
      level: 'INFO',
      message: 'System state reset to baseline benchmark dataset.'
    };
    await addLogs([resetLog]);

    await Database.save();
    return res.json({
      success: true,
      message: 'Marketplace state reset to baseline successfully.',
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  // Scenario 1: Flagship ₹20L Urgent Deal
  if (scenarioId === 'flagship-20l') {
    const invoice = invoices.find(i => i.id === 'inv-demo-20l') || invoices[0];
    const runResult = ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
    offersMap[invoice.id] = runResult.offers;
    await addLogs(runResult.logs);

    return res.json({
      scenarioId,
      scenarioTitle: 'Flagship ₹20L Urgent Capital Demo (Lowest Rate != Best Fit)',
      result: runResult,
      explanation: runResult.explanation,
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  // Scenario 2: Fraud / Invalid Invoice Quarantine
  if (scenarioId === 'fraud-rejection') {
    const invoice = invoices.find(i => i.id === 'inv-fraud-002') || invoices[1];
    const runResult = ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
    offersMap[invoice.id] = [];
    await addLogs(runResult.logs);

    return res.json({
      scenarioId,
      scenarioTitle: 'Fraud Detection & 3-Way Reconciliation Quarantine',
      result: runResult,
      explanation: runResult.explanation,
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  // Scenario 3: High Risk BBB Deal
  if (scenarioId === 'high-risk') {
    const invoice = invoices.find(i => i.id === 'inv-risk-003') || invoices[2];
    const runResult = ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
    offersMap[invoice.id] = runResult.offers;
    await addLogs(runResult.logs);

    return res.json({
      scenarioId,
      scenarioTitle: 'High Risk / Information Uncertainty Deal',
      result: runResult,
      explanation: runResult.explanation,
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  // Scenario 4: Concentration Limit Block
  if (scenarioId === 'portfolio-cap') {
    const invoice = invoices.find(i => i.id === 'inv-large-004') || invoices[3];
    const runResult = ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
    offersMap[invoice.id] = runResult.offers;
    await addLogs(runResult.logs);

    return res.json({
      scenarioId,
      scenarioTitle: 'Single Buyer Concentration Limit Exclusion',
      result: runResult,
      explanation: runResult.explanation,
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  // Scenario 5: Full End-to-End Financing & Settlement Loop
  if (scenarioId === 'settlement-loop') {
    const invoice = invoices.find(i => i.id === 'inv-demo-20l') || invoices[0];
    const runResult = ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
    offersMap[invoice.id] = runResult.offers;
    await addLogs(runResult.logs);

    if (runResult.winningOffer) {
      const provIndex = providers.findIndex(p => p.id === runResult.winningOffer!.providerId);
      const supplier = suppliers.find(s => s.id === invoice.supplierId)!;
      const buyer = buyers.find(b => b.id === invoice.buyerId)!;

      // 1. Finance
      const finRes = SettlementEngine.executeFinancing(invoice, runResult.winningOffer, providers[provIndex], supplier, buyer);
      providers[provIndex] = finRes.updatedProvider;
      financingRecords.unshift(finRes.financingRecord);
      invoice.status = 'FINANCED';
      await addLogs(finRes.logs);

      // 2. Settle immediately for demo loop
      const settleRes = SettlementEngine.completeSettlement(finRes.financingRecord, providers[provIndex], supplier, true);
      financingRecords[0] = settleRes.updatedRecord;
      providers[provIndex] = settleRes.updatedProvider;
      suppliers[suppliers.findIndex(s => s.id === supplier.id)] = settleRes.updatedSupplier;
      invoice.status = 'SETTLED';
      await addLogs(settleRes.logs);
    }

    return res.json({
      scenarioId,
      scenarioTitle: 'Continuous Financing -> Settlement -> Liquidity Rebalance Loop',
      result: runResult,
      state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
    });
  }

  res.status(400).json({ error: `Unknown scenario: ${scenarioId}` });
});
