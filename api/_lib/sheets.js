const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

function getAuth() {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const filePath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    credentials = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function appendEvent(eventData) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    new Date().toISOString(),
    eventData.eventName || "",
    eventData.date || "",
    eventData.time || "",
    eventData.location || "",
    eventData.description || "",
    eventData.price || "",
    eventData.url || "",
    eventData.frequency || "Once",
    eventData.imageUrl || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "Sheet1!A:J",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return row;
}

module.exports = { appendEvent };
