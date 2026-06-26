// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const API_BASE_URL = "http://localhost:8000/api/v1";
let CURRENT_USER_ID = "user_pune_2026"; 
let applicationState = {
    metrics: { monthly_income: 0, total_expenses: 0, net_cashflow: 0 },
    transactions: [],
    goals: []
};

// ==========================================
// 2. ROUTING & NAVIGATION
// ==========================================
const routes = {
    landing: "view-landing",
    login: "view-login",
    goals: "app-layout",
    chat: "app-layout",
    simulator: "app-layout"
};

function handleRouting() {
    const hash = window.location.hash.replace("#", "") || "landing";
    const containerId = routes[hash] || "view-landing";

    // Hide everything first
    document.getElementById("view-landing").classList.remove("active");
    document.getElementById("view-login").classList.remove("active");
    
    const appLayout = document.getElementById("app-layout");
    if (appLayout) appLayout.classList.add("hidden");

    // Route to Dashboard Layout
    if (containerId === "app-layout" && appLayout) {
        document.body.className = "light-theme";
        appLayout.classList.remove("hidden");

        // Hide all sub-views
        document.getElementById("subview-goals").classList.remove("active");
        document.getElementById("subview-chat").classList.remove("active");
        document.getElementById("subview-simulator").classList.remove("active");

        // Deactivate sidebar links
        document.getElementById("sidebarLinkHome").classList.remove("active");
        document.getElementById("sidebarLinkGoals").classList.remove("active");
        document.getElementById("sidebarLinkParser").classList.remove("active");
        document.querySelector(".chat-session-item").classList.remove("active");

        // Activate requested sub-view
        if (hash === "goals") {
            document.getElementById("subview-goals").classList.add("active");
            document.getElementById("sidebarLinkGoals").classList.add("active");
            AgentAPI.fetchDashboardState(); // Auto-refresh data
        } else if (hash === "chat") {
            document.getElementById("subview-chat").classList.add("active");
            document.querySelector(".chat-session-item").classList.add("active");
        } else if (hash === "simulator") {
            document.getElementById("subview-simulator").classList.add("active");
            document.getElementById("sidebarLinkParser").classList.add("active");
        }
    } 
    // Route to Public Pages (Landing / Login)
    else {
        document.body.className = "dark-theme";
        const targetView = document.getElementById(containerId);
        if (targetView) targetView.classList.add("active");
    }
}

// Bind native URL hash changes
window.addEventListener("hashchange", handleRouting);


// ==========================================
// 3. BACKEND API SERVICE
// ==========================================
class AgentAPI {
    static async fetchDashboardState() {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${CURRENT_USER_ID}/dashboard`);
            if (!response.ok) throw new Error("Backend connection failed");
            
            applicationState = await response.json();
            UIController.renderDashboard();
            this.logToConsole("Dashboard synced with PostgreSQL database.", true);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            this.logToConsole("Error connecting to backend. Is Uvicorn running?");
        }
    }

    static async sendAgentQuery(message) {
        UIController.appendChatMessage(message, "user");
        UIController.appendChatMessage("Analyzing financial context...", "bot", "loading-msg"); 
        this.logToConsole("Agent is reasoning... executing LangGraph tools...", false, true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: CURRENT_USER_ID, message: message })
            });
            const data = await response.json();
            
            // Remove loading bubble
            const loadingBubble = document.getElementById('loading-msg');
            if (loadingBubble) loadingBubble.remove();
            
            const finalMessage = data.messages[data.messages.length - 1]?.content || "Action completed.";
            UIController.appendChatMessage(finalMessage, "bot");
            this.logToConsole(`[AGENT]:\n${finalMessage}`);
            
            await this.fetchDashboardState(); 
        } catch (error) {
            this.logToConsole(`Agent execution failed: ${error.message}`);
        }
    }

    static async simulateWebhook(amount, merchant, category, direction) {
        this.logToConsole(`Simulating ${merchant} transaction... analyzing goal variance...`, false, true);
        
        // Show loading in simulator panel
        document.getElementById('devResultPanel').classList.remove('hidden');
        document.getElementById('devResultTitle').textContent = "Processing Webhook...";
        document.getElementById('devResultMessage').textContent = "Waiting for agent to calculate variance threshold...";
        
        try {
            const response = await fetch(`${API_BASE_URL}/plaid/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    amount: parseFloat(amount),
                    merchant: merchant,
                    category: category,
                    direction: direction
                })
            });
            const data = await response.json();
            
            // Render Nudge Output
            document.getElementById('devResultTitle').textContent = "Real-Time Agent Nudge generated";
            document.getElementById('devResultMessage').textContent = data.nudge;
            document.getElementById('devResultSeverityText').textContent = "HIGH SEVERITY";
            
            this.logToConsole(`[SYSTEM NUDGE]:\n${data.nudge}`);
            await this.fetchDashboardState();
        } catch (error) {
            this.logToConsole(`Webhook simulation failed: ${error.message}`);
            document.getElementById('devResultTitle').textContent = "Simulation Failed";
        }
    }

    static logToConsole(text, append = false, isThinking = false) {
        const consoleEl = document.getElementById('devAgentConsoleJson');
        if (!consoleEl) return;
        
        let prefix = isThinking ? "⏳ " : "🟢 ";
        if (append && consoleEl.textContent !== `"No active log runs."`) {
            consoleEl.textContent += `\n\n${prefix}${text}`;
        } else {
            consoleEl.textContent = `${prefix}${text}`;
        }
    }
}


// ==========================================
// 4. UI DOM CONTROLLER
// ==========================================
class UIController {
    static renderDashboard() {
        try {
            const goals = applicationState.goals || [];
            document.getElementById('kpiTotalGoals').textContent = goals.length;
            
            // Manage Empty vs Filled States
            const emptyState = document.getElementById('goalsEmptyState');
            const filledState = document.getElementById('goalsFilledState');
            
            if (goals.length > 0) {
                if(emptyState) emptyState.classList.add('hidden');
                if(filledState) filledState.classList.remove('hidden');
                
                const goal = goals[0]; // Render the primary active goal
                document.getElementById('activeGoalName').textContent = goal.name;
                document.getElementById('activeGoalTarget').textContent = `Target: ₹${goal.target_amount.toLocaleString()}`;
                document.getElementById('activeGoalSaved').textContent = `₹${goal.current_amount.toLocaleString()}`;
                
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);
                document.getElementById('activeGoalRemaining').textContent = `₹${remaining.toLocaleString()}`;
                
                const progressPct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                document.getElementById('activeGoalProgressPct').textContent = `${progressPct.toFixed(1)}%`;
                document.getElementById('activeGoalProgressFill').style.width = `${Math.min(100, progressPct)}%`;
            } else {
                if(emptyState) emptyState.classList.remove('hidden');
                if(filledState) filledState.classList.add('hidden');
            }

            // Populate Ledger Table
            const tbody = document.getElementById('ledgerTableBody');
            if (tbody) {
                const txs = applicationState.transactions || [];
                if (txs.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="no-data-cell" style="text-align: center; padding: 20px;">No transactions recorded.</td></tr>`;
                } else {
                    tbody.innerHTML = txs.map(tx => `
                        <tr>
                            <td>${tx.date.split(' ')[0]}</td>
                            <td>${tx.description}</td>
                            <td class="font-bold">₹${tx.amount.toLocaleString()}</td>
                            <td><span style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-app); background-color: var(--bg-card);">${tx.category}</span></td>
                            <td><span style="color: ${tx.direction === 'credit' ? 'var(--color-green)' : 'var(--color-red)'}; font-weight:600; text-transform:capitalize;">${tx.direction}</span></td>
                        </tr>
                    `).join('');
                }
            }
        } catch (e) {
            console.error("Render dashboard error:", e);
        }
    }

    static appendChatMessage(text, sender, id = null) {
        const chatWindow = document.getElementById('chatMessagesWindow');
        if (!chatWindow) return;
        
        const div = document.createElement("div");
        div.className = `chat-bubble-chat ${sender}`;
        if (id) div.id = id;
        div.innerHTML = text;
        
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}


// ==========================================
// 5. EVENT LISTENERS INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Force route resolution instantly on load
    handleRouting();

    // 2. Auth: Redirect Login to Goals Dashboard
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.hash = "#goals"; // Natively triggers handleRouting via hashchange
        });
    }

    // 3. Agent: Natural Language Input processing
    const chatPromptForm = document.getElementById('chatPromptForm');
    if (chatPromptForm) {
        chatPromptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputEl = document.getElementById('chatInputText');
            if (!inputEl.value.trim()) return;
            
            AgentAPI.sendAgentQuery(inputEl.value.trim());
            inputEl.value = '';
        });
    }

    // 4. Simulator: Plaid Webhook Nudge execution
    const simForm = document.getElementById('devSimForm');
    if (simForm) {
        simForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = document.getElementById('devSimAmount').value;
            const merchant = document.getElementById('devSimMerchant').value;
            const category = document.getElementById('devSimCategory').value;
            
            AgentAPI.simulateWebhook(amount, merchant, category, "debit");
        });
    }

    // 5. Profile Edit Dropdown behavior
    const btnCloseModal = document.getElementById('btnCloseEditProfileModal');
    const editProfileModal = document.getElementById('editProfileModal');
    if (btnCloseModal && editProfileModal) {
        btnCloseModal.addEventListener('click', () => {
            editProfileModal.classList.add('hidden');
        });
    }
});