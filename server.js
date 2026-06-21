require('dotenv').config();

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const tenantMiddleware = require('./middleware/tenant');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const stripeRouter = require('./routes/stripe');

const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const checkoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many requests. Please slow down.' },
});

const app = express();

app.use('/webhook', express.raw({ type: 'application/json' }), stripeRouter);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(tenantMiddleware);

app.use(bookingsRouter);
app.use('/admin/login', adminLoginLimiter);
app.use('/create-checkout-session', checkoutLimiter);
app.use(adminRouter);
app.use(stripeRouter);

app.get('/health', (req, res) => res.sendStatus(200));

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
