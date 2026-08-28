import PDFDocument from 'pdfkit';
import { InvoiceScannerEngine } from './engine/invoiceScannerEngine';
import { INITIAL_SUPPLIERS, INITIAL_BUYERS } from './data/mockData';
import fs from 'fs';
import path from 'path';

// Generate a valid compliant PDF buffer with stacked section layout (as tested by user)
function createValidPdfBuffer(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).text('Invoice Number');
    doc.fontSize(12).text('INV-2026-0817');
    doc.moveDown(0.5);

    doc.fontSize(10).text('Invoice Date');
    doc.fontSize(12).text('17-Aug-2026');
    doc.moveDown(0.5);

    doc.fontSize(10).text('Due Date');
    doc.fontSize(12).text('16-Oct-2026');
    doc.moveDown(0.5);

    doc.fontSize(10).text('Currency');
    doc.fontSize(12).text('INR');
    doc.moveDown(0.5);

    doc.fontSize(10).text('Payment Terms');
    doc.fontSize(12).text('Net 60');
    doc.moveDown(0.5);

    doc.fontSize(10).text('SUPPLIER');
    doc.fontSize(12).text('APEX PRECISION ENGINEERING LTD');
    doc.moveDown(0.5);

    doc.fontSize(10).text('BUYER / ENTERPRISE DEBTOR');
    doc.fontSize(12).text('GLOBAL MOTORS INDIA CORP');
    doc.moveDown(0.5);

    doc.fontSize(10).text('TOTAL INVOICE VALUE');
    doc.fontSize(12).text('Rs. 20,00,000');
    doc.moveDown(0.5);

    doc.fontSize(10).text('PO Number');
    doc.fontSize(12).text('PO-ENTERPRISE-8831');
    doc.moveDown(0.5);

    doc.fontSize(10).text('eWay Bill');
    doc.fontSize(12).text('EWB-772910384910');

    doc.end();
  });
}

// Generate an invalid PDF buffer intentionally missing Buyer, Amount, Due Date, Payment Terms
function createInvalidPdfBuffer(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text('Invoice Number');
    doc.fontSize(12).text('INV-2026-8801');
    doc.moveDown(0.5);

    doc.fontSize(10).text('SUPPLIER');
    doc.fontSize(12).text('APEX PRECISION ENGINEERING LTD');
    doc.moveDown(0.5);

    // Intentionally missing Buyer / Enterprise Debtor
    // Intentionally missing Total Invoice Value / Amount

    doc.fontSize(10).text('Currency');
    doc.fontSize(12).text('INR');
    doc.moveDown(0.5);

    doc.fontSize(10).text('Invoice Date');
    doc.fontSize(12).text('17-Aug-2026');
    doc.moveDown(0.5);

    // Intentionally missing Due Date
    // Intentionally missing Payment Terms

    doc.fontSize(10).text('Goods Description');
    doc.fontSize(12).text('Prototype Aluminum Castings');

    doc.end();
  });
}

async function runTests() {
  const testDir = path.join(__dirname, '../../test-samples');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  console.log('================================================================');
  console.log('🧪 TESTING INVOICE PARSING & DETERMINISTIC VERIFICATION ENGINE');
  console.log('================================================================\n');

  // --- TEST 1: Sample_Valid_Invoice_TradeCapital.pdf ---
  console.log('=== TEST 1: Sample_Valid_Invoice_TradeCapital.pdf ===');
  const validPdfBuffer = await createValidPdfBuffer();

  fs.writeFileSync(path.join(testDir, 'Sample_Valid_Invoice_TradeCapital.pdf'), validPdfBuffer);
  fs.writeFileSync(path.join(testDir, 'sample_apex_invoice.pdf'), validPdfBuffer);

  const textValid = await InvoiceScannerEngine.extractTextFromFile(validPdfBuffer, 'application/pdf', 'Sample_Valid_Invoice_TradeCapital.pdf');
  console.log('Extracted Raw Text:\n', textValid);

  const resultValid = InvoiceScannerEngine.processInvoice(
    textValid,
    'Sample_Valid_Invoice_TradeCapital.pdf',
    validPdfBuffer.length,
    'application/pdf',
    INITIAL_SUPPLIERS,
    INITIAL_BUYERS
  );

  console.log('\nParsed Fields:');
  console.log('  invoiceNumber:', resultValid.extractedFields.invoiceNumber.value);
  console.log('  supplierName:', resultValid.extractedFields.supplierName.value, `(matchedId: ${resultValid.extractedFields.supplierName.matchedSupplierId})`);
  console.log('  buyerName:', resultValid.extractedFields.buyerName.value, `(matchedId: ${resultValid.extractedFields.buyerName.matchedBuyerId})`);
  console.log('  invoiceAmount:', resultValid.extractedFields.invoiceAmount.formatted, `(value: ${resultValid.extractedFields.invoiceAmount.value}, amountLakhs: ${resultValid.extractedFields.invoiceAmount.amountLakhs})`);
  console.log('  invoiceDate:', resultValid.extractedFields.invoiceDate.formatted);
  console.log('  dueDate:', resultValid.extractedFields.dueDate.formatted);
  console.log('  currency:', resultValid.extractedFields.currency.value);
  console.log('  paymentTerms:', resultValid.extractedFields.paymentTerms.value);
  console.log('  tenorDays:', resultValid.extractedFields.tenorDays.value);
  console.log('\nVerification Status:', resultValid.verification.status);
  console.log('Checklist:');
  resultValid.verification.checklist.forEach(c => {
    console.log(`  ${c.passed ? '✓' : '✗'} ${c.label}: ${c.message}`);
  });

  if (resultValid.verification.status !== 'VERIFIED' ||
      resultValid.extractedFields.invoiceNumber.value !== 'INV-2026-0817' ||
      resultValid.extractedFields.supplierName.matchedSupplierId !== 'sup-001' ||
      resultValid.extractedFields.buyerName.matchedBuyerId !== 'buy-001' ||
      resultValid.extractedFields.invoiceAmount.value !== 2000000 ||
      resultValid.extractedFields.invoiceDate.value !== '2026-08-17' ||
      resultValid.extractedFields.dueDate.value !== '2026-10-16') {
    throw new Error(`TEST 1 FAILED: Expected all fields extracted + VERIFIED!`);
  }
  console.log('>>> ✅ TEST 1 PASSED: Sample_Valid_Invoice_TradeCapital.pdf correctly parsed all stacked fields and returned VERIFIED! <<<\n');

  // --- TEST 2: Sample_Invalid_Invoice_TradeCapital.pdf ---
  console.log('=== TEST 2: Sample_Invalid_Invoice_TradeCapital.pdf ===');
  const invalidPdfBuffer = await createInvalidPdfBuffer();

  fs.writeFileSync(path.join(testDir, 'Sample_Invalid_Invoice_TradeCapital.pdf'), invalidPdfBuffer);

  const textInvalid = await InvoiceScannerEngine.extractTextFromFile(invalidPdfBuffer, 'application/pdf', 'Sample_Invalid_Invoice_TradeCapital.pdf');
  const resultInvalid = InvoiceScannerEngine.processInvoice(
    textInvalid,
    'Sample_Invalid_Invoice_TradeCapital.pdf',
    invalidPdfBuffer.length,
    'application/pdf',
    INITIAL_SUPPLIERS,
    INITIAL_BUYERS
  );

  console.log('Parsed Fields:');
  console.log('  Invoice Number:', resultInvalid.extractedFields.invoiceNumber.value || 'MISSING');
  console.log('  Supplier:', resultInvalid.extractedFields.supplierName.value || 'MISSING');
  console.log('  Buyer:', resultInvalid.extractedFields.buyerName.value || 'MISSING');
  console.log('  Amount:', resultInvalid.extractedFields.invoiceAmount.value || 'MISSING');
  console.log('  Due Date:', resultInvalid.extractedFields.dueDate.value || 'MISSING');
  console.log('  Payment Terms:', resultInvalid.extractedFields.paymentTerms.value || 'MISSING');
  console.log('Missing Fields:', resultInvalid.verification.missingFields);
  console.log('Verification Status:', resultInvalid.verification.status);
  console.log('Summary:', resultInvalid.verification.summary);

  if (resultInvalid.verification.status === 'VERIFIED') {
    throw new Error(`TEST 2 FAILED: Sample_Invalid_Invoice_TradeCapital.pdf was incorrectly marked VERIFIED!`);
  }
  if (resultInvalid.verification.status !== 'INCOMPLETE') {
    throw new Error(`TEST 2 FAILED: Expected INCOMPLETE but got ${resultInvalid.verification.status}`);
  }
  console.log('>>> ✅ TEST 2 PASSED: Sample_Invalid_Invoice_TradeCapital.pdf correctly returned INCOMPLETE! <<<\n');

  console.log('================================================================');
  console.log('🎉 ALL SCANNER & VERIFICATION ENGINE TESTS PASSED 100%!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('❌ TEST ERROR:', err);
  process.exit(1);
});
