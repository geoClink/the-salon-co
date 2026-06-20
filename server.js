require('dotenv').config();

const express = require('express');
const Stripe = require('stripe');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TENANT_ID = process.env.TENANT_ID;

// Webhook must come before express.json() so Stripe gets the raw body
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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

        console.log('Webhook metadata:', m);

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

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SERVICES = {
    '01': { name: 'Signature Cut & Finish', price: 14500 },
    '02': { name: 'Returning Cut',          price: 11500 },
    '03': { name: 'Texture & Curl Cut',     price: 16500 },
    '04': { name: 'Single-process Color',   price: 14500 },
    '05': { name: 'Hand-painted Balayage',  price: 28000 },
    '06': { name: 'The Long Ritual',        price: 32000 },
};

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { serviceId, serviceName, stylist, date, time, customerName, customerEmail, customerPhone } = req.body;

        const service = SERVICES[serviceId];
        if (!service) return res.status(400).json({ error: 'Invalid service' });

        const depositAmount = Math.round(service.price * 0.25);
        const origin = req.protocol + '://' + req.get('host');

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `25% Deposit — ${serviceName}`,
                        description: `${stylist} · ${date} at ${time}`,
                    },
                    unit_amount: depositAmount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: customerEmail,
            success_url: `${origin}/success.html`,
            cancel_url: `${origin}/book.html`,
            metadata: {
                tenant_id: TENANT_ID,
                serviceId,
                serviceName,
                stylist,
                date,
                time,
                customerName,
                customerEmail,
                customerPhone,
            },
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/booked-slots', async (req, res) => {
    try {
        const { stylist, date } = req.query;

        const { data, error } = await supabase
            .from('bookings')
            .select('time')
            .eq('tenant_id', TENANT_ID)
            .eq('stylist', stylist)
            .eq('date', date);

        if (error) throw error;

        res.json({ bookedTimes: data.map(row => row.time) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
