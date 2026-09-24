import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/storage.js';
import { User } from '../db/types.js';

// Simple, secure HMAC session token handling
const SESSION_SECRET = process.env.SESSION_SECRET || 'ai-project-orchestrator-super-secret-key-32';
const SESSIONS = new Map<string, { userId: string; expiresAt: number }>();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    SESSIONS.set(token, { userId, expiresAt });
    return token;
  }

  static getUserIdFromSession(token?: string): string | null {
    if (!token) return null;
    const session = SESSIONS.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      SESSIONS.delete(token);
      return null;
    }
    return session.userId;
  }

  static destroySession(token?: string): void {
    if (token) {
      SESSIONS.delete(token);
    }
  }
}

/**
 * Express middleware to authenticate user via Cookie or Authorization header
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const cookieToken = req.cookies?.['auth_token'];
  const token = headerToken || cookieToken;

  const userId = AuthService.getUserIdFromSession(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = user;
  next();
}

/**
 * Seed a default developer demo user if none exists
 */
export async function ensureDemoUser(): Promise<User> {
  const existing = db.getUserByEmail('developer@orchestrator.local');
  if (existing) return existing;

  const hash = await AuthService.hashPassword('orchestrator123');
  return db.createUser('developer@orchestrator.local', hash, 'Lead Engineer');
}
