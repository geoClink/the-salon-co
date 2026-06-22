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