# ASRTEX Textile POS Application

A modern, high-speed retail Point of Sale, multi-attribute apparel inventory, and business management application purpose-built for textile, garment, and readymade retail stores.

---

## 🌟 Key Features

1. **Separation of Master Products & Variants**:
   - Master style details (Item Code, Brand, Category, Tax rate).
   - Variant Matrix: Garment Size $\times$ Color combinations with unique Code-128 barcodes and isolated stock levels.
2. **Sub-150ms POS Fast Billing & Auto-Discounts**:
   - USB Barcode Scanner Wedge auto-listener (scans directly without requiring click/focus).
   - Item-level default discount engine: Automatically applies promotional markdown upon barcode scan.
   - Live Total MRP and Total Customer Savings badges displayed dynamically in the billing cart.
   - Keyboard-first controls: `F1` (Barcode), `F2` (Item Search), `F8` (Payment method toggle), `F9` (Checkout & Print).
   - Multi-payment support: Cash, Card, UPI / GPay, and Split Payments.
   - Atomic stock decrement upon invoice generation.
3. **Bulk CSV Garment & Category Import**:
   - One-click "Download Sample CSV" (`textile_items_sample.csv`).
   - Drag-and-drop CSV importer with live error validation and preview table.
   - Auto-creates missing categories/brands, upserts styles, generates barcodes for blank rows, and records opening stock audit entries.
4. **Audit-Grade Financial Integrity**:
   - Frozen Cost Price snapshot (`costPriceSnapshot`) at time of sale.
   - P&L Computation: $\text{Gross Profit} = \text{Net Sales} - \text{COGS}$, $\text{Net Operating Profit} = \text{Gross Profit} - \text{Expenses}$.
   - Immutable invoices: Completed bills cannot be quietly edited. Corrections are handled via documented Returns or authorized Cancellations with restock audit trails.
5. **Purchase Inward Entry**:
   - Record supplier bills, line items, and received quantities.
   - Automatically increments current stock and updates supplier purchase ledger.
6. **Physical Stock Adjustments**:
   - Dedicated workflow for soiled garments, try-room damage, and physical audit discrepancies.
7. **Dual Hardware Printer Configurations & Savings Banner**:
   - **Billing Receipt Printer**: Formatted for 58mm and 80mm continuous thermal paper rolls.
   - **Customer Savings Psychology**: Displays Item MRP, Total MRP Value, Subtotal, and highlighted banner: `🎉 YOU SAVED A TOTAL OF ₹XXX.00! 🎉` (toggleable in Settings).
   - **Barcode Label Printer**: Prints garment stickers (50mm $\times$ 25mm) with store name, barcode, size, color, MRP, and selling price.
8. **Automated Daily Backups**:
   - Automated PowerShell script calling `pg_dump` with a 30-day retention policy.

---

## 📁 Project Structure

```
c:\ASRTEX\Software\POS-ASR\
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Complete PostgreSQL schema
│   │   └── seed.ts               # Sample textile products, categories & users
│   ├── src/
│   │   ├── config/               # Prisma client connection
│   │   ├── middleware/           # JWT auth & Role protection
│   │   ├── modules/
│   │   │   ├── auth/             # Login & auto-role resolution
│   │   │   ├── employees/        # Employee CRUD & access control
│   │   │   ├── categories/       # Category tree & apparel brands
│   │   │   ├── products/         # Master garments & variant matrix
│   │   │   ├── purchases/        # Inward stock & supplier management
│   │   │   ├── sales/            # POS checkout, returns & cancellations
│   │   │   ├── inventory/        # Stock overview, movements & audits
│   │   │   ├── expenses/         # Store overheads & expense categories
│   │   │   ├── reports/          # P&L, sales breakdowns & best sellers
│   │   │   └── settings/         # Store info & dual printer config
│   │   ├── app.ts                # Express application router
│   │   └── server.ts             # Server entrypoint
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # 58mm/80mm Thermal Receipt & Barcode Tag modals
│   │   │   └── layout/           # AppLayout & navigation sidebar
│   │   ├── context/              # AuthContext & user role state
│   │   ├── hooks/                # useBarcodeScanner (zero-latency keyboard wedge)
│   │   ├── pages/                # POS, Dashboard, Products, Purchases, Orders, Inventory, Reports, Settings
│   │   ├── services/             # Axios API client with bearer token
│   │   ├── types/                # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── scripts/
│   └── backup.ps1                # Automated daily PostgreSQL backup
├── start-pos.bat                 # One-click Windows store launch script
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Database Configuration
Ensure PostgreSQL 18 is running locally. Set your database credentials in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=asrtex_super_secret_jwt_key_2026_textile_pos
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/asrtex_pos?schema=public
```

### 2. Backend Setup
```powershell
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

The application will be live at `http://localhost:3000`.

### 4. Default Seeded Accounts
- **Administrator**: `admin` / `admin123` (Full access to all settings, purchases, margins, P&L reports, employee management)
- **Salesperson**: `sales` / `sales123` (Fast POS billing, customer creation, order history view, reprint bills)
