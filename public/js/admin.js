let supabaseClient = null;
let accessToken = null;
let DEPOSIT_MAP = {};

async function initSupabase() {
    const res = await fetch('/admin/config');
    const { supabaseUrl, supabaseAnonKey } = await res.json();
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
    };
}

function showLogin(message) {
    accessToken = null;
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-login').style.display = 'flex';
    document.getElementById('admin-password').value = '';
    if (message) document.getElementById('login-error').textContent = message;
}

document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();

    const loginBtn = document.getElementById('admin-login-btn');
    const passwordInput = document.getElementById('admin-password');
    const emailInput = document.getElementById('admin-email');
    const loginError = document.getElementById('login-error');

    async function doLogin() {
        loginError.textContent = '';
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error || !data.session) {
            loginError.textContent = 'Incorrect email or password.';
            return;
        }

        accessToken = data.session.access_token;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';

        fetch('/admin/services', { headers: authHeaders() })
            .then(r => {
                if (r.status === 401) { showLogin('Session expired. Please log in again.'); return null; }
                return r.json();
            })
            .then(data => {
                if (!data) return;
                data.services.forEach(s => {
                    DEPOSIT_MAP[s.name] = Math.round(s.price * 0.25);
                });
                loadBookings();
            });

        loadClosedDates();
        startSessionTimer();
    }

    loginBtn.addEventListener('click', doLogin);
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

    const addBtn = document.getElementById('add-closed-date-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const date = document.getElementById('closed-date-input').value;
            const reason = document.getElementById('closed-date-reason').value.trim();
            const errorEl = document.getElementById('closed-date-error');

            if (!date) { errorEl.textContent = 'Please select a date.'; return; }
            errorEl.textContent = '';

            const res = await fetch('/admin/closed-dates', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ date, reason }),
            });

            if (res.status === 401) { showLogin('Session expired. Please log in again.'); return; }

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
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(async () => {
        if (supabaseClient) await supabaseClient.auth.signOut();
        showLogin('Session expired. Please log in again.');
    }, SESSION_TIMEOUT);
}

function resetSessionTimer() {
    if (!accessToken) return;
    clearTimeout(sessionTimer);
    startSessionTimer();
}

document.addEventListener('mousemove', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);

async function loadClosedDates() {
    const res = await fetch('/admin/closed-dates', { headers: authHeaders() });
    if (res.status === 401) { showLogin('Session expired. Please log in again.'); return; }
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
            await fetch(`/admin/closed-dates/${id}`, { method: 'DELETE', headers: authHeaders() });
            loadClosedDates();
        });
        list.appendChild(li);
    });
}

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
    const response = await fetch('/admin/bookings', { headers: authHeaders() });
    if (response.status === 401) { showLogin('Session expired. Please log in again.'); return; }

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
