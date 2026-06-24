const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

router.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ ok: true });
    } else {
        res.status(401).json({ error: 'Incorrect password' });
    }
});

router.get('/admin/bookings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', req.tenant.id)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (error) throw error;

        res.json({ bookings: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/closed-dates', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('closed_dates')
            .select('id, date, reason')
            .eq('tenant_id', req.tenant.id)
            .gte('date', today)
            .order('date', { ascending: true });

        if (error) throw error;
        res.json({ closedDates: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/closed-dates', async (req, res) => {
    try {
        const { date, reason } = req.body;
        if (!date) return res.status(400).json({ error: 'date required' });

        const { data, error } = await supabase
            .from('closed_dates')
            .insert({ tenant_id: req.tenant.id, date, reason: reason || null })
            .select('id, date, reason')
            .single();

        if (error) throw error;
        res.json({ closedDate: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/admin/closed-dates/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('closed_dates')
            .delete()
            .eq('id', req.params.id)
            .eq('tenant_id', req.tenant.id);

        if (error) throw error;
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;