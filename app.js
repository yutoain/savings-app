// アプリケーション状態管理
class SavingsApp {
    constructor() {
        this.cards = this.loadData('cards') || [];
        this.expenses = this.loadData('expenses') || [];
        this.incomes = this.loadData('incomes') || [];
        this.goal = this.loadData('goal') || null;
        this.settings = this.loadData('settings') || { theme: 'light', notificationTime: '08:00' };
        this.currentMonth = new Date();
        this.selectedDate = new Date();
        this.currentEditingCardId = null;

        this.init();
    }

    init() {
        this.setupServiceWorker();
        this.setupEventListeners();
        this.applyTheme();
        this.setDefaultDate();
        this.updatePaymentMethodOptions();
        this.renderDashboard();
        this.renderCardsList();
        this.renderCalendar();
        this.renderGoalProgress();
    }

    // データの保存と読み込み
    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // Service Worker登録
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .catch(err => console.log('Service Worker registration failed:', err));
        }
    }

    // イベントリスナー設定
    setupEventListeners() {
        // ナビゲーション
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchPage(e.currentTarget.dataset.page));
        });

        // テーマ切り替え
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // カード管理
        document.getElementById('addCardBtn').addEventListener('click', () => this.openCardModal());
        document.getElementById('closeCardModal').addEventListener('click', () => this.closeCardModal());
        document.getElementById('cardForm').addEventListener('submit', (e) => this.saveCard(e));

        // 収入・支出入力
        document.getElementById('incomeForm').addEventListener('submit', (e) => this.saveIncome(e));
        document.getElementById('expenseForm').addEventListener('submit', (e) => this.saveExpense(e));
        document.getElementById('paymentMethod').addEventListener('change', (e) => this.updateWithdrawalDate(e.target.value));
        document.getElementById('expenseDate').addEventListener('change', () => {
            const paymentMethod = document.getElementById('paymentMethod').value;
            if (paymentMethod !== 'cash') {
                this.updateWithdrawalDate(paymentMethod);
            }
        });

        // カレンダー
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // 目標設定
        document.getElementById('goalForm').addEventListener('submit', (e) => this.saveGoal(e));

        // 通知
        document.getElementById('enableNotifications').addEventListener('click', () => this.enableNotifications());

        // データ管理
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));

        // モーダル外クリックで閉じる
        document.getElementById('cardModal').addEventListener('click', (e) => {
            if (e.target.id === 'cardModal') this.closeCardModal();
        });
    }

    // ページ切り替え
    switchPage(pageName) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

        document.getElementById(pageName).classList.add('active');
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // ページ切り替え時に更新
        if (pageName === 'dashboard') this.renderDashboard();
        if (pageName === 'expense') this.renderRecentExpenses();
        if (pageName === 'calendarPage') this.renderCalendar();
        if (pageName === 'goalPage') this.renderGoalProgress();
        if (pageName === 'settings') this.renderCardsList();
    }

    // テーマ切り替え
    toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = newTheme;
        document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
        this.settings.theme = newTheme;
        this.saveData('settings', this.settings);
    }

    applyTheme() {
        document.documentElement.dataset.theme = this.settings.theme;
        document.getElementById('themeToggle').textContent = this.settings.theme === 'dark' ? '☀️' : '🌙';
    }

    // カード管理
    openCardModal(cardId = null) {
        this.currentEditingCardId = cardId;
        const modal = document.getElementById('cardModal');

        if (cardId) {
            const card = this.cards.find(c => c.id === cardId);
            document.getElementById('cardName').value = card.name;
            document.getElementById('closingDay').value = card.closingDay;
            document.getElementById('paymentDay').value = card.paymentDay;
            document.getElementById('cardColor').value = card.color;
        } else {
            document.getElementById('cardForm').reset();
            document.getElementById('cardColor').value = this.getRandomColor();
        }

        modal.classList.add('active');
    }

    closeCardModal() {
        document.getElementById('cardModal').classList.remove('active');
        this.currentEditingCardId = null;
    }

    saveCard(e) {
        e.preventDefault();

        const cardData = {
            id: this.currentEditingCardId || 'card_' + Date.now(),
            name: document.getElementById('cardName').value,
            closingDay: document.getElementById('closingDay').value,
            paymentDay: parseInt(document.getElementById('paymentDay').value),
            color: document.getElementById('cardColor').value
        };

        if (this.currentEditingCardId) {
            const index = this.cards.findIndex(c => c.id === this.currentEditingCardId);
            this.cards[index] = cardData;
        } else {
            this.cards.push(cardData);
        }

        this.saveData('cards', this.cards);
        this.closeCardModal();
        this.renderCardsList();
        this.updatePaymentMethodOptions();
        this.renderDashboard();
    }

    deleteCard(cardId) {
        if (!confirm('このカードを削除しますか？')) return;

        this.cards = this.cards.filter(c => c.id !== cardId);
        this.expenses = this.expenses.filter(e => e.paymentMethod !== cardId);

        this.saveData('cards', this.cards);
        this.saveData('expenses', this.expenses);
        this.renderCardsList();
        this.updatePaymentMethodOptions();
        this.renderDashboard();
    }

    renderCardsList() {
        const container = document.getElementById('cardsList');

        if (this.cards.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💳</div><div>カードを登録してください</div></div>';
            return;
        }

        container.innerHTML = this.cards.map(card => `
            <div class="card-item">
                <div>
                    <div class="card-badge" style="background: ${card.color}20; color: ${card.color};">
                        ${card.name}
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary);">
                        締め日: ${card.closingDay === 'month-end' ? '月末' : card.closingDay + '日'} |
                        引き落とし: ${card.paymentDay}日
                    </div>
                </div>
                <div>
                    <button class="btn btn-small btn-secondary" onclick="app.openCardModal('${card.id}')" style="margin-right: 8px;">編集</button>
                    <button class="delete-btn" onclick="app.deleteCard('${card.id}')">削除</button>
                </div>
            </div>
        `).join('');
    }

    updatePaymentMethodOptions() {
        const select = document.getElementById('paymentMethod');
        select.innerHTML = '<option value="cash">現金</option>' +
            this.cards.map(card => `<option value="${card.id}">${card.name}</option>`).join('');
    }

    // 引き落とし日計算
    calculateWithdrawalDate(cardId, expenseDate) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return null;

        const date = new Date(expenseDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        // 締め日を取得
        let closingDay;
        if (card.closingDay === 'month-end') {
            closingDay = new Date(year, month + 1, 0).getDate();
        } else {
            closingDay = parseInt(card.closingDay);
        }

        // 締め日を過ぎているか判定
        // 例: 15日締め → 1-15日の利用は翌月10日引き落とし、16-31日の利用は翌々月10日引き落とし
        // 例: 月末締め → 1-31日の利用は翌月27日引き落とし
        let withdrawalDate;
        if (day <= closingDay) {
            // 締め日以内 → 翌月の引き落とし日
            withdrawalDate = new Date(year, month + 1, card.paymentDay);
        } else {
            // 締め日を過ぎた → 翌々月の引き落とし日
            withdrawalDate = new Date(year, month + 2, card.paymentDay);
        }

        return withdrawalDate.toISOString().split('T')[0];
    }

    updateWithdrawalDate(paymentMethod) {
        const group = document.getElementById('withdrawalDateGroup');
        const input = document.getElementById('withdrawalDate');
        const expenseDate = document.getElementById('expenseDate').value;

        if (paymentMethod === 'cash') {
            group.style.display = 'none';
            input.value = '';
        } else {
            group.style.display = 'block';
            if (expenseDate) {
                input.value = this.calculateWithdrawalDate(paymentMethod, expenseDate);
            }
        }
    }

    // 収入・支出管理
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('incomeDate').value = today;
        document.getElementById('expenseDate').value = today;
    }

    saveIncome(e) {
        e.preventDefault();

        const incomeData = {
            id: 'income_' + Date.now(),
            date: document.getElementById('incomeDate').value,
            amount: parseInt(document.getElementById('incomeAmount').value),
            source: document.getElementById('incomeSource').value || '収入'
        };

        this.incomes.push(incomeData);
        this.saveData('incomes', this.incomes);

        e.target.reset();
        this.setDefaultDate();

        alert('収入を記録しました！');
        this.renderRecentExpenses();
        this.renderDashboard();
        this.renderCalendar();
    }

    saveExpense(e) {
        e.preventDefault();

        const paymentMethod = document.getElementById('paymentMethod').value;
        const expenseData = {
            id: 'expense_' + Date.now(),
            date: document.getElementById('expenseDate').value,
            amount: parseInt(document.getElementById('expenseAmount').value),
            paymentMethod: paymentMethod,
            category: document.getElementById('expenseCategory').value || '未分類',
            withdrawalDate: paymentMethod === 'cash' ? null : document.getElementById('withdrawalDate').value
        };

        this.expenses.push(expenseData);
        this.saveData('expenses', this.expenses);

        e.target.reset();
        this.setDefaultDate();
        this.updateWithdrawalDate('cash');

        alert('支出を記録しました！');
        this.renderRecentExpenses();
        this.renderDashboard();
        this.renderCalendar();
    }

    deleteExpense(expenseId) {
        if (!confirm('この支出を削除しますか？')) return;

        this.expenses = this.expenses.filter(e => e.id !== expenseId);
        this.saveData('expenses', this.expenses);

        this.renderRecentExpenses();
        this.renderDashboard();
        this.renderCalendar();
    }

    deleteIncome(incomeId) {
        if (!confirm('この収入を削除しますか？')) return;

        this.incomes = this.incomes.filter(i => i.id !== incomeId);
        this.saveData('incomes', this.incomes);

        this.renderRecentExpenses();
        this.renderDashboard();
        this.renderCalendar();
    }

    renderRecentExpenses() {
        const container = document.getElementById('recentExpenses');

        // 収入と支出を統合してソート
        const allTransactions = [
            ...this.incomes.map(i => ({...i, type: 'income'})),
            ...this.expenses.map(e => ({...e, type: 'expense'}))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

        if (allTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div>取引データがありません</div></div>';
            return;
        }

        container.innerHTML = allTransactions.map(item => {
            if (item.type === 'income') {
                return `
                    <div class="expense-item" style="border-left: 3px solid var(--success);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">${item.date}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${item.source} | 収入
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="expense-amount success" style="color: var(--success);">
                                +¥${item.amount.toLocaleString()}
                            </div>
                            <button class="delete-btn" onclick="app.deleteIncome('${item.id}')">×</button>
                        </div>
                    </div>
                `;
            } else {
                const card = item.paymentMethod === 'cash' ? null : this.cards.find(c => c.id === item.paymentMethod);
                return `
                    <div class="expense-item" style="border-left: 3px solid var(--danger);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">${item.date}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${item.category} | ${card ? card.name : '現金'}
                                ${item.withdrawalDate ? `<br>引き落とし: ${item.withdrawalDate}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="expense-amount ${card ? 'card' : 'cash'}">
                                -¥${item.amount.toLocaleString()}
                            </div>
                            <button class="delete-btn" onclick="app.deleteExpense('${item.id}')">×</button>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    // ダッシュボード
    renderDashboard() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 今月の収入を計算
        const monthIncomes = this.incomes.filter(i => {
            const date = new Date(i.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);

        // 今月の支出を計算
        const monthExpenses = this.expenses.filter(e => {
            const date = new Date(e.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const cashSpent = monthExpenses.filter(e => e.paymentMethod === 'cash')
            .reduce((sum, e) => sum + e.amount, 0);

        const cardSpent = monthExpenses.filter(e => e.paymentMethod !== 'cash')
            .reduce((sum, e) => sum + e.amount, 0);

        // 全期間の収支から現在の残高を計算
        const allIncome = this.incomes.reduce((sum, i) => sum + i.amount, 0);
        const allExpenses = this.expenses.reduce((sum, e) => sum + e.amount, 0);
        const currentBalance = allIncome - allExpenses;

        // 次回引き落とし額を計算
        const nextWithdrawal = this.calculateUpcomingWithdrawals(1)[0]?.amount || 0;

        // 引き落とし後残高
        const afterBalance = currentBalance - nextWithdrawal;

        document.getElementById('monthIncome').textContent = '¥' + totalIncome.toLocaleString();
        document.getElementById('currentBalance').textContent = '¥' + currentBalance.toLocaleString();
        document.getElementById('cashSpent').textContent = '¥' + cashSpent.toLocaleString();
        document.getElementById('cardSpent').textContent = '¥' + cardSpent.toLocaleString();
        document.getElementById('nextWithdrawal').textContent = '¥' + nextWithdrawal.toLocaleString();
        document.getElementById('afterBalance').textContent = '¥' + afterBalance.toLocaleString();

        // 残高の色を変更
        const balanceElement = document.getElementById('currentBalance');
        if (currentBalance > 0) {
            balanceElement.classList.remove('danger');
            balanceElement.classList.add('success');
        } else {
            balanceElement.classList.remove('success');
            balanceElement.classList.add('danger');
        }

        const afterBalanceElement = document.getElementById('afterBalance');
        if (afterBalance > 0) {
            afterBalanceElement.classList.remove('danger');
            afterBalanceElement.classList.add('success');
        } else {
            afterBalanceElement.classList.remove('success');
            afterBalanceElement.classList.add('danger');
        }

        // カード別使用状況
        this.renderCardUsage(monthExpenses);

        // 引き落としスケジュール
        this.renderWithdrawalSchedule();

        // モチベーションメッセージ
        this.renderMotivationMessage(cashSpent, cardSpent, nextWithdrawal);
    }

    renderCardUsage(monthExpenses) {
        const cardUsage = {};

        monthExpenses.filter(e => e.paymentMethod !== 'cash').forEach(expense => {
            if (!cardUsage[expense.paymentMethod]) {
                cardUsage[expense.paymentMethod] = 0;
            }
            cardUsage[expense.paymentMethod] += expense.amount;
        });

        // 円グラフ描画
        const canvas = document.getElementById('cardChart');
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Object.keys(cardUsage).length === 0) {
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('今月のカード利用なし', 150, 150);
        } else {
            this.drawPieChart(ctx, cardUsage);
        }

        // カード別リスト
        const container = document.getElementById('cardUsageList');
        if (Object.keys(cardUsage).length > 0) {
            container.innerHTML = Object.entries(cardUsage).map(([cardId, amount]) => {
                const card = this.cards.find(c => c.id === cardId);
                return `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${card?.color || '#666'};"></div>
                            <span>${card?.name || '不明'}</span>
                        </div>
                        <span style="font-weight: 600;">¥${amount.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '';
        }
    }

    drawPieChart(ctx, data) {
        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        let currentAngle = -Math.PI / 2;

        Object.entries(data).forEach(([cardId, amount]) => {
            const card = this.cards.find(c => c.id === cardId);
            const sliceAngle = (amount / total) * 2 * Math.PI;

            ctx.fillStyle = card?.color || '#666';
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.arc(150, 150, 120, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            currentAngle += sliceAngle;
        });
    }

    calculateUpcomingWithdrawals(months = 3) {
        const now = new Date();
        const withdrawals = [];

        for (let i = 0; i < months; i++) {
            const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthlyWithdrawal = { month: targetMonth, amount: 0, details: [] };

            this.cards.forEach(card => {
                const cardExpenses = this.expenses.filter(e => {
                    if (e.paymentMethod !== card.id || !e.withdrawalDate) return false;
                    const withdrawalDate = new Date(e.withdrawalDate);
                    return withdrawalDate.getMonth() === targetMonth.getMonth() &&
                           withdrawalDate.getFullYear() === targetMonth.getFullYear();
                });

                const cardTotal = cardExpenses.reduce((sum, e) => sum + e.amount, 0);
                if (cardTotal > 0) {
                    monthlyWithdrawal.amount += cardTotal;
                    monthlyWithdrawal.details.push({
                        cardName: card.name,
                        amount: cardTotal,
                        date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), card.paymentDay)
                    });
                }
            });

            withdrawals.push(monthlyWithdrawal);
        }

        return withdrawals;
    }

    renderWithdrawalSchedule() {
        const container = document.getElementById('withdrawalSchedule');
        const withdrawals = this.calculateUpcomingWithdrawals(3);

        container.innerHTML = withdrawals.map(w => {
            if (w.amount === 0) return '';

            return `
                <div class="withdrawal-item">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">
                            ${w.month.getFullYear()}年${w.month.getMonth() + 1}月
                        </div>
                        ${w.details.map(d => `
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${d.cardName}: ¥${d.amount.toLocaleString()} (${d.date.getDate()}日)
                            </div>
                        `).join('')}
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--danger);">
                        ¥${w.amount.toLocaleString()}
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state"><div class="empty-state-icon">📅</div><div>引き落とし予定なし</div></div>';
    }

    renderMotivationMessage(cashSpent, cardSpent, nextWithdrawal) {
        const message = document.getElementById('motivationMessage');
        const totalSpent = cashSpent + cardSpent + nextWithdrawal;

        let text = '';
        let className = 'alert-success';

        if (this.goal) {
            const daysLeft = Math.ceil((new Date(this.goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            const monthlyTarget = (this.goal.amount - this.goal.currentSavings) / (daysLeft / 30);

            if (totalSpent > monthlyTarget * 1.2) {
                text = '⚠️ カード使用に注意！このペースでは目標達成が難しいです';
                className = 'alert-danger';
            } else if (totalSpent > monthlyTarget) {
                text = '💪 節約が必要です！引き落としも考慮して計画的に';
                className = 'alert-warning';
            } else {
                text = '👍 この調子！目標達成に向けて順調です';
                className = 'alert-success';
            }
        } else {
            if (cardSpent > cashSpent * 2) {
                text = '💳 カード使いすぎかも？来月の引き落としに注意';
                className = 'alert-warning';
            } else {
                text = '✨ 支出をバランスよく管理できています';
                className = 'alert-success';
            }
        }

        message.textContent = text;
        message.className = 'alert ' + className;
        message.style.display = 'block';
    }

    // カレンダー
    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        // 曜日ヘッダー
        ['日', '月', '火', '水', '木', '金', '土'].forEach(day => {
            const header = document.createElement('div');
            header.textContent = day;
            header.style.fontWeight = '600';
            header.style.fontSize = '12px';
            header.style.color = 'var(--text-secondary)';
            header.style.textAlign = 'center';
            header.style.padding = '8px 0';
            calendar.appendChild(header);
        });

        // 空白
        for (let i = 0; i < firstDay; i++) {
            calendar.appendChild(document.createElement('div'));
        }

        // 日付
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // その日の支出・収入
            const hasExpense = this.expenses.some(e => e.date === dateStr);
            const hasIncome = this.incomes.some(i => i.date === dateStr);

            // その日の引き落とし予定
            const withdrawals = this.expenses.filter(e => e.withdrawalDate === dateStr);
            const hasWithdrawal = withdrawals.length > 0;

            const isToday = dateStr === new Date().toISOString().split('T')[0];

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            if (hasExpense || hasIncome) dayElement.classList.add('has-expense');
            if (isToday) dayElement.classList.add('today');

            // 日付とマーカーを表示
            dayElement.innerHTML = `
                <div style="font-weight: ${isToday ? '700' : '400'};">${day}</div>
                ${hasWithdrawal ? '<div style="font-size: 10px; color: var(--danger); margin-top: 2px;">💳</div>' : ''}
            `;
            dayElement.style.flexDirection = 'column';
            dayElement.style.gap = '0';

            dayElement.addEventListener('click', () => this.showDayExpenses(dateStr));

            calendar.appendChild(dayElement);
        }

        this.showDayExpenses(this.selectedDate.toISOString().split('T')[0]);
    }

    changeMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.renderCalendar();
    }

    showDayExpenses(dateStr) {
        this.selectedDate = new Date(dateStr);
        const container = document.getElementById('dayExpenses');

        // その日の支出
        const dayExpenses = this.expenses.filter(e => e.date === dateStr);

        // その日の収入
        const dayIncomes = this.incomes.filter(i => i.date === dateStr);

        // その日の引き落とし予定
        const dayWithdrawals = this.expenses.filter(e => e.withdrawalDate === dateStr);

        if (dayExpenses.length === 0 && dayIncomes.length === 0 && dayWithdrawals.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><div>${dateStr}<br>データなし</div></div>`;
            return;
        }

        let html = `<div style="font-weight: 600; margin-bottom: 12px;">${dateStr}</div>`;

        // 収入を表示
        if (dayIncomes.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: var(--success);">📈 収入</div>`;
            dayIncomes.forEach(income => {
                html += `
                    <div class="expense-item" style="border-left: 3px solid var(--success);">
                        <div>
                            <div style="font-weight: 600;">${income.source}</div>
                        </div>
                        <div class="expense-amount success" style="color: var(--success);">
                            +¥${income.amount.toLocaleString()}
                        </div>
                    </div>
                `;
            });
        }

        // 支出を表示
        if (dayExpenses.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: var(--danger);">📉 支出</div>`;
            dayExpenses.forEach(expense => {
                const card = expense.paymentMethod === 'cash' ? null : this.cards.find(c => c.id === expense.paymentMethod);
                html += `
                    <div class="expense-item" style="border-left: 3px solid var(--danger);">
                        <div>
                            <div style="font-weight: 600;">${expense.category}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${card ? card.name : '現金'}
                                ${expense.withdrawalDate ? `<br>引き落とし: ${expense.withdrawalDate}` : ''}
                            </div>
                        </div>
                        <div class="expense-amount ${card ? 'card' : 'cash'}">
                            -¥${expense.amount.toLocaleString()}
                        </div>
                    </div>
                `;
            });
        }

        // 引き落とし予定を表示
        if (dayWithdrawals.length > 0) {
            html += `<div style="font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: var(--warning);">💳 引き落とし予定</div>`;

            // カード別に集計
            const withdrawalsByCard = {};
            dayWithdrawals.forEach(expense => {
                const card = this.cards.find(c => c.id === expense.paymentMethod);
                if (card) {
                    if (!withdrawalsByCard[card.id]) {
                        withdrawalsByCard[card.id] = {
                            card: card,
                            expenses: [],
                            total: 0
                        };
                    }
                    withdrawalsByCard[card.id].expenses.push(expense);
                    withdrawalsByCard[card.id].total += expense.amount;
                }
            });

            Object.values(withdrawalsByCard).forEach(item => {
                html += `
                    <div class="expense-item" style="border-left: 3px solid ${item.card.color}; background: ${item.card.color}10;">
                        <div>
                            <div style="font-weight: 600; color: ${item.card.color};">${item.card.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                ${item.expenses.map(e => `${e.category} ¥${e.amount.toLocaleString()} (${e.date})`).join('<br>')}
                            </div>
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: ${item.card.color};">
                            ¥${item.total.toLocaleString()}
                        </div>
                    </div>
                `;
            });

            const totalWithdrawal = Object.values(withdrawalsByCard).reduce((sum, item) => sum + item.total, 0);
            html += `
                <div style="margin-top: 12px; padding: 12px; background: var(--warning)20; border-radius: 8px; text-align: right; font-weight: 700; color: var(--warning);">
                    引き落とし合計: ¥${totalWithdrawal.toLocaleString()}
                </div>
            `;
        }

        // 収支合計
        const totalIncome = dayIncomes.reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netAmount = totalIncome - totalExpense;

        if (dayIncomes.length > 0 || dayExpenses.length > 0) {
            html += `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>収入:</span>
                        <span style="color: var(--success);">+¥${totalIncome.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>支出:</span>
                        <span style="color: var(--danger);">-¥${totalExpense.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 700; padding-top: 8px; border-top: 1px solid var(--border);">
                        <span>差引:</span>
                        <span style="color: ${netAmount >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            ${netAmount >= 0 ? '+' : ''}¥${netAmount.toLocaleString()}
                        </span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // 目標管理
    saveGoal(e) {
        e.preventDefault();

        this.goal = {
            amount: parseInt(document.getElementById('goalAmount').value),
            currentSavings: parseInt(document.getElementById('currentSavings').value),
            deadline: document.getElementById('goalDeadline').value
        };

        this.saveData('goal', this.goal);
        this.renderGoalProgress();
        this.renderDashboard();
        alert('目標を設定しました！');
    }

    renderGoalProgress() {
        if (!this.goal) {
            document.getElementById('goalProgress').style.display = 'none';

            // デフォルト値を設定
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('goalDeadline').value = tomorrow.toISOString().split('T')[0];
            return;
        }

        document.getElementById('goalProgress').style.display = 'block';

        // フォームに値を設定
        document.getElementById('goalAmount').value = this.goal.amount;
        document.getElementById('currentSavings').value = this.goal.currentSavings;
        document.getElementById('goalDeadline').value = this.goal.deadline;

        const progress = (this.goal.currentSavings / this.goal.amount) * 100;
        document.getElementById('progressFill').style.width = Math.min(progress, 100) + '%';

        const now = new Date();
        const deadline = new Date(this.goal.deadline);
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        const needed = this.goal.amount - this.goal.currentSavings;

        // 今後の引き落とし総額
        const futureWithdrawals = this.calculateUpcomingWithdrawals(Math.ceil(daysLeft / 30));
        const totalWithdrawals = futureWithdrawals.reduce((sum, w) => sum + w.amount, 0);

        // 月平均支出
        const monthlyAvg = this.calculateMonthlyAverage();
        const estimatedSpending = (daysLeft / 30) * monthlyAvg;

        const achievable = this.goal.currentSavings + (daysLeft / 30 * 30000) - totalWithdrawals - estimatedSpending >= needed;

        document.getElementById('goalStats').innerHTML = `
            <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>目標金額:</span>
                    <span style="font-weight: 700;">¥${this.goal.amount.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>現在の貯金:</span>
                    <span style="font-weight: 700;">¥${this.goal.currentSavings.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>残り必要額:</span>
                    <span style="font-weight: 700; color: var(--primary);">¥${needed.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>残り日数:</span>
                    <span style="font-weight: 700;">${daysLeft}日</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border);">
                    <span>今後の引き落とし予定:</span>
                    <span style="font-weight: 700; color: var(--danger);">¥${totalWithdrawals.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>月平均支出:</span>
                    <span style="font-weight: 700;">¥${monthlyAvg.toLocaleString()}</span>
                </div>
                <div style="padding: 16px; background: ${achievable ? 'var(--success)' : 'var(--warning)'}20; border-radius: 8px; margin-top: 8px;">
                    <div style="font-weight: 700; color: ${achievable ? 'var(--success)' : 'var(--warning)'};">
                        ${achievable ? '✅ 目標達成可能！' : '⚠️ 節約が必要です'}
                    </div>
                    <div style="font-size: 14px; margin-top: 4px;">
                        カードの引き落としを考慮した予測です
                    </div>
                </div>
            </div>
        `;
    }

    calculateMonthlyAverage() {
        if (this.expenses.length === 0) return 0;

        const oldestExpense = this.expenses.reduce((oldest, e) =>
            new Date(e.date) < new Date(oldest.date) ? e : oldest
        );

        const months = Math.max(1, Math.ceil((new Date() - new Date(oldestExpense.date)) / (1000 * 60 * 60 * 24 * 30)));
        const total = this.expenses.reduce((sum, e) => sum + e.amount, 0);

        return Math.round(total / months);
    }

    // 通知
    enableNotifications() {
        if (!('Notification' in window)) {
            alert('このブラウザは通知機能をサポートしていません');
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                alert('通知を有効にしました！毎朝予算をお知らせします');
                this.scheduleNotifications();
            }
        });
    }

    scheduleNotifications() {
        // 実際の実装ではService Workerのバックグラウンド同期を使用
        // ここでは簡易的な実装
        const notificationTime = this.settings.notificationTime;
        console.log('通知スケジュール設定:', notificationTime);
    }

    // データ管理
    exportData() {
        const data = {
            cards: this.cards,
            expenses: this.expenses,
            incomes: this.incomes,
            goal: this.goal,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `savings-app-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (confirm('データをインポートしますか？現在のデータは上書きされます。')) {
                    this.cards = data.cards || [];
                    this.expenses = data.expenses || [];
                    this.incomes = data.incomes || [];
                    this.goal = data.goal || null;
                    this.settings = data.settings || { theme: 'light', notificationTime: '08:00' };

                    this.saveData('cards', this.cards);
                    this.saveData('expenses', this.expenses);
                    this.saveData('incomes', this.incomes);
                    this.saveData('goal', this.goal);
                    this.saveData('settings', this.settings);

                    alert('データをインポートしました！');
                    location.reload();
                }
            } catch (error) {
                alert('データの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }

    // ユーティリティ
    getRandomColor() {
        const colors = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// アプリ初期化
const app = new SavingsApp();
