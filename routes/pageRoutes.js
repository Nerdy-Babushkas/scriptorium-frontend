const express = require('express');
const router = express.Router();

router.get('/', (req, res) => { //done
    res.render('pages/landing');
});

router.get('/login', (req, res) => { //not done
    res.render('pages/login');
});

router.get('/signup', (req, res) => { //not
    res.render('pages/signup'); 
});

router.get('/about', (req, res) => { //done
    res.render('pages/landing');
});

router.get('/features', (req, res) => {
    res.redirect('/#features');
});

router.get('/contact', (req, res) => { 
    res.render('pages/contact');
});

router.get('/room', (req, res) => { 
    res.render('pages/room');
});

router.get('/account', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Account' });
});

router.get('/rewards', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Rewards' });
});

router.get('/customise', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Customise' });
});

router.get('/progress', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Progress' });
});

router.get('/library', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Library' });
});

router.get('/music', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Music Room' });
});

router.get('/theatre', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'Theatre' });
});

router.get('/ai-recommendations', (req, res) => { 
    res.render('pages/placeholder', { pageName: 'AI Recommendations' });
});

router.use((req, res) => {
    res.status(404).render('pages/404');
});
module.exports = router;