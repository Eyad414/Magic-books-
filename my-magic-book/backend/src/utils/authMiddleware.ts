import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
}

/** A minute of granularity is plenty for "who is online", and it keeps a busy
 *  session down to one write a minute instead of one per request. Deliberately
 *  not awaited: presence is never worth slowing a real request for, and a
 *  failed write must not turn into a 401. */
const SEEN_EVERY_MS = 60_000;
function touchLastSeen(user: any): void {
  const last = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
  if (Date.now() - last < SEEN_EVERY_MS) return;
  User.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } })
    .catch((err) => console.warn('[lastSeen]', err?.message || err));
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'غير مصرح — يرجى تسجيل الدخول' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }

    (req as any).user = user;
    touchLastSeen(user);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'رمز التحقق غير صالح' });
  }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'غير مسموح — للمديرين فقط' });
    return;
  }
  next();
};
