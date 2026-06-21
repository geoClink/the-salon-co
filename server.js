require('dotenv').config();

const express = require('express');
const path = require('path');

const tenantMiddleware = require('./middleware/tenant');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const stripeRouter = require('./routes/stripe');

const app = express();

app.use('/webhook', express.raw({ type: 'application/json' }), stripeRouter);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(tenantMiddleware);

app.use(bookingsRouter);
app.use(adminRouter);
app.use(stripeRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
