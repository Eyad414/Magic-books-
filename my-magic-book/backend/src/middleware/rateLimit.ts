import { Request, Response, NextFunction } from 'express';

/**
 * A per-IP cap on an endpoint that cannot ask who you are.
 *
 * Uploading the child's photo happens in step 2 of the wizard, and the account
 * wall is deliberately in step 3 — the customer picks a photo before they have
 * an account, and moving that wall earlier to protect the endpoint would undo
 * the conversion work. So the upload stays open and gets a ceiling instead.
 *
 * In memory on purpose: this runs as a single instance, the state is worth
 * nothing after a restart, and a shared store would be a database dependency
 * on the one path that must not fail for a paying customer. If this is ever
 * scaled to more than one instance the ceiling becomes per-instance — still a
 * ceiling, just a looser one.
 *
 * The limit is set where an abuser is throttled and a real customer never
 * notices. Re-picking a photo a few times, or a family behind one address, has
 * to stay well inside it: turning away a customer costs more than hosting a
 * few unwanted images.
 */

interface Window { count: number; resetAt: number; }

/**
 * Addresses that can only mean "this is not the caller".
 *
 * If `trust proxy` were ever unset or wrong, req.ip becomes Render's internal
 * address and EVERY visitor collapses onto one key — the ceiling would then be
 * site-wide and the thirteenth customer of the hour could not order a book.
 * That is far worse than the abuse this exists to stop, so a key that looks
 * internal is treated as a misconfiguration: shout in the log, let the request
 * through, never turn a customer away over it.
 */
const NOT_A_CALLER = /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|unknown$)/;
let warned = false;

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Arabic, because the customer reads it. */
  message: string;
}

/** The middleware, plus a way to see how many windows it is holding. */
export type IpRateLimiter = ((req: Request, res: Response, next: NextFunction) => void) & {
  /** Live window count. Exists so the sweep can be proven, not guessed at. */
  trackedKeys(): number;
};

export function ipRateLimit({ windowMs, max, message }: RateLimitOptions): IpRateLimiter {
  const hits = new Map<string, Window>();
  let lastSweep = Date.now();

  /** Drop expired windows so a long-running process does not grow forever. */
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, w] of hits) if (w.resetAt <= now) hits.delete(key);
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now);

    // req.ip is only the real caller when the app trusts Render's proxy; see
    // `trust proxy` in server.ts. Without it every visitor shares one key and
    // the first few uploads would lock out everybody else.
    const key = req.ip || req.socket.remoteAddress || 'unknown';

    // Local development is all loopback, so only refuse to limit when this
    // looks like a deployed box behind a proxy that is not being trusted.
    if (process.env.NODE_ENV === 'production' && NOT_A_CALLER.test(key)) {
      if (!warned) {
        warned = true;
        console.error(
          `[rateLimit] resolved caller as "${key}" — the proxy is not trusted, so every ` +
          `visitor shares one bucket. Not limiting; fix \`app.set('trust proxy')\`.`
        );
      }
      next();
      return;
    }

    const w = hits.get(key);

    if (!w || w.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    w.count += 1;
    if (w.count > max) {
      const retryAfter = Math.ceil((w.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, message, retryAfter });
      return;
    }
    next();
  };

  (middleware as IpRateLimiter).trackedKeys = () => hits.size;
  return middleware as IpRateLimiter;
}
