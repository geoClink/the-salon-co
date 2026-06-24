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

app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https://images.pexels.com data:",
            "font-src 'self'",
            "connect-src 'self' https://api.stripe.com",
            "frame-src https://js.stripe.com",
        ].join('; ')
    );
    next();
});

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
