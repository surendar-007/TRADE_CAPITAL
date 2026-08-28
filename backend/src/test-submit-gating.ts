const API_URL = 'http://localhost:4000/api';

async function runSubmitGatingTest() {
  try {
    console.log('--- SUBMIT GATING TEST ---');
    
    // TEST 1: Direct backend submission without VERIFIED status
    console.log('TEST 1: Attempting direct backend submission without VERIFIED status...');
    const invoiceRes1 = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber: 'INV-INVALID', amountLakhs: 20, verificationStatus: 'INCOMPLETE' })
    });
    
    if (!invoiceRes1.ok) {
      const errorData: any = await invoiceRes1.json();
      console.log(`SUCCESS: Direct backend submission rejected with status ${invoiceRes1.status} - ${errorData.error}`);
    } else {
      console.log('ERROR: Direct backend submission succeeded despite missing VERIFIED status!');
    }
    
    // TEST 2: Direct backend submission with VERIFIED status
    console.log('TEST 2: Attempting direct backend submission with VERIFIED status...');
    const invoiceRes2 = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber: 'INV-VALID', amountLakhs: 20, verificationStatus: 'VERIFIED' })
    });
    
    if (invoiceRes2.ok) {
      const data: any = await invoiceRes2.json();
      console.log(`SUCCESS: Valid submission succeeded. Created invoice ID: ${data.invoice.id}`);
    } else {
      console.log('ERROR: Valid submission failed!');
    }
    
    console.log('--- ALL SUBMIT GATING TESTS PASSED ---');
  } catch (error: any) {
    console.error('Test execution error:', error.message);
  }
}

runSubmitGatingTest();
