# MoneyOS (₹ INR) — Personal Finance Web App & PWA

MoneyOS is a full-featured, mobile-first, installable PWA for personal finance management in India, built using **Next.js 14, TypeScript, Prisma ORM, and the IBM Carbon Design System**.

---

## 4 Modules Overview

### 1. ⚡ Expense Tracker (`/`, `/transactions`)
- **Fast Quick-Add**:
  - **Natural Language Parsing**: Type e.g., `"450 swiggy dinner hdfc"`, `"₹1,200 groceries icici"`, or `"transfer 5000 hdfc to icici"`.
  - **Voice Input**: Web Speech API real-time voice capture.
  - **Bill OCR**: Scan receipts and invoices to automatically parse totals and vendor names.
- **Visual Dashboard**: 6-month cashflow trend bar charts, category spending progress bars, monthly budget limit alerts, and recent transactions.
- **Transaction Ledger**: Search and filter by Type, Category, and Account with delete/undo support.

### 2. 💼 Monthly Salary Planner (`/salary-planner`)
- Split take-home salary into purposes (Rent, Emergency Fund, Mutual Funds, Savings, etc.).
- Step-by-step checklist with target bank account mapping.
- Live running balance column showing funds remaining after each row.
- **"Clone Last Month"** button to copy previous month's structure in 1 click.

### 3. 📈 Investments & Goals (`/investments`)
- Portfolio tracker across Mutual Funds, Direct Stocks, FDs, Gold (SGB), EPF/PPF, NPS, Real Estate, and Crypto.
- **Financial Goals & Loan Calculator**:
  - Down payment calculation.
  - Monthly reducing balance EMI calculation.
  - Monthly SIP / savings required to reach goal by target date with linked holdings progress.
- **Investment Wishlist**: Buy triggers, priority tags, and investment rationales.

### 4. 👥 Family IPO Tracker (`/ipo-tracker`)
- **Multi-Person Family Bidding Matrix**: Apply for IPOs (e.g. Swiggy Ltd, Tata Tech) across multiple family members in a single click.
- **Allotment & Refund Tracking**: Toggle Allotted vs Not Allotted and monitor pending refunds.
- **Sell Execution & P&L Calculator**: Real-time gain/loss calculation on listing/sell price.
- **Family Fund Ledger**: Tracks money received from family members vs money used in IPOs vs profits distributed.

---

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup (Prisma)**:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed # Seeds demo accounts, categories, and transactions
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Default Demo Credentials**:
   - Email: `demo@moneyos.in`
   - Password: `moneyos123`
