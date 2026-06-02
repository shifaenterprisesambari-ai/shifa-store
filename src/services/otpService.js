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
  return bcrypt.compare(plainOtp, hashedOtp);
};
