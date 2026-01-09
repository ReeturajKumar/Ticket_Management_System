import crypto from 'crypto';

/**
 * Generate secure random token for password reset
 * @returns 32-byte hex string
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash reset token for storage in database
 * @param token - Plain reset token
 * @returns Hashed token
 */
export const hashResetToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
