/**
 * Generate a cryptographically strong random password.
 * @param length Password length (default: 16)
 * @param charset Optional charset (default: strong)
 */
export function generateRandomPassword(length = 16, charset?: string): string {
  const defaultCharset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?";
  const chars = charset || defaultCharset;
  const array = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
    return Array.from(array, (x) => chars[x % chars.length]).join("");
  }
  // fallback (not cryptographically strong)
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
