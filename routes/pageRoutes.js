const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('pages/landing', { title: 'Welcome' });
});

router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login' });
});

router.get('/dashboard', (req, res) => {
    // In the future, check if user is logged in here
    res.render('pages/dashboard', { title: 'My Library' });
});

module.exports = router;