const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('pages/landing');
});

router.get('/login', (req, res) => {
    res.render('pages/login');
});

router.get('/signup', (req, res) => {
    res.render('pages/signup'); // You'll create this next
});

// Placeholders for the other pages in your App.tsx
router.get('/about', (req, res) => {
    res.render('pages/placeholder', { pageName: 'About Us' });
});

router.get('/features', (req, res) => {
    res.render('pages/placeholder', { pageName: 'Features' });
});

router.get('/contact', (req, res) => {
    res.render('pages/placeholder', { pageName: 'Contact' });
});

module.exports = router;