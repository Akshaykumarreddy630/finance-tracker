/* FINANCE TRACKER - FULLY MOBILE-COMPATIBLE VERSION */
const encryptionKey = "financeKey123";
let transactions = [];
let userProfile = {
    income: 0,
    essentialBudget: 50,
    discretionaryBudget: 30,
    savingsGoal: 0,
    currency: "USD",
    financialHealth: 0
};

// ==================== CORE INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data
    try {
        const encryptedTx = localStorage.getItem("transactions");
        if (encryptedTx) {
            const decrypted = xorDecrypt(atob(encryptedTx), encryptionKey);
            transactions = JSON.parse(decrypted) || [];
        }

        const profile = localStorage.getItem("userProfile");
        if (profile) {
            userProfile = {...userProfile, ...JSON.parse(profile)};
            document.getElementById('customEssentials').value = userProfile.essentialBudget;
            document.getElementById('customDiscretionary').value = userProfile.discretionaryBudget;
            document.getElementById('goalAmount').value = userProfile.savingsGoal;
        }
    } catch (e) {
        console.error("Data load error:", e);
        showAlert("⚠️ Couldn't load saved data. Starting fresh.", 'error');
    }

    // Initialize UI
    document.getElementById('txDate').valueAsDate = new Date();
    applyTheme();
    setupMobileEvents();

    // First-run experience
    if (!localStorage.getItem('firstRun')) {
        showHelpTooltip();
        localStorage.setItem('firstRun', 'completed');
    }

    
});

function setupMobileEvents() {
    // Handle start button
    const startBtn = document.getElementById('startBtn') || document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', enterApp);
        startBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            enterApp();
        }, {passive: false});
    }

    // Mobile-friendly dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggle').addEventListener('touchend', function(e) {
        e.preventDefault();
        toggleDarkMode();
    }, {passive: false});

    // Analysis buttons
    document.getElementById('analyzePatternsBtn').addEventListener('click', analyzeSpendingPatterns);
    document.getElementById('optimizeSavingsBtn').addEventListener('click', optimizeSavings);

    // Add transaction form
    document.querySelector('#inputSection button[onclick="addTransaction()"]')
        .addEventListener('touchend', function(e) {
            e.preventDefault();
            addTransaction();
        }, {passive: false});
}

// ==================== MAIN APP FUNCTIONS ====================
function enterApp() {
    try {
        document.getElementById('home').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        showSection('dashboard');
        localStorage.setItem('appInitialized', 'true');
        updateUI();
    } catch (error) {
        console.error('App initialization failed:', error);
        showAlert('Please reload the page. If problem persists, try another browser.', 'error');
    }
}

function addTransaction() {
    // Delay for mobile keyboards to close
    setTimeout(() => {
        const desc = document.getElementById("desc").value.trim();
        const amount = parseFloat(document.getElementById("amount").value);
        const type = document.getElementById("type").value;
        let category = document.getElementById("category").value;
        const txDate = document.getElementById("txDate").value;

        // Validation
        if (!desc) return showAlert("Description is required", 'error');
        if (!amount || amount <= 0) return showAlert("Amount must be positive", 'error');
        
        // Auto-categorization
        const rules = [
            { pattern: /netflix|spotify|prime|disney|hbo|subscription/i, category: 'discretionary' },
            { pattern: /rent|mortgage|electric|water|gas|internet|phone/i, category: 'essential' },
            { pattern: /grocery|supermarket|food|dining|restaurant/i, category: 'essential' },
            { pattern: /salary|paycheck|bonus|income/i, category: 'income' },
            { pattern: /medical|doctor|hospital|pharmacy|clinic|healthcare/i, category: 'healthcare' }
        ];
        
        for (const rule of rules) {
            if (rule.pattern.test(desc)) {
                category = rule.category;
                break;
            }
        }

        // Create transaction
        const date = txDate ? new Date(txDate).getTime() : Date.now();
        const transaction = {
            id: date,
            desc,
            amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
            type,
            category,
            date: new Date(date).toISOString().split('T')[0]
        };

        transactions.push(transaction);
        saveData();
        
        // Clear inputs
        document.getElementById("desc").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("txDate").value = "";
        
        updateUI();
        checkForAnomalies();
    }, 300);
}

// ==================== FINANCIAL CALCULATIONS ====================
function calculateFinancialMetrics() {
    const result = {
        income: 0,
        expenses: 0,
        essentialSpending: 0,
        discretionarySpending: 0,
        healthcareSpending: 0,
        savings: 0
    };

    transactions.forEach(tx => {
        if (tx.amount > 0) {
            result.income += tx.amount;
        } else {
            const amount = Math.abs(tx.amount);
            result.expenses += amount;
            
            switch(tx.category) {
                case 'essential': 
                    result.essentialSpending += amount;
                    break;
                case 'discretionary':
                    result.discretionarySpending += amount;
                    break;
                case 'healthcare':
                    result.healthcareSpending += amount;
                    break;
            }
        }
    });

    result.balance = result.income - result.expenses;
    result.savingsRate = result.income > 0 ? (result.balance / result.income) : 0;
    
    result.essentialBudget = result.income * (userProfile.essentialBudget / 100);
    result.discretionaryBudget = result.income * (userProfile.discretionaryBudget / 100);
    result.savingsBudget = result.income * ((100 - userProfile.essentialBudget - userProfile.discretionaryBudget) / 100);
    
    return result;
}

function calculateFinancialHealth() {
    const metrics = calculateFinancialMetrics();
    const savingsScore = Math.min(100, metrics.savingsRate * 200);
    const budgetScore = calculateBudgetAdherenceScore(metrics);
    const goalScore = userProfile.savingsGoal > 0 
        ? Math.min(100, (metrics.balance / userProfile.savingsGoal) * 100)
        : 50;

    return {
        score: Math.round((savingsScore * 0.4) + (budgetScore * 0.4) + (goalScore * 0.2)),
        components: {
            savings: Math.round(savingsScore),
            budgeting: Math.round(budgetScore),
            goals: Math.round(goalScore)
        }
    };
}

function calculateBudgetAdherenceScore(metrics) {
    const essentialDeviation = Math.max(0, metrics.essentialSpending - metrics.essentialBudget);
    const discretionaryDeviation = Math.max(0, metrics.discretionarySpending - metrics.discretionaryBudget);
    
    const essentialScore = 100 - (essentialDeviation / metrics.essentialBudget * 100);
    const discretionaryScore = 100 - (discretionaryDeviation / metrics.discretionaryBudget * 100);
    
    return Math.max(0, (essentialScore * 0.6 + discretionaryScore * 0.4));
}

// ==================== UI UPDATES ====================
function updateUI() {
    showLoading(true);
    setTimeout(() => {
        updateDashboard();
        updateTransactionLog();
        updateSavingsGoal();
        updateBadges();
        updateCharts();
        updateTips();
        updateFinancialHealthDisplay();
        showLoading(false);
    }, 100);
}

function updateDashboard() {
    const metrics = calculateFinancialMetrics();
    const cards = [
        { label: "Income", value: formatCurrency(metrics.income) },
        { label: "Expenses", value: formatCurrency(metrics.expenses) },
        { 
            label: "Balance", 
            value: formatCurrency(metrics.balance),
            highlight: metrics.balance < 0 ? 'error' : metrics.balance >= userProfile.savingsGoal ? 'success' : '' 
        },
        { label: "Savings Rate", value: `${(metrics.savingsRate * 100).toFixed(1)}%` },
        { 
            label: "Essentials", 
            value: `${formatCurrency(metrics.essentialSpending)} of ${formatCurrency(metrics.essentialBudget)}`,
            highlight: metrics.essentialSpending > metrics.essentialBudget ? 'error' : '' 
        },
        { 
            label: "Discretionary", 
            value: `${formatCurrency(metrics.discretionarySpending)} of ${formatCurrency(metrics.discretionaryBudget)}`,
            highlight: metrics.discretionarySpending > metrics.discretionaryBudget ? 'warning' : '' 
        },
        { label: "Healthcare", value: formatCurrency(metrics.healthcareSpending) }
    ];

    document.getElementById("summary").innerHTML = cards.map(card => `
        <div class="card ${card.highlight || ''}">
            <h4>${card.label}</h4>
            <p>${card.value}</p>
        </div>
    `).join('');
}

function updateTransactionLog() {
    const logList = document.getElementById("logList");
    logList.innerHTML = transactions
        .sort((a, b) => b.id - a.id)
        .map(tx => `
            <li class="tx-item ${tx.amount < 0 ? 'expense' : 'income'}">
                <span class="tx-date">${new Date(tx.id).toLocaleDateString()}</span>
                <span class="tx-desc">${tx.desc}</span>
                <span class="tx-amount">
                    ${tx.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(tx.amount))}
                </span>
                <span class="tx-category">${tx.category}</span>
            </li>
        `).join('');
}

function updateFinancialHealthDisplay() {
    const health = calculateFinancialHealth();
    const healthElem = document.getElementById('healthScore');
    
    healthElem.innerHTML = `
        <div class="score-value">${health.score}</div>
        <div class="score-label">Financial Health</div>
        <svg class="score-circle" viewBox="0 0 36 36">
            <path class="circle-bg"
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path class="circle-fill"
                stroke-dasharray="${health.score}, 100"
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
        </svg>
    `;
    
    document.getElementById('healthBreakdown').innerHTML = `
        <div class="health-components">
            <div><span class="component-label">Savings:</span> ${health.components.savings}</div>
            <div><span class="component-label">Budgeting:</span> ${health.components.budgeting}</div>
            <div><span class="component-label">Goals:</span> ${health.components.goals}</div>
        </div>
    `;
}

// ==================== ANALYTICS FEATURES ====================
function analyzeSpendingPatterns() {
    showLoading(true);
    
    setTimeout(() => {
        try {
            const metrics = calculateFinancialMetrics();
            const analysis = generateSpendingAnalysis(metrics);
            
            const report = document.createElement('div');
            report.className = 'analysis-report';
            report.innerHTML = `
                <h3>Spending Analysis Report</h3>
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <h4>Essential Spending</h4>
                        <p>${formatCurrency(metrics.essentialSpending)}</p>
                        <p>${(metrics.essentialSpending / metrics.expenses * 100).toFixed(1)}% of expenses</p>
                    </div>
                    <div class="analysis-card">
                        <h4>Discretionary Spending</h4>
                        <p>${formatCurrency(metrics.discretionarySpending)}</p>
                        <p>${(metrics.discretionarySpending / metrics.expenses * 100).toFixed(1)}% of expenses</p>
                    </div>
                </div>
                <div class="analysis-advice">
                    <h4>Recommendations</h4>
                    <p>${analysis.message}</p>
                    ${generateCategoryBreakdown()}
                </div>
            `;
            
            showModal('Spending Analysis', report);
        } catch (error) {
            console.error("Analysis error:", error);
            showAlert("Failed to analyze spending patterns", 'error');
        } finally {
            showLoading(false);
        }
    }, 500);
}

function optimizeSavings() {
    showLoading(true);
    
    setTimeout(() => {
        try {
            const metrics = calculateFinancialMetrics();
            const potentialSavings = calculatePotentialSavings(metrics);
            const largestExpenses = findLargestExpenses();
            
            const report = document.createElement('div');
            report.className = 'savings-report';
            report.innerHTML = `
                <h3>Savings Optimization</h3>
                <div class="savings-summary">
                    <p>Current savings rate: <strong>${(metrics.savingsRate * 100).toFixed(1)}%</strong></p>
                    <p>Potential monthly savings: <strong>${formatCurrency(potentialSavings)}</strong></p>
                </div>
                <div class="savings-suggestions">
                    <h4>Top Opportunities</h4>
                    <ol>
                        <li>Review recurring subscriptions (potential savings: ${formatCurrency(potentialSavings * 0.3)})</li>
                        <li>Reduce dining out by 20% (potential savings: ${formatCurrency(potentialSavings * 0.2)})</li>
                        <li>Shop with a grocery list (potential savings: ${formatCurrency(potentialSavings * 0.15)})</li>
                    </ol>
                </div>
                <div class="largest-expenses">
                    <h4>Your Largest Expenses</h4>
                    <ul>
                        ${largestExpenses.map(expense => `
                            <li>
                                ${expense.desc}: ${formatCurrency(Math.abs(expense.amount))}
                                <span class="expense-date">${new Date(expense.id).toLocaleDateString()}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            
            showModal('Savings Optimization', report);
        } catch (error) {
            console.error("Optimization error:", error);
            showAlert("Failed to generate savings optimization", 'error');
        } finally {
            showLoading(false);
        }
    }, 500);
}

// ==================== UTILITY FUNCTIONS ====================
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content.innerHTML || content}
            </div>
        </div>
    `;
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: userProfile.currency || 'USD'
    }).format(amount);
}

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.setAttribute('role', 'alert');
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.prepend(alert);
        setTimeout(() => alert.remove(), 5000);
    }
}

function showLoading(show) {
    const loader = document.getElementById('loader') || createLoader();
    loader.style.display = show ? 'block' : 'none';
}

function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
    return loader;
}

function toggleDarkMode() {
    const isDark = !document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    applyTheme();
}

function applyTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark', isDark);
    document.getElementById('darkModeToggle').textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// ==================== DATA MANAGEMENT ====================
function saveData() {
    try {
        const encrypted = btoa(xorEncrypt(JSON.stringify(transactions), encryptionKey));
        localStorage.setItem("transactions", encrypted);
        userProfile.financialHealth = calculateFinancialHealth().score;
        localStorage.setItem("userProfile", JSON.stringify(userProfile));
    } catch (e) {
        console.error("Data save error:", e);
        showAlert("⚠️ Failed to save data", 'error');
    }
}

function xorEncrypt(text, key) {
    return [...text].map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
}

function xorDecrypt(encrypted, key) {
    return xorEncrypt(encrypted, key);
}

// ==================== HELPER FUNCTIONS ====================
function generateSpendingAnalysis(metrics) {
    if (metrics.expenses === 0) {
        return {
            severity: 'low',
            message: 'No spending data to analyze'
        };
    }

    const essentialRatio = metrics.essentialSpending / metrics.expenses;
    const discretionaryRatio = metrics.discretionarySpending / metrics.expenses;
    
    if (essentialRatio > 0.7) {
        return {
            severity: 'high',
            message: `Your essential spending is high (${(essentialRatio*100).toFixed(1)}% of expenses). Consider reviewing fixed costs like rent, utilities, and groceries to see if you can reduce these necessary expenses.`
        };
    }
    
    if (discretionaryRatio > 0.5) {
        return {
            severity: 'medium',
            message: `Your discretionary spending is significant (${(discretionaryRatio*100).toFixed(1)}% of expenses). Look for areas like dining out, entertainment, or subscriptions where you might cut back without significantly impacting your lifestyle.`
        };
    }
    
    return {
        severity: 'low',
        message: 'Your spending patterns are well-balanced between essential and discretionary categories. Keep up the good work!'
    };
}

function generateCategoryBreakdown() {
    const categories = {};
    transactions.forEach(tx => {
        if (tx.amount < 0) {
            categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount);
        }
    });
    
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);
    if (total === 0) return '';
    
    return `
        <h4>Category Breakdown</h4>
        <ul class="category-list">
            ${Object.entries(categories).map(([category, amount]) => `
                <li>
                    <span class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                    <span class="category-amount">${formatCurrency(amount)} (${((amount / total) * 100).toFixed(1)}%)</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function calculatePotentialSavings(metrics) {
    return metrics.discretionarySpending * 0.15;
}

function findLargestExpenses(limit = 5) {
    return transactions
        .filter(tx => tx.amount < 0)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, limit);
}

function checkForAnomalies() {
    const { discretionarySpending } = calculateFinancialMetrics();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const recentSpending = transactions
        .filter(tx => tx.amount < 0 && tx.category === 'discretionary' && new Date(tx.id) > lastMonth)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const avgDaily = recentSpending / 30;
    const currentWeek = transactions
        .filter(tx => tx.amount < 0 && tx.category === 'discretionary' && new Date(tx.id) > new Date(Date.now() - 7 * 86400000))
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    if (currentWeek > avgDaily * 7 * 1.5) {
        showAlert(`⚠️ High spending this week: $${currentWeek.toFixed(2)} vs usual $${(avgDaily * 7).toFixed(2)}`, 'warning');
    }
}

function showHelpTooltip() {
    showAlert("💡 Tip: Add your first transaction to get started!", 'info');
}

function updateSavingsGoal() {
    const { balance } = calculateFinancialMetrics();
    const goal = userProfile.savingsGoal;
    const status = document.getElementById("goalStatus");
    
    if (!goal) {
        status.innerHTML = "<p>No savings goal set</p>";
        return;
    }

    const progress = Math.min(100, (balance / goal) * 100);
    status.innerHTML = `
        <p>${balance >= goal ? '✅' : '❌'} ${formatCurrency(balance)} of ${formatCurrency(goal)}</p>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
    `;
}

function updateBadges() {
    const { balance } = calculateFinancialMetrics();
    const badges = [];
    
    if (balance >= 1000) badges.push("💰 Savings Champion");
    if (balance >= userProfile.savingsGoal && userProfile.savingsGoal > 0) badges.push("🎯 Goal Achiever");
    
    document.getElementById("badgeSection").innerHTML = badges.length
        ? badges.map(b => `<div class="badge">${b}</div>`).join('')
        : "<p>Complete milestones to earn badges</p>";
}

function updateCharts() {
    const metrics = calculateFinancialMetrics();
    const suggestedCtx = document.getElementById("suggestedChart");
    const actualCtx = document.getElementById("actualChart");

    if (!suggestedCtx || !actualCtx || !window.Chart) return;

    // Suggested Budget Chart
    if (window.suggestedChartInstance) {
        window.suggestedChartInstance.destroy();
    }
    window.suggestedChartInstance = new Chart(suggestedCtx, {
        type: 'pie',
        data: {
            labels: ['Essentials', 'Discretionary', 'Savings'],
            datasets: [{
                data: [
                    metrics.essentialBudget,
                    metrics.discretionaryBudget,
                    metrics.savingsBudget
                ],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { 
                    display: true, 
                    text: 'Suggested Budget',
                    font: { size: 14 }
                }
            }
        }
    });

    // Actual Spending Chart
    if (window.actualChartInstance) {
        window.actualChartInstance.destroy();
    }
    window.actualChartInstance = new Chart(actualCtx, {
        type: 'pie',
        data: {
            labels: ['Essentials', 'Discretionary', 'Healthcare', 'Remaining'],
            datasets: [{
                data: [
                    metrics.essentialSpending,
                    metrics.discretionarySpending,
                    metrics.healthcareSpending,
                    Math.max(metrics.balance, 0)
                ],
                backgroundColor: ['#FF6384', '#36A2EB', '#AA66CC', '#4BC0C0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { 
                    display: true, 
                    text: 'Actual Spending',
                    font: { size: 14 }
                }
            }
        }
    });
}

function updateTips() {
    const advice = generateFinancialAdvice(calculateFinancialMetrics());
    document.getElementById("tipsList").innerHTML = advice.map(a => `
        <li class="advice-${a.severity}">${a.message}</li>
    `).join('');
}

function generateFinancialAdvice(metrics) {
    const advice = [];
    const { income, balance, savingsRate, essentialSpending, discretionarySpending, 
            essentialBudget, discretionaryBudget, healthcareSpending } = metrics;

    // Savings advice
    if (savingsRate < 0.1) {
        advice.push({
            severity: 'high',
            message: `Low savings rate (${(savingsRate * 100).toFixed(1)}%). Aim for at least 10%.`
        });
    }

    // Budget adherence
    if (essentialSpending > essentialBudget) {
        advice.push({
            severity: 'high',
            message: `Overspent on essentials by $${(essentialSpending - essentialBudget).toFixed(2)}`
        });
    }

    if (discretionarySpending > discretionaryBudget) {
        advice.push({
            severity: 'medium',
            message: `Overspent on discretionary by $${(discretionarySpending - discretionaryBudget).toFixed(2)}`
        });
    }

    // Large transactions
    transactions.filter(tx => tx.amount < -income * 0.1)
        .forEach(tx => {
            advice.push({
                severity: 'medium',
                message: `Large expense: $${Math.abs(tx.amount).toFixed(2)} on ${tx.desc}`
            });
        });

    return advice.length ? advice : [{
        severity: 'low',
        message: "Your finances look healthy!"
    }];
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
    });

    document.getElementById('inputSection').style.display = 
        sectionId === 'dashboard' ? 'flex' : 'none';

    if (sectionId === 'analysis') initializeDateAnalysis();
}


function initializeDateAnalysis() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    document.getElementById('startDate').valueAsDate = start;
    document.getElementById('endDate').valueAsDate = end;
}

function analyzeDateRange() {
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);
    
    if (!start || !end || start > end) {
        showAlert('Invalid date range', 'error');
        return;
    }

    const filtered = transactions.filter(tx => {
        const txDate = new Date(tx.id);
        return txDate >= start && txDate <= end;
    });

    displayAnalysisResults(filtered, start, end);
}

function displayAnalysisResults(transactions, start, end) {
    const result = {
        income: 0,
        essential: 0,
        discretionary: 0,
        healthcare: 0
    };

    transactions.forEach(tx => {
        if (tx.amount > 0) {
            result.income += tx.amount;
        } else if (tx.category === 'essential') {
            result.essential += Math.abs(tx.amount);
        } else if (tx.category === 'discretionary') {
            result.discretionary += Math.abs(tx.amount);
        } else if (tx.category === 'healthcare') {
            result.healthcare += Math.abs(tx.amount);
        }
    });

    document.getElementById('dateRangeResults').innerHTML = `
        <div class="analysis-summary">
            <div class="card">
                <h4>Period</h4>
                <p>${start.toLocaleDateString()} to ${end.toLocaleDateString()}</p>
            </div>
            <div class="card">
                <h4>Income</h4>
                <p>${formatCurrency(result.income)}</p>
            </div>
            <div class="card">
                <h4>Essentials</h4>
                <p>${formatCurrency(result.essential)}</p>
            </div>
            <div class="card">
                <h4>Discretionary</h4>
                <p>${formatCurrency(result.discretionary)}</p>
            </div>
            <div class="card">
                <h4>Healthcare</h4>
                <p>${formatCurrency(result.healthcare)}</p>
            </div>
        </div>
        <h3>Transactions (${transactions.length})</h3>
        <div class="tx-table">
            ${transactions.map(tx => `
                <div class="tx-row">
                    <span>${new Date(tx.id).toLocaleDateString()}</span>
                    <span>${tx.desc}</span>
                    <span class="${tx.amount < 0 ? 'expense' : 'income'}">
                        ${tx.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <span>${tx.category}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function exportFilteredCSV() {
    const start = new Date(document.getElementById('startDate').value);
    const end = new Date(document.getElementById('endDate').value);
    
    if (!start || !end || start > end) {
        showAlert('Select valid dates first', 'error');
        return;
    }

    const filtered = transactions.filter(tx => {
        const txDate = new Date(tx.id);
        return txDate >= start && txDate <= end;
    });

    if (!filtered.length) {
        showAlert('No transactions in selected range', 'warning');
        return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category'];
    const rows = filtered.map(tx => [
        new Date(tx.id).toLocaleDateString(),
        `"${tx.desc.replace(/"/g, '""')}"`,
        tx.amount.toFixed(2),
        tx.type,
        tx.category
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadCSV(csvContent, `transactions_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveCustomBudgetRule() {
    const essentials = parseFloat(document.getElementById('customEssentials').value);
    const discretionary = parseFloat(document.getElementById('customDiscretionary').value);
    
    if (essentials + discretionary > 100) {
        document.getElementById('budgetWarning').textContent = 'Total exceeds 100%';
        return;
    }

    userProfile.essentialBudget = essentials;
    userProfile.discretionaryBudget = discretionary;
    saveData();
    document.getElementById('budgetWarning').textContent = '';
    updateUI();
}

function setSavingsGoal() {
    const goal = parseFloat(document.getElementById('goalAmount').value);
    if (!goal || goal <= 0) {
        showAlert('Enter a valid goal amount', 'error');
        return;
    }
    
    userProfile.savingsGoal = goal;
    saveData();
    updateUI();
}

function resetAllData() {
    if (confirm('This will delete ALL your data. Continue?')) {
        localStorage.clear();
        transactions = [];
        userProfile = {
            income: 0,
            essentialBudget: 50,
            discretionaryBudget: 30,
            savingsGoal: 0,
            currency: "USD",
            financialHealth: 0
        };
        updateUI();
        showAlert('All data has been reset', 'info');
    }
}