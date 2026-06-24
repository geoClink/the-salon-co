const express = require('express');
const router = express.Router();
const stripe = require('../lib/stripe');
const supabase = require('../lib/supabase');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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

        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('name, price')
            .eq('tenant_id', req.tenant.id)
            .eq('slug', sanitize(serviceId))
            .single();
        if (serviceError || !service) return res.status(400).json({ error: 'Invalid service' });

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
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/reserve.html`,
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

        const { data: booking, error } = await supabase.from('bookings').insert({
            tenant_id: m.tenant_id,
            stylist: m.stylist,
            date: m.date,
            time: m.time,
            service: m.serviceName,
            customer_name: m.customerName,
            customer_email: m.customerEmail,
            customer_phone: m.customerPhone,
            stripe_session_id: session.id,
        }).select('cancel_token').single();

        if (error) {
            console.error('Supabase insert error:', error);
        } else {
            console.log('Booking saved successfully');
            const origin = 'https://the-salon-co.onrender.com';
            const cancelUrl = `${origin}/cancel?token=${booking.cancel_token}`;
            const formattedDate = new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });

            await resend.emails.send({
                from: 'The Salon Co. <onboarding@resend.dev>',
                to: m.customerEmail,
                subject: 'Your appointment is confirmed — The Salon Co.',
                html: `
                    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #1A2E2A;">
                        <p style="font-size: 1.5rem; font-weight: 300; margin-bottom: 0.5rem;">You're confirmed.</p>
                        <p style="font-size: 0.9rem; color: #6a746d; margin-top: 0;">Your deposit was received. We'll see you soon.</p>

                        <hr style="border: none; border-top: 0.5px solid #1A2E2A; margin: 1.5rem 0;">

                        <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                            <tr><td style="padding: 0.6rem 0; color: #6a746d;">Service</td><td style="text-align: right;">${m.serviceName}</td></tr>
                            <tr><td style="padding: 0.6rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Stylist</td><td style="text-align: right; border-top: 0.5px solid rgba(26,46,42,0.1);">${m.stylist}</td></tr>
                            <tr><td style="padding: 0.6rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Date</td><td style="text-align: right; border-top: 0.5px solid rgba(26,46,42,0.1);">${formattedDate}</td></tr>
                            <tr><td style="padding: 0.6rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Time</td><td style="text-align: right; border-top: 0.5px solid rgba(26,46,42,0.1);">${m.time}</td></tr>
                        </table>

                        <hr style="border: none; border-top: 0.5px solid #1A2E2A; margin: 1.5rem 0;">

                        <p style="font-size: 0.85rem; color: #6a746d;">Need to cancel? You can do so up to 48 hours before your appointment for a full deposit refund.</p>
                        <a href="${cancelUrl}" style="display: inline-block; margin-top: 0.5rem; font-size: 0.85rem; color: #1A2E2A;">Cancel this appointment →</a>

                        <hr style="border: none; border-top: 0.5px solid rgba(26,46,42,0.15); margin: 1.5rem 0;">
                        <p style="font-size: 0.8rem; color: #6a746d;">The Salon Co. &nbsp;·&nbsp; By appointment only.</p>
                    </div>
                `,
            });
        }
    }

    res.json({ received: true });
});

module.exports = router;
