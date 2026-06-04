import bcrypt from "bcryptjs";

/**
 * Generate a random 4-digit OTP string.
 * @returns {string} Plain text OTP (e.g., "0472")
 */
export const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Hash an OTP using bcrypt.
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} Hashed OTP
 */
export const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Verify a plain OTP against its bcrypt hash.
 * @param {string} plainOtp - The OTP entered by the delivery partner
 * @param {string} hashedOtp - The hashed OTP stored in the order
 * @returns {Promise<boolean>}
 */
export const verifyOtp = async (plainOtp, hashedOtp) => {
  if (!plainOtp || !hashedOtp) return false;
  const p = String(plainOtp).trim();
  const h = String(hashedOtp).trim();

  // If the stored value looks like a bcrypt hash, compare using bcrypt
  if (h.startsWith("$2a$") || h.startsWith("$2b$") || h.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(p, h);
    } catch (err) {
      console.error("Bcrypt compare error:", err);
      return false;
    }
  }

  // Otherwise, fallback to plain text comparison
  return p === h;
};
