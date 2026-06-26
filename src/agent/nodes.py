import re
import json
from datetime import datetime
from sqlalchemy import select, text
from core.llm import get_llm
from agent.state import AgentFinancialState
from db.models import Transaction, BudgetGoal, ExpenseAlert, FinancialPlan
from agent.tools.financial_tools import ToolSessionLocal
from langchain_core.messages import SystemMessage, AIMessage

llm = get_llm()

async def memory_injection_node(state: AgentFinancialState):
    """Injects historical memory context into the state."""
    return {"retrieved_context": state.get("retrieved_context", [])}

async def extractor_agent_node(state: AgentFinancialState):
    """Loads all transaction records from the PostgreSQL database for the current user."""
    user_id = state.get("user_id")
    messages = state.get("messages", [])
    
    # Check for goal creation request in the last human message
    last_human_msg = None
    for msg in reversed(messages):
        if msg.type == "human":
            last_human_msg = msg.content
            break
            
    if last_human_msg:
        goal_name = None
        target_amount_str = None
        
        # 1. Match frontend pattern: Create a budget goal named '...' with target amount ...
        match = re.search(
            r"create\s+(?:a\s+)?budget\s+goal\s+named\s+['\"]?([^'\"]+)['\"]?\s+with\s+target\s+(?:amount\s+)?(?:₹|Rs\.?|INR)?\s*([\d\.,]+)",
            last_human_msg,
            re.IGNORECASE
        )
        if match:
            goal_name = match.group(1).strip()
            target_amount_str = match.group(2)
        else:
            # 2. Match standard chat pattern: Set a budget limit of ... for ...
            match = re.search(
                r"set\s+(?:a\s+)?budget\s+(?:limit|goal|ceiling)\s+(?:of\s+)?(?:₹|Rs\.?|INR)?\s*([\d\.,]+)\s+for\s+['\"]?([^'\"]+)['\"]?",
                last_human_msg,
                re.IGNORECASE
            )
            if match:
                target_amount_str = match.group(1)
                goal_name = match.group(2).strip()
            else:
                # 3. Match another pattern: Create a budget goal for ... with limit ...
                match = re.search(
                    r"create\s+(?:a\s+)?budget\s+(?:goal|limit)\s+for\s+['\"]?([^'\"]+)['\"]?\s+with\s+(?:limit|target|amount)?\s*(?:of\s+)?(?:₹|Rs\.?|INR)?\s*([\d\.,]+)",
                    last_human_msg,
                    re.IGNORECASE
                )
                if match:
                    goal_name = match.group(1).strip()
                    target_amount_str = match.group(2)
                    
        if goal_name and target_amount_str:
            try:
                target_amount = float(target_amount_str.replace(",", ""))
                async with ToolSessionLocal() as session:
                    # Check if a goal with the exact same name already exists for this user to avoid duplicates
                    exists_stmt = select(BudgetGoal).where(
                        BudgetGoal.user_id == user_id,
                        BudgetGoal.name.ilike(goal_name)
                    )
                    exists_result = await session.execute(exists_stmt)
                    existing_goal = exists_result.scalars().first()
                    
                    if not existing_goal:
                        new_goal = BudgetGoal(
                            user_id=user_id,
                            name=goal_name,
                            target_amount=target_amount,
                            current_amount=0.0
                        )
                        session.add(new_goal)
                        await session.commit()
                        print(f"[OK] Goal '{goal_name}' created successfully via agent node regex parse.")
                    else:
                        print(f"[INFO] Goal '{goal_name}' already exists.")
            except Exception as e:
                print(f"[ERROR] Failed to create goal in extractor node: {e}")

    async with ToolSessionLocal() as session:
        stmt = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.transaction_date.desc())
        result = await session.execute(stmt)
        transactions = result.scalars().all()
        
        tx_list = [
            {
                "id": t.id,
                "date": str(t.transaction_date),
                "description": t.description,
                "amount": t.amount,
                "direction": t.direction,
                "category": t.category
            } for t in transactions
        ]
        return {
            "extracted_transactions": tx_list
        }

async def analyzer_agent_node(state: AgentFinancialState):
    """Classifies raw transactions into semantic categories (Utilities, Entertainment, etc.) using Ollama."""
    txs = state.get("extracted_transactions", [])
    to_classify = [t for t in txs if t.get("category") in ("Other", "unknown", "", None)]
    
    if not to_classify:
        return {"analyzed_transactions": txs}
        
    prompt = (
        "You are a financial transaction classifier. Categorize the following transactions. "
        "Return ONLY a raw JSON list where each item is like: {\"id\": \"...\", \"category\": \"...\"}. "
        "Do not include markdown code block formats (e.g. ```json), no conversation, just the raw JSON text. "
        "The category must be one of: 'Food & Dining', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Housing', 'Other'.\n\n"
        "Transactions to classify:\n"
    )
    for t in to_classify:
        prompt += f"- id: {t['id']}, description: {t['description']}, amount: {t['amount']}\n"
        
    response = await llm.ainvoke(prompt)
    content = response.content.strip()
    
    # Strip markdown block wrappers if LLM returned them
    if content.startswith("```"):
        content = re.sub(r"^```(json)?\n", "", content)
        content = re.sub(r"\n```$", "", content)
        content = content.strip()
        
    classified_map = {}
    try:
        results = json.loads(content)
        for item in results:
            classified_map[item["id"]] = item["category"]
    except Exception as e:
        print("Failed to parse LLM transaction categorization JSON:", e)
        
    # Update PostgreSQL DB with categorized values
    async with ToolSessionLocal() as session:
        for tx_id, cat in classified_map.items():
            if cat not in ('Food & Dining', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Housing', 'Other'):
                cat = "Other"
            await session.execute(
                text("UPDATE transactions SET category = :cat WHERE id = :id"),
                {"cat": cat, "id": tx_id}
            )
        await session.commit()
        
    # Build updated list
    analyzed_txs = []
    for t in txs:
        new_t = dict(t)
        if t["id"] in classified_map:
            new_t["category"] = classified_map[t["id"]]
        analyzed_txs.append(new_t)
        
    return {"analyzed_transactions": analyzed_txs}

async def goal_tracker_agent_node(state: AgentFinancialState):
    """Computes budget goal variance and tracks saving trajectories."""
    user_id = state.get("user_id")
    txs = state.get("analyzed_transactions", [])
    
    async with ToolSessionLocal() as session:
        stmt = select(BudgetGoal).where(BudgetGoal.user_id == user_id)
        result = await session.execute(stmt)
        goals = result.scalars().all()
        
        goal_status = []
        for goal in goals:
            matching_amt = 0.0
            for tx in txs:
                if tx["direction"] == "debit":
                    # Check matching keywords
                    is_match = False
                    if goal.name.lower() in tx["category"].lower() or tx["category"].lower() in goal.name.lower():
                        is_match = True
                    elif "all" in goal.name.lower() or "total" in goal.name.lower():
                        is_match = True
                    elif goal.name.lower() in tx["description"].lower():
                        is_match = True
                        
                    if is_match:
                        matching_amt += tx["amount"]
            
            # Compute total net savings for savings goal pacing
            total_income = sum(t["amount"] for t in txs if t["direction"] == "credit")
            total_expense = sum(t["amount"] for t in txs if t["direction"] == "debit")
            net_savings = max(0.0, total_income - total_expense)
            
            if "save" in goal.name.lower() or "saving" in goal.name.lower():
                current_amount = net_savings
            else:
                current_amount = matching_amt
                
            goal.current_amount = current_amount
            session.add(goal)
            
            variance = goal.target_amount - current_amount
            
            # For saving goals: deviation if target not met. For expense goals: deviation if limit exceeded.
            is_deviation = False
            if "save" in goal.name.lower() or "saving" in goal.name.lower():
                is_deviation = current_amount < goal.target_amount
            else:
                is_deviation = current_amount > goal.target_amount
                
            goal_status.append({
                "id": goal.id,
                "name": goal.name,
                "target_amount": goal.target_amount,
                "current_amount": current_amount,
                "variance": variance,
                "status": "deviation" if is_deviation else "on_track"
            })
        await session.commit()
        return {"goal_status": goal_status}

async def expense_alert_agent_node(state: AgentFinancialState):
    """Detects duplicate transactions, spending spikes, or overspending anomalies."""
    user_id = state.get("user_id")
    txs = state.get("analyzed_transactions", [])
    goal_status = state.get("goal_status", [])
    
    alerts = []
    if not txs:
        return {"alerts": []}
        
    # Detect exact duplicates (same date, merchant, amount)
    seen_txs = set()
    for tx in txs:
        key = (tx["date"], tx["description"], tx["amount"])
        if key in seen_txs:
            alerts.append({
                "category": tx["category"],
                "threshold": tx["amount"],
                "trigger_date": tx["date"],
                "reason": f"Potential duplicate charge at '{tx['description']}' for ₹{tx['amount']}."
            })
        seen_txs.add(key)
        
    # Detect overspending alerts from deviations
    for gs in goal_status:
        if gs["status"] == "deviation" and "save" not in gs["name"].lower():
            alerts.append({
                "category": gs["name"],
                "threshold": gs["target_amount"],
                "trigger_date": datetime.now().date().isoformat(),
                "reason": f"Budget limit exceeded on goal '{gs['name']}'. Spent ₹{gs['current_amount']} against target ₹{gs['target_amount']}."
            })
            
    # Save alerts to PostgreSQL
    async with ToolSessionLocal() as session:
        for alert in alerts:
            db_alert = ExpenseAlert(
                user_id=user_id,
                category=alert["category"],
                threshold=alert["threshold"],
                trigger_date=datetime.strptime(alert["trigger_date"], "%Y-%m-%d").date()
            )
            session.add(db_alert)
        await session.commit()
        
    return {"alerts": alerts}

async def financial_planner_agent_node(state: AgentFinancialState):
    """Cognitive core: aggregates metrics and generates actionable financial nudges."""
    user_id = state.get("user_id")
    txs = state.get("analyzed_transactions", [])
    goal_status = state.get("goal_status", [])
    alerts = state.get("alerts", [])
    messages = state.get("messages", [])
    
    total_income = sum(t["amount"] for t in txs if t["direction"] == "credit")
    total_expense = sum(t["amount"] for t in txs if t["direction"] == "debit")
    
    prompt = (
        f"You are the Financial Planner Agent. Generate a personalized budgeting recommendation "
        f"and direct nudges for the user based on their transaction history and goals.\n\n"
        f"Summary Metrics:\n"
        f"- Total Income: ₹{total_income}\n"
        f"- Total Expenses: ₹{total_expense}\n"
        f"- Net Savings: ₹{total_income - total_expense}\n\n"
        f"Active Goals:\n"
    )
    for gs in goal_status:
        prompt += f"- Goal: '{gs['name']}', Target: ₹{gs['target_amount']}, Current: ₹{gs['current_amount']}, Status: {gs['status']}\n"
        
    if alerts:
        prompt += "\nAnomalies/Alerts:\n"
        for a in alerts:
            prompt += f"- {a['reason']}\n"
            
    prompt += (
        "\nRespond to the user's latest query directly in human-readable language. "
        "Incorporate the summary and alerts context naturally to provide explainable financial insights. "
        "Keep recommendations actionable and concise. Do not use markdown code block formatting."
    )
    
    system_instruction = SystemMessage(content=prompt)
    convo = [system_instruction] + [m for m in messages if isinstance(m, (AIMessage, SystemMessage)) or m.type == "human"]
    
    response = await llm.ainvoke(convo)
    nudge_content = response.content.strip()
    
    # Save FinancialPlan to PostgreSQL
    async with ToolSessionLocal() as session:
        db_plan = FinancialPlan(
            user_id=user_id,
            create_date=datetime.now().date(),
            recommendations=nudge_content,
            risk_profile="Balanced"
        )
        session.add(db_plan)
        await session.commit()
        
    return {
        "messages": [response],
        "financial_plan": {
            "recommendations": nudge_content,
            "create_date": datetime.now().date().isoformat()
        }
    }