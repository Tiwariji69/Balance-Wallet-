// --- 1. LOCAL STORAGE & DATA HYDRATION ---
let savedData = localStorage.getItem('personal_balance_ledger');
let ledger = savedData ? JSON.parse(savedData) : [];
ledger.forEach(tx => { tx.dateObj = new Date(tx.dateObj); });

let userDailyBudget = localStorage.getItem('personal_daily_budget') || 200;
userDailyBudget = parseFloat(userDailyBudget);

function saveLedger() {
    localStorage.setItem('personal_balance_ledger', JSON.stringify(ledger));
    updateDashboard();
    calculateDailyPulse();
}

// --- 2. INTERACTIVE PARALLAX ENGINE ---
document.addEventListener('mousemove', function(e) {
    const bg = document.getElementById('interactive-bg');
    if (bg) {
        const xOffset = (e.clientX / window.innerWidth - 0.5) * 40; 
        const yOffset = (e.clientY / window.innerHeight - 0.5) * 40;
        bg.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    }
});

// --- 3. VIEW ROUTING ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    if (viewId === 'view-analytics') updateDashboard();
    if (viewId === 'view-budget') calculateDailyPulse();
}

// --- 4. DATA ENTRY LOGIC ---
const categories = {
    expense: ['Diet', 'Groceries', 'Clothing', 'Dining Out', 'Personal Care', 'Traveling', 'Accommodation', 'Medical', 'Utilities', 'Miscellaneous'],
    income: ['Teaching', 'Event Management', 'Public Speaking', 'Other'],
    investment: ['Nifty 50', 'SIP', 'Stock Market'],
    savings: ['Cash Stash', 'Bank Account', 'Emergency Fund']
};

const typeSelect = document.getElementById('type');
const catSelect = document.getElementById('category');
const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('tx-date');

if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

typeSelect.addEventListener('change', function() {
    catSelect.innerHTML = '';
    categories[this.value].forEach(cat => {
        catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
});
typeSelect.dispatchEvent(new Event('change'));

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const rawDate = new Date(dateInput.value);
    rawDate.setHours(0, 0, 0, 0);

    const newTx = {
        id: Date.now(),
        type: typeSelect.value,
        category: catSelect.value,
        amount: parseFloat(document.getElementById('amount').value),
        notes: document.getElementById('notes').value || '—',
        dateObj: rawDate, 
        dateStr: rawDate.toLocaleDateString('en-IN') 
    };
    
    ledger.push(newTx);
    saveLedger();
    
    const btn = form.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Saved ✓';
    // Match the new Muted Teal color
    btn.style.background = '#78a99f'; 
    btn.style.boxShadow = '0 4px 0 #5c877f';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.boxShadow = '';
        this.reset();
        dateInput.value = new Date().toISOString().split('T')[0]; 
        typeSelect.dispatchEvent(new Event('change'));
    }, 800);
});

// --- 5. BUDGET MODAL LOGIC ---
function openBudgetModal() {
    document.getElementById('new-budget-input').value = userDailyBudget;
    document.getElementById('budget-modal').classList.remove('hidden');
}

function closeBudgetModal() {
    document.getElementById('budget-modal').classList.add('hidden');
}

function saveNewBudget() {
    const newTarget = parseFloat(document.getElementById('new-budget-input').value);
    if (!isNaN(newTarget) && newTarget >= 0) {
        userDailyBudget = newTarget;
        localStorage.setItem('personal_daily_budget', userDailyBudget);
        calculateDailyPulse();
        closeBudgetModal();
    }
}

// --- 6. DAILY PULSE ENGINE ---
function calculateDailyPulse() {
    const todayStr = new Date().toLocaleDateString('en-IN');
    
    document.getElementById('display-daily-limit').textContent = `₹ ${userDailyBudget.toLocaleString('en-IN')}`;
    
    const todayExpensesList = ledger.filter(tx => tx.type === 'expense' && tx.dateStr === todayStr);
    const todayExpenses = todayExpensesList.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = userDailyBudget - todayExpenses;
    
    document.getElementById('today-spent').textContent = `₹${todayExpenses.toLocaleString('en-IN')}`;
    const remainingEl = document.getElementById('today-remaining');
    remainingEl.textContent = `₹${remaining.toLocaleString('en-IN')}`;
    remainingEl.className = `stat-value ${remaining >= 0 ? 'positive' : 'negative'}`;

    const progressFill = document.getElementById('budget-progress');
    const progressText = document.getElementById('budget-percentage');
    let percentage = userDailyBudget > 0 ? (todayExpenses / userDailyBudget) * 100 : 0;
    
    if (percentage > 100) percentage = 100;
    progressFill.style.width = `${percentage}%`;
    
    if (todayExpenses > userDailyBudget && userDailyBudget > 0) {
        progressFill.style.backgroundColor = 'var(--negative)';
        progressText.textContent = `Over budget by ₹${(todayExpenses - userDailyBudget).toLocaleString('en-IN')}`;
        progressText.style.color = 'var(--negative)';
    } else {
        progressFill.style.backgroundColor = 'var(--positive)';
        progressText.textContent = `${Math.round(percentage)}% used`;
        progressText.style.color = 'var(--text-muted)';
    }

    const allExpenses = ledger.filter(tx => tx.type === 'expense');
    const uniqueDays = new Set(allExpenses.map(tx => tx.dateStr)).size;
    const totalExp = allExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    const avg = uniqueDays === 0 ? 0 : Math.round(totalExp / uniqueDays);
    document.getElementById('avg-daily').textContent = `₹${avg.toLocaleString('en-IN')}`;

    const logContainer = document.getElementById('today-logs-list');
    logContainer.innerHTML = '';
    if (todayExpensesList.length === 0) {
        logContainer.innerHTML = '<div class="empty-state">No expenses logged today.</div>';
    } else {
        todayExpensesList.reverse().forEach(tx => {
            logContainer.innerHTML += `
                <div class="transaction-item">
                    <div class="tx-info">
                        <h4 style="margin:0 0 4px 0;">${tx.category}</h4>
                        <p style="margin:0; font-size:12px; color:var(--text-muted); font-weight:600;">${tx.notes}</p>
                    </div>
                    <div class="tx-amount negative">₹${tx.amount.toLocaleString('en-IN')}</div>
                </div>
            `;
        });
    }
}

// --- 7. ANALYTICS & FILTERING LOGIC ---
const timeFilter = document.getElementById('time-filter');
const customDateUI = document.getElementById('custom-date-ui');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyCustomBtn = document.getElementById('apply-custom-btn');

timeFilter.addEventListener('change', function() {
    if (this.value === 'custom') {
        customDateUI.classList.remove('custom-date-hidden');
        customDateUI.classList.add('custom-date-active');
    } else {
        customDateUI.classList.remove('custom-date-active');
        customDateUI.classList.add('custom-date-hidden');
        updateDashboard();
    }
});
applyCustomBtn.addEventListener('click', updateDashboard);

function getFilteredLedger() {
    const filterType = timeFilter.value;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return ledger.filter(tx => {
        if (filterType === 'all') return true;
        if (filterType === 'week') {
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            return tx.dateObj >= sevenDaysAgo && tx.dateObj <= now;
        }
        if (filterType === 'month') {
            return tx.dateObj.getMonth() === now.getMonth() && tx.dateObj.getFullYear() === now.getFullYear();
        }
        if (filterType === 'custom') {
            const start = new Date(startDateInput.value); start.setHours(0, 0, 0, 0);
            const end = new Date(endDateInput.value); end.setHours(23, 59, 59, 999); 
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return true; 
            return tx.dateObj >= start && tx.dateObj <= end;
        }
    });
}

function updateDashboard() {
    let totals = { income: 0, expense: 0, investment: 0, savings: 0 };
    const filteredLedger = getFilteredLedger();
    filteredLedger.forEach(tx => { totals[tx.type] += tx.amount; });

    document.getElementById('total-income').textContent = `₹${totals.income.toLocaleString('en-IN')}`;
    document.getElementById('total-expense').textContent = `₹${totals.expense.toLocaleString('en-IN')}`;
    document.getElementById('total-invested').textContent = `₹${totals.investment.toLocaleString('en-IN')}`;
    document.getElementById('total-saved').textContent = `₹${totals.savings.toLocaleString('en-IN')}`;
    renderChart(totals);
}

function openDetails(type) {
    const modal = document.getElementById('details-modal');
    const list = document.getElementById('transaction-list');
    const filteredTx = getFilteredLedger().filter(tx => tx.type === type);
    
    document.getElementById('modal-title').textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Ledger`;
    list.innerHTML = ''; 
    
    if (filteredTx.length === 0) {
        list.innerHTML = '<div class="empty-state">No transactions in this timeframe.</div>';
    } else {
        filteredTx.reverse().forEach(tx => {
            let colorClass = '';
            if (tx.type === 'income') colorClass = 'positive';
            else if (tx.type === 'expense') colorClass = 'negative';
            else if (tx.type === 'investment') colorClass = 'neutral';
            else if (tx.type === 'savings') colorClass = 'savings-color';

            list.innerHTML += `
                <div class="transaction-item">
                    <div class="tx-info">
                        <h4>${tx.category}</h4>
                        <p>${tx.dateStr} • ${tx.notes}</p>
                    </div>
                    <div class="tx-amount ${colorClass}">₹${tx.amount.toLocaleString('en-IN')}</div>
                </div>
            `;
        });
    }
    modal.classList.remove('hidden');
}

function closeDetails() { document.getElementById('details-modal').classList.add('hidden'); }

let myChart;
function renderChart(totals) {
    const ctx = document.getElementById('cashflowChart');
    if (!ctx) return;
    if (myChart) myChart.destroy(); 
    
    const hasData = totals.income > 0 || totals.expense > 0 || totals.investment > 0 || totals.savings > 0;
    const chartData = hasData ? [totals.income, totals.expense, totals.investment, totals.savings] : [1];
    
    // Muted Palette: Teal, Coral, Mustard, Slate
    const chartColors = hasData ? ['#78a99f', '#d67a73', '#ecb265', '#92a4bd'] : ['#dfd4c5'];

    setTimeout(() => {
        myChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: hasData ? ['Income', 'Expenses', 'Invested', 'Saved'] : ['No Data'],
                datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 0, hoverOffset: hasData ? 4 : 0 }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, cutout: '75%', 
                plugins: { 
                    legend: { position: 'right', labels: { boxWidth: 14, font: { family: 'Nunito', size: 13, weight: '600' }, color: '#584a53' } }, 
                    tooltip: { enabled: hasData } 
                } 
            }
        });
    }, 50);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    calculateDailyPulse();
});