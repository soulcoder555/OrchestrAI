import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storage.js';
import { AuthService, AuthenticatedRequest, requireAuth } from '../auth/auth.js';

export const authRouter = Router();

const AuthInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

authRouter.post('/signup', async (req, res) => {
  try {
    const parsed = AuthInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password, name } = parsed.data;
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = await AuthService.hashPassword(password);
    const user = db.createUser(email, hash, name);
    const token = AuthService.createSession(user.id);

    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 });
    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await AuthService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = AuthService.createSession(user.id);
    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 86400 * 1000 });

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

authRouter.post('/logout', (req, res) => {
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const cookieToken = req.cookies?.['auth_token'];
  AuthService.destroySession(headerToken || cookieToken);
  res.clearCookie('auth_token');
  return res.json({ success: true });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  return res.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
});
