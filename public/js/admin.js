const loginBtn = document.getElementById('admin-login-btn');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

const DEPOSIT_MAP = {
    'Signature Cut & Finish': 3625,
    'Returning Cut':          2875,
    'Texture & Curl Cut':     4125,
    'Single-process Color':   3625,
    'Hand-painted Balayage':  7000,
    'The Long Ritual':        8000,
};

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
        loadBookings();
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

    const today = todayString();
    const todayCount = bookings.filter(b => b.date === today).length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (DEPOSIT_MAP[b.service] || 0), 0);

    document.getElementById('stat-total').textContent = bookings.length;
    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('stat-revenue').textContent = '$' + (totalRevenue / 100).toFixed(2);

    const tbody = document.getElementById('bookings-body');
    bookings.forEach(b => {
        const row = document.createElement('tr');
        if (b.date === today) row.classList.add('today-row');
        row.innerHTML = `
            <td>${escapeHtml(formatDate(b.date))}</td>
            <td>${escapeHtml(b.time)}</td>
            <td>${escapeHtml(b.stylist)}</td>
            <td>${escapeHtml(b.service)}</td>
            <td>${escapeHtml(formatDeposit(b.service))}</td>
            <td>${escapeHtml(b.customer_name)}</td>
            <td>${escapeHtml(b.customer_email)}</td>
            <td>${escapeHtml(b.customer_phone)}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('bookings-table').style.display = 'table';
}
