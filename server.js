// Load env - manually parse to avoid dotenv quirks with long values
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach((line) => {
  const eq = line.indexOf("=");
  if (eq > 0) {
    const key = line.substring(0, eq).trim();
    const val = line.substring(eq + 1).trim();
    if (key) {
      process.env[key] = val;
    }
  }
});

const express = require("express");
const smsHandler = require("./api/sms");

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio sends form-encoded POST data
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("SMS Event Submit server is running!");
});

// SMS webhook endpoint
app.post("/api/sms", (req, res) => {
  smsHandler(req, res);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Twilio webhook URL: http://localhost:${PORT}/api/sms`);
  console.log(`\nTo expose publicly, run: npx ngrok http ${PORT}`);
});
