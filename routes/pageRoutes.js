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

// router.get('/contact', (req, res) => { 
//     res.render('pages/placeholder', { pageName: 'Contact' });
// });

router.use((req, res) => {
    res.status(404).render('pages/404');
});
module.exports = router;