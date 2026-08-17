import crypto from 'crypto';
import { cookies } from 'next/headers';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SECRET_KEY = process.env.SESSION_SECRET 
  ? crypto.createHash('sha256').update(process.env.SESSION_SECRET).digest()
  : crypto.createHash('sha256').update('seapac-fallback-secret-key-32-chars').digest();

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt session cookie:', err);
    return null;
  }
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('seapac_session');
    if (!sessionCookie || !sessionCookie.value) return null;

    const decrypted = decrypt(sessionCookie.value);
    if (!decrypted) return null;

    return JSON.parse(decrypted);
  } catch (err) {
    console.error('getSessionUser error:', err);
    return null;
  }
}

export async function isAdmin() {
  const user = await getSessionUser();
  return !!(user && user.role === 'adm');
}
