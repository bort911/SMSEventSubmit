const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

async function appendEvent(eventData) {
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const filePath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    credentials = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

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
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "Sheet1!A:H",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return row;
}

module.exports = { appendEvent };
