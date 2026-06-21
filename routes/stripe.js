const express = require('express');
const router = express.Router();
const stripe = require('../lib/stripe');
const supabase = require('../lib/supabase');

const SERVICES = {
    '01': { name: 'Signature Cut & Finish', price: 14500 },
    '02': { name: 'Returning Cut',          price: 11500 },
    '03': { name: 'Texture & Curl Cut',     price: 16500 },
    '04': { name: 'Single-process Color',   price: 14500 },
    '05': { name: 'Hand-painted Balayage',  price: 28000 },
    '06': { name: 'The Long Ritual',        price: 32000 },
};

function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"']/g, '').trim().slice(0, 200);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10,15}$/.test(phone.replace(/\D/g, ''));
}

router.post('/create-checkout-session', async (req, res) => {
    try {
        const { serviceId, customerName, customerEmail, customerPhone } = req.body;
        const stylist = sanitize(req.body.stylist);
        const date = sanitize(req.body.date);
        const time = sanitize(req.body.time);

        const service = SERVICES[serviceId];
        if (!service) return res.status(400).json({ error: 'Invalid service' });

        if (!customerName || sanitize(customerName).length < 2)
            return res.status(400).json({ error: 'Invalid name' });
        if (!isValidEmail(customerEmail))
            return res.status(400).json({ error: 'Invalid email' });
        if (!isValidPhone(customerPhone))
            return res.status(400).json({ error: 'Invalid phone' });

        const depositAmount = Math.round(service.price * 0.25);
        const origin = req.protocol + '://' + req.get('host');

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `25% Deposit — ${service.name}`,
                        description: `${stylist} · ${date} at ${time}`,
                    },
                    unit_amount: depositAmount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: customerEmail,
            success_url: `${origin}/success.html?service=${encodeURIComponent(service.name)}&stylist=${encodeURIComponent(sanitize(req.body.stylist))}&date=${encodeURIComponent(sanitize(req.body.date))}&time=${encodeURIComponent(sanitize(req.body.time))}`,
            cancel_url: `${origin}/book.html`,
            metadata: {
                tenant_id: req.tenant.id,
                serviceId: sanitize(serviceId),
                serviceName: sanitize(service.name),
                stylist,
                date,
                time,
                customerName: sanitize(customerName),
                customerEmail: sanitize(customerEmail),
                customerPhone: sanitize(customerPhone),
            },
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const m = session.metadata;

        const { error } = await supabase.from('bookings').insert({
            tenant_id: m.tenant_id,
            stylist: m.stylist,
            date: m.date,
            time: m.time,
            service: m.serviceName,
            customer_name: m.customerName,
            customer_email: m.customerEmail,
            customer_phone: m.customerPhone,
            stripe_session_id: session.id,
        });

        if (error) console.error('Supabase insert error:', error);
        else console.log('Booking saved successfully');
    }

    res.json({ received: true });
});

module.exports = router;
