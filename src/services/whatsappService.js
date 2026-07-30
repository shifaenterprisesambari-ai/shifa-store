import { sendSMS } from "./fast2smsService.js";

/**
 * Fast2SMS Message delivery service (Twilio removed).
 * @param {string|number} phone - Recipient phone number (10-digit Indian phone number)
 * @param {string} message - Message body text
 */
export const sendWhatsApp = async (phone, message) => {
  if (!phone) {
    console.log("[Fast2SMS] No phone number — skipping SMS send.");
    return;
  }

  console.log(`\n--- FAST2SMS SMS MESSAGE ---`);
  console.log(`To: ${phone}`);
  console.log(`Body:\n${message}`);
  console.log(`----------------------------\n`);

  return sendSMS({ phone, message });
};
