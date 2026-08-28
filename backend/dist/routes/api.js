"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const mockData_1 = require("../data/mockData");
const verificationEngine_1 = require("../engine/verificationEngine");
const riskEngine_1 = require("../engine/riskEngine");
const matchingEngine_1 = require("../engine/matchingEngine");
const providerAgent_1 = require("../engine/providerAgent");
const evaluationEngine_1 = require("../engine/evaluationEngine");
const settlementEngine_1 = require("../engine/settlementEngine");
const scenarioRunner_1 = require("../engine/scenarioRunner");
exports.router = (0, express_1.Router)();
// In-Memory State Store
let suppliers = JSON.parse(JSON.stringify(mockData_1.INITIAL_SUPPLIERS));
let buyers = JSON.parse(JSON.stringify(mockData_1.INITIAL_BUYERS));
let providers = JSON.parse(JSON.stringify(mockData_1.INITIAL_PROVIDERS));
let invoices = JSON.parse(JSON.stringify(mockData_1.INITIAL_INVOICES));
let offersMap = {};
let financingRecords = [];
let logs = JSON.parse(JSON.stringify(mockData_1.INITIAL_LOGS));
function addLogs(newLogs) {
    logs = [...newLogs, ...logs].slice(0, 100); // Keep latest 100 logs
}
function calculateMetrics() {
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
// 1. Get Complete State
exports.router.get('/state', (req, res) => {
    res.json({
        suppliers,
        buyers,
        providers,
        invoices,
        offersMap,
        financingRecords,
        logs,
        metrics: calculateMetrics()
    });
});
// 2. Submit New Invoice
exports.router.post('/invoices', (req, res) => {
    const { invoiceNumber, supplierId, buyerId, amountLakhs, minRequiredAmountLakhs, tenorDays, goodsDescription, eWayBillNumber, purchaseOrderNumber, preferences } = req.body;
    const newInvoice = {
        id: `inv-${Date.now().toString(36)}`,
        invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-5)}`,
        supplierId: supplierId || suppliers[0].id,
        buyerId: buyerId || buyers[0].id,
        amountLakhs: Number(amountLakhs) || 20.0,
        minRequiredAmountLakhs: Number(minRequiredAmountLakhs) || 16.0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + (Number(tenorDays) || 60) * 86400000).toISOString().split('T')[0],
        tenorDays: Number(tenorDays) || 60,
        goodsDescription: goodsDescription || 'Supply Chain Consignment Parts',
        eWayBillNumber: eWayBillNumber || `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        purchaseOrderNumber: purchaseOrderNumber || `PO-ENTERPRISE-${Date.now().toString().slice(-4)}`,
        status: 'DRAFT',
        preferences: preferences || {
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
    const log = {
        id: `log-inv-new-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'DiscoveryMatchingAgent',
        level: 'INFO',
        invoiceId: newInvoice.id,
        message: `New invoice [${newInvoice.invoiceNumber}] registered by supplier. Amount: ₹${newInvoice.amountLakhs}L (Urgent requirement: ₹${newInvoice.minRequiredAmountLakhs}L).`
    };
    addLogs([log]);
    res.status(201).json({ invoice: newInvoice, logs: [log] });
});
// 3. Verify Single Invoice
exports.router.post('/invoices/:id/verify', (req, res) => {
    const invoice = invoices.find(inv => inv.id === req.params.id);
    if (!invoice)
        return res.status(404).json({ error: 'Invoice not found' });
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const buyer = buyers.find(b => b.id === invoice.buyerId);
    const { result, log } = verificationEngine_1.VerificationEngine.verifyInvoice(invoice, supplier, buyer);
    invoice.verificationResult = result;
    invoice.status = result.status === 'FAILED' ? 'VERIFICATION_FAILED' : 'VERIFIED';
    addLogs([log]);
    res.json({ invoice, verificationResult: result, log });
});
// 4. Assess Risk on Single Invoice
exports.router.post('/invoices/:id/risk', (req, res) => {
    const invoice = invoices.find(inv => inv.id === req.params.id);
    if (!invoice)
        return res.status(404).json({ error: 'Invoice not found' });
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const buyer = buyers.find(b => b.id === invoice.buyerId);
    const { assessment, log } = riskEngine_1.RiskEngine.assessRisk(invoice, supplier, buyer);
    invoice.riskAssessment = assessment;
    invoice.status = 'IN_MARKET';
    addLogs([log]);
    res.json({ invoice, riskAssessment: assessment, log });
});
// 5. Run Clearing Engine on Invoice (Match + Competing Bids + Multi-Criteria TOPSIS Evaluation)
exports.router.post('/invoices/:id/clear', (req, res) => {
    const invoice = invoices.find(inv => inv.id === req.params.id);
    if (!invoice)
        return res.status(404).json({ error: 'Invoice not found' });
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const buyer = buyers.find(b => b.id === invoice.buyerId);
    // If not verified, verify now
    if (!invoice.verificationResult) {
        const { result: verResult, log: verLog } = verificationEngine_1.VerificationEngine.verifyInvoice(invoice, supplier, buyer);
        invoice.verificationResult = verResult;
        addLogs([verLog]);
        if (verResult.status === 'FAILED') {
            invoice.status = 'VERIFICATION_FAILED';
            return res.json({ invoice, offers: [], explanation: 'Verification failed. Quarantined from capital market.' });
        }
    }
    // If not risk assessed, assess now
    if (!invoice.riskAssessment) {
        const { assessment: riskResult, log: riskLog } = riskEngine_1.RiskEngine.assessRisk(invoice, supplier, buyer);
        invoice.riskAssessment = riskResult;
        addLogs([riskLog]);
    }
    const { matches, logs: matchLogs } = matchingEngine_1.MatchingEngine.discoverAndFilterProviders(invoice, invoice.riskAssessment, providers);
    addLogs(matchLogs);
    const eligibleMatches = matches.filter(m => m.isEligible);
    if (eligibleMatches.length === 0) {
        invoice.status = 'IN_MARKET';
        offersMap[invoice.id] = [];
        return res.json({
            invoice,
            matches,
            offers: [],
            explanation: 'No institutional providers currently meet the risk appetite or single-buyer concentration limits for this deal.'
        });
    }
    const generatedOffers = [];
    const bidLogs = [];
    eligibleMatches.forEach(m => {
        const { offer, log: bLog } = providerAgent_1.ProviderAgent.generateBid(invoice, m.provider, invoice.riskAssessment);
        generatedOffers.push(offer);
        bidLogs.push(bLog);
    });
    addLogs(bidLogs);
    const { evaluatedOffers, winningOffer, explanation, log: evalLog } = evaluationEngine_1.EvaluationEngine.evaluateOffers(invoice, generatedOffers);
    addLogs([evalLog]);
    invoice.status = 'OFFERS_RECEIVED';
    offersMap[invoice.id] = evaluatedOffers;
    res.json({
        invoice,
        matches,
        offers: evaluatedOffers,
        winningOffer,
        explanation
    });
});
// 6. Execute Financing Disbursement
exports.router.post('/invoices/:id/finance', (req, res) => {
    const invoice = invoices.find(inv => inv.id === req.params.id);
    if (!invoice)
        return res.status(404).json({ error: 'Invoice not found' });
    const offers = offersMap[invoice.id] || [];
    const selectedOffer = req.body.offerId
        ? offers.find(o => o.id === req.body.offerId)
        : offers.find(o => o.isSelected) || offers[0];
    if (!selectedOffer) {
        return res.status(400).json({ error: 'No offer available to finance' });
    }
    const providerIndex = providers.findIndex(p => p.id === selectedOffer.providerId);
    if (providerIndex === -1)
        return res.status(404).json({ error: 'Provider not found' });
    const supplier = suppliers.find(s => s.id === invoice.supplierId) || suppliers[0];
    const buyer = buyers.find(b => b.id === invoice.buyerId) || buyers[0];
    const { financingRecord, updatedProvider, logs: finLogs } = settlementEngine_1.SettlementEngine.executeFinancing(invoice, selectedOffer, providers[providerIndex], supplier, buyer);
    providers[providerIndex] = updatedProvider;
    financingRecords.unshift(financingRecord);
    invoice.status = 'FINANCED';
    addLogs(finLogs);
    res.json({
        invoice,
        financingRecord,
        updatedProvider,
        metrics: calculateMetrics()
    });
});
// 7. Complete Buyer Settlement
exports.router.post('/financing/:id/settle', (req, res) => {
    const recordIndex = financingRecords.findIndex(r => r.id === req.params.id);
    if (recordIndex === -1)
        return res.status(404).json({ error: 'Financing record not found' });
    const record = financingRecords[recordIndex];
    const providerIndex = providers.findIndex(p => p.id === record.providerId);
    const supplierIndex = suppliers.findIndex(s => s.id === record.supplierId);
    const isSuccessful = req.body.isSuccessful !== false;
    const { updatedRecord, updatedProvider, updatedSupplier, logs: settleLogs } = settlementEngine_1.SettlementEngine.completeSettlement(record, providers[providerIndex] || providers[0], suppliers[supplierIndex] || suppliers[0], isSuccessful);
    financingRecords[recordIndex] = updatedRecord;
    if (providerIndex !== -1)
        providers[providerIndex] = updatedProvider;
    if (supplierIndex !== -1)
        suppliers[supplierIndex] = updatedSupplier;
    const targetInvoice = invoices.find(inv => inv.id === record.invoiceId);
    if (targetInvoice) {
        targetInvoice.status = isSuccessful ? 'SETTLED' : 'DEFAULTED';
    }
    addLogs(settleLogs);
    res.json({
        financingRecord: updatedRecord,
        updatedProvider,
        updatedSupplier,
        metrics: calculateMetrics()
    });
});
// 8. One-Click Benchmark Scenarios Runner
exports.router.post('/scenarios/run/:scenarioId', (req, res) => {
    const { scenarioId } = req.params;
    if (scenarioId === 'reset') {
        suppliers = JSON.parse(JSON.stringify(mockData_1.INITIAL_SUPPLIERS));
        buyers = JSON.parse(JSON.stringify(mockData_1.INITIAL_BUYERS));
        providers = JSON.parse(JSON.stringify(mockData_1.INITIAL_PROVIDERS));
        invoices = JSON.parse(JSON.stringify(mockData_1.INITIAL_INVOICES));
        offersMap = {};
        financingRecords = [];
        logs = JSON.parse(JSON.stringify(mockData_1.INITIAL_LOGS));
        const resetLog = {
            id: `log-reset-${Date.now()}`,
            timestamp: new Date().toISOString(),
            agentName: 'DiscoveryMatchingAgent',
            level: 'INFO',
            message: 'System state reset to baseline benchmark dataset.'
        };
        addLogs([resetLog]);
        return res.json({
            success: true,
            message: 'Marketplace state reset to baseline successfully.',
            state: { suppliers, buyers, providers, invoices, offersMap, financingRecords, logs, metrics: calculateMetrics() }
        });
    }
    // Scenario 1: Flagship ₹20L Urgent Deal
    if (scenarioId === 'flagship-20l') {
        const invoice = invoices.find(i => i.id === 'inv-demo-20l') || invoices[0];
        const runResult = scenarioRunner_1.ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
        offersMap[invoice.id] = runResult.offers;
        addLogs(runResult.logs);
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
        const runResult = scenarioRunner_1.ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
        offersMap[invoice.id] = [];
        addLogs(runResult.logs);
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
        const runResult = scenarioRunner_1.ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
        offersMap[invoice.id] = runResult.offers;
        addLogs(runResult.logs);
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
        const runResult = scenarioRunner_1.ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
        offersMap[invoice.id] = runResult.offers;
        addLogs(runResult.logs);
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
        const runResult = scenarioRunner_1.ScenarioRunner.runFullPipeline(invoice, suppliers, buyers, providers);
        offersMap[invoice.id] = runResult.offers;
        addLogs(runResult.logs);
        if (runResult.winningOffer) {
            const provIndex = providers.findIndex(p => p.id === runResult.winningOffer.providerId);
            const supplier = suppliers.find(s => s.id === invoice.supplierId);
            const buyer = buyers.find(b => b.id === invoice.buyerId);
            // 1. Finance
            const finRes = settlementEngine_1.SettlementEngine.executeFinancing(invoice, runResult.winningOffer, providers[provIndex], supplier, buyer);
            providers[provIndex] = finRes.updatedProvider;
            financingRecords.unshift(finRes.financingRecord);
            invoice.status = 'FINANCED';
            addLogs(finRes.logs);
            // 2. Settle immediately for demo loop
            const settleRes = settlementEngine_1.SettlementEngine.completeSettlement(finRes.financingRecord, providers[provIndex], supplier, true);
            financingRecords[0] = settleRes.updatedRecord;
            providers[provIndex] = settleRes.updatedProvider;
            suppliers[suppliers.findIndex(s => s.id === supplier.id)] = settleRes.updatedSupplier;
            invoice.status = 'SETTLED';
            addLogs(settleRes.logs);
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
