import crypto from 'node:crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

/** Encrypts secrets at rest (SMTP passwords, Slack webhooks). Output: iv.tag.ciphertext (base64url). */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}
