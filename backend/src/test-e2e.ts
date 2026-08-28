import fs from 'fs';
import path from 'path';

async function runE2ETests() {
  console.log('========================================================');
  console.log('🚀 RUNNING END-TO-END HTTP API & INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  const testDir = path.join(__dirname, '../../test-samples');

  // Test 1: Scan Sample_Valid_Invoice_TradeCapital.pdf
  console.log('--- TEST 1: Scanning Sample_Valid_Invoice_TradeCapital.pdf via POST /api/invoices/scan ---');
  const validPdfBuffer = fs.readFileSync(path.join(testDir, 'Sample_Valid_Invoice_TradeCapital.pdf'));
  const blob1 = new Blob([validPdfBuffer], { type: 'application/pdf' });
  const form1 = new FormData();
  form1.append('invoice', blob1, 'Sample_Valid_Invoice_TradeCapital.pdf');

  const scanRes1 = await fetch('http://localhost:4000/api/invoices/scan', {
    method: 'POST',
    body: form1
  });

  if (!scanRes1.ok) {
    throw new Error(`Scan 1 failed with status ${scanRes1.status}: ${await scanRes1.text()}`);
  }

  const scanData1: any = await scanRes1.json();
  console.log('Scan 1 HTTP Status: 200 OK');
  console.log('Filename:', scanData1.filename);
  console.log('Verification Status:', scanData1.verification.status);
  console.log('Extracted Invoice Number:', scanData1.extractedFields.invoiceNumber.value);
  console.log('Extracted Supplier:', scanData1.extractedFields.supplierName.value, `(ID: ${scanData1.extractedFields.supplierName.matchedSupplierId})`);
  console.log('Extracted Buyer:', scanData1.extractedFields.buyerName.value, `(ID: ${scanData1.extractedFields.buyerName.matchedBuyerId})`);
  console.log('Extracted Amount:', scanData1.extractedFields.invoiceAmount.formatted, `(${scanData1.extractedFields.invoiceAmount.amountLakhs} Lakhs)`);
  console.log('Extracted Dates:', `Dated ${scanData1.extractedFields.invoiceDate.formatted}, Due ${scanData1.extractedFields.dueDate.formatted}`);
  console.log('Extracted Payment Terms & Tenor:', `${scanData1.extractedFields.paymentTerms.value} (${scanData1.extractedFields.tenorDays.value} days)`);

  if (scanData1.verification.status !== 'VERIFIED' || 
      scanData1.extractedFields.invoiceNumber.value !== 'INV-2026-0817' ||
      scanData1.extractedFields.supplierName.matchedSupplierId !== 'sup-001' ||
      scanData1.extractedFields.buyerName.matchedBuyerId !== 'buy-001' ||
      scanData1.extractedFields.invoiceAmount.amountLakhs !== 20) {
    throw new Error('Test 1 Assertions Failed!');
  }
  console.log('✅ TEST 1 PASSED: Valid invoice successfully verified with VERIFIED status!\n');

  // Test 2: Scan Sample_Invalid_Invoice_TradeCapital.pdf (MUST NOT RETURN VERIFIED)
  console.log('--- TEST 2: Scanning Sample_Invalid_Invoice_TradeCapital.pdf via POST /api/invoices/scan ---');
  const invalidPdfBuffer = fs.readFileSync(path.join(testDir, 'Sample_Invalid_Invoice_TradeCapital.pdf'));
  const blob2 = new Blob([invalidPdfBuffer], { type: 'application/pdf' });
  const form2 = new FormData();
  form2.append('invoice', blob2, 'Sample_Invalid_Invoice_TradeCapital.pdf');

  const scanRes2 = await fetch('http://localhost:4000/api/invoices/scan', {
    method: 'POST',
    body: form2
  });

  if (!scanRes2.ok) {
    throw new Error(`Scan 2 failed with status ${scanRes2.status}: ${await scanRes2.text()}`);
  }

  const scanData2: any = await scanRes2.json();
  console.log('Scan 2 HTTP Status: 200 OK');
  console.log('Filename:', scanData2.filename);
  console.log('Verification Status:', scanData2.verification.status);
  console.log('Invoice Number:', scanData2.extractedFields.invoiceNumber.value || 'MISSING');
  console.log('Supplier:', scanData2.extractedFields.supplierName.value || 'MISSING');
  console.log('Buyer:', scanData2.extractedFields.buyerName.value || 'MISSING');
  console.log('Invoice Amount:', scanData2.extractedFields.invoiceAmount.value || 'MISSING');
  console.log('Due Date:', scanData2.extractedFields.dueDate.value || 'MISSING');
  console.log('Payment Terms:', scanData2.extractedFields.paymentTerms.value || 'MISSING');
  console.log('Missing Fields:', scanData2.verification.missingFields);
  console.log('Summary:', scanData2.verification.summary);

  if (scanData2.verification.status === 'VERIFIED') {
    throw new Error('TEST 2 FAILED: Invalid invoice was incorrectly marked VERIFIED!');
  }
  if (scanData2.verification.status !== 'INCOMPLETE') {
    throw new Error(`TEST 2 FAILED: Expected INCOMPLETE but got ${scanData2.verification.status}`);
  }
  console.log('✅ TEST 2 PASSED: Sample_Invalid_Invoice_TradeCapital.pdf correctly returned INCOMPLETE!\n');

  // Test 3: Unsupported File Type Error Handling
  console.log('--- TEST 3: Unsupported File Type Error Handling ---');
  const textBlob = new Blob(['hello plain text file'], { type: 'text/plain' });
  const form3 = new FormData();
  form3.append('invoice', textBlob, 'notes.txt');

  const scanRes3 = await fetch('http://localhost:4000/api/invoices/scan', {
    method: 'POST',
    body: form3
  });

  const errorData3: any = await scanRes3.json();
  console.log('HTTP Status:', scanRes3.status);
  console.log('Error message returned:', errorData3.error);

  if (scanRes3.status !== 400 || !errorData3.error) {
    throw new Error('Test 3 Assertions Failed!');
  }
  console.log('✅ TEST 3 PASSED: Clean rejection and error response on unsupported file!\n');

  // Test 4: Submit the valid pre-filled invoice through Supplier Portal API
  console.log('--- TEST 4: Submitting Scanned & Verified Invoice to Capital Market ---');
  const submitPayload = {
    invoiceNumber: scanData1.extractedFields.invoiceNumber.value,
    supplierId: scanData1.extractedFields.supplierName.matchedSupplierId,
    buyerId: scanData1.extractedFields.buyerName.matchedBuyerId,
    amountLakhs: scanData1.extractedFields.invoiceAmount.amountLakhs,
    minRequiredAmountLakhs: 16.0,
    tenorDays: scanData1.extractedFields.tenorDays.value,
    goodsDescription: 'Machined Aerospace Grade Flanges',
    purchaseOrderNumber: scanData1.extractedFields.purchaseOrderNumber?.value || 'PO-ENTERPRISE-8831',
    eWayBillNumber: scanData1.extractedFields.eWayBillNumber?.value || 'EWB-772910384910',
    issueDate: scanData1.extractedFields.invoiceDate.value,
    dueDate: scanData1.extractedFields.dueDate.value,
    preferences: {
      urgencyLevel: 'CRITICAL',
      targetAdvanceRate: 0.80,
      maxAcceptableRate: 14.0,
      priorityWeights: {
        advanceRate: 0.35,
        settlementSpeed: 0.30,
        interestRate: 0.20,
        fees: 0.10,
        tenorFlexibility: 0.05
      }
    }
  };

  const submitRes = await fetch('http://localhost:4000/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitPayload)
  });

  if (!submitRes.ok) {
    throw new Error(`Invoice submission failed: ${await submitRes.text()}`);
  }

  const submitData: any = await submitRes.json();
  const createdInvoice = submitData.invoice;
  console.log('Created Invoice ID:', createdInvoice.id);
  console.log('Invoice Number:', createdInvoice.invoiceNumber);
  console.log('Status:', createdInvoice.status);
  console.log('Supplier ID:', createdInvoice.supplierId);
  console.log('Buyer ID:', createdInvoice.buyerId);
  console.log('Amount:', `₹${createdInvoice.amountLakhs} Lakhs`);

  if (!createdInvoice.id || createdInvoice.invoiceNumber !== 'INV-2026-0817' || createdInvoice.amountLakhs !== 20) {
    throw new Error('Test 4 Assertions Failed!');
  }
  console.log('✅ TEST 4 PASSED: Submitted invoice registered with all scanned and user values!\n');

  // Test 5: Feed into downstream Capital Market Clearing Pipeline
  console.log('--- TEST 5: Executing Multi-Attribute Market Clearing on Scanned Invoice ---');
  const clearRes = await fetch(`http://localhost:4000/api/invoices/${createdInvoice.id}/clear`, {
    method: 'POST'
  });

  if (!clearRes.ok) {
    throw new Error(`Clearing failed: ${await clearRes.text()}`);
  }

  const clearData: any = await clearRes.json();
  console.log('Clearing Output:');
  console.log('Matched Offers Count:', clearData.offers.length);
  console.log('Winning Provider:', clearData.winningOffer?.providerName);
  console.log('Offered Advance Rate:', `${(clearData.winningOffer?.offeredAdvanceRate * 100).toFixed(1)}%`);
  console.log('Offered Interest Rate:', `${clearData.winningOffer?.interestRatePercent}%`);
  console.log('Settlement Speed:', `${clearData.winningOffer?.settlementSpeedHours} hours`);
  console.log('Utility Score:', clearData.winningOffer?.utilityScore);

  if (!clearData.winningOffer || clearData.offers.length === 0) {
    throw new Error('Test 5 Assertions Failed!');
  }
  console.log('✅ TEST 5 PASSED: Scanned invoice seamlessly flowed through Autonomous Bidding & Clearing Pipeline!\n');

  console.log('========================================================');
  console.log('🎉 ALL 5 END-TO-END INTEGRATION TESTS PASSED 100%!');
  console.log('========================================================');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E TEST ERROR:', err);
  process.exit(1);
});
