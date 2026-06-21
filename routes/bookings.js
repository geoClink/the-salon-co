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

  module.exports = router;