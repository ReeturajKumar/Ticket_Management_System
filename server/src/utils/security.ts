import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/appConfig';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, await bcrypt.genSalt(10));
};

export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

const getSecondsUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); 
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
};

export const generateToken = (payload: JWTPayload): string => {
  const secret = config.jwt.secret;
  if (!secret) throw new Error('JWT Secret missing');
  return jwt.sign(payload, secret, { expiresIn: getSecondsUntilMidnight() });
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = config.jwt.secret;
  if (!secret) throw new Error('JWT Secret missing');
  return jwt.verify(token, secret) as JWTPayload;
};

export const getTokenExpiry = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
};

/**
 * SECURE RANDOM TOKENS (Reset/OTP)
 */
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashRandomToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
