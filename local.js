// local.js
const app = require('./app');
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Scriptorium running locally on http://localhost:${PORT}`);
});