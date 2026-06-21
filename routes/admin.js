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

module.exports = router;