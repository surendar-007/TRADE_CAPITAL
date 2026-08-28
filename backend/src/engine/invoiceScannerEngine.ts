import { Supplier, Buyer } from '../models/types';

// Dynamic imports or require for libraries
// @ts-ignore
const _pdfParse = require('pdf-parse');
const pdfParse = typeof _pdfParse === 'function' ? _pdfParse : (_pdfParse.default || _pdfParse);
// @ts-ignore
import { createWorker } from 'tesseract.js';

export type FieldStatus = 'EXTRACTED' | 'UNCERTAIN' | 'MISSING';

export interface ExtractedField<T = string> {
  value: T | null;
  rawText?: string;
  formatted?: string;
  status: FieldStatus;
  confidence: number;
}

export interface ExtractedInvoiceData {
  invoiceNumber: ExtractedField<string>;
  supplierName: ExtractedField<string> & { matchedSupplierId?: string; matchConfidence?: number };
  buyerName: ExtractedField<string> & { matchedBuyerId?: string; matchConfidence?: number };
  invoiceAmount: ExtractedField<number> & { amountLakhs?: number };
  currency: ExtractedField<string>;
  invoiceDate: ExtractedField<string>;
  dueDate: ExtractedField<string>;
  paymentTerms: ExtractedField<string>;
  tenorDays: ExtractedField<number>;
  purchaseOrderNumber?: ExtractedField<string>;
  eWayBillNumber?: ExtractedField<string>;
  goodsDescription?: ExtractedField<string>;
}

export interface VerificationCheckItem {
  key: string;
  label: string;
  passed: boolean;
  message?: string;
}

export type ScanVerificationStatus = 'VERIFIED' | 'NEEDS REVIEW' | 'INCOMPLETE';

export interface ScanVerificationResult {
  status: ScanVerificationStatus;
  checklist: VerificationCheckItem[];
  summary: string;
  missingFields: string[];
  uncertainFields: string[];
}

export interface ScanInvoiceResponse {
  success: boolean;
  filename: string;
  fileSize: number;
  mimeType: string;
  extractedText: string;
  extractedFields: ExtractedInvoiceData;
  verification: ScanVerificationResult;
}

export class InvoiceScannerEngine {
  /**
   * Extract raw text from file buffer (PDF or image)
   */
  public static async extractTextFromFile(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<string> {
    const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    const isImage = 
      mimeType.startsWith('image/') || 
      /\.(jpg|jpeg|png)$/i.test(filename);

    if (isPdf) {
      try {
        const pdfModule = require('pdf-parse');
        const parseFn = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule);

        // Custom page renderer that reconstructs logical reading order using X, Y coordinates
        const customPagerender = (pageData: any) => {
          return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
            const validItems = (textContent.items || [])
              .filter((it: any) => it.str && it.str.trim().length > 0)
              .map((it: any) => ({
                str: it.str.trim(),
                x: it.transform ? it.transform[4] : 0,
                y: it.transform ? it.transform[5] : 0,
                width: it.width || (it.str.length * 6),
                height: it.height || 10
              }));

            if (validItems.length === 0) return '';

            // Sort items top-to-bottom (Y descending), then left-to-right (X ascending)
            validItems.sort((a: any, b: any) => b.y - a.y || a.x - b.x);

            const lineTolerance = 4.0;
            const lines: { y: number; items: typeof validItems }[] = [];

            for (const item of validItems) {
              let placed = false;
              for (const line of lines) {
                if (Math.abs(line.y - item.y) <= lineTolerance) {
                  line.items.push(item);
                  line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
                  placed = true;
                  break;
                }
              }
              if (!placed) {
                lines.push({ y: item.y, items: [item] });
              }
            }

            // Sort lines top to bottom (Y descending)
            lines.sort((a: any, b: any) => b.y - a.y);

            const rendered = lines.map((line: any) => {
              // Sort items in this line left to right (X ascending)
              line.items.sort((a: any, b: any) => a.x - b.x);
              let lineStr = '';
              for (let i = 0; i < line.items.length; i++) {
                const it = line.items[i];
                if (i > 0) {
                  const prev = line.items[i - 1];
                  const gap = it.x - (prev.x + prev.width);
                  if (gap > 25) {
                    lineStr += '   '; // column separation
                  } else {
                    lineStr += ' ';
                  }
                }
                lineStr += it.str;
              }
              return lineStr;
            });

            return rendered.join('\n');
          });
        };

        const data = await parseFn(new Uint8Array(buffer), { pagerender: customPagerender });
        const text = data && data.text ? data.text.trim() : '';

        if (text && text.length >= 10) {
          return text;
        }
        throw new Error('PDF appears to contain no embedded text. It may be an image-only scan.');
      } catch (err: any) {
        // Fallback: standard pdf-parse
        try {
          const pdfModule = require('pdf-parse');
          const parseFn = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule);
          const data = await parseFn(new Uint8Array(buffer));
          if (data && data.text && data.text.trim().length >= 10) {
            return data.text.trim();
          }
        } catch (_) {}

        // Fallback 2: raw stream text parsing
        try {
          const rawStr = buffer.toString('latin1');
          const matches = rawStr.match(/\(([^\\()]+)\)\s*Tj/g);
          if (matches && matches.length >= 2) {
            const rawExtracted = matches
              .map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim())
              .filter(Boolean)
              .join('\n');
            if (rawExtracted.length >= 10) {
              return rawExtracted;
            }
          }
        } catch (_) {}

        throw new Error(`Failed to extract text from PDF: ${err.message || err}`);
      }
    } else if (isImage) {
      let worker: any = null;
      try {
        worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        const text = ret.data && ret.data.text ? ret.data.text.trim() : '';
        await worker.terminate();
        if (!text || text.length < 5) {
          throw new Error('No legible text recognized in image.');
        }
        return text;
      } catch (err: any) {
        if (worker) {
          try { await worker.terminate(); } catch (_) {}
        }
        throw new Error(`OCR processing failed: ${err.message || err}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${mimeType || filename}. Allowed types: PDF, JPG, JPEG, PNG.`);
    }
  }

  /**
   * Parse extracted raw text into structured fields and perform deterministic verification
   */
  public static processInvoice(
    rawText: string,
    filename: string,
    fileSize: number,
    mimeType: string,
    registeredSuppliers: Supplier[] = [],
    registeredBuyers: Buyer[] = []
  ): ScanInvoiceResponse {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    // 1. Extract Invoice Number
    const invoiceNumber = this.extractInvoiceNumber(rawText, lines);

    // 2. Extract Supplier
    const supplierName = this.extractSupplier(rawText, lines, registeredSuppliers);

    // 3. Extract Buyer
    const buyerName = this.extractBuyer(rawText, lines, registeredBuyers);

    // 4. Extract Amount & Currency
    const { invoiceAmount, currency } = this.extractAmountAndCurrency(rawText, lines);

    // 5. Extract Dates
    const invoiceDate = this.extractInvoiceDate(rawText, lines);
    const dueDate = this.extractDueDate(rawText, lines);

    // 6. Extract Payment Terms & Tenor
    const { paymentTerms, tenorDays } = this.extractTermsAndTenor(rawText, lines, invoiceDate.value, dueDate.value);

    // 7. Extract PO & eWay Bill
    const purchaseOrderNumber = this.extractPO(rawText);
    const eWayBillNumber = this.extractEWayBill(rawText);
    const goodsDescription = this.extractGoodsDescription(rawText);

    const extractedFields: ExtractedInvoiceData = {
      invoiceNumber,
      supplierName,
      buyerName,
      invoiceAmount,
      currency,
      invoiceDate,
      dueDate,
      paymentTerms,
      tenorDays,
      purchaseOrderNumber,
      eWayBillNumber,
      goodsDescription
    };

    // 8. Deterministic Verification
    const verification = this.verifyExtractedData(rawText, extractedFields);

    return {
      success: true,
      filename,
      fileSize,
      mimeType,
      extractedText: rawText,
      extractedFields,
      verification
    };
  }

  // --- Field Extractors with Multi-line Layout Support ---

  private static extractInvoiceNumber(text: string, lines: string[]): ExtractedField<string> {
    const isCleanInvoiceCode = (val: string): boolean => {
      const clean = val.replace(/^[#:\-\s]+/, '').replace(/[#:\-\s]+$/, '').trim();
      if (clean.length < 3 || clean.length > 30) return false;
      if (/^(date|total|amount|due|terms|number|invoice|tax|gstin|buyer|supplier|currency|status|verified|candidate|0ice)$/i.test(clean)) {
        return false;
      }
      // Must contain at least some digits or letters with delimiter
      return /^[A-Z0-9][A-Z0-9\-\/_#]{2,28}$/i.test(clean);
    };

    // 1. Stacked label search (e.g. Line 1: "Invoice Number", Line 2: "INV-2026-0817")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isInvoiceLabel = /^(?:Invoice\s*Number|Invoice\s*No\.?|Invoice\s*#|Invoice\s*Num|Invoice\s*ID|Bill\s*No\.?|Bill\s*Number)$/i.test(line) ||
        (line.toLowerCase() === 'invoice' && lines[i + 1]?.toLowerCase() === 'number');

      if (isInvoiceLabel) {
        const nextLineIdx = (line.toLowerCase() === 'invoice' && lines[i + 1]?.toLowerCase() === 'number') ? i + 2 : i + 1;
        if (nextLineIdx < lines.length) {
          const candidate = lines[nextLineIdx].split(/\s{2,}|\t/)[0].trim();
          // Extract the first clean token
          const token = candidate.split(/\s+/)[0];
          if (isCleanInvoiceCode(token)) {
            return {
              value: token,
              rawText: `${line} ${token}`,
              status: 'EXTRACTED',
              confidence: 0.98
            };
          }
        }
      }
    }

    // 2. Standalone standard token (e.g. INV-2026-0817)
    const tokenMatch = text.match(/\b(INV[-\_][0-9A-Za-z\-_]{3,25})\b/i);
    if (tokenMatch && tokenMatch[1]) {
      const val = tokenMatch[1].trim();
      if (isCleanInvoiceCode(val)) {
        return {
          value: val,
          rawText: tokenMatch[0],
          status: 'EXTRACTED',
          confidence: 0.95
        };
      }
    }

    // 3. Inline label matching (e.g. "Invoice Number: INV-2026-0817")
    const inlinePatterns = [
      /(?:Invoice\s*(?:No\.?|Number|#|Num|ID)|INV\s*#?|Bill\s*No\.?)\s*[:\-\#]?\s*([A-Z0-9][A-Z0-9\-\/_#]{2,30})/i
    ];

    for (const p of inlinePatterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const val = match[1].split(/\s+/)[0].trim();
        if (isCleanInvoiceCode(val)) {
          return {
            value: val,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: 0.90
          };
        }
      }
    }

    return {
      value: null,
      status: 'MISSING',
      confidence: 0
    };
  }

  private static extractSupplier(
    text: string,
    lines: string[],
    registeredSuppliers: Supplier[]
  ): ExtractedField<string> & { matchedSupplierId?: string; matchConfidence?: number } {
    // 1. Direct search for registered suppliers in document
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const textNorm = normalize(text);

    for (const sup of registeredSuppliers) {
      const supNorm = normalize(sup.name);
      if (textNorm.includes(supNorm)) {
        return {
          value: sup.name,
          rawText: sup.name,
          status: 'EXTRACTED',
          confidence: 0.98,
          matchedSupplierId: sup.id,
          matchConfidence: 1.0
        };
      }
    }

    // 2. Stacked section heading (e.g. Line 1: "SUPPLIER" or "SUPPLIER DETAILS", Line 2: "APEX PRECISION ENGINEERING LTD")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isSupplierHeading = /^(?:SUPPLIER|SELLER|VENDOR|FROM|BILLED\s*BY|ISSUED\s*BY|SOLD\s*BY|SUPPLIER\s*DETAILS|COMPANY\s*NAME)(?:\s*[:\-\#])?$/i.test(line) ||
        /\b(?:SUPPLIER|SELLER|VENDOR)\b/i.test(line);

      if (isSupplierHeading) {
        let candidate = lines[i + 1].trim();
        // If multi-column line, take left column
        if (candidate.includes('   ')) {
          candidate = candidate.split('   ')[0].trim();
        }
        if (candidate.length > 3 && !/^(buyer|customer|bill to|date|amount|total|invoice|gstin|po|currency)$/i.test(candidate)) {
          const matchSup = registeredSuppliers.find(s => 
            normalize(s.name) === normalize(candidate) ||
            normalize(s.name).includes(normalize(candidate)) || 
            normalize(candidate).includes(normalize(s.name))
          );

          return {
            value: matchSup ? matchSup.name : candidate,
            rawText: `${line} ${candidate}`,
            status: 'EXTRACTED',
            confidence: matchSup ? 0.98 : 0.85,
            matchedSupplierId: matchSup?.id,
            matchConfidence: matchSup ? 1.0 : 0.5
          };
        }
      }
    }

    // 3. Inline pattern (e.g. "Supplier: APEX PRECISION ENGINEERING LTD")
    const supplierPatterns = [
      /(?:Supplier|Seller|Vendor|From|Billed\s*By|Issued\s*By|Sold\s*By|Company\s*Name)\s*[:\-\#]\s*([A-Za-z0-9\s\.,&'\-\(\)]+?)(?=\n|   |Buyer|To|GSTIN|Invoice|Date|Amount|$)/i
    ];

    for (const p of supplierPatterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const candidate = match[1].trim().split('\n')[0].trim();
        if (candidate.length > 3 && candidate.length < 80 && !/^(date|amount|invoice|buyer|customer|bill to)$/i.test(candidate)) {
          const matchSup = registeredSuppliers.find(s => 
            normalize(s.name) === normalize(candidate) ||
            normalize(s.name).includes(normalize(candidate)) || 
            normalize(candidate).includes(normalize(s.name))
          );

          return {
            value: matchSup ? matchSup.name : candidate,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: matchSup ? 0.98 : 0.85,
            matchedSupplierId: matchSup?.id,
            matchConfidence: matchSup ? 1.0 : 0.5
          };
        }
      }
    }

    return {
      value: null,
      status: 'MISSING',
      confidence: 0
    };
  }

  private static extractBuyer(
    text: string,
    lines: string[],
    registeredBuyers: Buyer[]
  ): ExtractedField<string> & { matchedBuyerId?: string; matchConfidence?: number } {
    // 1. Direct search for registered buyers in document
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const textNorm = normalize(text);

    for (const buyer of registeredBuyers) {
      const buyerNorm = normalize(buyer.name);
      if (textNorm.includes(buyerNorm)) {
        return {
          value: buyer.name,
          rawText: buyer.name,
          status: 'EXTRACTED',
          confidence: 0.98,
          matchedBuyerId: buyer.id,
          matchConfidence: 1.0
        };
      }
    }

    // 2. Stacked section heading (e.g. Line 1: "BUYER / ENTERPRISE DEBTOR", Line 2: "GLOBAL MOTORS INDIA CORP")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isBuyerHeading = /^(?:BUYER\s*\/?\s*ENTERPRISE\s*DEBTOR|ENTERPRISE\s*DEBTOR|BUYER|BUYER\s*DETAILS|CUSTOMER|BILL\s*TO|BILLED\s*TO|SHIP\s*TO|DEBTOR|PURCHASER|CLIENT|TO)(?:\s*[:\-\#])?$/i.test(line) ||
        /\b(?:BUYER|ENTERPRISE\s*DEBTOR|BILL\s*TO|CUSTOMER)\b/i.test(line);

      if (isBuyerHeading) {
        let candidate = lines[i + 1].trim();
        // If multi-column line, take right column or full column
        if (candidate.includes('   ')) {
          const parts = candidate.split('   ').map(p => p.trim()).filter(Boolean);
          candidate = parts[parts.length - 1];
        }
        if (candidate.length > 3 && !/^(supplier|vendor|from|date|amount|total|invoice|gstin|po|currency|payment)$/i.test(candidate)) {
          const matchBuyer = registeredBuyers.find(b => 
            normalize(b.name) === normalize(candidate) ||
            normalize(b.name).includes(normalize(candidate)) || 
            normalize(candidate).includes(normalize(b.name))
          );

          return {
            value: matchBuyer ? matchBuyer.name : candidate,
            rawText: `${line} ${candidate}`,
            status: 'EXTRACTED',
            confidence: matchBuyer ? 0.98 : 0.85,
            matchedBuyerId: matchBuyer?.id,
            matchConfidence: matchBuyer ? 1.0 : 0.5
          };
        }
      }
    }

    // 3. Inline pattern (e.g. "BUYER / ENTERPRISE DEBTOR: GLOBAL MOTORS INDIA CORP")
    const buyerPatterns = [
      /(?:Buyer\s*\/?\s*Enterprise\s*Debtor|Enterprise\s*Debtor|Buyer|Customer|Bill\s*To|Billed\s*To|Ship\s*To|Debtor|Purchaser|Client)\s*[:\-\#]\s*([A-Za-z0-9\s\.,&'\-\(\)]+?)(?=\n|   |GSTIN|Invoice|Date|Amount|PO|Payment|$)/i
    ];

    for (const p of buyerPatterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const candidate = match[1].trim().split('\n')[0].trim();
        if (candidate.length > 3 && candidate.length < 80 && !/^(date|amount|invoice|supplier|vendor|from)$/i.test(candidate)) {
          const matchBuyer = registeredBuyers.find(b => 
            normalize(b.name) === normalize(candidate) ||
            normalize(b.name).includes(normalize(candidate)) || 
            normalize(candidate).includes(normalize(b.name))
          );

          return {
            value: matchBuyer ? matchBuyer.name : candidate,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: matchBuyer ? 0.98 : 0.85,
            matchedBuyerId: matchBuyer?.id,
            matchConfidence: matchBuyer ? 1.0 : 0.5
          };
        }
      }
    }

    return {
      value: null,
      status: 'MISSING',
      confidence: 0
    };
  }

  private static extractAmountAndCurrency(text: string, lines: string[]): {
    invoiceAmount: ExtractedField<number> & { amountLakhs?: number };
    currency: ExtractedField<string>;
  } {
    let detectedCurrency = 'INR';
    if (/\$|USD/i.test(text)) detectedCurrency = 'USD';
    else if (/€|EUR/i.test(text)) detectedCurrency = 'EUR';
    else if (/£|GBP/i.test(text)) detectedCurrency = 'GBP';
    else if (/₹|INR|Rs\.?|Rupees/i.test(text)) detectedCurrency = 'INR';

    const parseAmountValue = (str: string): { val: number; lakhs: number } | null => {
      // Lakhs format: "20.0 Lakhs" or "20 Lakhs" or "20 lakh"
      const lakhMatch = str.match(/([\d\.]+)\s*(?:Lakhs?|Lacs?|Lakh)/i);
      if (lakhMatch && lakhMatch[1]) {
        const lVal = parseFloat(lakhMatch[1]);
        if (!isNaN(lVal) && lVal > 0) {
          return { val: lVal * 100000, lakhs: lVal };
        }
      }

      // Currency / standard numbers: "Rs. 20,00,000", "₹20,00,000", "20,00,000 INR", "2,000,000 INR", "2000000"
      const numMatch = str.match(/(?:₹|Rs\.?|INR|\$|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:INR|USD|EUR|Rs\.?)?/i);
      if (numMatch && numMatch[1]) {
        const clean = numMatch[1].replace(/,/g, '');
        const val = parseFloat(clean);
        if (!isNaN(val) && val > 0) {
          const lakhs = val >= 10000 ? Math.round((val / 100000) * 100) / 100 : val;
          return { val, lakhs };
        }
      }
      return null;
    };

    // 1. Stacked label search (e.g. Line 1: "TOTAL INVOICE VALUE", Line 2: "Rs. 20,00,000")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isAmountHeading = /^(?:TOTAL\s*INVOICE\s*VALUE|TOTAL\s*INVOICE\s*AMOUNT|INVOICE\s*AMOUNT|TOTAL\s*AMOUNT|GRAND\s*TOTAL|TOTAL\s*PAYABLE|TOTAL\s*VALUE|FINAL\s*TOTAL|NET\s*AMOUNT|AMOUNT\s*DUE|BALANCE\s*DUE|TOTAL)(?:\s*[:\-\#])?$/i.test(line);

      if (isAmountHeading) {
        const candidate = lines[i + 1].trim();
        const parsed = parseAmountValue(candidate);
        if (parsed) {
          return {
            invoiceAmount: {
              value: parsed.val,
              amountLakhs: parsed.lakhs,
              formatted: detectedCurrency === 'INR' ? `₹${parsed.val.toLocaleString('en-IN')}` : `${detectedCurrency} ${parsed.val.toLocaleString()}`,
              rawText: `${line} ${candidate}`,
              status: 'EXTRACTED',
              confidence: 0.98
            },
            currency: {
              value: detectedCurrency,
              status: 'EXTRACTED',
              confidence: 0.98
            }
          };
        }
      }
    }

    // 2. Inline label pattern (e.g. "TOTAL INVOICE VALUE: Rs. 20,00,000" or "Total Amount: 20 Lakhs")
    const inlinePatterns = [
      /(?:Total\s*Invoice\s*Value|Total\s*Invoice\s*Amount|Invoice\s*Amount|Total\s*Amount|Grand\s*Total|Total\s*Payable|Total\s*Value|Final\s*Total|Net\s*Amount|Amount\s*Due|Balance\s*Due)\s*[:\-\#]?\s*(?:₹|Rs\.?|INR|\$|EUR)?\s*([\d\.]+)\s*(?:Lakhs?|Lacs?|Lakh)/i,
      /(?:Total\s*Invoice\s*Value|Total\s*Invoice\s*Amount|Invoice\s*Amount|Total\s*Amount|Grand\s*Total|Total\s*Payable|Total\s*Value|Final\s*Total|Net\s*Amount|Amount\s*Due|Balance\s*Due)\s*[:\-\#]?\s*(?:₹|Rs\.?|INR|\$|EUR)?\s*([\d,]+(?:\.\d{1,2})?)/i
    ];

    for (const p of inlinePatterns) {
      const match = text.match(p);
      if (match && match[0]) {
        const parsed = parseAmountValue(match[0]);
        if (parsed) {
          return {
            invoiceAmount: {
              value: parsed.val,
              amountLakhs: parsed.lakhs,
              formatted: detectedCurrency === 'INR' ? `₹${parsed.val.toLocaleString('en-IN')}` : `${detectedCurrency} ${parsed.val.toLocaleString()}`,
              rawText: match[0],
              status: 'EXTRACTED',
              confidence: 0.95
            },
            currency: {
              value: detectedCurrency,
              status: 'EXTRACTED',
              confidence: 0.95
            }
          };
        }
      }
    }

    return {
      invoiceAmount: {
        value: null,
        status: 'MISSING',
        confidence: 0
      },
      currency: {
        value: detectedCurrency,
        status: 'EXTRACTED',
        confidence: 0.70
      }
    };
  }

  private static parseDateString(dateStr: string): { iso: string; formatted: string } | null {
    try {
      const clean = dateStr.trim().replace(/[\,\.]/g, ' ');
      const monthsMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        january: '01', february: '02', march: '03', april: '04', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };

      // Check DD-MMM-YYYY (e.g. 17-Aug-2026 or 17 Aug 2026 or 16-Oct-2026)
      const dMonthYMatch = clean.match(/^(\d{1,2})[-\s\/]([A-Za-z]{3,9})[-\s\/](\d{2,4})$/);
      if (dMonthYMatch) {
        const day = parseInt(dMonthYMatch[1]);
        const mKey = dMonthYMatch[2].toLowerCase();
        let year = parseInt(dMonthYMatch[3]);
        if (year < 100) year += 2000;
        const monthNum = monthsMap[mKey] || monthsMap[mKey.substring(0, 3)] || '01';
        const dayStr = String(day).padStart(2, '0');
        const formatted = `${dayStr}-${dMonthYMatch[2].substring(0, 3)}-${year}`;
        return {
          iso: `${year}-${monthNum}-${dayStr}`,
          formatted
        };
      }

      // Check YYYY-MM-DD or DD/MM/YYYY
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = d.getFullYear();
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        return {
          iso: `${year}-${monthNum}-${dayNum}`,
          formatted: `${dayNum}-${months[d.getMonth()]}-${year}`
        };
      }
    } catch (_) {}
    return null;
  }

  private static extractInvoiceDate(text: string, lines: string[]): ExtractedField<string> {
    // 1. Stacked label search (e.g. Line 1: "Invoice Date", Line 2: "17-Aug-2026")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isDateLabel = /^(?:Invoice\s*Date|Bill\s*Date|Dated|Issue\s*Date|Date\s*of\s*Issue|Date)(?:\s*[:\-\#])?$/i.test(line);

      if (isDateLabel) {
        const candidate = lines[i + 1].trim();
        const parsed = this.parseDateString(candidate);
        if (parsed) {
          return {
            value: parsed.iso,
            formatted: parsed.formatted,
            rawText: `${line} ${candidate}`,
            status: 'EXTRACTED',
            confidence: 0.98
          };
        }
      }
    }

    // 2. Inline label search
    const patterns = [
      /(?:Invoice\s*Date|Bill\s*Date|Dated|Issue\s*Date|Date\s*of\s*Issue|Date)\s*[:\-\#]?\s*([0-9]{1,2}[-\/\.\s][A-Za-z]{3,9}[-\/\.\s][0-9]{2,4}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{4}[-\/\.][0-9]{1,2}[-\/\.][0-9]{1,2})/i
    ];

    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const parsed = this.parseDateString(match[1]);
        if (parsed) {
          return {
            value: parsed.iso,
            formatted: parsed.formatted,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: 0.90
          };
        }
      }
    }

    return {
      value: null,
      status: 'MISSING',
      confidence: 0
    };
  }

  private static extractDueDate(text: string, lines: string[]): ExtractedField<string> {
    // 1. Stacked label search (e.g. Line 1: "Due Date" or "Payment Due", Line 2: "16-Oct-2026")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isDueDateLabel = /^(?:Due\s*Date|Payment\s*Due\s*Date|Payment\s*Due|Valid\s*Until|Maturity\s*Date|Pay\s*By)(?:\s*[:\-\#])?$/i.test(line);

      if (isDueDateLabel) {
        const candidate = lines[i + 1].trim();
        const parsed = this.parseDateString(candidate);
        if (parsed) {
          return {
            value: parsed.iso,
            formatted: parsed.formatted,
            rawText: `${line} ${candidate}`,
            status: 'EXTRACTED',
            confidence: 0.98
          };
        }
      }
    }

    // 2. Inline label search
    const patterns = [
      /(?:Due\s*Date|Payment\s*Due\s*Date|Payment\s*Due|Valid\s*Until|Maturity\s*Date|Pay\s*By)\s*[:\-\#]?\s*([0-9]{1,2}[-\/\.\s][A-Za-z]{3,9}[-\/\.\s][0-9]{2,4}|[0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{4}[-\/\.][0-9]{1,2}[-\/\.][0-9]{1,2})/i
    ];

    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        const parsed = this.parseDateString(match[1]);
        if (parsed) {
          return {
            value: parsed.iso,
            formatted: parsed.formatted,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: 0.90
          };
        }
      }
    }

    return {
      value: null,
      status: 'MISSING',
      confidence: 0
    };
  }

  private static extractTermsAndTenor(
    text: string,
    lines: string[],
    invoiceDateIso?: string | null,
    dueDateIso?: string | null
  ): {
    paymentTerms: ExtractedField<string>;
    tenorDays: ExtractedField<number>;
  } {
    // 1. Stacked label search (e.g. Line 1: "Payment Terms", Line 2: "Net 60")
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const isTermsLabel = /^(?:Payment\s*Terms|Credit\s*Terms|Terms\s*of\s*Payment|Terms|Pay\s*Terms)(?:\s*[:\-\#])?$/i.test(line);

      if (isTermsLabel) {
        const candidate = lines[i + 1].trim();
        const netMatch = candidate.match(/Net\s*(\d+)/i) || candidate.match(/(\d+)\s*Days/i);
        const days = netMatch ? parseInt(netMatch[1]) : 0;
        if (days > 0 || /^(immediate|advance|cod|upon receipt)$/i.test(candidate)) {
          return {
            paymentTerms: {
              value: candidate,
              rawText: `${line} ${candidate}`,
              status: 'EXTRACTED',
              confidence: 0.98
            },
            tenorDays: {
              value: days > 0 ? days : 1,
              status: 'EXTRACTED',
              confidence: 0.98
            }
          };
        }
      }
    }

    // 2. Check if dates provide exact tenor
    if (invoiceDateIso && dueDateIso) {
      const invDate = new Date(invoiceDateIso);
      const dueDate = new Date(dueDateIso);
      const diffMs = dueDate.getTime() - invDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 365) {
        return {
          paymentTerms: {
            value: `Net ${diffDays}`,
            status: 'EXTRACTED',
            confidence: 0.95
          },
          tenorDays: {
            value: diffDays,
            status: 'EXTRACTED',
            confidence: 0.95
          }
        };
      }
    }

    // 3. Inline label search
    const termsPattern = /(?:Payment\s*Terms|Credit\s*Terms|Terms\s*of\s*Payment|Terms)\s*[:\-\#]?\s*([^\r\n]+)/i;
    const match = text.match(termsPattern);
    if (match && match[1]) {
      const raw = match[1].trim();
      const netMatch = raw.match(/Net\s*(\d+)/i) || raw.match(/(\d+)\s*Days/i);
      const days = netMatch ? parseInt(netMatch[1]) : 0;
      if (days > 0) {
        return {
          paymentTerms: {
            value: raw,
            rawText: match[0],
            status: 'EXTRACTED',
            confidence: 0.85
          },
          tenorDays: {
            value: days,
            status: 'EXTRACTED',
            confidence: 0.85
          }
        };
      }
    }

    return {
      paymentTerms: {
        value: null,
        status: 'MISSING',
        confidence: 0
      },
      tenorDays: {
        value: null,
        status: 'MISSING',
        confidence: 0
      }
    };
  }

  private static extractPO(text: string): ExtractedField<string> {
    const poMatch = text.match(/(?:Purchase Order|PO Number|P\.O\.|PO No\.?|PO\s*#?)\s*[:\-\#]\s*([A-Z0-9\-\/]{4,25})/i);
    if (poMatch && poMatch[1]) {
      return {
        value: poMatch[1].trim(),
        rawText: poMatch[0],
        status: 'EXTRACTED',
        confidence: 0.85
      };
    }
    return { value: null, status: 'MISSING', confidence: 0 };
  }

  private static extractEWayBill(text: string): ExtractedField<string> {
    const ewbMatch = text.match(/(?:eWay\s*Bill|e-Way\s*Bill|EWB\s*No\.?|EWB)\s*[:\-\#]\s*([0-9]{10,16})/i);
    if (ewbMatch && ewbMatch[1]) {
      return {
        value: ewbMatch[1].trim(),
        rawText: ewbMatch[0],
        status: 'EXTRACTED',
        confidence: 0.85
      };
    }
    return { value: null, status: 'MISSING', confidence: 0 };
  }

  private static extractGoodsDescription(text: string): ExtractedField<string> {
    const descMatch = text.match(/(?:Description|Items|Goods Description|Product Description)\s*[:\-\#]\s*([^\r\n]+)/i);
    if (descMatch && descMatch[1]) {
      return {
        value: descMatch[1].trim(),
        rawText: descMatch[0],
        status: 'EXTRACTED',
        confidence: 0.75
      };
    }
    return { value: null, status: 'MISSING', confidence: 0 };
  }

  // --- Deterministic Verification ---

  private static verifyExtractedData(
    rawText: string,
    fields: ExtractedInvoiceData
  ): ScanVerificationResult {
    const checklist: VerificationCheckItem[] = [];
    const missingFields: string[] = [];
    const uncertainFields: string[] = [];

    // 1. File readable
    const isReadable = rawText.trim().length >= 10;
    checklist.push({
      key: 'readable',
      label: 'Invoice readable',
      passed: isReadable,
      message: isReadable ? 'Document text extracted successfully' : 'Unreadable or empty document'
    });

    // 2. Invoice number detected
    const invNumPassed = fields.invoiceNumber.status === 'EXTRACTED' && !!fields.invoiceNumber.value;
    checklist.push({
      key: 'invoiceNumber',
      label: 'Invoice number detected',
      passed: invNumPassed,
      message: invNumPassed ? `Found ${fields.invoiceNumber.value}` : 'Invoice number missing or unreadable'
    });
    if (!invNumPassed) missingFields.push('Invoice Number');

    // 3. Supplier detected
    const supPassed = fields.supplierName.status === 'EXTRACTED' && !!fields.supplierName.value;
    checklist.push({
      key: 'supplier',
      label: 'Supplier detected',
      passed: supPassed,
      message: supPassed ? `Identified ${fields.supplierName.value}` : 'Supplier name missing or uncertain'
    });
    if (!supPassed) {
      if (fields.supplierName.status === 'UNCERTAIN') uncertainFields.push('Supplier Name');
      else missingFields.push('Supplier Name');
    }

    // 4. Buyer detected
    const buyerPassed = fields.buyerName.status === 'EXTRACTED' && !!fields.buyerName.value;
    checklist.push({
      key: 'buyer',
      label: 'Buyer detected',
      passed: buyerPassed,
      message: buyerPassed ? `Identified ${fields.buyerName.value}` : 'Buyer name missing or uncertain'
    });
    if (!buyerPassed) {
      if (fields.buyerName.status === 'UNCERTAIN') uncertainFields.push('Buyer Name');
      else missingFields.push('Buyer Name');
    }

    // 5. Invoice amount detected & valid
    const amountPassed = fields.invoiceAmount.status === 'EXTRACTED' && (fields.invoiceAmount.value ?? 0) > 0;
    checklist.push({
      key: 'amount',
      label: 'Invoice amount detected',
      passed: amountPassed,
      message: amountPassed ? `Amount: ${fields.invoiceAmount.formatted || fields.invoiceAmount.value}` : 'Valid invoice amount not found'
    });
    if (!amountPassed) missingFields.push('Invoice Amount');

    // 6. Invoice date detected
    const invDatePassed = fields.invoiceDate.status === 'EXTRACTED' && !!fields.invoiceDate.value;
    checklist.push({
      key: 'invoiceDate',
      label: 'Invoice date detected',
      passed: invDatePassed,
      message: invDatePassed ? `Dated: ${fields.invoiceDate.formatted || fields.invoiceDate.value}` : 'Invoice date missing'
    });
    if (!invDatePassed) missingFields.push('Invoice Date');

    // 7. Due date / Payment terms detected
    const dueDatePassed = fields.dueDate.status === 'EXTRACTED' && !!fields.dueDate.value;
    const termsPassed = fields.paymentTerms.status === 'EXTRACTED' && !!fields.paymentTerms.value;
    const dateOrTermsPassed = dueDatePassed || termsPassed;
    checklist.push({
      key: 'dueDate',
      label: 'Due date / Tenor detected',
      passed: dateOrTermsPassed,
      message: dueDatePassed 
        ? `Due: ${fields.dueDate.formatted || fields.dueDate.value}` 
        : (termsPassed ? `Terms: ${fields.paymentTerms.value}` : 'Due date and payment terms missing')
    });
    if (!dueDatePassed && !termsPassed) {
      missingFields.push('Due Date / Payment Terms');
    }

    // Determine status:
    // Core critical fields required for any invoice claim:
    // 1. Readable
    // 2. Invoice Number
    // 3. Supplier Name
    // 4. Buyer Name (Enterprise Debtor)
    // 5. Invoice Amount (> 0)
    const hasAllCriticalFields = isReadable && invNumPassed && supPassed && buyerPassed && amountPassed;

    let status: ScanVerificationStatus = 'INCOMPLETE';
    let summary = '';

    if (!hasAllCriticalFields) {
      status = 'INCOMPLETE';
      const missingList = missingFields.join(', ');
      summary = `Invoice is incomplete. Missing required critical fields: ${missingList || 'Required invoice details'}. Please review and upload a valid invoice or enter details manually.`;
    } else if (hasAllCriticalFields && invDatePassed && (dueDatePassed || termsPassed)) {
      status = 'VERIFIED';
      summary = 'All essential invoice details successfully extracted and verified.';
    } else {
      // Critical fields are present, but dates/tenor require review
      status = 'NEEDS REVIEW';
      summary = 'Core invoice details extracted, but due date, payment terms, or issue date require manual confirmation before submitting.';
    }

    return {
      status,
      checklist,
      summary,
      missingFields,
      uncertainFields
    };
  }
}
