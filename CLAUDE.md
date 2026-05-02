# CLAUDE.md — Personal Finance Dashboard

## Project Overview

A **local-first personal finance dashboard** built as a fullstack Next.js application. It syncs PDF bank statements from Google Drive, parses them, stores transactions in SQLite, and provides a dashboard with charts and a natural language chat interface powered by a local LLM (Ollama + Gemma 3).

**No data ever leaves your machine** except for the Google Drive sync. No external AI APIs are used.

---

## Data Sources

| Source | Format | Notes |
|---|---|---|
| HDFC Bank | PDF statement | Monthly |
| ICICI Bank | PDF statement | Monthly |
| Google Pay | PDF statement | Monthly |

All PDFs are uploaded monthly to a **single Google Drive folder**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, fullstack) |
| API Layer | Next.js API Routes (`/app/api/`) |
| PDF Parsing | Claude Code to decide best Node.js approach (pdf-parse, pdfjs-dist, or Python child process) |
| Database | SQLite via `better-sqlite3` |
| Chat / AI | Ollama (local) + Gemma 3 model |
| Google Drive Sync | Google Drive API v3 (service account) via `googleapis` npm package |
| Charts | Recharts |
| Styling | Tailwind CSS |

---

## Project Structure

```
finance-dashboard/
├── app/
│   ├── page.tsx                  # Dashboard page (/)
│   ├── chat/
│   │   └── page.tsx              # Chat page (/chat)
│   ├── api/
│   │   ├── transactions/
│   │   │   └── route.ts          # GET /api/transactions
│   │   ├── summary/
│   │   │   └── route.ts          # GET /api/summary
│   │   ├── chat/
│   │   │   └── route.ts          # POST /api/chat
│   │   └── sync/
│   │       └── route.ts          # POST /api/sync
│   └── layout.tsx                # Root layout with sidebar nav
├── components/
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── SummaryCards.tsx          # Total spend, top category, top bank
│   ├── CategoryDonut.tsx         # Recharts PieChart
│   ├── BankBarChart.tsx          # Recharts BarChart
│   ├── SpendLineChart.tsx        # Recharts LineChart
│   ├── TransactionsTable.tsx     # Paginated, filterable table
│   └── ChatWindow.tsx            # Chat UI component
├── lib/
│   ├── db.ts                     # SQLite connection & queries (better-sqlite3)
│   ├── categorizer.ts            # Keyword-based transaction categorizer
│   ├── chat.ts                   # Ollama/Gemma 3 integration
│   ├── gdrive.ts                 # Google Drive sync logic
│   └── parsers/
│       ├── hdfc.ts               # HDFC PDF → transactions
│       ├── icici.ts              # ICICI PDF → transactions
│       └── gpay.ts               # GPay PDF → transactions
├── statements/                   # Local folder for downloaded PDFs (gitignored)
├── finance.db                    # SQLite database file (gitignored)
├── .env.local                    # Secrets — never commit this
└── CLAUDE.md                     # This file
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
GDRIVE_FOLDER_ID=your_google_drive_folder_id_here
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./service_account.json
```

> ⚠️ No `ANTHROPIC_API_KEY` needed — chat is handled locally by Ollama.

---

## Database Schema

Using `better-sqlite3` for synchronous SQLite access.

**Table: `transactions`**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PRIMARY KEY | Auto-increment |
| date | TEXT | ISO format: YYYY-MM-DD |
| description | TEXT | Raw merchant/narration text |
| amount | REAL | Always positive |
| type | TEXT | `debit` or `credit` |
| category | TEXT | Auto-assigned (see categories) |
| bank_source | TEXT | `hdfc`, `icici`, or `gpay` |
| month | INTEGER | 1–12 |
| year | INTEGER | e.g. 2025 |
| file_name | TEXT | Source PDF filename |

**Table: `synced_files`**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PRIMARY KEY | Auto-increment |
| file_name | TEXT UNIQUE | Prevents re-processing |
| synced_at | TEXT | ISO timestamp |

---

## Transaction Categories

Assign one of the following categories based on keyword matching on the `description` field:

- **Food** — Swiggy, Zomato, restaurant, cafe, bakery
- **Transport** — Uber, Ola, metro, fuel, petrol, IRCTC
- **Shopping** — Amazon, Flipkart, Myntra, mall, store
- **Utilities** — electricity, water, gas, broadband, mobile recharge
- **Entertainment** — Netflix, Spotify, BookMyShow, theatre
- **Health** — pharmacy, hospital, clinic, doctor, Apollo
- **Transfer** — NEFT, IMPS, UPI transfer, self transfer
- **Other** — fallback for unmatched transactions

---

## API Routes

### `GET /api/transactions`
Returns filtered transactions.

Query params: `month`, `year`, `bank` (`hdfc`/`icici`/`gpay`), `category`

### `GET /api/summary`
Returns aggregated insights:
- Total spend for selected month/year
- Spend breakdown by category
- Spend breakdown by bank
- Month-over-month delta vs previous month

### `POST /api/chat`
Accepts a natural language question and returns an AI-generated answer.

**Request body:**
```json
{ "question": "How much did I spend on food last month?" }
```

**Internal flow:**
1. Query SQLite for relevant aggregates (monthly totals, category breakdown, recent transactions)
2. Build a structured context block from the results
3. Send context + question to Ollama at `http://localhost:11434/api/generate` with model `gemma3` and `stream: false`
4. Return Ollama's response

**Fail gracefully** if Ollama is not reachable — return a clear error message.

### `POST /api/sync`
Manually triggers a Google Drive sync: polls the configured folder, downloads any new PDFs to `statements/`, parses them, and inserts transactions into SQLite. Skips files already recorded in the `synced_files` table.

---

## PDF Parsers — Implementation Notes

> ⚠️ **Claude Code should choose the best PDF parsing approach** for Node.js. Options in order of preference:
> 1. `pdfjs-dist` — more accurate table extraction
> 2. `pdf-parse` — simpler, text-only extraction with regex fallback
> 3. Python child process (`pdfplumber`) — most accurate for Indian bank formats, use if pure Node options prove unreliable

Write **separate parser modules** for each source in `lib/parsers/`. Each parser must:
- Accept a file path as input
- Return a list of transaction objects matching the DB schema
- Handle edge cases: blank rows, summary rows, header rows, page breaks
- Define column names/patterns as **constants at the top of the file** for easy adjustment

### HDFC
- Table columns: Date, Narration, Chq/Ref No., Value Date, Withdrawal Amt, Deposit Amt, Closing Balance
- Withdrawal Amt → `debit`, Deposit Amt → `credit`
- Date format: `DD/MM/YY`

### ICICI
- Use column header detection, not fixed positions (layout varies)
- Watch for multi-line narrations spanning rows
- Date format: `DD-MM-YYYY`

### GPay
- Less structured — use regex fallback if table extraction fails
- Look for patterns: date, merchant name, amount with ₹ symbol, status (Paid/Received)

---

## Google Drive Sync — Implementation Notes

- Use the `googleapis` npm package with a **service account** (not OAuth) for unattended access
- Trigger sync manually via `POST /api/sync` (button in the UI — no background polling needed)
- Track already-downloaded files in the `synced_files` DB table to avoid re-processing
- Download PDFs to the local `statements/` folder before parsing

### One-time Setup Steps
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → enable **Google Drive API**
3. Create a **Service Account** → download JSON key → save as `service_account.json`
4. Share your Drive folder with the service account email (Viewer access)
5. Copy the folder ID from the Drive URL into `.env.local`

---

## Frontend Pages

### Dashboard (`/`)
- **Summary cards:** Total spend this month, biggest category, most active bank
- **Donut chart:** Spend by category (Recharts PieChart)
- **Bar chart:** Spend by bank per month (Recharts BarChart)
- **Line chart:** Month-over-month total spend trend (Recharts LineChart)
- **Transactions table:** Paginated, filterable by month/year/bank/category

### Chat (`/chat`)
- Message input at bottom, conversation thread above
- Each question hits `POST /api/chat`, displays the response
- Show a loading indicator while waiting for Ollama response
- Display a warning banner if Ollama is unreachable

### Navigation
- Sidebar (via `layout.tsx`) with links to Dashboard and Chat
- **Sync Now** button that calls `POST /api/sync` and shows last sync time

---

## Build Order

Build in this sequence to validate data before layering UI on top:

1. **DB setup** — `lib/db.ts`, create tables, verify with a test insert
2. **Parsers** — `lib/parsers/hdfc.ts`, `icici.ts`, `gpay.ts` — test against real sample PDFs
3. **Categorizer** — `lib/categorizer.ts` — keyword matching logic
4. **Google Drive sync** — `lib/gdrive.ts` + `POST /api/sync`
5. **API routes** — `/api/transactions`, `/api/summary`
6. **Ollama chat** — `lib/chat.ts` + `POST /api/chat`
7. **React frontend** — Dashboard first, then Chat page

---

## Key Constraints

- **No external AI API calls** — all LLM inference via Ollama locally
- **No cloud database** — SQLite only (`better-sqlite3`), stored locally
- **Ollama prerequisite** — `/api/chat` must check Ollama availability and return a clear error if not running
- **Sensitive files** — `statements/`, `service_account.json`, `.env.local`, `finance.db` must all be in `.gitignore`
- **Single repo** — no separate backend server; everything lives in Next.js

---

## Ollama Setup (Prerequisite)

```bash
# 1. Install Ollama from https://ollama.com
# 2. Pull the Gemma 3 model
ollama pull gemma3

# 3. Verify it's running
curl http://localhost:11434/api/generate -d '{
  "model": "gemma3",
  "prompt": "Hello",
  "stream": false
}'
```

Ollama must be running before using the chat feature.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.
