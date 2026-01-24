import { v4 as uuidv4 } from 'uuid';
import { ISession, IUser } from '../models/User';

/**
 * Session Management Utility
 * Handles multi-device session tracking
 */

// Maximum sessions per user
const MAX_SESSIONS_PER_USER = 5;

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent?: string): {
  browser?: string;
  os?: string;
  device?: string;
} {
  if (!userAgent) {
    return {};
  }

  let browser: string | undefined;
  let os: string | undefined;
  let device: string | undefined;

  // Detect browser
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    device = 'Mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    device = 'Tablet';
  } else {
    device = 'Desktop';
  }

  return { browser, os, device };
}

/**
 * Create a new session
 */
export function createSession(
  refreshToken: string,
  rememberMe: boolean,
  deviceInfo: {
    userAgent?: string;
    ip?: string;
  }
): ISession {
  const parsed = parseUserAgent(deviceInfo.userAgent);
  
  // Calculate expiry based on remember me setting
  const expiresAt = new Date();
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  } else {
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day
  }

  return {
    sessionId: uuidv4(),
    refreshToken,
    deviceInfo: {
      userAgent: deviceInfo.userAgent,
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
      ip: deviceInfo.ip,
    },
    rememberMe,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt,
  };
}

/**
 * Add session to user, enforcing max sessions limit
 * Removes oldest sessions if limit exceeded
 */
export function addSessionToUser(user: IUser, newSession: ISession): void {
  // Initialize sessions array if it doesn't exist
  if (!user.sessions) {
    user.sessions = [];
  }

  // Remove expired sessions first
  const now = new Date();
  user.sessions = user.sessions.filter(session => session.expiresAt > now);

  // If at max sessions, remove the oldest one
  if (user.sessions.length >= MAX_SESSIONS_PER_USER) {
    // Sort by lastUsedAt and remove the oldest
    user.sessions.sort((a, b) => 
      new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()
    );
    user.sessions.shift(); // Remove oldest session
  }

  // Add new session
  user.sessions.push(newSession);

  // Also set legacy refreshToken for backward compatibility
  user.refreshToken = newSession.refreshToken;
}

/**
 * Find session by refresh token
 */
export function findSessionByToken(user: IUser, refreshToken: string): ISession | undefined {
  if (!user.sessions) {
    return undefined;
  }
  
  return user.sessions.find(session => session.refreshToken === refreshToken);
}

/**
 * Find session by session ID
 */
export function findSessionById(user: IUser, sessionId: string): ISession | undefined {
  if (!user.sessions) {
    return undefined;
  }
  
  return user.sessions.find(session => session.sessionId === sessionId);
}

/**
 * Update session's lastUsedAt and refresh token
 */
export function updateSession(
  user: IUser,
  sessionId: string,
  newRefreshToken: string
): boolean {
  if (!user.sessions) {
    return false;
  }

  const sessionIndex = user.sessions.findIndex(s => s.sessionId === sessionId);
  if (sessionIndex === -1) {
    return false;
  }

  user.sessions[sessionIndex].refreshToken = newRefreshToken;
  user.sessions[sessionIndex].lastUsedAt = new Date();
  
  // Update legacy refreshToken
  user.refreshToken = newRefreshToken;
  
  return true;
}

/**
 * Remove a specific session
 */
export function removeSession(user: IUser, sessionId: string): boolean {
  if (!user.sessions) {
    return false;
  }

  const initialLength = user.sessions.length;
  user.sessions = user.sessions.filter(session => session.sessionId !== sessionId);
  
  // If we removed a session and there are remaining sessions, update legacy token
  if (user.sessions.length < initialLength) {
    if (user.sessions.length > 0) {
      user.refreshToken = user.sessions[user.sessions.length - 1].refreshToken;
    } else {
      user.refreshToken = null;
    }
    return true;
  }
  
  return false;
}

/**
 * Remove all sessions except current one
 */
export function removeOtherSessions(user: IUser, currentSessionId: string): number {
  if (!user.sessions) {
    return 0;
  }

  const initialLength = user.sessions.length;
  user.sessions = user.sessions.filter(session => session.sessionId === currentSessionId);
  
  return initialLength - user.sessions.length;
}

/**
 * Remove all sessions (logout from all devices)
 */
export function removeAllSessions(user: IUser): number {
  if (!user.sessions) {
    return 0;
  }

  const count = user.sessions.length;
  user.sessions = [];
  user.refreshToken = null;
  
  return count;
}

/**
 * Clean expired sessions
 */
export function cleanExpiredSessions(user: IUser): number {
  if (!user.sessions) {
    return 0;
  }

  const now = new Date();
  const initialLength = user.sessions.length;
  user.sessions = user.sessions.filter(session => session.expiresAt > now);
  
  // Update legacy refreshToken if sessions changed
  if (user.sessions.length < initialLength) {
    if (user.sessions.length > 0) {
      user.refreshToken = user.sessions[user.sessions.length - 1].refreshToken;
    } else {
      user.refreshToken = null;
    }
  }
  
  return initialLength - user.sessions.length;
}

/**
 * Get all active sessions for display (without sensitive data)
 */
export function getActiveSessions(user: IUser): Array<{
  sessionId: string;
  device: string;
  browser?: string;
  os?: string;
  ip?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}> {
  if (!user.sessions) {
    return [];
  }

  const now = new Date();
  
  return user.sessions
    .filter(session => session.expiresAt > now)
    .map(session => ({
      sessionId: session.sessionId,
      device: session.deviceInfo?.device || 'Unknown',
      browser: session.deviceInfo?.browser,
      os: session.deviceInfo?.os,
      ip: session.deviceInfo?.ip ? maskIP(session.deviceInfo.ip) : undefined,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Will be set by the calling function
    }));
}

/**
 * Mask IP address for privacy
 * e.g., "192.168.1.100" -> "192.168.xxx.xxx"
 */
function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  // IPv6 or other - just show partial
  if (ip.length > 8) {
    return ip.substring(0, 8) + '...';
  }
  return ip;
}

export default {
  parseUserAgent,
  createSession,
  addSessionToUser,
  findSessionByToken,
  findSessionById,
  updateSession,
  removeSession,
  removeOtherSessions,
  removeAllSessions,
  cleanExpiredSessions,
  getActiveSessions,
};
