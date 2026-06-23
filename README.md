# The Salon Co.

A booking and deposit platform for a four-chair hair studio. Built with HTML/CSS/JS, Node.js/Express, Stripe, and Supabase.

**Live site:** https://the-salon-co.onrender.com

---

## Features

- Multi-step appointment booking flow (service → stylist → date & time → contact details)
- 25% deposit payment via Stripe Checkout
- Booked time slots and fully-booked dates automatically grayed out
- Client cancellation via tokenized link (no login required)
- Bookings saved to Supabase with full tenant isolation
- Admin dashboard for viewing upcoming appointments (password protected)
- Self-hosted fonts (Cormorant Garamond, Jost) — no Google Fonts dependency

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Payments | Stripe Checkout |
| Database | Supabase (PostgreSQL) |
| Hosting | Render |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
TENANT_ID=your_tenant_uuid
ADMIN_PASSWORD=yourchosenpassword
```

### 3. Set up the database

Run this in the Supabase SQL Editor:

```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  stylist text not null,
  date date not null,
  time text not null,
  service text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  stripe_session_id text,
  cancel_token uuid default gen_random_uuid(),
  status text default 'confirmed',
  created_at timestamptz default now()
);

grant all on public.bookings to service_role;
```

### 4. Run the server

```bash
npm start
```

Visit `http://localhost:3000`

### 5. Set up Stripe webhooks (local testing)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/webhook
```

Copy the `whsec_...` secret printed in the terminal into your `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on Render connected to the repo
3. Set **Build Command** to `npm install` and **Start Command** to `node server.js`
4. Add all environment variables from `.env` in the Render dashboard
5. Set up a Stripe webhook in the Stripe dashboard pointing to `https://the-salon-co.onrender.com/webhook`

---

## Admin

The admin dashboard is at `/admin.html` — not linked anywhere on the public site. Access requires the password set in `ADMIN_PASSWORD`.

---

## Project Structure

```
the-salon-co/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── fonts/              # Self-hosted WOFF2 files
│   ├── images/
│   ├── js/
│   │   ├── script.js       # Booking flow, calendar, validation
│   │   └── admin.js        # Admin dashboard logic
│   ├── index.html
│   ├── reserve.html
│   ├── success.html
│   ├── cancel.html
│   ├── admin.html
│   └── ...
├── routes/
│   ├── bookings.js
│   ├── stripe.js
│   └── admin.js
├── lib/
│   ├── stripe.js
│   └── supabase.js
├── middleware/
├── server.js
└── package.json
```
