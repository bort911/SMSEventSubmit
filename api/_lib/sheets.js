const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

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
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

// Find or create a folder by name, optionally inside a parent folder
async function findOrCreateFolder(drive, name, parentId) {
  const query = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({ q: query, fields: "files(id, name)" });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create the folder
  const fileMetadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) fileMetadata.parents = [parentId];

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });

  return folder.data.id;
}

// Upload image buffer to Google Drive and return a viewable link
async function uploadImageToDrive(imageBuffer, fileName, mediaType) {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // Find or create "SMS Events" folder
  const smsEventsFolderId = await findOrCreateFolder(drive, "SMS Events");

  // Find or create "img" subfolder inside "SMS Events"
  const imgFolderId = await findOrCreateFolder(drive, "img", smsEventsFolderId);

  // Upload the image
  const stream = new Readable();
  stream.push(imageBuffer);
  stream.push(null);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [imgFolderId],
    },
    media: {
      mimeType: mediaType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  // Make the file viewable by anyone with the link
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
