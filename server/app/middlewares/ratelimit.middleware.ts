import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const getLinkRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many failed login attempts. Please try again after 15 minutes.',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by IP using express-rate-limit's helper for IPv6 safety
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        return `getlink_${ipKeyGenerator(ip)}`;
    },
    handler: (req, res) => {
        console.warn('Get links rate limit exceeded', {
            ip: req.ip,
            identifier: req.body?.identifier,
            userAgent: req.get('User-Agent')
        });
        return res.status(429).json({
                    success: false,
                    message: 'Too many failed get link attempts. Please try again after 1 minute.',
        });
    },
});

/**
 * authRateLimit — strict bot spam 
 * max 100 attempts per 1 minutes per IP. Only failed (non-2xx) responses count toward the limit.
 */
export const globalAuthRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        return `auth_${ipKeyGenerator(ip)}`;
    },
    handler: (_req, res) => {
        return res.status(429).json({
            success: false,
            message: 'Too many requests! Please slow down.',
        });
    },
});

/**
 * loginRateLimit — strict brute-force protection for /auth/login and /auth/register.
 * max 10 attempts per 10 minutes per IP. Only failed (non-2xx) responses count toward the limit.
 */
export const loginRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const ip = req.ip ?? 'unknown';
        let email = req.body?.email ?? 'anonymous';
        if (typeof email !== 'string') {
            email = 'invalid_format'; 
        }
        email = email.trim().toLowerCase().substring(0, 100);
        return `login_${ip}_${email}`; 
    },
    handler: (_req, res) => {
        return res.status(429).json({
            success: false,
            message: 'Too many failed login attempts. Please try again in 10 minutes.',
        });
    },
});

/**
 * REGISTER RATE LIMIT
 * Prevent spam create account
 */
export const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // max 5 accounts / hour / IP
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, 
    keyGenerator: (req) => {
        const ip = req.ip ?? 'unknown';
        return `register_${ip}`;
    },
    handler: (_req, res) => {
        return res.status(429).json({
            success: false,
            message: 'Too many accounts created. Please try again later.',
        });
    },
});