// app.js
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const pageRoutes = require("./routes/pageRoutes");

const app = express();

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//auth middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static Files (CSS/JS)
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", pageRoutes);

module.exports = app;
