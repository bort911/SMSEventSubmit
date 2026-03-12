const { extractEventFromText, extractEventFromImage } = require("./_lib/claude");
const { appendEvent } = require("./_lib/sheets");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { Body, From, NumMedia, MediaUrl0, MediaContentType0 } = req.body;
  const numMedia = parseInt(NumMedia || "0", 10);

  console.log(`Received SMS from ${From}: "${Body}" (${numMedia} media)`);
  console.log(`API key loaded: ${process.env.ANTHROPIC_API_KEY ? "yes (" + process.env.ANTHROPIC_API_KEY.substring(0, 10) + "...)" : "NO - MISSING!"}`);


  try {
    let eventData;

    if (numMedia > 0 && MediaContentType0?.startsWith("image/")) {
      console.log("Processing image...");
      const imageResponse = await fetch(MediaUrl0, {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString("base64"),
        },
      });
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const base64Data = imageBuffer.toString("base64");

      eventData = await extractEventFromImage(
        base64Data,
        MediaContentType0,
        Body?.trim() || ""
      );
      eventData.imageUrl = MediaUrl0;
    } else if (Body?.trim()) {
      console.log("Processing text with Claude...");
      eventData = await extractEventFromText(Body.trim());
    } else {
      console.log("No text or image received");
      return res.status(200).send("<Response></Response>");
    }

    console.log("Claude extracted:", JSON.stringify(eventData));

    // Append to Google Sheet
    console.log("Writing to Google Sheet...");
    await appendEvent(eventData);
    console.log("Successfully added to Google Sheet!");

    // Return TwiML response (no reply SMS to avoid A2P 10DLC issues)
    return res.status(200).set("Content-Type", "text/xml").send("<Response></Response>");
  } catch (error) {
    console.error("Error processing SMS:", error.message || error);
    return res.status(200).set("Content-Type", "text/xml").send("<Response></Response>");
  }
};
