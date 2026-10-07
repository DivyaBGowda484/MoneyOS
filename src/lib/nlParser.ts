/**
 * Natural Language Fast Parser for quick transactions.
 * Example inputs:
 *  "450 swiggy dinner hdfc"
 *  "₹1200 groceries icici"
 *  "income 85000 salary to hdfc"
 *  "transfer 5000 hdfc to icici"
 *  "300 uber cab"
 *  "coffee 180"
 */

export interface ParsedTransaction {
  amount: number | null;
  description: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  categoryHint: string | null;
  accountHint: string | null;
  toAccountHint: string | null;
  rawText: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'dinner', 'lunch', 'breakfast', 'pizza', 'burger', 'cafe', 'coffee', 'chai', 'tea', 'restaurant', 'mcdonalds', 'kfc', 'starbucks', 'biryani', 'snack', 'food'],
  'Groceries': ['groceries', 'grocery', 'blinkit', 'zepto', 'instamart', 'bigbasket', 'vegetables', 'fruits', 'milk', 'supermarket', 'ration', 'dmart'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'shopping', 'mall', 'zara', 'h&m'],
  'Travel & Commute': ['uber', 'ola', 'auto', 'metro', 'petrol', 'fuel', 'diesel', 'flight', 'irctc', 'train', 'bus', 'cab', 'rapido', 'toll', 'parking'],
  'Bills & Utilities': ['electricity', 'wifi', 'broadband', 'water', 'gas', 'lpg', 'mobile', 'recharge', 'airtel', 'jio', 'bill', 'maintenance'],
  'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'pvr', 'hotstar', 'prime', 'game', 'concert', 'outing', 'pub'],
  'Health & Medical': ['medicine', 'doctor', 'hospital', 'pharmacy', 'apollo', '1mg', 'gym', 'health', 'clinic'],
  'Rent & Housing': ['rent', 'maid', 'cook', 'society', 'deposit'],
  'Salary & Income': ['salary', 'freelance', 'dividend', 'bonus', 'cashback', 'interest', 'stipend'],
  'Investments': ['sip', 'mutual fund', 'zerodha', 'groww', 'stocks', 'crypto', 'gold', 'nps', 'ppf'],
};

const KNOWN_ACCOUNTS = [
  'slice', 'canara', 'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb',
  'paytm', 'gpay', 'phonepe', 'cred', 'cash'
];

export function parseNaturalLanguageInput(input: string): ParsedTransaction {
  const rawText = input.trim();
  if (!rawText) {
    return {
      amount: null,
      description: '',
      type: 'EXPENSE',
      categoryHint: null,
      accountHint: null,
      toAccountHint: null,
      rawText: '',
    };
  }

  let text = rawText.toLowerCase();

  // 1. Detect Type
  let type: 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE';
  if (text.includes('transfer') || text.includes('sent to') || text.includes(' moved to ')) {
    type = 'TRANSFER';
  } else if (text.includes('income') || text.includes('received') || text.includes('salary') || text.includes('credited')) {
    type = 'INCOME';
  }

  // 2. Extract Amount
  // Matches "450", "₹450", "450.50", "rs. 450", "rs 450", "450rs", "450/-"
  const amountRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rs|inr|\/-)?/i;
  const amountMatch = text.match(amountRegex);
  let amount: number | null = null;
  
  if (amountMatch && amountMatch[1]) {
    const cleanNumber = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(cleanNumber);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
      // remove the matched amount from working text for cleaner description parsing
      text = text.replace(amountMatch[0], ' ');
    }
  }

  // 3. Extract Accounts
  let accountHint: string | null = null;
  let toAccountHint: string | null = null;

  if (type === 'TRANSFER') {
    // Check for "X to Y"
    const transferMatch = text.match(/([a-z]+)\s+to\s+([a-z]+)/i);
    if (transferMatch) {
      accountHint = transferMatch[1];
      toAccountHint = transferMatch[2];
      text = text.replace(transferMatch[0], ' ');
    }
  }

  if (!accountHint) {
    for (const acc of KNOWN_ACCOUNTS) {
      const accRegex = new RegExp(`\\b${acc}\\b`, 'i');
      if (accRegex.test(text)) {
        accountHint = acc.toUpperCase();
        text = text.replace(accRegex, ' ');
        break;
      }
    }
  }

  // 4. Detect Category
  let categoryHint: string | null = null;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      if (kwRegex.test(text) || kwRegex.test(rawText.toLowerCase())) {
        categoryHint = category;
        break;
      }
    }
    if (categoryHint) break;
  }

  // 5. Build Description
  // Clean up words like "paid", "for", "from", "to", "via", "on" if dangling
  let description = rawText
    .replace(/(?:₹|rs\.?|inr)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\/-)?/gi, '')
    .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\b/g, '')
    .trim();

  if (accountHint) {
    description = description.replace(new RegExp(`\\b${accountHint}\\b`, 'gi'), '').trim();
  }
  if (toAccountHint) {
    description = description.replace(new RegExp(`\\b${toAccountHint}\\b`, 'gi'), '').trim();
  }

  // Remove common filler words
  description = description
    .replace(/\b(paid|spent|received|transferred|via|using|from|for|in|at)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) {
    description = categoryHint || (type === 'EXPENSE' ? 'Expense' : type === 'INCOME' ? 'Income' : 'Transfer');
  } else {
    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    amount,
    description,
    type,
    categoryHint,
    accountHint,
    toAccountHint,
    rawText,
  };
}
