# 📑 ExpenseFlow: Technical Specification & Blueprint

This document serves as the comprehensive implementation guide and requirement specification for **ExpenseFlow**, a glassmorphic, AI-driven financial tracking application.

---

## 🏗️ Technical Architecture

- **Framework**: Next.js 15 (App Router, Server Actions, API Routes)
- **Database**: SQLite (Local file: `finance.db`)
- **Query Engine**: `better-sqlite3` (Synchronous, high-performance)
- **Styling**: Tailwind CSS (Glassmorphism design system)
- **Animations**: Framer Motion
- **AI Integration**: Local Ollama instance (Model: `gemma3`)
- **Charts**: Recharts (Responsive Container, Area, Bar, Pie)

---

## 💾 Core Logic & Modules

### 1. Data Ingestion & Parsing (`src/lib/parsers`)
The system must support heterogeneous data sources:
- **ICICI Bank**: Support for both PDF and XLS formats.
- **HDFC Bank**: Support for specific XLS export formats (starts at row 22).
- **Google Pay (GPay)**: PDF parsing of transaction history.
- **Deduplication Logic**: Identify duplicate transactions across files using a composite check: `(date, description, amount, bank_source)`. This prevents double-counting between bank statements and wallet apps.

### 2. Categorization Engine (`src/lib/categorizer.ts` & `src/lib/smart_categorizer.ts`)
- **Rule-Based (Primary)**: High-performance regex matching for common brands (Amazon, Swiggy, Uber, Netflix, etc.).
- **AI-Based (Fallback)**: Asynchronous processing using Ollama (`gemma3`) to infer categories for vague descriptions.
- **State Management**: Transactions are tagged as `Uncategorized` if the AI cannot determine the intent, preventing infinite retry loops.

### 3. Consumption Logic
- **"Consumption" vs "Gross"**: The system distinguishes between actual spending and wealth movement.
- **Excluded Categories**: `Transfer`, `Investment`, and `Salary` (debit) are excluded from the default "Total Spent" to show pure consumption.
- **Grand Total**: Users can toggle "Gross" mode to see total outflow including transfers.

---

## 📡 API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/sync` | `POST` | Processes files in a local directory. Returns `raw`, `parsed`, and `new` counts. |
| `/api/reset` | `POST` | Wipes `transactions` and `synced_files` tables. |
| `/api/summary` | `GET` | Aggregates stats. Supports params: `filter=ytd`, `month`, `year`, `category`, `channel`, `gross=true`. |
| `/api/transactions` | `GET` | Paginated transaction list. Supports same filters as summary. |
| `/api/insights` | `GET` | Advanced analytics: Cash Flow (Bar), Behavioral (Pie), Anomalies, and Recurring Costs. |
| `/api/months` | `GET` | Returns list of available months/years in the database for filtering. |

---

## 🎨 UI/UX Requirements

### 1. Main Dashboard
- **Glass-Card Design**: Semi-transparent backgrounds with `backdrop-blur-xl`.
- **Responsive Stats Grid**: Total Spent, Avg. Spent, Avg. Received, Top Category, Total Items.
- **Immersive Distribution**: Full-width Pie chart with an interactive category legend on the right.
- **Global Filters**: Header-based filters for Date, Category, Channel, YTD, and Gross Toggle.

### 2. Deep Insights Tab
- **Cash Flow**: Income vs. Spend bar chart comparison.
- **Behavioral Spends**: Weekend vs. Weekday distribution (Doughnut chart).
- **Anomaly Detection**: Highlight transactions where `amount > (category_average * 1.5)`.
- **Recurring Tracker**: Merchant-based grouping to identify predicted monthly bills.

### 3. Sync Configuration
- **Local Path Input**: Modal that accepts an absolute folder path and persists it to `localStorage`.
- **Ingestion Report**: Detailed success modal showing exact record counts for each file processed.

---

## 🛡️ Privacy & Security
- **Local-Only**: No data leaves the machine. AI runs locally via Ollama. Database is a local file.
- **Git Safety**: `.gitignore` must exclude `finance.db`, `Data/` folder, and `scratch/` folder.

---
*Blueprint Version: 1.0.0*
