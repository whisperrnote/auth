/**
 * Generate a cryptographically strong random password.
 * @param length Password length (default: 16, min: 12, max: 128)
 * @param charset Optional charset (default: strong)
 * @throws Error if Web Crypto API is not available
 */
export function generateRandomPassword(length = 16, charset?: string): string {
  // Validate length
  if (length < 12) {
    throw new Error("Password length must be at least 12 characters");
  }
  if (length > 128) {
    throw new Error("Password length cannot exceed 128 characters");
  }

  const defaultCharset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?";
  const chars = charset || defaultCharset;
  
  // Check if Web Crypto API is available
  if (typeof window === "undefined" || !window.crypto || !window.crypto.getRandomValues) {
    throw new Error("Web Crypto API is not available. Secure password generation requires a modern browser.");
  }

  // Use cryptographically secure random values
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}
