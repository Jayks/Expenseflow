# 🌌 ExpenseFlow: Modern Financial Insights

ExpenseFlow is a premium, glassmorphic financial dashboard designed to transform raw bank statements into actionable intelligence. It combines high-performance SQLite data processing with local AI (Ollama) to provide a private, beautiful, and automated expense tracking experience.

![Dashboard Mockup](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070)

## ✨ Key Features

### 📊 Interactive Dashboard
- **Glassmorphic UI**: A stunning, modern design with vibrant gradients and smooth micro-animations.
- **Dynamic Filtering**: Filter by Date (Monthly/YTD), Bank Channel (ICICI, HDFC, GPay), or Category with real-time updates.
- **Spending Distribution**: Interactive Pie Charts that act as a navigation menu to drill down into specific expense types.

### 🧠 Intelligent Categorization
- **Dual-Engine Logic**: Uses a prioritized rule-based engine for high-fidelity brand matching (e.g., Cred, Netflix, LinkedIn) combined with a local LLM fallback.
- **Local AI (Ollama)**: Automatically classifies unknown transactions using a locally running `gemma3` model—ensuring your financial data never leaves your machine.
- **Background Processing**: Large sync operations run AI categorization in the background to keep the UI snappy.

### 📈 Deep Insights Hub
- **Cash Flow Analysis**: Month-over-month Income vs. Spend tracking with automated Savings Rate calculation.
- **Behavioral Patterns**: Weekend vs. Weekday spending breakdowns to identify lifestyle habits.
- **Automated Fixed Costs**: Automatically detects recurring subscriptions and predicted monthly bills.
- **Sensitive Anomaly Detection**: Flags unusual spending spikes (>1.5x category average) to help detect fraud or overspending.

### 🏦 Multi-Bank Support
- **Cross-Platform Parsing**: Native support for ICICI Bank statements, HDFC Excel exports, and Google Pay (GPay) transaction history.
- **Smart Deduplication**: Advanced logic to identify and merge duplicate entries across different bank statements based on time, description, and amount.
- **Custom Sync Paths**: Pick any folder on your computer to sync from; the app remembers your last used location.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Database**: [SQLite](https://www.sqlite.org/) with [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
- **AI Engine**: [Ollama](https://ollama.com/) (running `gemma3`)
- **Visuals**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- [Ollama](https://ollama.com/) installed and running locally.
- Pull the categorization model: `ollama pull gemma3`

### 2. Installation
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Setup
- Open [http://localhost:3000](http://localhost:3000)
- Click **"Sync Data"** and paste the absolute path to your folder containing bank statements.
- Click **"Start Sync"** and watch your data transform!

---

## 📂 Project Structure

- `/src/app/api`: Backend endpoints for summary, transactions, and AI insights.
- `/src/lib/parsers`: Custom logic for reading various bank formats (PDF/XLS).
- `/src/lib/categorizer.ts`: The primary categorization engine.
- `/src/lib/smart_categorizer.ts`: Bridge to the local Ollama LLM.
- `/finance.db`: Local SQLite database (Auto-generated).

---

## 🔒 Privacy First
ExpenseFlow is built with a **Privacy-First** philosophy. Your financial statements are processed entirely on your local machine. No data is uploaded to the cloud, and the AI categorization uses a local model, keeping your sensitive information 100% private.

---
*Created with ❤️ for modern financial management.*
