const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const DRIVE_IMG_FOLDER_ID = "11HXzfjuYgMQ9ejtIZV5p_UU_g17ocyaT";

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
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
}

// Upload image buffer to the shared Google Drive img folder
async function uploadImageToDrive(imageBuffer, fileName, mediaType) {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const stream = new Readable();
  stream.push(imageBuffer);
  stream.push(null);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_IMG_FOLDER_ID],
    },
    media: {
      mimeType: mediaType,
      body: stream,
    },
    fields: "id",
  });

  // Make viewable by anyone with the link
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return `https://drive.google.com/uc?id=${file.data.id}`;
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
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return row;
}

module.exports = { appendEvent, uploadImageToDrive };
