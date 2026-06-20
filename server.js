require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const path = require('path');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const SERVICES = {
    '01': { name: 'Signature Cut & Finish', price: 14500 },
    '02': { name: 'Returning Cut', price: 11500 },
    '03': { name: 'Texture & Curl Cut', price: 16500 },
    '04': { name: 'Single-process Color', price: 14500 },
    '05': { name: 'Hand-painted Balayage', price: 28000 },
    '06': { name: 'The Long Ritual', price: 32000 },
};

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { serviceId, serviceName, stylist, date, time, customerEmail
        } = req.body;

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
            });

            res.json({ url: session.url });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));