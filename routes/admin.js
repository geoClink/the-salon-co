const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

async function requireAdminAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7));
    if (error || !user) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    next();
}

router.get('/admin/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    });
});

router.get('/admin/bookings', requireAdminAuth, async (req, res) => {
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

router.get('/admin/services', requireAdminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('name, price')
            .eq('tenant_id', req.tenant.id);

        if (error) throw error;
        res.json({ services: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/closed-dates', requireAdminAuth, async (req, res) => {
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

router.post('/admin/closed-dates', requireAdminAuth, async (req, res) => {
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

router.delete('/admin/closed-dates/:id', requireAdminAuth, async (req, res) => {
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
