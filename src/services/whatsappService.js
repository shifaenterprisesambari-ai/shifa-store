import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

let client = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn("⚠️  Twilio credentials not set — WhatsApp notifications disabled.");
}

/**
 * Send a WhatsApp message via Twilio.
 * @param {string|number} phone - Recipient phone number (with country code, e.g. 919876543210)
 * @param {string} message - Message body text
 */
export const sendWhatsApp = async (phone, message) => {
  if (!client || !fromNumber) {
    console.log("[WhatsApp] Twilio not configured — skipping WhatsApp send.");
    return;
  }

  if (!phone) {
    console.log("[WhatsApp] No phone number — skipping.");
    return;
  }

  // Normalize phone: ensure it starts with + and country code
  const normalized = String(phone).replace(/\D/g, "");
  const to = normalized.startsWith("91") || normalized.length === 12
    ? `whatsapp:+${normalized}`
    : `whatsapp:+91${normalized}`; // default to India (+91)

  try {
    const msg = await client.messages.create({
      from: fromNumber,
      to,
      body: message,
    });
    console.log(`✅ WhatsApp sent to ${to} — SID: ${msg.sid}`);
  } catch (err) {
    // Log but don't crash — WhatsApp is secondary to the main notification
    console.error(`❌ WhatsApp failed to ${to}:`, err.message);
  }
};
