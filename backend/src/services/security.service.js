import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config/constants.js';

export class SecurityService {
  /**
   * Generates an HMAC-SHA256 signed streaming token.
   * Prevents stream URL tampering, origin sniffing, and hotlinking.
   */
  static generateStreamToken(mediaId, type, serverId = 'vidplay', season = null, episode = null) {
    const expiresAt = Math.floor(Date.now() / 1000) + CONFIG.STREAM_TOKEN_EXPIRY;
    const payload = {
      m: mediaId,
      t: type,
      s: serverId,
      sea: season,
      ep: episode,
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString('hex')
    };

    const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', CONFIG.STREAM_SECRET_KEY)
      .update(serialized)
      .digest('base64url');

    return `${serialized}.${signature}`;
  }

  /**
   * Verifies the authenticity and expiration of a stream token.
   */
  static verifyStreamToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Missing or malformed token' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const [serialized, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.STREAM_SECRET_KEY)
      .update(serialized)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid token signature' };
    }

    try {
      const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: 'Failed to decode token payload' };
    }
  }

  /**
   * Encrypts a raw upstream stream/m3u8 URL into an opaque ciphertext
   */
  static encryptUrl(url) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(CONFIG.STREAM_SECRET_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts an opaque ciphertext back into the upstream stream URL
   */
  static decryptUrl(encryptedString) {
    try {
      const [ivHex, encrypted] = encryptedString.split(':');
      if (!ivHex || !encrypted) return null;

      const algorithm = 'aes-256-cbc';
      const key = crypto.createHash('sha256').update(CONFIG.STREAM_SECRET_KEY).digest();
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      return null;
    }
  }

  /**
   * Hash user password
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare user password
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate Auth JWT for users
   */
  static generateAuthToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify Auth JWT
   */
  static verifyAuthToken(token) {
    try {
      return { valid: true, decoded: jwt.verify(token, CONFIG.JWT_SECRET) };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}
