import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
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
