import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export interface AuthUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'SALESPERSON';
  employeeName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'asrtex_fallback_secret';

    const decoded = jwt.verify(token, secret) as AuthUser;

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, employeeName: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive or disabled' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeName: user.employeeName,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
};

export const requireRole = (roles: Array<'ADMIN' | 'SALESPERSON'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};
