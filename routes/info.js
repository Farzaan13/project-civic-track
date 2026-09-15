const express = require("express");
const router = express.Router();

// About CivicTrack
router.get("/about", (req, res) => {
    res.render("info/about");
});

// Contact Us
router.get("/contact", (req, res) => {
    res.render("info/contact");
});

// Privacy Policy
router.get("/privacy", (req, res) => {
    res.render("info/privacy");
});

// Terms & Conditions
router.get("/terms", (req, res) => {
    res.render("info/terms");
});

module.exports = router;