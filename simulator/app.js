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
    home: "app-layout",
    goals: "app-layout",
    transactions: "app-layout",
    banks: "app-layout",
    sandbox: "app-layout",
    chat: "app-layout"
};

function handleRouting() {
    const hash = window.location.hash.replace("#", "") || "landing";
    const containerId = routes[hash] || "view-landing";

    document.getElementById("view-landing").classList.remove("active");
    document.getElementById("view-login").classList.remove("active");
    
    const appLayout = document.getElementById("app-layout");
    if (appLayout) appLayout.classList.add("hidden");

    if (containerId === "app-layout" && appLayout) {
        document.body.className = "light-theme";
        appLayout.classList.remove("hidden");

        const views = ["home", "goals", "transactions", "banks", "simulator", "chat"];
        views.forEach(v => {
            const el = document.getElementById(`subview-${v}`);
            if (el) el.classList.remove("active");
        });

        const links = ["Home", "Goals", "Transactions", "Banks", "Sandbox"];
        links.forEach(l => {
            const el = document.getElementById(`sidebarLink${l}`);
            if (el) el.classList.remove("active");
        });

        let targetView = hash;
        let targetLink = hash.charAt(0).toUpperCase() + hash.slice(1);
        
        if (hash === "sandbox") targetView = "simulator";
        
        const activePane = document.getElementById(`subview-${targetView}`);
        if (activePane) activePane.classList.add("active");

        const activeLink = document.getElementById(`sidebarLink${targetLink}`);
        if (activeLink) activeLink.classList.add("active");

        AgentAPI.fetchDashboardState();
    } else {
        document.body.className = "dark-theme";
        const targetView = document.getElementById(containerId);
        if (targetView) targetView.classList.add("active");
    }
}

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
        } catch (error) {
            console.error("Dashboard fetch error:", error);
            this.logToConsole("Error connecting to backend.");
        }
    }

    static async sendAgentQuery(message) {
        UIController.appendChatMessage(message, "user");
        UIController.appendChatMessage("Processing...", "bot", "loading-msg"); 
        
        try {
            const response = await fetch(`${API_BASE_URL}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: CURRENT_USER_ID, message: message })
            });
            const data = await response.json();
            
            const loadingBubble = document.getElementById('loading-msg');
            if (loadingBubble) loadingBubble.remove();
            
            const finalMessage = data.messages[data.messages.length - 1]?.content || "Action completed.";
            UIController.appendChatMessage(finalMessage, "bot");
            
            await this.fetchDashboardState(); 
        } catch (error) {
            this.logToConsole(`Agent execution failed: ${error.message}`);
        }
    }

    static async simulateWebhook(amount, merchant, category, direction) {
        document.getElementById('devResultPanel').classList.remove('hidden');
        document.getElementById('devResultTitle').textContent = "Intercepting Webhook...";
        document.getElementById('devResultMessage').textContent = "Agent executing variance calculations...";
        
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
            
            document.getElementById('devResultTitle').textContent = "Goal Variance Breach Detected";
            document.getElementById('devResultMessage').textContent = data.nudge;
            document.getElementById('devResultSeverityText').textContent = "ACTION REQUIRED";
            
            this.logToConsole(`[NUDGE]:\n${data.nudge}`);
            await this.fetchDashboardState();
        } catch (error) {
            document.getElementById('devResultTitle').textContent = "Simulation Failed";
        }
    }

    static logToConsole(text) {
        const consoleEl = document.getElementById('devAgentConsoleJson');
        if (consoleEl) consoleEl.textContent = text;
    }
}

// ==========================================
// 4. UI DOM CONTROLLER
// ==========================================
class UIController {
    static renderDashboard() {
        const txs = applicationState.transactions || [];
        
        // Render isolated Transactions Page table
        const pageTbody = document.getElementById('pageLedgerTableBody');
        if (pageTbody) {
            if (txs.length === 0) {
                pageTbody.innerHTML = `<tr><td colspan="5" class="no-data-cell">No transactions found.</td></tr>`;
            } else {
                pageTbody.innerHTML = txs.map(tx => `
                    <tr>
                        <td>${tx.date.split(' ')[0]}</td>
                        <td>${tx.description}</td>
                        <td class="font-bold">₹${tx.amount.toLocaleString()}</td>
                        <td><span style="padding: 4px 8px; border: 1px solid var(--border-app); background: var(--bg-card);">${tx.category}</span></td>
                        <td><span style="color: ${tx.direction === 'credit' ? 'var(--color-green)' : 'var(--color-red)'}; text-transform:capitalize;">${tx.direction}</span></td>
                    </tr>
                `).join('');
            }
        }

        // Render Goals constraints
        const goals = applicationState.goals || [];
        if (goals.length > 0) {
            const goal = goals[0];
            const nameEl = document.getElementById('activeGoalName');
            const targetEl = document.getElementById('activeGoalTarget');
            const savedEl = document.getElementById('activeGoalSaved');
            
            if(nameEl) nameEl.textContent = goal.name;
            if(targetEl) targetEl.textContent = `Target: ₹${goal.target_amount.toLocaleString()}`;
            if(savedEl) savedEl.textContent = `₹${goal.current_amount.toLocaleString()}`;
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
// 5. EVENT BINDINGS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    handleRouting();

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

    const toggleDevTx = document.getElementById('toggleDevTx');
    const toggleDevPlaid = document.getElementById('toggleDevPlaid');
    const devWebhookFields = document.getElementById('devWebhookFields');

    if (toggleDevTx && toggleDevPlaid) {
        toggleDevTx.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDevTx.classList.add('active');
            toggleDevPlaid.classList.remove('active');
            if(devWebhookFields) devWebhookFields.classList.add('hidden');
        });

        toggleDevPlaid.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDevPlaid.classList.add('active');
            toggleDevTx.classList.remove('active');
            if(devWebhookFields) devWebhookFields.classList.remove('hidden');
        });
    }
});