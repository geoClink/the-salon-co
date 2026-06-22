const express = require('express');
  const router = express.Router();
  const supabase = require('../lib/supabase');

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

      const { data, error } = await supabase
          .from('bookings')
          .select('service, stylist, date, time, customer_name, cancel_token')
          .eq('tenant_id', req.tenant.id)
          .eq('stripe_session_id', session_id)
          .single();

      if (error || !data) return res.status(404).json({ error: 'Booking not found' });

      res.json({
          service: data.service,
          stylist: data.stylist,
          date: data.date,
          time: data.time,
          customer_name: data.customer_name,
          cancel_url: `/cancel?token=${data.cancel_token}`,
      });
  });

  // Cancel a booking by token (no auth — token is the credential)
  router.patch('/bookings/cancel', async (req, res) => {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'token required' });

      const { data, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('cancel_token', token)
          .eq('tenant_id', req.tenant.id)
          .select('id, date, time, service')
          .single();

      if (error || !data) return res.status(404).json({ error: 'Booking not found or already cancelled' });

      res.json({ success: true, booking: data });
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

  module.exports = router;