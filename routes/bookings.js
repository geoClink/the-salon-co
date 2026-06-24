const express = require('express');
  const router = express.Router();
  const supabase = require('../lib/supabase');
  const stripe = require('../lib/stripe');
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  router.get('/booked-slots', async (req, res) => {
      try {
          const { stylist, date } = req.query;

          const { data, error } = await supabase
              .from('bookings')
              .select('time')
              .eq('tenant_id', req.tenant.id)
              .eq('stylist', stylist)
              .eq('date', date);

          if (error) throw error;

          res.json({ bookedTimes: data.map(row => row.time) });
      } catch (err) {
          console.error(err);
          res.status(500).json({ error: err.message });
      }
  });

  // Fetch booking details by Stripe session ID (used on success page)
  router.get('/booking-confirmed', async (req, res) => {
      const { session_id } = req.query;
      if (!session_id) return res.status(400).json({ error: 'session_id required' });

      // Try Supabase first — webhook may have already fired
      const { data } = await supabase
          .from('bookings')
          .select('service, stylist, date, time, customer_name, cancel_token')
          .eq('tenant_id', req.tenant.id)
          .eq('stripe_session_id', session_id)
          .single();

      if (data) {
          return res.json({
              service: data.service,
              stylist: data.stylist,
              date: data.date,
              time: data.time,
              customer_name: data.customer_name,
              cancel_url: `/cancel?token=${data.cancel_token}`,
          });
      }

      // Webhook hasn't fired yet — pull details directly from Stripe session metadata
      try {
          const session = await stripe.checkout.sessions.retrieve(session_id);
          const m = session.metadata;
          if (!m || m.tenant_id !== req.tenant.id) return res.status(404).json({ error: 'Booking not found' });
          return res.json({
              service: m.serviceName,
              stylist: m.stylist,
              date: m.date,
              time: m.time,
              customer_name: m.customerName,
          });
      } catch (err) {
          return res.status(404).json({ error: 'Booking not found' });
      }
  });

  // Cancel a booking by token (no auth — token is the credential)
  router.patch('/bookings/cancel', async (req, res) => {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'token required' });

      const { data: existing, error: fetchError } = await supabase
          .from('bookings')
          .select('id, date, time, service, status, stripe_session_id')
          .eq('cancel_token', token)
          .eq('tenant_id', req.tenant.id)
          .single();

      if (fetchError || !existing) return res.status(404).json({ error: 'Booking not found or already cancelled' });

      // Parse "02:00 PM" into 24h so we can build a proper Date
      const [timePart, period] = existing.time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const appointmentDate = new Date(`${existing.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const hoursUntil = (appointmentDate - new Date()) / (1000 * 60 * 60);

      if (hoursUntil < 48) {
          return res.status(400).json({ error: 'Cancellations must be made at least 48 hours before your appointment. Please call us directly.' });
      }

      const { data, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('cancel_token', token)
          .eq('tenant_id', req.tenant.id)
          .select('id, date, time, service')
          .single();

      if (error || !data) return res.status(404).json({ error: 'Booking not found or already cancelled' });

      // Issue Stripe refund automatically
      if (existing.stripe_session_id) {
          try {
              const session = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
              if (session.payment_intent) {
                  await stripe.refunds.create({ payment_intent: session.payment_intent });
              }
          } catch (refundErr) {
              console.error('Stripe refund error:', refundErr.message);
          }
      }

      res.json({ success: true, booking: data });
  });

  // Returns owner-blocked dates for a given month (used by the booking calendar)
  router.get('/closed-dates', async (req, res) => {
      try {
          const { year, month } = req.query;
          const paddedMonth = String(month).padStart(2, '0');
          const from = `${year}-${paddedMonth}-01`;
          const to = `${year}-${paddedMonth}-31`;

          const { data, error } = await supabase
              .from('closed_dates')
              .select('date')
              .eq('tenant_id', req.tenant.id)
              .gte('date', from)
              .lte('date', to);

          if (error) throw error;
          res.json({ closedDates: data.map(r => r.date) });
      } catch (err) {
          res.status(500).json({ error: err.message });
      }
  });

  // Returns dates in a given month where ALL of the stylist's slots are taken
  router.get('/booked-dates', async (req, res) => {
      try {
          const { stylist, year, month } = req.query;
          const paddedMonth = String(month).padStart(2, '0');
          const from = `${year}-${paddedMonth}-01`;
          const to = `${year}-${paddedMonth}-31`;

          const { data, error } = await supabase
              .from('bookings')
              .select('date, time')
              .eq('tenant_id', req.tenant.id)
              .eq('stylist', stylist)
              .gte('date', from)
              .lte('date', to);

          if (error) throw error;

          // Group booked times by date
          const byDate = {};
          data.forEach(row => {
              if (!byDate[row.date]) byDate[row.date] = [];
              byDate[row.date].push(row.time);
          });

          res.json({ bookedByDate: byDate });
      } catch (err) {
          console.error(err);
          res.status(500).json({ error: err.message });
      }
  });

  router.post('/contact', async (req, res) => {
      const { firstName, lastName, email, phone, subject, message } = req.body;

      if (!firstName || !lastName || !email || !message) {
          return res.status(400).json({ error: 'Please fill in all required fields.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: 'Invalid email address.' });
      }

      const ownerEmail = process.env.OWNER_EMAIL;
      if (!ownerEmail) return res.status(500).json({ error: 'Contact form is not configured.' });

      try {
          await resend.emails.send({
              from: 'The Salon Co. <onboarding@resend.dev>',
              to: ownerEmail,
              reply_to: email,
              subject: `Contact form: ${subject || 'General enquiry'} — ${firstName} ${lastName}`,
              html: `
                  <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #1A2E2A;">
                      <p style="font-size: 1.2rem; font-weight: 300;">New message from the website.</p>
                      <hr style="border: none; border-top: 0.5px solid #1A2E2A; margin: 1rem 0;">
                      <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
                          <tr><td style="padding: 0.5rem 0; color: #6a746d;">Name</td><td>${firstName} ${lastName}</td></tr>
                          <tr><td style="padding: 0.5rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Email</td><td style="border-top: 0.5px solid rgba(26,46,42,0.1);">${email}</td></tr>
                          <tr><td style="padding: 0.5rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Phone</td><td style="border-top: 0.5px solid rgba(26,46,42,0.1);">${phone || '—'}</td></tr>
                          <tr><td style="padding: 0.5rem 0; color: #6a746d; border-top: 0.5px solid rgba(26,46,42,0.1);">Subject</td><td style="border-top: 0.5px solid rgba(26,46,42,0.1);">${subject || '—'}</td></tr>
                      </table>
                      <hr style="border: none; border-top: 0.5px solid #1A2E2A; margin: 1rem 0;">
                      <p style="font-size: 0.9rem; white-space: pre-wrap;">${message}</p>
                      <hr style="border: none; border-top: 0.5px solid rgba(26,46,42,0.15); margin: 1rem 0;">
                      <p style="font-size: 0.8rem; color: #6a746d;">Reply directly to this email to respond to ${firstName}.</p>
                  </div>
              `,
          });

          res.json({ ok: true });
      } catch (err) {
          console.error('Contact email error:', err.message);
          res.status(500).json({ error: 'Failed to send message. Please try again.' });
      }
  });

  module.exports = router;