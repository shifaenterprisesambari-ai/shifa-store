import "dotenv/config";

/**
 * Fast2SMS Service for sending SMS and OTPs in India.
 * Supports both Quick OTP/SMS route (for instant dev setup) and DLT route (for production).
 */

/**
 * Helper to normalize Indian phone numbers to 10 digits.
 * Removes +91, 0, spaces, hyphens.
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

/**
 * Send an OTP or SMS message via Fast2SMS API (bulkV2).
 *
 * @param {Object} options
 * @param {string} options.phone - 10-digit Indian phone number
 * @param {string} [options.otp] - OTP string (used for Quick OTP route or template variable)
 * @param {string} [options.message] - Text message body
 * @param {string} [options.dltTeId] - Optional DLT Template ID override
 * @param {string} [options.variablesValues] - Pipe or comma separated variables for DLT template
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function sendSMS({ phone, otp, message, dltTeId, variablesValues }) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const route = process.env.FAST2SMS_ROUTE || "q";
  const senderId = process.env.FAST2SMS_SENDER_ID || "";
  const envDltTeId = process.env.FAST2SMS_DLT_TE_ID || "";
  const enableSms = process.env.ENABLE_SMS_NOTIFICATIONS !== "false";

  if (!enableSms) {
    console.log("[Fast2SMS] SMS notifications are disabled in configuration.");
    return { success: false, error: "SMS disabled" };
  }

  if (!apiKey) {
    console.warn("⚠️  FAST2SMS_API_KEY is not set in environment. Skipping SMS send.");
    return { success: false, error: "Missing API Key" };
  }

  const cleanPhone = normalizePhoneNumber(phone);
  if (!cleanPhone) {
    console.warn(`⚠️  Invalid phone number format for Fast2SMS: ${phone}`);
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const isDltRoute = route.toLowerCase() === "dlt" && (dltTeId || envDltTeId);

    let payload = {};

    if (isDltRoute) {
      // DLT Route payload
      payload = {
        route: "dlt",
        sender_id: senderId,
        message: dltTeId || envDltTeId, // Fast2SMS uses message param for DLT TE ID
        variables_values: variablesValues || otp || message || "",
        numbers: cleanPhone,
      };
    } else if (route.toLowerCase() === "otp") {
      // Fast2SMS OTP route (if domain verified)
      payload = {
        route: "otp",
        variables_values: String(otp || variablesValues || ""),
        numbers: cleanPhone,
      };
    } else {
      // Fast2SMS Quick SMS route (Instant SMS delivery, no DLT required)
      const smsText = message || (otp ? `Your Shifa Store verification OTP code is: ${otp}. Valid for 10 minutes.` : "Notification from Shifa Store");
      payload = {
        route: "q",
        message: smsText,
        language: "english",
        flash: "0",
        numbers: cleanPhone,
      };
    }

    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    const errorMessage = Array.isArray(result.message)
      ? result.message.join(", ")
      : result.message || "Failed response";

    if (result.return === true || result.status_code === 200) {
      console.log(`✅ [Fast2SMS] SMS sent successfully to ${cleanPhone}. Request ID: ${result.request_id || "N/A"}`);
      return { success: true, data: result };
    } else {
      console.error(`❌ [Fast2SMS] Failed to send SMS to ${cleanPhone}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error("❌ [Fast2SMS] Exception while sending SMS:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Convenience function specifically for sending OTPs.
 */
export async function sendOtpSMS(phone, otp) {
  return sendSMS({ phone, otp });
}
