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
 * authRateLimit — strict brute-force protection for /auth/login and /auth/register.
 * 5 attempts per 15 minutes per IP. Only failed (non-2xx) responses count toward the limit.
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many attempts. Please try again after 15 minutes.',
        statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        return `auth_${ipKeyGenerator(ip)}`;
    },
    handler: (_req, res) => {
        return res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try again after 15 minutes.',
        });
    },
});