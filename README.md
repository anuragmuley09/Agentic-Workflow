# BudgetBuddy: Agentic AI-Powered Financial Co-Pilot

BudgetBuddy is a privacy-first, local agentic budgeting application that bridges the personal finance action gap. Instead of simple passive reporting dashboards, BudgetBuddy leverages a collaborative network of specialized agents running on a local Large Language Model (LLM) to extract transactions, semantically categorize expenses, track goal variance, analyze anomalies, and suggest actionable recommendations.

---

## Architecture & Component Overview

BudgetBuddy is divided into three primary components:

### 1. Frontend: Modern Next.js Dashboard (`/frontend`)
A state-of-the-art Next.js + React client styled in a premium dark-navy theme. Features:
* **Interactive Overview**: Real-time cashflow metrics (Total Income, Total Expenses, Net Savings), credit/debit breakdowns, category distribution charts (Recharts), and system anomalies.
* **Smart Budget Goals**: Displays saving trajectories and expense ceilings. Includes **expandable AI Insights panels**, **inline progress/contribution forms**, and **quick contribution action chips** (+₹500, +₹1,000, +₹5,000).
* **Advisor Chat Logs**: An interactive chat window with **persistent chat logs** synced via `localStorage`. Start new chat logs, rename logs, delete conversations, and switch sessions seamlessly.
* **Statement Upload**: Drag-and-drop ingestion interface supporting CSV and PDF parsing.
* **Developer Webhook Simulator**: Sidebar slide-out panel to trigger Plaid transaction event simulations.

### 2. Backend: FastAPI & LangGraph Workflows (`/src`)
A FastAPI server orchestrating a multi-agent pipeline using **LangGraph**:
* **Statement Ingestion**: Auto-detects and inserts budget goals early in graph executions.
* **Semantic Category Classifier**: Uses local Ollama LLM to classify raw descriptions into categories (Utilities, Entertainment, Shopping, etc.) without rigid keyword matches.
* **Goal Variance Tracker**: Evaluates savings/expense pacing against target limits.
* **Alert Trigger**: Auto-detects overspending anomalies and duplicate charges.
* **Planner Core**: Cognitive node that synthesizes logs, metrics, and alerts to generate explainable recommendations.

### 3. Asynchronous Tasks: Celery & Redis (`/src/tasks`)
Asynchronous background task workers to handle statement parsing, periodic calculations, and weekly/monthly PDF financial plan generations.

---

## Installation & Setup Guide

Ensure you have **Docker**, **Node.js (v18+)**, and **Python 3.10+** installed on your system.

### Step 1: Clone the Repository & Configure Databases
1. Spin up the PostgreSQL database (pre-configured with `pgvector`) and Redis broker:
   ```bash
   docker-compose up -d
   ```

### Step 2: Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\activate

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run Alembic database migrations:
   ```bash
   alembic upgrade head
   ```
4. Start Ollama and pull local models:
   ```bash
   # Ensure Ollama daemon is running
   ollama pull llama3.1:8b
   ollama pull nomic-embed-text
   ```
5. Launch the FastAPI server:
   ```bash
   cd src
   uvicorn main:app --reload
   ```
   *The backend documentation is now available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### Step 3: Celery Workers (Optional - Background Ingests)
1. In a separate terminal shell (with virtual env active), run the Celery worker process:
   ```bash
   cd src
   celery -A core.celery_app worker --loglevel=info
   ```

### Step 4: Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Boot the Next.js development client:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view the client app.

---

## Verification & Plaid Webhook Simulation

To test the end-to-end real-time agent execution cycle:
1. Open the dashboard client on the **Overview Dashboard** or **Budget Goals** page.
2. Open the **Plaid Webhook Simulator** panel in the right sidebar.
3. Input a transaction description, amount, category, and direction (Credit/Debit), then click **Trigger Simulated Webhook**.
4. The backend multi-agent pipeline will execute instantly, updating your charts, generating nudges, and triggering budget alert warnings if target limits are exceeded.
