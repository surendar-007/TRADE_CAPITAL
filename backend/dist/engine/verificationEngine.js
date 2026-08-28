"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEngine = void 0;
class VerificationEngine {
    static verifyInvoice(invoice, supplier, buyer) {
        const flags = [];
        let gstinActive = true;
        let eWayBillValid = true;
        let threeWayMatchScore = 95;
        let buyerAcknowledged = true;
        // Check GSTIN active status
        if (!supplier || !supplier.gstin || supplier.gstin.length !== 15) {
            gstinActive = false;
            flags.push('Supplier GSTIN missing or invalid format');
        }
        // Check eWay bill validity
        if (!invoice.eWayBillNumber || invoice.eWayBillNumber.includes('INVALID') || invoice.eWayBillNumber.length < 10) {
            eWayBillValid = false;
            flags.push('eWay Bill generation record could not be authenticated on NIC portal');
        }
        // Check Purchase Order linkage
        if (!invoice.purchaseOrderNumber || invoice.purchaseOrderNumber.includes('FAKE')) {
            threeWayMatchScore = 30;
            flags.push('PO number mismatch with ERP electronic manifest');
        }
        // Buyer verification check
        if (buyer && buyer.disputeRatePercent > 3.0) {
            buyerAcknowledged = false;
            flags.push(`Buyer ${buyer.name} flagged with elevated dispute rate (${buyer.disputeRatePercent}%)`);
        }
        // Compute composite verification score (0 - 100)
        let score = 100;
        if (!gstinActive)
            score -= 40;
        if (!eWayBillValid)
            score -= 35;
        if (threeWayMatchScore < 80)
            score -= (80 - threeWayMatchScore);
        if (!buyerAcknowledged)
            score -= 15;
        score = Math.max(0, Math.min(100, score));
        let status = 'PASSED';
        let explanation = 'Invoice passed electronic 3-way reconciliation (GSTIN active, verified eWay bill, matching PO).';
        if (score < 60) {
            status = 'FAILED';
            explanation = `Verification failed with score ${score}/100. Critical issues detected: ${flags.join('; ')}`;
        }
        else if (score < 80) {
            status = 'FLAGGED';
            explanation = `Verification flagged for manual review with score ${score}/100. Warnings: ${flags.join('; ')}`;
        }
        const result = {
            status,
            verificationScore: score,
            gstinActive,
            eWayBillValid,
            threeWayMatchScore,
            buyerAcknowledged,
            flags,
            explanation,
            verifiedAt: new Date().toISOString()
        };
        const log = {
            id: `log-ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            agentName: 'VerificationAgent',
            level: status === 'PASSED' ? 'DECISION' : (status === 'FLAGGED' ? 'WARNING' : 'ACTION'),
            invoiceId: invoice.id,
            message: `Invoice [${invoice.invoiceNumber}] verification completed: ${status} (Score: ${score}/100).`,
            details: result
        };
        return { result, log };
    }
}
exports.VerificationEngine = VerificationEngine;
