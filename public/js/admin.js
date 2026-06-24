const loginBtn = document.getElementById('admin-login-btn');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

let DEPOSIT_MAP = {};

loginBtn.addEventListener('click', async () => {
    const password = passwordInput.value;

    const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });

    if (response.ok) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        fetch('/admin/services')
            .then(r => r.json())
            .then(({ services }) => {
                services.forEach(s => {
                    DEPOSIT_MAP[s.name] = Math.round(s.price * 0.25);
                });
                loadBookings();
            });
        loadClosedDates();
    } else {
        loginError.textContent = 'Incorrect password.';
    }
});

passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDeposit(service) {
    const cents = DEPOSIT_MAP[service];
    if (!cents) return '—';
    return '$' + (cents / 100).toFixed(2);
}

function todayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const SESSION_TIMEOUT = 30 * 60 * 1000;
let sessionTimer;

function startSessionTimer() {
    sessionTimer = setTimeout(() => {
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('admin-login').style.display = 'flex';
        passwordInput.value = '';
        loginError.textContent = 'Session expired. Please log in again.';
    }, SESSION_TIMEOUT);
}

function resetSessionTimer() {
    clearTimeout(sessionTimer);
    startSessionTimer();
}

document.addEventListener('mousemove', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);

async function loadClosedDates() {
    const res = await fetch('/admin/closed-dates');
    const { closedDates } = await res.json();
    const list = document.getElementById('closed-dates-list');
    list.innerHTML = '';

    if (!closedDates || closedDates.length === 0) {
        list.innerHTML = '<li class="closed-dates-empty">No blocked dates.</li>';
        return;
    }

    closedDates.forEach(({ id, date, reason }) => {
        const li = document.createElement('li');
        li.className = 'closed-date-row';
        li.innerHTML = `
            <span>${escapeHtml(formatDate(date))}${reason ? ' — ' + escapeHtml(reason) : ''}</span>
            <button class="remove-closed-date-btn" data-id="${escapeHtml(id)}">Remove</button>
        `;
        li.querySelector('.remove-closed-date-btn').addEventListener('click', async () => {
            await fetch(`/admin/closed-dates/${id}`, { method: 'DELETE' });
            loadClosedDates();
        });
        list.appendChild(li);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-closed-date-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const date = document.getElementById('closed-date-input').value;
            const reason = document.getElementById('closed-date-reason').value.trim();
            const errorEl = document.getElementById('closed-date-error');

            if (!date) {
                errorEl.textContent = 'Please select a date.';
                return;
            }
            errorEl.textContent = '';

            const res = await fetch('/admin/closed-dates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, reason }),
            });

            if (res.ok) {
                document.getElementById('closed-date-input').value = '';
                document.getElementById('closed-date-reason').value = '';
                loadClosedDates();
            } else {
                const { error } = await res.json();
                errorEl.textContent = error || 'Failed to block date.';
            }
        });
    }
});

let allBookings = [];
let activeFilter = 'upcoming';

function renderBookings() {
    const today = todayString();
    const tbody = document.getElementById('bookings-body');
    tbody.innerHTML = '';

    const visible = activeFilter === 'upcoming'
        ? allBookings.filter(b => b.date >= today && b.status !== 'cancelled')
        : allBookings;

    if (visible.length === 0) {
        document.getElementById('bookings-empty').style.display = 'block';
        document.getElementById('bookings-table').style.display = 'none';
        return;
    }

    document.getElementById('bookings-empty').style.display = 'none';
    document.getElementById('bookings-table').style.display = 'table';

    visible.forEach(b => {
        const cancelled = b.status === 'cancelled';
        const isPast = b.date < today;
        const row = document.createElement('tr');
        if (b.date === today && !cancelled) row.classList.add('today-row');
        if (cancelled) row.classList.add('cancelled-row');

        row.innerHTML = `
            <td>${escapeHtml(formatDate(b.date))}</td>
            <td>${escapeHtml(b.time)}</td>
            <td>${escapeHtml(b.stylist)}</td>
            <td>${escapeHtml(b.service)}</td>
            <td>${escapeHtml(formatDeposit(b.service))}</td>
            <td>${escapeHtml(b.customer_name)}</td>
            <td>${escapeHtml(b.customer_email)}</td>
            <td>${escapeHtml(b.customer_phone)}</td>
            <td><span class="booking-status ${cancelled ? 'status-cancelled' : 'status-confirmed'}">${cancelled ? 'Cancelled' : 'Confirmed'}</span></td>
            <td>${!cancelled && !isPast ? `<button class="admin-cancel-btn" data-token="${escapeHtml(b.cancel_token)}">Cancel</button>` : ''}</td>
        `;

        if (!cancelled && !isPast) {
            row.querySelector('.admin-cancel-btn').addEventListener('click', async (e) => {
                if (!confirm('Cancel this booking? This will issue a refund if within the 48-hour window.')) return;
                const token = e.target.dataset.token;
                const res = await fetch(`/bookings/cancel?token=${encodeURIComponent(token)}`, { method: 'PATCH' });
                const data = await res.json();
                if (res.ok) {
                    b.status = 'cancelled';
                    renderBookings();
                    updateStats();
                } else {
                    alert(data.error || 'Could not cancel booking.');
                }
            });
        }

        tbody.appendChild(row);
    });
}

function updateStats() {
    const today = todayString();
    const confirmed = allBookings.filter(b => b.status !== 'cancelled');
    const todayCount = confirmed.filter(b => b.date === today).length;
    const totalRevenue = confirmed.reduce((sum, b) => sum + (DEPOSIT_MAP[b.service] || 0), 0);
    document.getElementById('stat-total').textContent = confirmed.length;
    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('stat-revenue').textContent = '$' + (totalRevenue / 100).toFixed(2);
}

async function loadBookings() {
    startSessionTimer();
    const response = await fetch('/admin/bookings');
    const { bookings } = await response.json();

    document.getElementById('bookings-loading').style.display = 'none';

    if (!bookings || bookings.length === 0) {
        document.getElementById('bookings-empty').style.display = 'block';
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-today').textContent = '0';
        document.getElementById('stat-revenue').textContent = '$0';
        return;
    }

    allBookings = bookings;
    updateStats();
    renderBookings();

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderBookings();
        });
    });
}
