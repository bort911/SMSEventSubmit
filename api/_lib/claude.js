const Anthropic = require("@anthropic-ai/sdk");

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are an event data extraction assistant. Extract structured event information from the provided text or image. Return ONLY a valid JSON object with these exact keys:

- eventName: Name or title of the event
- date: Date of the event (format: YYYY-MM-DD if possible, otherwise as stated)
- time: Time of the event (format: HH:MM AM/PM if possible, otherwise as stated)
- location: Venue name and/or address
- description: Brief one-sentence description of the event
- price: Ticket price or cost (include currency symbol if mentioned)
- url: Any website URL or ticket link mentioned
- frequency: How often the event occurs. Must be one of: "Once", "Weekly", "Monthly", "Daily", or "Other". If the event mentions recurring (e.g. "every Tuesday", "monthly meetup"), pick the appropriate value. Default to "Once" if not indicated.

For any field you cannot determine, use an empty string "". For frequency, default to "Once".
Return ONLY the JSON object. No markdown, no backticks, no explanation.`;

async function extractEventFromText(text) {
  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  return JSON.parse(message.content[0].text);
}

async function extractEventFromImage(base64Data, mediaType, accompanyingText) {
  const content = [
    {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64Data },
    },
  ];

  const textPrompt = accompanyingText
    ? `Extract event details from this image. The sender also included this text: "${accompanyingText}"`
    : "Extract event details from this image.";

  content.push({ type: "text", text: textPrompt });

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  return JSON.parse(message.content[0].text);
}

module.exports = { extractEventFromText, extractEventFromImage };
