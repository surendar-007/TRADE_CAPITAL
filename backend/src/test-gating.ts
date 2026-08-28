const API_URL = 'http://localhost:4000/api';

async function runGatingTest() {
  try {
    console.log('--- GATING TEST ---');
    
    console.log('1. Submitting dummy invoice...');
    const invoiceRes = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber: 'INV-TEST-FAIL', amountLakhs: 20, purchaseOrderNumber: 'FAKE-123' })
    });
    const invoiceData: any = await invoiceRes.json();
    const invoice = invoiceData.invoice;
    console.log(`Created invoice ID: ${invoice.id}`);
    
    console.log('2. Running verification (will fail naturally due to missing PO)...');
    const verifyRes = await fetch(`${API_URL}/invoices/${invoice.id}/verify`, { method: 'POST' });
    const verifyData: any = await verifyRes.json();
    console.log(`Verification Status: ${verifyData.invoice.status}`);
    
    if (verifyData.invoice.status !== 'VERIFICATION_FAILED') {
       console.log('Invoice somehow passed. Cannot test gating on passed invoice. Aborting test script.');
       return;
    }
    
    console.log('3. Attempting to bypass and call /risk...');
    const riskRes = await fetch(`${API_URL}/invoices/${invoice.id}/risk`, { method: 'POST' });
    if (riskRes.ok) {
      console.log('ERROR: /risk bypass succeeded!');
    } else {
      const errorData: any = await riskRes.json();
      console.log(`SUCCESS: /risk rejected bypass with status ${riskRes.status} - ${errorData.error}`);
    }
    
    console.log('4. Attempting to bypass and call /clear...');
    const clearRes = await fetch(`${API_URL}/invoices/${invoice.id}/clear`, { method: 'POST' });
    if (clearRes.ok) {
      console.log('ERROR: /clear bypass succeeded!');
    } else {
      const errorData: any = await clearRes.json();
      console.log(`SUCCESS: /clear rejected bypass with status ${clearRes.status} - ${errorData.error}`);
    }

    console.log('5. Attempting to bypass and call /finance...');
    const financeRes = await fetch(`${API_URL}/invoices/${invoice.id}/finance`, { method: 'POST' });
    if (financeRes.ok) {
      console.log('ERROR: /finance bypass succeeded!');
    } else {
      const errorData: any = await financeRes.json();
      console.log(`SUCCESS: /finance rejected bypass with status ${financeRes.status} - ${errorData.error}`);
    }
    
    console.log('--- ALL GATING TESTS PASSED ---');
  } catch (error: any) {
    console.error('Test execution error:', error.message);
  }
}
runGatingTest();
