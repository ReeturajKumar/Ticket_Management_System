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

interface TokenOptions {
  rememberMe?: boolean;
  sessionId?: string;
}

/**
 * Token expiry constants
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_SHORT: '1d',    // Standard session (no remember me)
  REFRESH_TOKEN_LONG: '30d',    // Remember me session
};

/**
 * Generate both access and refresh tokens
 * @param payload - User data to encode in tokens
 * @param options - Token generation options (rememberMe, sessionId)
 * @returns Object containing both tokens
 */
export const generateTokens = (payload: JWTPayload, options?: TokenOptions): TokenPair => {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET || '';
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || '';
  
  if (!accessSecret || !refreshSecret) {
    throw new Error('Token secrets are not defined in environment variables');
  }

  // Determine refresh token expiry based on "Remember Me" option
  const rememberMe = options?.rememberMe ?? false;
  const refreshTokenExpiry = rememberMe 
    ? TOKEN_EXPIRY.REFRESH_TOKEN_LONG 
    : TOKEN_EXPIRY.REFRESH_TOKEN_SHORT;

  // Include sessionId in payload if provided
  const extendedPayload = options?.sessionId 
    ? { ...payload, sessionId: options.sessionId }
    : payload;

  const accessToken = jwt.sign(extendedPayload, accessSecret, {
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
  } as SignOptions);

  const refreshToken = jwt.sign(extendedPayload, refreshSecret, {
    expiresIn: refreshTokenExpiry,
  } as SignOptions);

  return { accessToken, refreshToken };
};

/**
 * Get the expiry date from a token
 * @param token - JWT token
 * @returns Expiry date or null if invalid
 */
export const getTokenExpiry = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
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
