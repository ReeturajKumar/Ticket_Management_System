import jwt, { SignOptions } from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate both access and refresh tokens
 * @param payload - User data to encode in tokens
 * @returns Object containing both tokens
 */
export const generateTokens = (payload: JWTPayload): TokenPair => {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET || '';
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || '';
  
  if (!accessSecret || !refreshSecret) {
    throw new Error('Token secrets are not defined in environment variables');
  }

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  } as SignOptions);

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  } as SignOptions);

  return { accessToken, refreshToken };
};

/**
 * Verify access token
 * @param token - Access token to verify
 * @returns Decoded payload if valid
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  const secret = process.env.ACCESS_TOKEN_SECRET || '';
  
  if (!secret) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as JWTPayload;
};

/**
 * Verify refresh token
 * @param token - Refresh token to verify
 * @returns Decoded payload if valid
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  const secret = process.env.REFRESH_TOKEN_SECRET || '';
  
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as JWTPayload;
};

// Backward compatibility - kept for existing code
export const generateToken = (payload: JWTPayload): string => {
  return generateTokens(payload).accessToken;
};

export const verifyToken = verifyAccessToken;
