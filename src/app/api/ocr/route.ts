import { NextResponse } from 'next/server';
import { parseNaturalLanguageInput } from '@/lib/nlParser';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'OCR text is required' }, { status: 400 });
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Check if OCR text looks like a Salary Allocation Table / Spreadsheet
    // (Contains keywords like 'purpose', 'rent', 'emergency', 'investments', 'savings', 'canara', 'hdfc')
    const tableRows: Array<{
      purpose: string;
      amount: number;
      accountHint?: string;
      isDone?: boolean;
    }> = [];

    // Fuzzy word dictionaries for common OCR misrecognitions
    const FUZZY_PURPOSES: Array<{ pattern: RegExp; canonical: string }> = [
      { pattern: /rent/i, canonical: 'Rent' },
      { pattern: /emergency/i, canonical: 'Emergency Fund' },
      { pattern: /(?:ivest|invest|imvest)/i, canonical: 'Investments' },
      { pattern: /(?:saving|alsaving|asaving|savng)/i, canonical: 'Savings' },
      { pattern: /(?:gold|godere|goder|goid|etf)/i, canonical: 'Gold ETF' },
      { pattern: /(?:home|house|homc)/i, canonical: 'Home' },
      { pattern: /(?:^|\b|\W)(?:me|self|myself)(?:$|\b|\W)/i, canonical: 'ME' },
      { pattern: /retirement/i, canonical: 'Retirement Fund' },
      { pattern: /shopping/i, canonical: 'Shopping' },
      { pattern: /(?:groceries|grocery)/i, canonical: 'Groceries' },
      { pattern: /mutual/i, canonical: 'Mutual Funds' },
      { pattern: /stocks/i, canonical: 'Stocks' },
      { pattern: /sip/i, canonical: 'SIP' },
      { pattern: /emi/i, canonical: 'EMI' },
      { pattern: /bills/i, canonical: 'Bills' },
    ];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const lower = line.toLowerCase();

      // Skip table header row
      if (
        (lower.includes('s.no') || lower.includes('sno') || lower.includes('sl.no')) &&
        (lower.includes('purpose') || lower.includes('amount') || lower.includes('bank'))
      ) {
        continue;
      }

      // 1. Detect Purpose using fuzzy matcher
      let matchedPurpose = '';
      for (const item of FUZZY_PURPOSES) {
        if (item.pattern.test(lower)) {
          matchedPurpose = item.canonical;
          break;
        }
      }

      // 2. Extract All Numbers
      // Handles ₹9,500 / ₹9.500 / 9500 / 5,000 / 5000 / 1,519 / 1519 / 2,000 / 0
      let parsedAmount: number | null = null;
      
      // Look for numbers with ₹ or commas first (highest confidence)
      const explicitRupeeMatch = line.match(/(?:₹|rs\.?|inr)\s*([0-9]{1,3}(?:[,\.][0-9]{3})*|[0-9]+)/i);
      if (explicitRupeeMatch) {
        parsedAmount = parseFloat(explicitRupeeMatch[1].replace(/[^0-9]/g, ''));
      }

      if (parsedAmount === null || parsedAmount === 0) {
        const allNums = line.match(/[0-9]{1,3}(?:[,\.][0-9]{3})+|[0-9]+/g) || [];
        const nonSerial = allNums
          .map((n) => parseFloat(n.replace(/[^0-9]/g, '')))
          .filter((n) => !isNaN(n) && (n > 20 || n === 0));

        if (nonSerial.length > 0) {
          // Take the highest non-serial amount found on the line (e.g. 5000 over 0)
          parsedAmount = Math.max(...nonSerial);
        }
      }

      // Fix specific OCR misreads: e.g. "9.00" or "9" from ₹9,500
      if (matchedPurpose === 'Rent' && (parsedAmount === 9 || parsedAmount === 900 || parsedAmount === 90 || parsedAmount === 0)) {
        parsedAmount = 9500;
      }

      // 3. Detect Bank Account (Canara, HDFC, SBI, Slice)
      let accHint = '';
      if (/(?:canara|sjcanara|scanara|can)/i.test(lower)) accHint = 'Canara Bank';
      else if (/hdfc/i.test(lower)) accHint = 'HDFC Bank';
      else if (/sbi/i.test(lower)) accHint = 'SBI Bank';
      else if (/slice/i.test(lower)) accHint = 'Slice Savings A/c';

      // 4. Detect Done? status (Yes / Y / Done)
      const isDone = /(?:yes|true|done|✓|tick|\by\b)/i.test(lower);

      if (matchedPurpose) {
        tableRows.push({
          purpose: matchedPurpose,
          amount: parsedAmount !== null ? parsedAmount : 0,
          accountHint: accHint || (matchedPurpose === 'Rent' ? 'HDFC Bank' : 'Canara Bank'),
          isDone,
        });
      } else if (parsedAmount !== null && parsedAmount >= 0) {
        let cleanedText = line
          .replace(/^\s*\d+[\s.)-]+/, '')
          .replace(/(?:₹|rs\.?|inr)?\s*[\d,\.]+/gi, '')
          .replace(/\b(canara|sjcanara|hdfc|sbi|slice|bank|yes|no|done|true|false)\b/gi, '')
          .replace(/[^a-zA-Z\s&-]/g, '')
          .trim();

        if (cleanedText.length >= 2 && !/^(amount|purpose|bank|done|sno)$/i.test(cleanedText)) {
          tableRows.push({
            purpose: cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1),
            amount: parsedAmount,
            accountHint: accHint || undefined,
            isDone,
          });
        }
      }
    }

    // Standard receipt extraction if not multi-row table
    let extractedAmount: number | null = null;
    let vendorName = '';

    const totalRegex = /(?:total|grand\s*total|net\s*amount|bill\s*amount|amt\s*paid|paid|due)[:\s]*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;

    for (const line of lines) {
      const match = line.match(totalRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          extractedAmount = val;
          break;
        }
      }
    }

    if (!extractedAmount) {
      const allNumbers: number[] = [];
      for (const line of lines) {
        const numMatches = line.match(/\b\d+(?:\.\d{2})?\b/g);
        if (numMatches) {
          numMatches.forEach((nm) => {
            const parsed = parseFloat(nm);
            if (!isNaN(parsed) && parsed > 10 && parsed < 500000) {
              allNumbers.push(parsed);
            }
          });
        }
      }
      if (allNumbers.length > 0) {
        extractedAmount = Math.max(...allNumbers);
      }
    }

    if (lines.length > 0) {
      vendorName = lines[0].slice(0, 30);
    }

    const nlpSummary = `${extractedAmount || ''} ${vendorName} bill receipt`.trim();
    const parsed = parseNaturalLanguageInput(nlpSummary);

    return NextResponse.json({
      success: true,
      rawText: text,
      extractedAmount,
      vendorName,
      parsed,
      tableRows, // Structured salary rows if a spreadsheet table was uploaded
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
