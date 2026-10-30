const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Welcome to my Node.js and Express server!");
});

app.get("/about", (req, res) => {
  res.status(200).json({
    name: "Paidi Sunhith Reddy",
    registrationNumber: "252U1R1174",
    class: "214",
    section: "CSE1D",
    college: "Aurora Deemed to be University",
    faculty: "Shiva Teja"
  });
});

app.get("/time", (req, res) => {
  res.status(200).json({ time: new Date().toISOString() });
});

// Keep this handler after all valid routes.
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT} (port ${PORT})`);
  });
}

module.exports = app;
