// app.js
const express = require('express');
const path = require('path');
const pageRoutes = require('./routes/pageRoutes');

const app = express();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files (CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', pageRoutes);

module.exports = app;