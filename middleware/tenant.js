const tenant = {
    id: process.env.TENANT_ID,
    name: 'The-Salon-Co.',
    slug: 'the-salon-co.',
    owner_email: process.env.OWNER_EMAIL,
};

module.exports = (req, res, next) => {
    req.tenant = tenant;
    next();
}